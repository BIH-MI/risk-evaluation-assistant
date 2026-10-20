package org.bihealth.mi.risk_assessment_api.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The browser-local AI model registry (frontend/src/qidDiscovery/aiSuggestions/modelRegistry.json,
 * copied to the classpath at build time). The backend uses it to install and serve model files (ids,
 * pinned repositories and revisions, SHA-256 hash of every file) and to check the screening
 * provenance that the browser reports for a new dataset against the registry.
 */
@Component
public class AiModelRegistry {

    private static final String REGISTRY_RESOURCE = "ai/modelRegistry.json";
    private static final Pattern MODEL_ID = Pattern.compile("[a-z0-9][a-z0-9.-]{0,63}");
    private static final Pattern REPOSITORY = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*");
    private static final Pattern REVISION = Pattern.compile("[0-9a-f]{40}");
    private static final Pattern SHA256 = Pattern.compile("[0-9a-f]{64}");
    // Relative paths of plain names only: no "..", no leading slash, no backslashes.
    private static final Pattern ASSET_FILE = Pattern.compile("[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*");

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Asset(String file, String sha256) {
    }

    /** An evaluation of one exact model configuration (see modelConfig.js, getValidation). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Validation(
            String promptVersion,
            String revision,
            String dtype,
            String promptFingerprint,
            String thresholdsFingerprint,
            Boolean approvedForAutoExclusion
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Model(
            String id,
            String displayName,
            String repository,
            String revision,
            String dtype,
            String promptProfile,
            String thresholdProfile,
            String availability,
            boolean installByDefault,
            List<Validation> validations,
            List<Asset> assets
    ) {
        public boolean enabled() {
            return "enabled".equals(availability);
        }

        public Optional<Asset> asset(String file) {
            return assets.stream().filter(asset -> asset.file().equals(file)).findFirst();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Registry(String defaultModelId, List<Model> models) {
    }

    private final Map<String, Model> models = new LinkedHashMap<>();

    public AiModelRegistry(ObjectMapper objectMapper) throws IOException {
        Registry registry;
        try (InputStream input = new ClassPathResource(REGISTRY_RESOURCE).getInputStream()) {
            registry = objectMapper.readValue(input, Registry.class);
        }
        for (Model model : registry.models()) {
            validate(model);
            if (models.putIfAbsent(model.id(), model) != null) {
                throw new IllegalStateException("Duplicate AI model id in registry: " + model.id());
            }
        }
    }

    private static void validate(Model model) {
        String id = model.id();
        if (id == null || !MODEL_ID.matcher(id).matches()) {
            throw new IllegalStateException("Invalid AI model id in registry: " + id);
        }
        if (model.repository() == null || !REPOSITORY.matcher(model.repository()).matches()) {
            throw new IllegalStateException("AI model " + id + ": invalid repository");
        }
        if (model.revision() == null || !REVISION.matcher(model.revision()).matches()) {
            throw new IllegalStateException("AI model " + id + ": revision must be a full commit hash");
        }
        if (model.dtype() == null || model.promptProfile() == null || model.thresholdProfile() == null) {
            throw new IllegalStateException("AI model " + id + ": dtype, promptProfile and thresholdProfile are required");
        }
        if (model.assets() == null || model.assets().isEmpty()) {
            throw new IllegalStateException("AI model " + id + ": no assets");
        }
        Set<String> files = new HashSet<>();
        for (Asset asset : model.assets()) {
            if (asset.file() == null || !ASSET_FILE.matcher(asset.file()).matches() || asset.file().contains("..")) {
                throw new IllegalStateException("AI model " + id + ": invalid asset path " + asset.file());
            }
            if (asset.sha256() == null || !SHA256.matcher(asset.sha256()).matches()) {
                throw new IllegalStateException("AI model " + id + ": invalid SHA-256 for " + asset.file());
            }
            if (!files.add(asset.file())) {
                throw new IllegalStateException("AI model " + id + ": duplicate asset " + asset.file());
            }
        }
    }

    /** Models this build can run (registry availability "enabled"). */
    public List<Model> enabledModels() {
        return models.values().stream().filter(Model::enabled).toList();
    }

    /** The enabled model with this id. */
    public Optional<Model> find(String id) {
        return Optional.ofNullable(id).map(models::get).filter(Model::enabled);
    }

    public boolean isSupported(String id) {
        return find(id).isPresent();
    }

    // Validation statuses, as computed by the frontend (AI_MODEL_VALIDATION_STATUS).
    public static final String APPROVED = "approved";
    public static final String EVALUATED = "evaluated";
    public static final String CONFIGURATION_CHANGED = "configurationChanged";
    public static final String NOT_EVALUATED = "notEvaluated";

    // "<prompt profile>+<prompt fingerprint>;<column-name rules version>" and
    // "<threshold profile>+<thresholds fingerprint>", as built by the frontend.
    private static final Pattern PROMPT_VERSION =
            Pattern.compile("([a-z0-9][a-z0-9.-]{0,24})\\+([0-9a-f]{8});([a-z0-9][a-z0-9.-]{0,24})");
    private static final Pattern THRESHOLDS_VERSION =
            Pattern.compile("([a-z0-9][a-z0-9.-]{0,24})\\+([0-9a-f]{8})");

    /** Screening provenance as stored with a dataset. */
    public record ScreeningProvenance(
            String modelId,
            String repository,
            String revision,
            String dtype,
            String promptVersion,
            String thresholdsVersion,
            String validationStatus
    ) {
    }

    /**
     * Checks screening provenance reported by the browser against the registry and returns the
     * values to store. Model id, repository, revision, quantisation and the prompt and threshold
     * profile names must match the registry entry; the validation status is derived here from the
     * registry's validation records and never taken from the client.
     *
     * <p>This proves that the reported configuration is one this deployment supports, with the
     * validation status it actually has. It cannot prove which model ran in the browser. The
     * prompt and thresholds fingerprints are computed by the frontend build, which is deployed
     * together with this registry.</p>
     *
     * @throws IllegalArgumentException for unknown models or inconsistent metadata
     */
    public ScreeningProvenance verifyScreeningProvenance(
            String modelId,
            String repository,
            String revision,
            String dtype,
            String promptVersion,
            String thresholdsVersion,
            String validationStatus
    ) {
        Model model = find(modelId == null ? null : modelId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Unsupported AI model: " + modelId));
        requireMatch(repository, model.repository(), "repository");
        requireMatch(revision, model.revision(), "revision");
        requireMatch(dtype, model.dtype(), "quantisation");

        Matcher prompt = PROMPT_VERSION.matcher(promptVersion == null ? "" : promptVersion);
        if (!prompt.matches() || !prompt.group(1).equals(model.promptProfile())) {
            throw new IllegalArgumentException("AI screening prompt version does not match model " + model.id() + ".");
        }
        Matcher thresholds = THRESHOLDS_VERSION.matcher(thresholdsVersion == null ? "" : thresholdsVersion);
        if (!thresholds.matches() || !thresholds.group(1).equals(model.thresholdProfile())) {
            throw new IllegalArgumentException("AI screening thresholds version does not match model " + model.id() + ".");
        }

        String status = validationStatus(model, prompt.group(2), thresholds.group(2));
        if (validationStatus != null && !validationStatus.equals(status)) {
            throw new IllegalArgumentException("AI screening validation status does not match the registry.");
        }
        return new ScreeningProvenance(model.id(), model.repository(), model.revision(), model.dtype(),
                promptVersion, thresholdsVersion, status);
    }

    private static String validationStatus(Model model, String promptFingerprint, String thresholdsFingerprint) {
        List<Validation> validations = model.validations() == null ? List.of() : model.validations();
        return validations.stream()
                .filter(validation -> model.promptProfile().equals(validation.promptVersion())
                        && model.revision().equals(validation.revision())
                        && model.dtype().equals(validation.dtype())
                        && promptFingerprint.equals(validation.promptFingerprint())
                        && thresholdsFingerprint.equals(validation.thresholdsFingerprint()))
                .findFirst()
                .map(validation -> Boolean.TRUE.equals(validation.approvedForAutoExclusion()) ? APPROVED : EVALUATED)
                .orElse(validations.isEmpty() ? NOT_EVALUATED : CONFIGURATION_CHANGED);
    }

    private static void requireMatch(String reported, String expected, String field) {
        if (reported != null && !reported.trim().equals(expected)) {
            throw new IllegalArgumentException("AI screening " + field + " does not match the registry.");
        }
    }
}
