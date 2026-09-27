package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.QuestionOptionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.QuestionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.ReidThresholdRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.RiskBandRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.RiskCategoryRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.RiskConfigurationUpdateRequest;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.RiskMatrixRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.configuration.ConfigurationResponseDTO;
import org.bihealth.mi.risk_assessment_api.exception.EntityNameAlreadyExistsException;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.configuration.ReidentificationThreshold;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskBand;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskMatrix;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.ConfigurationVersionRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service that owns the lifecycle of risk framework configurations.
 *
 * <p>The root configuration is mutable metadata. The actual framework content
 * is stored in immutable {@link ConfigurationVersion} rows so later edits do
 * not change questions, options, matrices, bands, or thresholds used by saved
 * assessments.</p>
 */
@Service
@Transactional
public class ConfigurationService {

    private final RiskConfigurationRepository configRepository;
    private final ConfigurationVersionRepository versionRepository;
    private final DatasetAssessmentRepository datasetAssessmentRepository;
    private final RecipientAssessmentRepository recipientAssessmentRepository;

    public ConfigurationService(
            RiskConfigurationRepository configRepository,
            ConfigurationVersionRepository versionRepository,
            DatasetAssessmentRepository datasetAssessmentRepository,
            RecipientAssessmentRepository recipientAssessmentRepository
    ) {
        this.configRepository = configRepository;
        this.versionRepository = versionRepository;
        this.datasetAssessmentRepository = datasetAssessmentRepository;
        this.recipientAssessmentRepository = recipientAssessmentRepository;
    }

    /**
     * Verifies if the user is an admin, the creator, or in the shared usernames list.
     * Read/fork access remains open to authenticated users.
     */
    public void verifyConfigurationWriteAccess(Configuration config, String username, boolean isAdmin) {
        if (isAdmin) return;

        if (!username.equals(config.getCreatorUsername()) &&
                (config.getSharedUsernames() == null || !config.getSharedUsernames().contains(username))) {
            throw new SecurityException("No write access to modify this configuration: " + config.getId());
        }
    }

    public void validateUniqueName(String newName, Long excludeId) {
        if (newName == null || newName.trim().isEmpty()) return;

        String normalizedName = EntityNameNormalizer.normalizeForComparison(newName);
        boolean nameExists = excludeId == null
                ? configRepository.existsByNormalizedName(normalizedName)
                : configRepository.existsByNormalizedNameAndIdNot(normalizedName, excludeId);

        if (nameExists) {
            throw new EntityNameAlreadyExistsException("configuration", EntityNameNormalizer.normalizeForStorage(newName));
        }
    }

    @Transactional(readOnly = true)
    public List<ConfigurationResponseDTO> getAllConfigurations(String username, boolean isAdmin) {
        return configRepository.findAll().stream()
                .sorted(Comparator.comparing(Configuration::isDefault, Comparator.reverseOrder())
                        .thenComparing(config -> config.getLastModifiedDate() == null
                                ? config.getCreationDate()
                                : config.getLastModifiedDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConfigurationResponseDTO getConfigurationById(Long id, String username, boolean isAdmin) {
        Configuration config = configRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Configuration ID " + id + " not found."));
        return toResponse(config);
    }

    @Transactional(readOnly = true)
    public ConfigurationVersion getCurrentVersion(Long configurationId) {
        Configuration config = configRepository.findById(configurationId)
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + configurationId));
        return getCurrentVersion(config);
    }

    public ConfigurationResponseDTO createConfiguration(Configuration config, String username) {
        validateUniqueName(config.getName(), null);
        config.setCreatorUsername(username);
        config.setName(requiredName(config.getName()));
        config.setDescription(trimToNull(config.getDescription()));
        config.setDefaultLanguage(defaultLanguage(config.getDefaultLanguage()));

        ConfigurationVersion version = buildVersionFromEntity(
                config,
                username,
                1
        );
        applyRootMetadataFromVersion(config, version);
        config.addVersion(version);

        if (config.isDefault()) {
            clearOtherDefaults(null);
        }

        Configuration saved = saveConfigurationHandlingDuplicateName(config, config.getName());
        return toResponse(saved);
    }

    public ConfigurationResponseDTO forkConfiguration(Long sourceId, String newName, String username, boolean isAdmin) {
        Configuration source = configRepository.findById(sourceId)
                .orElseThrow(() -> new EntityNotFoundException("Source configuration not found: " + sourceId));
        ConfigurationVersion sourceVersion = getCurrentVersion(source);

        validateUniqueName(newName, null);

        Configuration fork = new Configuration();
        fork.setCreatorUsername(username);
        fork.setName(requiredName(newName));
        fork.setDescription(sourceVersion.getDescription());
        fork.setDefaultLanguage(sourceVersion.getDefaultLanguage());
        fork.setActive(true);
        fork.setDefault(false);

        ConfigurationVersion version = buildVersionFromSources(
                fork.getName(),
                fork.getDescription(),
                fork.getDefaultLanguage(),
                sourceVersion.getRiskCategories(),
                sourceVersion.getQuestions(),
                sourceVersion.getRiskMatrices(),
                sourceVersion.getReidThresholds(),
                username,
                1
        );
        fork.addVersion(version);

        Configuration saved = saveConfigurationHandlingDuplicateName(fork, fork.getName());
        return toResponse(saved);
    }

    public ConfigurationResponseDTO updateConfiguration(
            Long configId,
            RiskConfigurationUpdateRequest request,
            String username,
            boolean isAdmin
    ) {
        Configuration config = configRepository.findById(configId)
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + configId));

        verifyConfigurationWriteAccess(config, username, isAdmin);
        validateUniqueName(request.getName(), configId);

        if (request.getSharedUsernames() != null) {
            if (config.getSharedUsernames() == null) {
                config.setSharedUsernames(new HashSet<>());
            }
            config.getSharedUsernames().clear();
            config.getSharedUsernames().addAll(request.getSharedUsernames());
        }

        if (request.isDefault() && !request.isActive()) {
            throw new IllegalArgumentException("Archived configurations cannot be set as default.");
        }

        config.setActive(request.isActive());
        config.setDefault(request.isDefault());

        ConfigurationVersion nextVersion = buildVersionFromRequest(
                request,
                username,
                config.getCurrentVersion() + 1
        );
        applyRootMetadataFromVersion(config, nextVersion);
        config.addVersion(nextVersion);

        if (config.isDefault()) {
            clearOtherDefaults(config.getId());
        }

        Configuration saved = saveConfigurationHandlingDuplicateName(config, config.getName());
        return toResponse(saved);
    }

    public ConfigurationResponseDTO archiveConfiguration(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        Configuration config = configRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Configuration ID " + id + " not found."));

        config.setActive(false);
        config.setDefault(false);

        Configuration saved = configRepository.save(config);
        return toResponse(saved);
    }

    public ConfigurationResponseDTO setDefaultConfiguration(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        Configuration config = configRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Configuration ID " + id + " not found."));

        if (!config.isActive()) {
            throw new IllegalArgumentException("Archived configurations cannot be set as default.");
        }

        clearOtherDefaults(config.getId());
        config.setDefault(true);

        Configuration saved = configRepository.save(config);
        return toResponse(saved);
    }

    public void deleteConfiguration(Long id, String username, boolean isAdmin) {
        Configuration config = configRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Configuration ID " + id + " not found."));

        verifyConfigurationWriteAccess(config, username, isAdmin);

        long usageCount = getAssessmentCount(id);
        if (usageCount > 0) {
            throw new IllegalStateException("Cannot delete a configuration that has already been used by assessments.");
        }

        configRepository.deleteById(id);
    }

    public ConfigurationResponseDTO toResponse(Configuration config) {
        return new ConfigurationResponseDTO(config, getCurrentVersion(config), getAssessmentCount(config.getId()));
    }

    public ConfigurationResponseDTO toSnapshotResponse(ConfigurationVersion version) {
        return new ConfigurationResponseDTO(
                version.getConfiguration(),
                version,
                getAssessmentCount(version.getConfiguration().getId())
        );
    }

    private ConfigurationVersion getCurrentVersion(Configuration config) {
        return config.getCurrentVersionEntity()
                .or(() -> versionRepository.findTopByConfigurationIdOrderByVersionNumberDesc(config.getId()))
                .orElseThrow(() -> new IllegalStateException("Configuration has no versions: " + config.getId()));
    }

    private long getAssessmentCount(Long configurationId) {
        return datasetAssessmentRepository.countByConfigurationId(configurationId)
                + recipientAssessmentRepository.countByConfigurationId(configurationId);
    }

    private ConfigurationVersion buildVersionFromEntity(Configuration config, String username, int versionNumber) {
        return buildVersionFromSources(
                config.getName(),
                config.getDescription(),
                config.getDefaultLanguage(),
                config.getRiskCategories(),
                config.getQuestions(),
                config.getRiskMatrices(),
                config.getReidThresholds(),
                username,
                versionNumber
        );
    }

    private ConfigurationVersion buildVersionFromRequest(
            RiskConfigurationUpdateRequest request,
            String username,
            int versionNumber
    ) {
        return buildVersionFromSources(
                request.getName(),
                request.getDescription(),
                request.getDefaultLanguage(),
                categoriesFromDtos(request.getCategories()),
                questionsFromDtos(request.getQuestions()),
                matricesFromDtos(request.getRiskMatrix()),
                thresholdsFromDtos(request.getThresholds()),
                username,
                versionNumber
        );
    }

    private List<RiskCategory> categoriesFromDtos(List<RiskCategoryRequestDTO> dtos) {
        if (dtos == null) return List.of();
        List<RiskCategory> categories = new ArrayList<>();
        for (RiskCategoryRequestDTO dto : dtos) {
            RiskCategory category = new RiskCategory();
            category.setCode(dto.getCode());
            category.setName(dto.getName());
            category.setAssessmentPhase(dto.getAssessmentPhase());
            category.setRiskEffect(dto.getRiskEffect());
            if (dto.getRiskBands() != null) {
                for (RiskBandRequestDTO bandDto : dto.getRiskBands()) {
                    RiskBand band = new RiskBand();
                    band.setLabel(bandDto.getLabel());
                    band.setDescription(bandDto.getDescription());
                    band.setRangeMinimum(bandDto.getRangeMinimum());
                    band.setRangeMaximum(bandDto.getRangeMaximum());
                    band.setColor(bandDto.getColor());
                    category.addRiskBand(band);
                }
            }
            categories.add(category);
        }
        return categories;
    }

    private List<Question> questionsFromDtos(List<QuestionRequestDTO> dtos) {
        if (dtos == null) return List.of();
        List<Question> questions = new ArrayList<>();
        for (QuestionRequestDTO dto : dtos) {
            Question question = new Question();
            question.setCategoryCode(dto.getCategoryCode());
            question.setCode(stableCodeOrGenerated(dto.getCode(), dto.getText(), "QUESTION"));
            question.setText(dto.getText());
            question.setTextTranslations(dto.getTextTranslations() == null
                    ? new HashMap<>()
                    : new HashMap<>(dto.getTextTranslations()));
            question.setRequired(dto.isRequired());
            question.setDependsOnOptionCode(dto.getDependsOnOptionCode());
            question.setWeight(dto.getWeight());
            if (dto.getOptions() != null) {
                for (QuestionOptionRequestDTO optionDto : dto.getOptions()) {
                    QuestionOption option = new QuestionOption();
                    option.setCode(stableCodeOrGenerated(optionDto.getCode(), optionDto.getText(), "OPTION"));
                    option.setText(optionDto.getText());
                    option.setTextTranslations(optionDto.getTextTranslations() == null
                            ? new HashMap<>()
                            : new HashMap<>(optionDto.getTextTranslations()));
                    option.setScore(optionDto.getRiskLevel());
                    option.setHighRiskTrigger(optionDto.isHighRiskTrigger());
                    option.setImpact(optionDto.getImpact());
                    question.addOption(option);
                }
            }
            questions.add(question);
        }
        return questions;
    }

    private List<RiskMatrix> matricesFromDtos(List<RiskMatrixRequestDTO> dtos) {
        if (dtos == null) return List.of();
        List<RiskMatrix> matrices = new ArrayList<>();
        for (RiskMatrixRequestDTO dto : dtos) {
            RiskMatrix matrix = new RiskMatrix();
            matrix.setConditions(dto.getConditions() == null
                    ? Map.of()
                    : new HashMap<>(dto.getConditions()));
            matrix.setContextRisk(dto.getContextRisk());
            matrices.add(matrix);
        }
        return matrices;
    }

    private List<ReidentificationThreshold> thresholdsFromDtos(List<ReidThresholdRequestDTO> dtos) {
        if (dtos == null) return List.of();
        List<ReidentificationThreshold> thresholds = new ArrayList<>();
        for (ReidThresholdRequestDTO dto : dtos) {
            ReidentificationThreshold threshold = new ReidentificationThreshold();
            threshold.setRiskClassification(dto.getRiskClassification());
            threshold.setThresholdValue(dto.getThresholdValue() == null ? 0.0 : dto.getThresholdValue());
            thresholds.add(threshold);
        }
        return thresholds;
    }

    private ConfigurationVersion buildVersionFromSources(
            String name,
            String description,
            String defaultLanguage,
            List<?> rawCategories,
            List<?> rawQuestions,
            List<?> rawMatrices,
            List<?> rawThresholds,
            String username,
            int versionNumber
    ) {
        ConfigurationVersion version = new ConfigurationVersion();
        version.setCreatorUsername(username);
        version.setName(requiredName(name));
        version.setDescription(trimToNull(description));
        version.setDefaultLanguage(defaultLanguage(defaultLanguage));
        version.setVersionNumber(versionNumber);

        List<RiskCategory> sourceCategories = normalizeCategories(rawCategories);
        if (sourceCategories.isEmpty()) {
            sourceCategories = defaultCategories();
        }

        Map<String, RiskCategory> categoryMap = new LinkedHashMap<>();
        for (RiskCategory source : sourceCategories) {
            RiskCategory category = copyCategory(source);
            version.addRiskCategory(category);
            String key = normalizeReference(category.getCode());
            if (categoryMap.containsKey(key)) {
                throw new IllegalArgumentException("Duplicate risk category code: " + category.getCode());
            }
            categoryMap.put(key, category);
        }

        for (Question source : normalizeQuestions(rawQuestions)) {
            Question question = copyQuestion(source);
            RiskCategory category = categoryMap.get(normalizeReference(source.getCategoryCode()));
            if (category == null) {
                throw new IllegalArgumentException("Question '" + source.getText()
                        + "' references unknown category code: " + source.getCategoryCode());
            }
            question.setCategory(category);
            version.addQuestion(question);
        }

        for (RiskMatrix source : normalizeMatrices(rawMatrices)) {
            RiskMatrix matrix = copyMatrix(source);
            version.addRiskMatrix(matrix);
        }

        for (ReidentificationThreshold source : normalizeThresholds(rawThresholds)) {
            ReidentificationThreshold threshold = copyThreshold(source);
            version.addReidThreshold(threshold);
        }

        validateVersion(version, categoryMap);
        return version;
    }

    private void applyRootMetadataFromVersion(Configuration config, ConfigurationVersion version) {
        config.setName(version.getName());
        config.setDescription(version.getDescription());
        config.setDefaultLanguage(version.getDefaultLanguage());
    }

    @SuppressWarnings("unchecked")
    private List<RiskCategory> normalizeCategories(List<?> rawCategories) {
        if (rawCategories == null) return List.of();
        return rawCategories.stream()
                .filter(RiskCategory.class::isInstance)
                .map(RiskCategory.class::cast)
                .collect(Collectors.toList());
    }

    private List<Question> normalizeQuestions(List<?> rawQuestions) {
        if (rawQuestions == null) return List.of();
        return rawQuestions.stream()
                .filter(Question.class::isInstance)
                .map(Question.class::cast)
                .collect(Collectors.toList());
    }

    private List<RiskMatrix> normalizeMatrices(List<?> rawMatrices) {
        if (rawMatrices == null) return List.of();
        return rawMatrices.stream()
                .filter(RiskMatrix.class::isInstance)
                .map(RiskMatrix.class::cast)
                .collect(Collectors.toList());
    }

    private List<ReidentificationThreshold> normalizeThresholds(List<?> rawThresholds) {
        if (rawThresholds == null) return List.of();
        return rawThresholds.stream()
                .filter(ReidentificationThreshold.class::isInstance)
                .map(ReidentificationThreshold.class::cast)
                .collect(Collectors.toList());
    }

    private RiskCategory copyCategory(RiskCategory source) {
        RiskCategory category = new RiskCategory();
        category.setCode(requiredText(source.getCode(), "Risk category code is required."));
        category.setName(requiredText(source.getName(), "Risk category name is required."));
        category.setAssessmentPhase(requiredText(source.getAssessmentPhase(), "Risk category assessment phase is required."));
        category.setRiskEffect(requiredText(source.getRiskEffect(), "Risk category risk effect is required."));

        if (source.getRiskBands() != null) {
            for (RiskBand sourceBand : source.getRiskBands()) {
                RiskBand band = new RiskBand();
                band.setLabel(requiredText(sourceBand.getLabel(), "Risk band label is required."));
                band.setDescription(trimToNull(sourceBand.getDescription()));
                band.setValue(sourceBand.getValue());
                band.setRangeMinimum(sourceBand.getRangeMinimum());
                band.setRangeMaximum(sourceBand.getRangeMaximum());
                band.setColor(trimToNull(sourceBand.getColor()));
                category.addRiskBand(band);
            }
        }
        return category;
    }

    private Question copyQuestion(Question source) {
        Question question = new Question();
        question.setCategoryCode(requiredText(source.getCategoryCode(), "Question category code is required."));
        question.setCode(stableCodeOrGenerated(source.getCode(), source.getText(), "QUESTION"));
        question.setText(requiredText(source.getText(), "Question text is required."));
        question.setTextTranslations(source.getTextTranslations() == null
                ? new HashMap<>()
                : new HashMap<>(source.getTextTranslations()));
        question.setRequired(source.isRequired());
        question.setDependsOnOptionCode(trimToNull(source.getDependsOnOptionCode()));
        question.setWeight(source.getWeight());

        if (source.getOptions() != null) {
            for (QuestionOption sourceOption : source.getOptions()) {
                QuestionOption option = new QuestionOption();
                option.setCode(stableCodeOrGenerated(sourceOption.getCode(), sourceOption.getText(), "OPTION"));
                option.setText(requiredText(sourceOption.getText(), "Question option text is required."));
                option.setTextTranslations(sourceOption.getTextTranslations() == null
                        ? new HashMap<>()
                        : new HashMap<>(sourceOption.getTextTranslations()));
                option.setScore(sourceOption.getScore());
                option.setHighRiskTrigger(sourceOption.isHighRiskTrigger());
                option.setImpact(trimToNull(sourceOption.getImpact()));
                question.addOption(option);
            }
        }
        return question;
    }

    private RiskMatrix copyMatrix(RiskMatrix source) {
        RiskMatrix matrix = new RiskMatrix();
        matrix.setConditions(source.getConditions() == null
                ? Map.of()
                : new HashMap<>(source.getConditions()));
        matrix.setContextRisk(source.getContextRisk());
        return matrix;
    }

    private ReidentificationThreshold copyThreshold(ReidentificationThreshold source) {
        ReidentificationThreshold threshold = new ReidentificationThreshold();
        threshold.setRiskClassification(requiredText(
                source.getRiskClassification(),
                "Re-identification threshold risk classification is required."
        ));
        threshold.setThresholdValue(source.getThresholdValue());
        return threshold;
    }

    private List<RiskCategory> defaultCategories() {
        RiskCategory impact = new RiskCategory();
        impact.setCode("IMPACT");
        impact.setName("Impact");
        impact.setAssessmentPhase("DATASET_ASSESSMENT");
        impact.setRiskEffect("INCREASES_RISK");

        RiskCategory controls = new RiskCategory();
        controls.setCode("CONTROLS");
        controls.setName("Controls");
        controls.setAssessmentPhase("RECIPIENT_ASSESSMENT");
        controls.setRiskEffect("DECREASES_RISK");

        RiskCategory likelihood = new RiskCategory();
        likelihood.setCode("LIKELIHOOD");
        likelihood.setName("Likelihood");
        likelihood.setAssessmentPhase("RECIPIENT_ASSESSMENT");
        likelihood.setRiskEffect("INCREASES_RISK");

        return List.of(impact, controls, likelihood);
    }

    private void validateVersion(ConfigurationVersion version, Map<String, RiskCategory> categoryMap) {
        validateMatrices(version, categoryMap);
        validateThresholds(version, categoryMap);
    }

    private void validateMatrices(ConfigurationVersion version, Map<String, RiskCategory> categoryMap) {
        for (RiskMatrix matrix : version.getRiskMatrices()) {
            if (matrix.getConditions() == null || matrix.getConditions().isEmpty()) {
                throw new IllegalArgumentException("Risk matrix rows require at least one condition.");
            }

            for (Map.Entry<String, String> condition : matrix.getConditions().entrySet()) {
                RiskCategory category = categoryMap.get(normalizeReference(condition.getKey()));
                if (category == null) {
                    throw new IllegalArgumentException("Risk matrix references unknown category: " + condition.getKey());
                }

                boolean bandExists = category.getRiskBands() != null && category.getRiskBands().stream()
                        .anyMatch(band -> normalizeReference(band.getLabel()).equals(normalizeReference(condition.getValue())));
                if (!bandExists) {
                    throw new IllegalArgumentException("Risk matrix references unknown band '"
                            + condition.getValue() + "' for category '" + category.getCode() + "'.");
                }
            }
        }
    }

    private void validateThresholds(ConfigurationVersion version, Map<String, RiskCategory> categoryMap) {
        if (version.getReidThresholds().isEmpty()) return;

        RiskCategory impactCategory = categoryMap.get("IMPACT");
        if (impactCategory == null || impactCategory.getRiskBands() == null) {
            throw new IllegalArgumentException("Configuration must define an IMPACT category with bands.");
        }

        Set<String> impactBands = impactCategory.getRiskBands().stream()
                .map(RiskBand::getLabel)
                .map(this::normalizeReference)
                .collect(Collectors.toSet());

        for (ReidentificationThreshold threshold : version.getReidThresholds()) {
            if (!impactBands.contains(normalizeReference(threshold.getRiskClassification()))) {
                throw new IllegalArgumentException("Threshold '" + threshold.getRiskClassification()
                        + "' does not match an IMPACT band.");
            }
        }
    }

    private void clearOtherDefaults(Long keepId) {
        configRepository.findAll().forEach(existing -> {
            if ((keepId == null || !existing.getId().equals(keepId)) && existing.isDefault()) {
                existing.setDefault(false);
                configRepository.save(existing);
            }
        });
    }

    private void requireAdmin(boolean isAdmin) {
        if (!isAdmin) {
            throw new SecurityException("Only administrators can modify configurations.");
        }
    }

    private String requiredName(String name) {
        return requiredText(name, "Configuration name is required.");
    }

    private String requiredText(String value, String message) {
        String normalized = EntityNameNormalizer.normalizeForStorage(value);
        if (normalized == null || normalized.isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String defaultLanguage(String value) {
        String language = trimToNull(value);
        return language == null ? "en" : language;
    }

    private String normalizeReference(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String stableCodeOrGenerated(String currentCode, String text, String fallbackPrefix) {
        String normalizedCode = trimToNull(currentCode);
        if (normalizedCode != null) {
            return normalizedCode.trim().toUpperCase(Locale.ROOT);
        }

        String source = trimToNull(text);
        if (source == null) {
            return null;
        }

        String generated = source
                .replaceAll("\\[[^]]*]", " ")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "")
                .toUpperCase(Locale.ROOT);
        if (generated.isEmpty()) {
            return fallbackPrefix;
        }
        return generated.length() <= 120 ? generated : generated.substring(0, 120).replaceAll("_+$", "");
    }

    private Configuration saveConfigurationHandlingDuplicateName(Configuration config, String name) {
        try {
            return configRepository.saveAndFlush(config);
        } catch (DataIntegrityViolationException ex) {
            if (isConfigurationNameUniqueConstraintViolation(ex)) {
                throw new EntityNameAlreadyExistsException("configuration", name);
            }
            throw ex;
        }
    }

    private boolean isConfigurationNameUniqueConstraintViolation(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = NestedExceptionUtils.getMostSpecificCause(ex);
        String message = mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage();
        return message != null && message.contains(NamedResourceConstraints.RISK_CONFIGURATIONS_NORMALIZED_NAME);
    }
}
