package org.bihealth.mi.risk_assessment_api.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bihealth.mi.risk_assessment_api.model.configuration.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Loads the bundled risk framework definitions before any sample data is created.
 *
 * <p>The JSON files in {@code src/main/resources/data} describe complete
 * {@link Configuration}: risk categories, risk bands,
 * questionnaire questions/options, matrices, and re-identification thresholds.
 * This loader turns those JSON documents into persistent JPA entities and
 * verifies that all cross-references used later by the computation service are
 * valid.</p>
 */
@Component
@Order(1)
public class ConfigLoader implements CommandLineRunner {

    private final RiskConfigurationRepository configRepo;
    private final ObjectMapper objectMapper;

    // Matches every bundled framework JSON file on the application classpath.
    private static final String CONFIG_DIR_PATTERN = "classpath*:data/*.json";

    /**
     * Uses a private ObjectMapper copy so lenient seed-file parsing is limited
     * to this loader and does not weaken JSON handling in the rest of the app.
     */
    public ConfigLoader(RiskConfigurationRepository configRepo, ObjectMapper objectMapper) {
        this.configRepo = configRepo;
        this.objectMapper = objectMapper.copy();
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.out.println("Starting Universal Framework Config Loader...");

        // Discover all bundled framework files. ConfigLoader is @Order(1), so
        // these configurations exist before DataLoader creates demo assessments.
        ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources(CONFIG_DIR_PATTERN);

        if (resources.length == 0) {
            System.out.println("No configuration files found in classpath:data/");
            return;
        }

        // Keep startup deterministic across operating systems and classpath
        // implementations; resource discovery order is otherwise unspecified.
        Arrays.sort(resources, Comparator.comparing(Resource::getFilename, Comparator.nullsLast(String::compareTo)));

        // The seed loader is idempotent by configuration name. Existing records
        // are left untouched so local edits made through the application are not
        // overwritten on each restart.
        Set<String> existingConfigNames = configRepo.findAll().stream()
                .map(Configuration::getName)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        for (Resource resource : resources) {
            loadConfig(resource, existingConfigNames);
        }

        System.out.println("Configuration loading complete.");
    }

    private void loadConfig(Resource resource, Set<String> existingConfigNames) {
        try (InputStream is = resource.getInputStream()) {

            // Deserialize the JSON into the domain model. Jackson creates the
            // object graph, but it does not know about every JPA back-reference
            // that must be set before saving.
            Configuration config = objectMapper.readValue(is, Configuration.class);

            // Seed configurations must satisfy audit constraints and should be
            // immediately selectable by users.
            config.setCreatorUsername("admin");
            config.setActive(true);

            // Make the bundled frameworks visible to the demo users created by
            // the rest of the setup process.
            config.setSharedUsernames(new HashSet<>(Arrays.asList(
                    "user",
                    "anna.mueller",
                    "max.mustermann",
                    "sophie.becker",
                    "lukas.schmidt"
            )));

            // Validate references before the aggregate is written. A malformed
            // framework would otherwise fail much later during risk computation.
            linkAndValidateConfig(config, resource.getFilename());

            if (existingConfigNames.contains(config.getName())) {
                System.out.println("   -> Skipping '" + config.getName() + "' (Already exists)");
                return;
            }

            // Persist the whole configuration aggregate. Cascade mappings on the
            // entity model save categories, bands, matrices, questions/options,
            // and thresholds with the parent configuration.
            configRepo.save(config);
            existingConfigNames.add(config.getName());
            System.out.println("   ✅ Successfully saved: '" + config.getName() + "'");

        } catch (Exception e) {
            System.err.println("   ❌ Failed to load file '" + resource.getFilename() + "': " + e.getMessage());
            e.printStackTrace();
            // Startup should fail loudly if a bundled framework cannot be loaded:
            // continuing would produce incomplete or misleading risk results.
            throw new IllegalStateException("Failed to load bundled configuration '" + resource.getFilename() + "'.", e);
        }
    }

    /**
     * Rebuilds the bidirectional entity links that are implicit in the JSON file
     * and validates category references used by questions, matrices, and
     * thresholds.
     */
    private void linkAndValidateConfig(Configuration config, String filename) {
        if (config.getRiskCategories() == null || config.getRiskCategories().isEmpty()) {
            throw new IllegalStateException("Configuration '" + config.getName() + "' in " + filename + " has no risk categories.");
        }

        // Build a normalized category lookup because JSON references sometimes
        // differ only by case or surrounding whitespace. The normalized key is
        // used only for matching; persisted codes remain exactly as configured.
        Map<String, RiskCategory> categoryMap = config.getRiskCategories().stream()
                .peek(cat -> {
                    cat.setConfiguration(config);
                    if (cat.getRiskBands() != null) {
                        for (RiskBand band : cat.getRiskBands()) {
                            band.setCategory(cat);
                        }
                    }
                })
                .collect(Collectors.toMap(
                        cat -> normalize(cat.getCode()),
                        cat -> cat,
                        (first, duplicate) -> {
                            throw new IllegalStateException("Duplicate risk category code '" + first.getCode()
                                    + "' in " + filename);
                        }
                ));

        if (config.getQuestions() != null) {
            for (Question q : config.getQuestions()) {
                // Questions store categoryCode in JSON for readability. At load
                // time that code is resolved to the actual RiskCategory entity.
                q.setConfiguration(config);

                RiskCategory mappedCategory = categoryMap.get(normalize(q.getCategoryCode()));
                if (mappedCategory == null) {
                    throw new IllegalStateException("Question '" + q.getText() + "' in " + filename
                            + " references unknown categoryCode '" + q.getCategoryCode() + "'.");
                }
                q.setCategory(mappedCategory);

                if (q.getOptions() != null) {
                    for (QuestionOption opt : q.getOptions()) {
                        // Required for JPA cascade persistence and for later
                        // answer creation that expects each option to know its
                        // owning question.
                        opt.setQuestion(q);
                    }
                }
            }
        }

        validateMatrices(config, categoryMap, filename);
        validateThresholds(config, categoryMap, filename);
    }

    /**
     * Ensures each configured matrix condition points to an existing category
     * and to a valid band label within that category.
     *
     * <p>The computation service uses these matrices to convert normalized
     * CONTROLS/LIKELIHOOD/IMPACT classifications into the final context-risk
     * value, so misspelled labels must be rejected at startup.</p>
     */
    private void validateMatrices(Configuration config, Map<String, RiskCategory> categoryMap, String filename) {
        if (config.getRiskMatrices() == null) {
            return;
        }

        for (RiskMatrix matrix : config.getRiskMatrices()) {
            matrix.setConfiguration(config);
            if (matrix.getConditions() == null || matrix.getConditions().isEmpty()) {
                throw new IllegalStateException("Risk matrix in " + filename + " has no conditions.");
            }

            for (Map.Entry<String, String> condition : matrix.getConditions().entrySet()) {
                RiskCategory category = categoryMap.get(normalize(condition.getKey()));
                if (category == null) {
                    throw new IllegalStateException("Risk matrix in " + filename
                            + " references unknown category '" + condition.getKey() + "'.");
                }

                boolean bandExists = category.getRiskBands() != null && category.getRiskBands().stream()
                        .anyMatch(band -> normalize(band.getLabel()).equals(normalize(condition.getValue())));
                if (!bandExists) {
                    throw new IllegalStateException("Risk matrix in " + filename + " references unknown band '"
                            + condition.getValue() + "' for category '" + category.getCode() + "'.");
                }
            }
        }
    }

    /**
     * Ensures every re-identification threshold can be selected by the dataset
     * IMPACT classification.
     *
     * <p>During risk calculation, the dataset answers determine an IMPACT band;
     * the matching threshold supplies {@code T} in {@code R = min(1, T / P_attack)}.
     * If a threshold label does not match an IMPACT band, the calculation cannot
     * select the intended threshold.</p>
     */
    private void validateThresholds(Configuration config, Map<String, RiskCategory> categoryMap, String filename) {
        if (config.getReidThresholds() == null) {
            return;
        }

        RiskCategory impactCategory = categoryMap.get("IMPACT");
        if (impactCategory == null || impactCategory.getRiskBands() == null) {
            throw new IllegalStateException("Configuration '" + config.getName()
                    + "' in " + filename + " must define an IMPACT category with bands.");
        }

        Set<String> impactBands = impactCategory.getRiskBands().stream()
                .map(RiskBand::getLabel)
                .map(this::normalize)
                .collect(Collectors.toSet());

        for (ReidentificationThreshold threshold : config.getReidThresholds()) {
            threshold.setConfiguration(config);
            if (!impactBands.contains(normalize(threshold.getRiskClassification()))) {
                throw new IllegalStateException("Threshold '" + threshold.getRiskClassification()
                        + "' in " + filename + " does not match an IMPACT band.");
            }
        }
    }

    /**
     * Canonical form used only for configuration reference matching.
     */
    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
