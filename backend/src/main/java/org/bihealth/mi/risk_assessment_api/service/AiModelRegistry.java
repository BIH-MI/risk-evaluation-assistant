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
import java.util.regex.Pattern;

/**
 * The browser-local AI model registry (frontend/src/qidDiscovery/aiSuggestions/modelRegistry.json,
 * copied to the classpath at build time). The backend only uses what it needs to install and serve
 * model files: ids, pinned repositories and revisions, and the SHA-256 hash of every file.
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Model(
            String id,
            String displayName,
            String repository,
            String revision,
            String availability,
            boolean installByDefault,
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
}
