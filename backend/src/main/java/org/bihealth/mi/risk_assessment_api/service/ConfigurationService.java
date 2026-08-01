package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.configuration.*;
import org.bihealth.mi.risk_assessment_api.model.configuration.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.*;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service that owns the lifecycle of risk framework configurations.
 *
 * <p>Configurations are larger than normal CRUD records: they contain
 * categories, bands, questions, answer options, matrix rules, and thresholds.
 * This service therefore handles access checks, duplicate-name validation,
 * deep-copy/fork behavior, and guarded structural updates.</p>
 */
@Service
@Transactional
public class ConfigurationService {

    // Repositories for the configuration aggregate and its child structures.
    private final RiskConfigurationRepository configRepository;
    private final RiskCategoryRepository categoryRepository;
    private final QuestionRepository questionRepository;
    private final RiskMatrixRepository riskMatrixRepository;
    private final ReidentificationThresholdRepository reidThresholdRepository;

    // Used to block deletion of questions/options that are already referenced by saved answers.
    private final AnswerRepository answerRepository;

    // Used to detect whether a configuration is already in use by assessments.
    private final DatasetAssessmentRepository datasetAssessmentRepository;
    private final RecipientAssessmentRepository recipientAssessmentRepository;

    /**
     * Creates the service with repositories for the root configuration and every
     * child entity that may need independent lookup or guarded replacement.
     */
    public ConfigurationService(
            RiskConfigurationRepository configRepository,
            RiskCategoryRepository categoryRepository,
            QuestionRepository questionRepository,
            RiskMatrixRepository riskMatrixRepository,
            ReidentificationThresholdRepository reidThresholdRepository,
            AnswerRepository answerRepository,
            DatasetAssessmentRepository datasetAssessmentRepository,
            RecipientAssessmentRepository recipientAssessmentRepository
    ) {
        this.configRepository = configRepository;
        this.categoryRepository = categoryRepository;
        this.questionRepository = questionRepository;
        this.riskMatrixRepository = riskMatrixRepository;
        this.reidThresholdRepository = reidThresholdRepository;
        this.answerRepository = answerRepository;
        this.datasetAssessmentRepository = datasetAssessmentRepository;
        this.recipientAssessmentRepository = recipientAssessmentRepository;
    }

    /**
     * Verifies if the user is an admin, the creator, or in the shared usernames list.
     * Used ONLY for modifying/deleting. Read/Fork access is open to all users.
     */
    public void verifyConfigurationWriteAccess(Configuration config, String username, boolean isAdmin) {
        // Admins can modify any configuration.
        if (isAdmin) return;

        if (!username.equals(config.getCreatorUsername()) &&
                (config.getSharedUsernames() == null || !config.getSharedUsernames().contains(username))) {
            throw new SecurityException("No write access to modify this configuration: " + config.getId());
        }
    }

    /**
     * Enforces unique names via fuzzy string matching.
     *
     * <p>Formatting-only differences should not produce separate framework names,
     * so punctuation and case are ignored before comparison.</p>
     */
    public void validateUniqueName(String newName, Long excludeId) {
        if (newName == null || newName.trim().isEmpty()) return;

        String normalizedNewName = newName.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();

        boolean nameExists = configRepository.findAll().stream()
                .filter(existing -> excludeId == null || !existing.getId().equals(excludeId))
                .map(Configuration::getName)
                .filter(Objects::nonNull)
                .map(name -> name.replaceAll("[^a-zA-Z0-9]", "").toLowerCase())
                .anyMatch(normalizedNewName::equals);

        if (nameExists) {
            throw new IllegalArgumentException("A configuration with this name already exists.");
        }
    }

    public List<Configuration> getAllConfigurations(String username, boolean isAdmin) {
        // Configurations are universally readable. Edit/delete access is checked
        // only on mutating operations.
        List<Configuration> configs = configRepository.findAll();

        // Assessment counts are derived data. They are attached transiently so
        // the frontend can decide whether structural editing should be disabled.
        for (Configuration config : configs) {
            long dsCount = datasetAssessmentRepository.countByConfigurationId(config.getId());
            long rcCount = recipientAssessmentRepository.countByConfigurationId(config.getId());
            config.setAssessmentCount((int) (dsCount + rcCount));
            config.setActive((dsCount + rcCount) > 0);
        }

        return configs;
    }

    public Configuration getConfigurationById(Long id, String username, boolean isAdmin) {
        Configuration config = configRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Configuration ID " + id + " not found."));

        // Read access is open so users can inspect or fork shared/bundled frameworks.
        return config;
    }

    /**
     * Creates a new configuration aggregate.
     *
     * <p>If the client does not provide explicit categories, a minimal generic
     * IMPACT/CONTROLS/LIKELIHOOD structure is created so the framework remains
     * compatible with the calculation model.</p>
     */
    public Configuration createConfiguration(Configuration config, String username) {
        validateUniqueName(config.getName(), null);
        config.setCreatorUsername(username);

        // Link categories and bands. Jackson/frontend payloads do not guarantee
        // that JPA back-references are already set.
        if (config.getRiskCategories() == null || config.getRiskCategories().isEmpty()) {
            RiskCategory impact = new RiskCategory();
            impact.setCode("IMPACT");
            impact.setName("Impact");
            impact.setAssessmentPhase("DATASET_ASSESSMENT");
            impact.setRiskEffect("INCREASES_RISK");
            impact.setConfiguration(config);

            RiskCategory controls = new RiskCategory();
            controls.setCode("CONTROLS");
            controls.setName("Controls");
            controls.setAssessmentPhase("RECIPIENT_ASSESSMENT");
            controls.setRiskEffect("DECREASES_RISK");
            controls.setConfiguration(config);

            RiskCategory likelihood = new RiskCategory();
            likelihood.setCode("LIKELIHOOD");
            likelihood.setName("Likelihood");
            likelihood.setAssessmentPhase("RECIPIENT_ASSESSMENT");
            likelihood.setRiskEffect("INCREASES_RISK");
            likelihood.setConfiguration(config);

            config.setRiskCategories(Arrays.asList(impact, controls, likelihood));
        } else {
            for (RiskCategory cat : config.getRiskCategories()) {
                cat.setConfiguration(config);
                if (cat.getRiskBands() != null) {
                    for (RiskBand band : cat.getRiskBands()) {
                        band.setCategory(cat);
                    }
                }
            }
        }

        // Resolve question category codes to actual RiskCategory entities.
        Map<String, RiskCategory> categoryMap = config.getRiskCategories().stream()
                .collect(Collectors.toMap(RiskCategory::getCode, Function.identity()));

        // Link questions and options into the same aggregate tree before saving.
        if (config.getQuestions() != null) {
            for (Question q : config.getQuestions()) {
                q.setConfiguration(config);

                if (q.getCategoryCode() != null && categoryMap.containsKey(q.getCategoryCode())) {
                    q.setCategory(categoryMap.get(q.getCategoryCode()));
                } else if (q.getCategory() != null && q.getCategory().getCode() != null && categoryMap.containsKey(q.getCategory().getCode())) {
                    q.setCategory(categoryMap.get(q.getCategory().getCode()));
                }

                if (q.getOptions() != null) {
                    for (QuestionOption opt : q.getOptions()) {
                        opt.setQuestion(q);
                    }
                }
            }
        }

        // Link matrix rows to the parent configuration.
        if (config.getRiskMatrices() != null) {
            for (RiskMatrix rm : config.getRiskMatrices()) {
                rm.setConfiguration(config);
            }
        }

        // Link thresholds to the parent configuration.
        if (config.getReidThresholds() != null) {
            for (ReidentificationThreshold rt : config.getReidThresholds()) {
                rt.setConfiguration(config);
            }
        }

        return configRepository.save(config);
    }

    public Configuration forkConfiguration(Long sourceId, String newName, String username, boolean isAdmin) {
        Configuration source = configRepository.findById(sourceId)
                .orElseThrow(() -> new EntityNotFoundException("Source configuration not found: " + sourceId));

        // Forking is open read-based access. The original configuration is not modified.
        validateUniqueName(newName, null);

        Configuration fork = new Configuration();
        fork.setName(newName);
        fork.setCreatorUsername(username);
        fork.setDescription(source.getDescription());
        fork.setDefaultLanguage(source.getDefaultLanguage());

        fork = configRepository.save(fork);

        Map<String, RiskCategory> newCategoryMap = new HashMap<>();
        List<RiskCategory> sourceCategories = categoryRepository.findByConfigurationId(sourceId);

        // Copy categories first so copied questions can reference the new category entities.
        for (RiskCategory srcCat : sourceCategories) {
            RiskCategory newCat = new RiskCategory();
            newCat.setConfiguration(fork);
            newCat.setCode(srcCat.getCode());
            newCat.setName(srcCat.getName());
            newCat.setAssessmentPhase(srcCat.getAssessmentPhase());
            newCat.setRiskEffect(srcCat.getRiskEffect());

            if (srcCat.getRiskBands() != null) {
                for (RiskBand srcBand : srcCat.getRiskBands()) {
                    RiskBand newBand = new RiskBand();
                    newBand.setLabel(srcBand.getLabel());
                    newBand.setDescription(srcBand.getDescription());
                    newBand.setRangeMinimum(srcBand.getRangeMinimum());
                    newBand.setRangeMaximum(srcBand.getRangeMaximum());
                    newBand.setColor(srcBand.getColor());
                    newCat.addRiskBand(newBand);
                }
            }
            categoryRepository.save(newCat);
            newCategoryMap.put(newCat.getCode(), newCat);
        }

        List<Question> sourceQuestions = questionRepository.findByConfigurationId(sourceId);
        for (Question srcQ : sourceQuestions) {
            // Copy questions and options by value. The fork must not share child
            // entities with the source configuration.
            Question newQ = new Question();
            newQ.setConfiguration(fork);
            newQ.setText(srcQ.getText());
            newQ.setTextTranslations(srcQ.getTextTranslations() != null ? new HashMap<>(srcQ.getTextTranslations()) : new HashMap<>());
            newQ.setRequired(srcQ.isRequired());
            newQ.setDependsOnOptionCode(srcQ.getDependsOnOptionCode());
            newQ.setWeight(srcQ.getWeight());

            if (srcQ.getCategory() != null) {
                newQ.setCategory(newCategoryMap.get(srcQ.getCategory().getCode()));
            }

            if (srcQ.getOptions() != null) {
                for (QuestionOption srcOpt : srcQ.getOptions()) {
                    QuestionOption newOpt = new QuestionOption();
                    newOpt.setText(srcOpt.getText());
                    newOpt.setTextTranslations(srcOpt.getTextTranslations() != null ? new HashMap<>(srcOpt.getTextTranslations()) : new HashMap<>());
                    newOpt.setScore(srcOpt.getScore());
                    newOpt.setHighRiskTrigger(srcOpt.isHighRiskTrigger());
                    newOpt.setImpact(srcOpt.getImpact());
                    newQ.addOption(newOpt);
                }
            }
            questionRepository.save(newQ);
        }

        List<RiskMatrix> sourceMatrix = riskMatrixRepository.findByConfigurationId(sourceId);
        for (RiskMatrix srcRm : sourceMatrix) {
            // Matrix conditions are JSON maps, so copy the map to avoid shared mutable state.
            RiskMatrix newRm = new RiskMatrix();
            newRm.setConfiguration(fork);
            newRm.setConditions(new HashMap<>(srcRm.getConditions()));
            newRm.setContextRisk(srcRm.getContextRisk());
            riskMatrixRepository.save(newRm);
        }

        List<ReidentificationThreshold> sourceThresholds = reidThresholdRepository.findByConfigurationId(sourceId);
        for (ReidentificationThreshold srcT : sourceThresholds) {
            // Threshold labels/values are copied exactly; they remain tied to
            // the copied category bands by label.
            ReidentificationThreshold newT = new ReidentificationThreshold();
            newT.setConfiguration(fork);
            newT.setRiskClassification(srcT.getRiskClassification());
            newT.setThresholdValue(srcT.getThresholdValue());
            reidThresholdRepository.save(newT);
        }

        return fork;
    }

    public void updateConfiguration(Long configId, RiskConfigurationUpdateRequest request, String username, boolean isAdmin) {
        Configuration config = configRepository.findById(configId)
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + configId));

        // Enforce write access strictly here
        verifyConfigurationWriteAccess(config, username, isAdmin);
        validateUniqueName(request.getName(), configId);

        // Once a configuration has saved assessments, structural changes could
        // invalidate historical answers. Only sharing metadata remains editable.
        boolean isInUse = datasetAssessmentRepository.existsByConfigurationId(configId) ||
                recipientAssessmentRepository.existsByConfigurationId(configId);

        // Always allow sharing changes, even when structural edits are blocked.
        if (request.getSharedUsernames() != null) {
            if (config.getSharedUsernames() == null) {
                config.setSharedUsernames(new java.util.HashSet<>());
            }
            config.getSharedUsernames().clear();
            config.getSharedUsernames().addAll(request.getSharedUsernames());
        }

        // If in use, persist only sharing changes and stop before replacing
        // categories/questions/matrices/thresholds.
        if (isInUse) {
            configRepository.save(config);
            return;
        }

        // Structural updates are allowed only while the configuration is still a draft.
        config.setName(request.getName());
        config.setDescription(request.getDescription());
        config.setDefaultLanguage(request.getDefaultLanguage());
        config.setDefault(request.isDefault());
        config.setActive(request.isActive());

        updateCategories(config, request.getCategories());
        updateQuestions(config, request.getQuestions());
        updateRiskMatrices(config, request.getRiskMatrix());
        updateThresholds(config, request.getThresholds());

        configRepository.save(config);
    }

    public void deleteConfiguration(Long id, String username, boolean isAdmin) {
        Configuration config = configRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Configuration ID " + id + " not found."));

        // Deletion follows the same write-access rule as updates.
        verifyConfigurationWriteAccess(config, username, isAdmin);

        configRepository.deleteById(id);
    }

    // Private structural update helpers. They replace draft child structures
    // with the incoming editor payload while preserving entities that can be
    // safely updated in place.

    private void updateCategories(Configuration config, List<RiskCategoryRequestDTO> dtos) {
        // Categories are matched by stable code rather than by display name.
        Map<String, RiskCategory> existingMap = config.getRiskCategories().stream()
                .collect(Collectors.toMap(RiskCategory::getCode, Function.identity()));

        if (dtos != null) {
            for (RiskCategoryRequestDTO dto : dtos) {
                RiskCategory category = existingMap.get(dto.getCode());

                if (category != null) {
                    // Bands are replaced as a set because their ranges/labels are
                    // edited together in the configuration editor.
                    category.getRiskBands().clear();

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
                }
            }
        }
        categoryRepository.saveAll(existingMap.values());
        categoryRepository.flush();
    }

    private void updateQuestions(Configuration config, List<QuestionRequestDTO> dtos) {
        List<Question> existingQuestions = questionRepository.findByConfigurationId(config.getId());
        Map<Long, Question> existingQuestionMap = existingQuestions.stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        // Track incoming IDs so omitted draft questions can be deleted after
        // verifying that no saved answers depend on them.
        List<Question> toSave = new ArrayList<>();
        List<Long> incomingQuestionIds = new ArrayList<>();

        if (dtos != null) {
            for (QuestionRequestDTO dto : dtos) {
                Question q;

                if (dto.getId() != null && existingQuestionMap.containsKey(dto.getId())) {
                    q = existingQuestionMap.get(dto.getId());
                    incomingQuestionIds.add(q.getId());
                } else {
                    q = new Question();
                    q.setConfiguration(config);
                }

                q.setText(dto.getText());
                q.setTextTranslations(dto.getTextTranslations() != null ? new HashMap<>(dto.getTextTranslations()) : new HashMap<>());
                q.setRequired(dto.isRequired());
                q.setDependsOnOptionCode(dto.getDependsOnOptionCode());
                q.setWeight(dto.getWeight());

                RiskCategory cat = categoryRepository.findByConfigurationId(config.getId()).stream()
                        .filter(c -> c.getCode().equals(dto.getCategoryCode()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Invalid category code"));
                q.setCategory(cat);

                if (dto.getOptions() != null) {
                    // Options are matched by text because the editor payload does
                    // not carry stable option IDs.
                    Map<String, QuestionOption> existingOptionMap = q.getOptions().stream()
                            .collect(Collectors.toMap(QuestionOption::getText, Function.identity()));

                    List<QuestionOption> updatedOptionsList = new ArrayList<>();

                    for (QuestionOptionRequestDTO optDto : dto.getOptions()) {
                        QuestionOption opt;
                        if (existingOptionMap.containsKey(optDto.getText())) {
                            opt = existingOptionMap.get(optDto.getText());
                        } else {
                            opt = new QuestionOption();
                            opt.setQuestion(q);
                        }
                        opt.setText(optDto.getText());
                        opt.setTextTranslations(optDto.getTextTranslations() != null ? new HashMap<>(optDto.getTextTranslations()) : new HashMap<>());
                        opt.setScore(optDto.getRiskLevel());
                        opt.setHighRiskTrigger(optDto.isHighRiskTrigger());
                        opt.setImpact(optDto.getImpact());
                        updatedOptionsList.add(opt);
                    }

                    List<QuestionOption> optionsToRemove = new ArrayList<>(q.getOptions());
                    optionsToRemove.removeAll(updatedOptionsList);

                    for(QuestionOption deletedOpt : optionsToRemove) {
                        if(answerRepository.existsBySelectedOptionId(deletedOpt.getId())) {
                            // Do not break historical assessments by deleting an
                            // option that a saved answer still references.
                            throw new IllegalStateException("Cannot delete option '" + deletedOpt.getText() + "' because it has already been selected in a saved assessment. Please fork the configuration to make changes.");
                        }
                    }

                    q.getOptions().clear();
                    q.getOptions().addAll(updatedOptionsList);
                }

                toSave.add(q);
            }
        }

        List<Question> questionsToDelete = existingQuestions.stream()
                .filter(q -> !incomingQuestionIds.contains(q.getId()))
                .collect(Collectors.toList());

        for(Question deletedQuestion : questionsToDelete) {
            if(answerRepository.existsByQuestionId(deletedQuestion.getId())) {
                // Do not break historical assessments by deleting answered questions.
                throw new IllegalStateException("Cannot delete question '" + deletedQuestion.getText() + "' because it has been answered in a saved assessment. Please fork the configuration to make changes.");
            }
        }

        questionRepository.deleteAll(questionsToDelete);
        questionRepository.saveAll(toSave);
    }

    private void updateRiskMatrices(Configuration config, List<RiskMatrixRequestDTO> dtos) {
        List<RiskMatrix> existing = riskMatrixRepository.findByConfigurationId(config.getId());
        Map<Long, RiskMatrix> existingMap = existing.stream()
                .collect(Collectors.toMap(RiskMatrix::getId, Function.identity()));

        // Matrix rows are matched by ID; omitted rows are deleted for draft configurations.
        List<RiskMatrix> toSave = new ArrayList<>();
        List<Long> incomingIds = new ArrayList<>();

        if (dtos != null) {
            for (RiskMatrixRequestDTO dto : dtos) {
                RiskMatrix rm;
                if (dto.getId() != null && existingMap.containsKey(dto.getId())) {
                    rm = existingMap.get(dto.getId());
                    incomingIds.add(rm.getId());
                } else {
                    rm = new RiskMatrix();
                    rm.setConfiguration(config);
                }

                rm.setConditions(dto.getConditions());
                rm.setContextRisk(dto.getContextRisk());
                toSave.add(rm);
            }
        }

        List<RiskMatrix> toDelete = existing.stream()
                .filter(rm -> !incomingIds.contains(rm.getId()))
                .collect(Collectors.toList());
        riskMatrixRepository.deleteAll(toDelete);
        riskMatrixRepository.saveAll(toSave);
    }

    private void updateThresholds(Configuration config, List<ReidThresholdRequestDTO> dtos) {
        List<ReidentificationThreshold> existing = reidThresholdRepository.findByConfigurationId(config.getId());
        Map<Long, ReidentificationThreshold> existingMap = existing.stream()
                .collect(Collectors.toMap(ReidentificationThreshold::getId, Function.identity()));

        // Threshold rows are matched by ID and replaced as part of draft editing.
        List<ReidentificationThreshold> toSave = new ArrayList<>();
        List<Long> incomingIds = new ArrayList<>();

        if (dtos != null) {
            for (ReidThresholdRequestDTO dto : dtos) {
                ReidentificationThreshold t;
                if (dto.getId() != null && existingMap.containsKey(dto.getId())) {
                    t = existingMap.get(dto.getId());
                    incomingIds.add(t.getId());
                } else {
                    t = new ReidentificationThreshold();
                    t.setConfiguration(config);
                }

                if (dto.getRiskClassification() != null) {
                    t.setRiskClassification(dto.getRiskClassification());
                }
                t.setThresholdValue(dto.getThresholdValue());
                toSave.add(t);
            }
        }

        List<ReidentificationThreshold> toDelete = existing.stream()
                .filter(t -> !incomingIds.contains(t.getId()))
                .collect(Collectors.toList());
        reidThresholdRepository.deleteAll(toDelete);
        reidThresholdRepository.saveAll(toSave);
    }
}
