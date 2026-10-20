package org.bihealth.mi.risk_assessment_api.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.bihealth.mi.risk_assessment_api.service.AiModelRegistry.Asset;
import org.bihealth.mi.risk_assessment_api.service.AiModelRegistry.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

/**
 * Installs the files of registry AI models into persistent server-side storage and tells which
 * models are installed. Researchers' browsers load the files from this server (see
 * AiModelController); models never run here.
 *
 * <p>Files are only fetched from the configured source at the model's pinned revision, and a file
 * counts as installed only if its SHA-256 hash matches the registry. Downloads go to a temporary
 * directory first and are moved into place after verification, so an interrupted or failed
 * installation never leaves a partially written file in use. Installations run one at a time; a
 * request for a model that is already installing or installed returns its current status.</p>
 *
 * <p>Layout: {@code <storage-dir>/<model id>/<revision>/<file>}. Files placed there manually (for
 * offline deployments) are accepted after the same hash verification at startup.</p>
 */
@Service
public class AiModelInstallationService {

    private static final Logger log = LoggerFactory.getLogger(AiModelInstallationService.class);
    private static final String TEMP_DIR = ".tmp";
    private static final long MAX_FILE_BYTES = 2L * 1024 * 1024 * 1024;
    private static final long RESERVED_BYTES = 64L * 1024 * 1024;
    private static final long PROGRESS_STEP_BYTES = 1024 * 1024;

    public enum State { NOT_INSTALLED, INSTALLING, INSTALLED, FAILED }

    /**
     * Installation status of one model. Progress fields are only meaningful while installing:
     * files verified so far, and bytes of the file being downloaded (total null when unknown).
     */
    public record Status(
            String modelId,
            String revision,
            State state,
            String error,
            int filesCompleted,
            int filesTotal,
            long fileBytes,
            Long fileTotalBytes
    ) {
        static Status of(Model model, State state, String error) {
            return new Status(model.id(), model.revision(), state, error,
                    state == State.INSTALLED ? model.assets().size() : 0, model.assets().size(), 0, null);
        }
    }

    private final AiModelRegistry registry;
    private final Path storageDir;
    private final String sourceUrl;
    private final HttpClient httpClient;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "ai-model-installer");
        thread.setDaemon(true);
        return thread;
    });
    private final Map<String, Status> statuses = new ConcurrentHashMap<>();

    public AiModelInstallationService(
            AiModelRegistry registry,
            @Value("${app.ai-models.storage-dir}") String storageDir,
            @Value("${app.ai-models.source-url}") String sourceUrl
    ) {
        this.registry = registry;
        this.storageDir = Path.of(storageDir).toAbsolutePath().normalize();
        this.sourceUrl = sourceUrl.replaceAll("/+$", "");
        this.httpClient = buildHttpClient();
    }

    /** Verifies the files already in storage and removes leftovers of interrupted installations. */
    @PostConstruct
    void verifyInstalledModels() throws IOException {
        Files.createDirectories(storageDir);
        deleteRecursively(storageDir.resolve(TEMP_DIR));
        for (Model model : registry.enabledModels()) {
            boolean installed = isInstalled(model);
            statuses.put(model.id(), Status.of(model, installed ? State.INSTALLED : State.NOT_INSTALLED, null));
        }
        log.info("AI model storage {}: installed {}", storageDir,
                statuses.values().stream().filter(status -> status.state() == State.INSTALLED)
                        .map(Status::modelId).toList());
    }

    /** Installs the registry's default models in the background, so a new deployment needs no manual step. */
    @EventListener(ApplicationReadyEvent.class)
    public void installDefaultModels() {
        registry.enabledModels().stream()
                .filter(Model::installByDefault)
                .filter(model -> getStatus(model.id()).state() != State.INSTALLED)
                .forEach(model -> requestInstall(model.id()));
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }

    public List<Status> getStatuses() {
        return registry.enabledModels().stream().map(model -> getStatus(model.id())).toList();
    }

    public Status getStatus(String modelId) {
        Model model = requireModel(modelId);
        return statuses.getOrDefault(model.id(), Status.of(model, State.NOT_INSTALLED, null));
    }

    /** Starts installing the model unless it is installed or already installing (safe to retry after a failure). */
    public synchronized Status requestInstall(String modelId) {
        Model model = requireModel(modelId);
        Status current = getStatus(model.id());
        if (current.state() == State.INSTALLED || current.state() == State.INSTALLING) {
            return current;
        }
        Status installing = Status.of(model, State.INSTALLING, null);
        statuses.put(model.id(), installing);
        executor.submit(() -> install(model));
        return installing;
    }

    /**
     * The stored file of an installed model, only for the pinned revision and files listed in the
     * registry (never an arbitrary path).
     */
    public Optional<Path> findInstalledFile(String modelId, String revision, String file) {
        Optional<Model> model = registry.find(modelId)
                .filter(candidate -> candidate.revision().equals(revision))
                .filter(candidate -> getStatus(candidate.id()).state() == State.INSTALLED);
        if (model.isEmpty() || model.get().asset(file).isEmpty()) {
            return Optional.empty();
        }
        Path directory = modelDirectory(model.get());
        Path path = directory.resolve(file).normalize();
        return path.startsWith(directory) && Files.isRegularFile(path) ? Optional.of(path) : Optional.empty();
    }

    private Model requireModel(String modelId) {
        return registry.find(modelId)
                .orElseThrow(() -> new EntityNotFoundException("Unknown AI model: " + modelId));
    }

    private Path modelDirectory(Model model) {
        return storageDir.resolve(model.id()).resolve(model.revision());
    }

    private boolean isInstalled(Model model) {
        for (Asset asset : model.assets()) {
            if (!hasExpectedHash(modelDirectory(model).resolve(asset.file()), asset.sha256())) {
                return false;
            }
        }
        return true;
    }

    private void install(Model model) {
        Path directory = modelDirectory(model);
        Path temp = storageDir.resolve(TEMP_DIR).resolve(model.id() + "-" + UUID.randomUUID());
        try {
            int completed = 0;
            for (Asset asset : model.assets()) {
                Path target = directory.resolve(asset.file());
                if (!hasExpectedHash(target, asset.sha256())) {
                    Path part = temp.resolve(asset.file());
                    download(model, asset, part, completed);
                    Files.createDirectories(target.getParent());
                    move(part, target);
                }
                completed += 1;
                updateProgress(model, completed, 0, null);
            }
            deleteOtherRevisions(model);
            statuses.put(model.id(), Status.of(model, State.INSTALLED, null));
            log.info("AI model {} installed ({}@{})", model.id(), model.repository(), model.revision());
        } catch (Exception exception) {
            String message = describeFailure(exception);
            log.warn("AI model {} installation failed: {}", model.id(), message, exception);
            statuses.put(model.id(), Status.of(model, State.FAILED, message));
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
        } finally {
            try {
                deleteRecursively(temp);
            } catch (IOException exception) {
                log.warn("Could not remove temporary AI model files {}", temp, exception);
            }
        }
    }

    private void download(Model model, Asset asset, Path part, int completed) throws IOException, InterruptedException {
        URI uri = URI.create(sourceUrl + "/" + model.repository() + "/resolve/" + model.revision() + "/" + asset.file());
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofMinutes(2)).GET().build();
        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream body = response.body()) {
            if (response.statusCode() != 200) {
                throw new IOException("Download of " + asset.file() + " failed (HTTP " + response.statusCode() + ")");
            }
            long length = response.headers().firstValueAsLong("content-length").orElse(-1);
            if (length > MAX_FILE_BYTES) {
                throw new IOException(asset.file() + " is larger than allowed");
            }
            Files.createDirectories(part.getParent());
            if (length > 0 && length + RESERVED_BYTES > Files.getFileStore(storageDir).getUsableSpace()) {
                throw new IOException("Insufficient storage space for " + asset.file());
            }
            Long total = length > 0 ? length : null;
            MessageDigest digest = sha256();
            try (InputStream input = new DigestInputStream(body, digest);
                 OutputStream output = Files.newOutputStream(part)) {
                byte[] buffer = new byte[64 * 1024];
                long written = 0;
                long reported = 0;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    written += read;
                    if (written > MAX_FILE_BYTES) {
                        throw new IOException(asset.file() + " is larger than allowed");
                    }
                    output.write(buffer, 0, read);
                    if (written - reported >= PROGRESS_STEP_BYTES) {
                        reported = written;
                        updateProgress(model, completed, written, total);
                    }
                }
            }
            if (!HexFormat.of().formatHex(digest.digest()).equals(asset.sha256())) {
                Files.deleteIfExists(part);
                throw new IOException("Checksum verification failed for " + asset.file());
            }
        }
    }

    private void updateProgress(Model model, int completed, long bytes, Long total) {
        statuses.put(model.id(), new Status(model.id(), model.revision(), State.INSTALLING, null,
                completed, model.assets().size(), bytes, total));
    }

    private void deleteOtherRevisions(Model model) throws IOException {
        Path modelRoot = storageDir.resolve(model.id());
        try (DirectoryStream<Path> revisions = Files.newDirectoryStream(modelRoot)) {
            for (Path revision : revisions) {
                if (!revision.getFileName().toString().equals(model.revision())) {
                    deleteRecursively(revision);
                }
            }
        }
    }

    private static String describeFailure(Exception exception) {
        String message = exception.getMessage();
        if (message != null && message.contains("No space left")) {
            return "Insufficient storage space";
        }
        if (exception instanceof InterruptedException) {
            return "Installation was interrupted";
        }
        return message == null || message.isBlank() ? exception.getClass().getSimpleName() : message;
    }

    private static void move(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static boolean hasExpectedHash(Path file, String sha256) {
        if (!Files.isRegularFile(file)) {
            return false;
        }
        MessageDigest digest = sha256();
        try (InputStream input = new DigestInputStream(Files.newInputStream(file), digest)) {
            input.transferTo(OutputStream.nullOutputStream());
        } catch (IOException exception) {
            return false;
        }
        return HexFormat.of().formatHex(digest.digest()).equals(sha256);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static void deleteRecursively(Path path) throws IOException {
        if (!Files.exists(path)) {
            return;
        }
        try (Stream<Path> paths = Files.walk(path)) {
            for (Path entry : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(entry);
            }
        }
    }

    /** Uses HTTPS_PROXY/HTTP_PROXY when set (as in proxied deployments), otherwise the JVM's proxy settings. */
    private static HttpClient buildHttpClient() {
        HttpClient.Builder builder = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(30));
        String proxy = Stream.of("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy")
                .map(System::getenv)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
        if (proxy != null) {
            URI proxyUri = URI.create(proxy.contains("://") ? proxy : "http://" + proxy);
            int port = proxyUri.getPort() > 0 ? proxyUri.getPort() : 80;
            builder.proxy(ProxySelector.of(new InetSocketAddress(proxyUri.getHost(), port)));
        } else {
            builder.proxy(ProxySelector.getDefault());
        }
        return builder.build();
    }
}
