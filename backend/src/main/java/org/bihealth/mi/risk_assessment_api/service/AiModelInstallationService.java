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
import java.net.ConnectException;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.channels.UnresolvedAddressException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.DirectoryStream;
import java.nio.file.FileSystemException;
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
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Stream;

/**
 * Installs the files of registry AI models into persistent server-side storage and tells which
 * models are installed. Researchers' browsers load the files from this server (see
 * AiModelController); models never run here.
 *
 * <p>Files are only fetched from the configured source at the model's pinned revision, and a file
 * counts as installed only if its SHA-256 hash matches the registry. Redirects are followed only to
 * the source host or the configured redirect hosts (Hugging Face serves files from its CDN), never
 * from HTTPS to HTTP. Downloads go to a temporary directory first and are moved into place after
 * verification, and a model is reported as installed only once all its files are verified, so an
 * interrupted or failed installation is never served. Installations run one at a time; a request
 * for a model that is already installing or installed returns its current status. Errors reported
 * to clients are generic; details are logged.</p>
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
    private static final int MAX_REDIRECTS = 5;
    private static final Duration RESPONSE_TIMEOUT = Duration.ofMinutes(2);
    // A download that receives no data for this long is aborted.
    private static final Duration STALL_TIMEOUT = Duration.ofSeconds(60);

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
    private final ScheduledExecutorService stallWatchdog = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "ai-model-download-watchdog");
        thread.setDaemon(true);
        return thread;
    });
    private final Map<String, Status> statuses = new ConcurrentHashMap<>();
    private final List<String> redirectHosts;

    public AiModelInstallationService(
            AiModelRegistry registry,
            @Value("${app.ai-models.storage-dir}") String storageDir,
            @Value("${app.ai-models.source-url}") String sourceUrl,
            @Value("${app.ai-models.redirect-hosts:}") List<String> redirectHosts
    ) {
        URI source = URI.create(sourceUrl.replaceAll("/+$", ""));
        if (!("https".equals(source.getScheme()) || "http".equals(source.getScheme())) || source.getHost() == null) {
            throw new IllegalStateException("app.ai-models.source-url must be an http(s) URL");
        }
        this.registry = registry;
        this.storageDir = Path.of(storageDir).toAbsolutePath().normalize();
        this.sourceUrl = source.toString();
        this.redirectHosts = redirectHosts.stream()
                .map(host -> host.trim().toLowerCase(Locale.ROOT))
                .filter(host -> !host.isEmpty())
                .toList();
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
        stallWatchdog.shutdownNow();
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
        HttpResponse<InputStream> response = send(
                URI.create(sourceUrl + "/" + model.repository() + "/resolve/" + model.revision() + "/" + asset.file()),
                asset.file());
        try (InputStream body = response.body()) {
            if (response.statusCode() != 200) {
                throw new InstallationException(
                        "Download of " + asset.file() + " failed (HTTP " + response.statusCode() + ")");
            }
            long length = response.headers().firstValueAsLong("content-length").orElse(-1);
            if (length > MAX_FILE_BYTES) {
                throw new InstallationException(asset.file() + " is larger than allowed");
            }
            Files.createDirectories(part.getParent());
            long usable = Files.getFileStore(storageDir).getUsableSpace();
            if (Math.max(length, 0) + RESERVED_BYTES > usable) {
                throw new InstallationException("Insufficient storage space for " + asset.file());
            }
            Long total = length > 0 ? length : null;
            MessageDigest digest = sha256();
            AtomicLong lastData = new AtomicLong(System.nanoTime());
            AtomicBoolean stalled = new AtomicBoolean();
            // Closing the body ends a read that is blocked on a stalled connection.
            ScheduledFuture<?> watchdog = stallWatchdog.scheduleWithFixedDelay(() -> {
                if (System.nanoTime() - lastData.get() > STALL_TIMEOUT.toNanos() && stalled.compareAndSet(false, true)) {
                    try {
                        body.close();
                    } catch (IOException ignored) {
                        // The download thread reports the stall.
                    }
                }
            }, 5, 5, TimeUnit.SECONDS);
            try (InputStream input = new DigestInputStream(body, digest);
                 OutputStream output = Files.newOutputStream(part)) {
                byte[] buffer = new byte[64 * 1024];
                long written = 0;
                long reported = 0;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    lastData.set(System.nanoTime());
                    written += read;
                    if (written > MAX_FILE_BYTES) {
                        throw new InstallationException(asset.file() + " is larger than allowed");
                    }
                    output.write(buffer, 0, read);
                    if (written - reported >= PROGRESS_STEP_BYTES) {
                        reported = written;
                        updateProgress(model, completed, written, total);
                    }
                }
            } catch (IOException exception) {
                if (stalled.get()) {
                    throw new InstallationException("Download of " + asset.file() + " stalled", exception);
                }
                throw exception;
            } finally {
                watchdog.cancel(false);
            }
            if (stalled.get()) {
                throw new InstallationException("Download of " + asset.file() + " stalled");
            }
            if (!HexFormat.of().formatHex(digest.digest()).equals(asset.sha256())) {
                Files.deleteIfExists(part);
                throw new InstallationException("Checksum verification failed for " + asset.file());
            }
        }
    }

    /**
     * Sends a GET request, following redirects only to allowed hosts (see isAllowedRedirect).
     * Redirect responses are drained and closed before the next request.
     */
    private HttpResponse<InputStream> send(URI uri, String file) throws IOException, InterruptedException {
        URI current = uri;
        for (int redirects = 0; ; redirects++) {
            HttpRequest request = HttpRequest.newBuilder(current).timeout(RESPONSE_TIMEOUT).GET().build();
            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            int status = response.statusCode();
            if (status != 301 && status != 302 && status != 303 && status != 307 && status != 308) {
                return response;
            }
            response.body().close();
            String location = response.headers().firstValue("location").orElse(null);
            if (location == null || redirects >= MAX_REDIRECTS) {
                throw new InstallationException("Download of " + file + " failed (invalid redirect)");
            }
            URI next = current.resolve(location);
            if (!isAllowedRedirect(current, next)) {
                log.warn("AI model download of {} redirected to a host that is not allowed: {}", file, next.getHost());
                throw new InstallationException("Download of " + file + " was redirected to a host that is not allowed");
            }
            current = next;
        }
    }

    /**
     * Same host as the configured source, or one of `app.ai-models.redirect-hosts` (or a subdomain).
     * HTTPS may never be downgraded to HTTP.
     */
    private boolean isAllowedRedirect(URI from, URI to) {
        String scheme = to.getScheme();
        String host = to.getHost();
        if (host == null || !("https".equals(scheme) || "http".equals(scheme))) {
            return false;
        }
        if ("https".equals(from.getScheme()) && !"https".equals(scheme)) {
            return false;
        }
        String normalized = host.toLowerCase(Locale.ROOT);
        if (normalized.equals(URI.create(sourceUrl).getHost().toLowerCase(Locale.ROOT))) {
            return true;
        }
        return "https".equals(scheme) && redirectHosts.stream()
                .anyMatch(allowed -> normalized.equals(allowed) || normalized.endsWith("." + allowed));
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

    /** A message that is safe to show to administrators (no paths, hosts or stack details). */
    private static String describeFailure(Exception exception) {
        if (exception instanceof InstallationException) {
            return exception.getMessage();
        }
        if (exception instanceof InterruptedException) {
            return "Installation was interrupted";
        }
        if (exception instanceof HttpTimeoutException) {
            return "The model source did not respond in time";
        }
        if (exception instanceof ConnectException || exception instanceof UnresolvedAddressException
                || exception.getCause() instanceof UnresolvedAddressException) {
            return "Could not connect to the model source";
        }
        String message = exception.getMessage();
        if (message != null && message.contains("No space left")) {
            return "Insufficient storage space";
        }
        if (exception instanceof FileSystemException) {
            return "Model files could not be written to storage";
        }
        if (exception instanceof IOException) {
            return "Download failed";
        }
        return "Installation failed";
    }

    /** An installation failure whose message is safe to report to clients. */
    private static final class InstallationException extends IOException {
        InstallationException(String message) {
            super(message);
        }

        InstallationException(String message, Throwable cause) {
            super(message, cause);
        }
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

    /**
     * Uses HTTPS_PROXY/HTTP_PROXY when set (as in proxied deployments), otherwise the JVM's proxy
     * settings. Redirects are followed by {@link #send}, which checks each target.
     */
    private static HttpClient buildHttpClient() {
        HttpClient.Builder builder = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
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
