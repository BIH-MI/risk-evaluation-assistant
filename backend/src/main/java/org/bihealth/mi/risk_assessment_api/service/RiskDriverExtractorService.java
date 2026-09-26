package org.bihealth.mi.risk_assessment_api.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataTarget;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverSource;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Extracts explainable assessment findings that drive mitigation planning.
 *
 * <p>This service does not calculate risk and does not rank actions with a new
 * score. Risk-driver priority explains selected answer semantics: high-risk
 * trigger, negative, neutral, or positive/no action required. It is not an
 * additional risk-scoring model; RiskComputationService remains authoritative.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RiskDriverExtractorService {

    public record ExtractedRiskDrivers(List<RiskDriverDTO> dataDrivers, List<RiskDriverDTO> contextDrivers) {}

    private static final String DATASET_EVIDENCE_CATEGORY = "DATASET_EVIDENCE";

    private final AnswerRepository answerRepository;
    private final MitigationQuestionMappingMatcher questionMappingMatcher;

    public ExtractedRiskDrivers extract(
            DatasetAssessment datasetAssessment,
            RecipientAssessment recipientAssessment,
            Collection<MitigationAction> dataActions,
            Map<MitigationAction, List<DataTarget>> dataActionTargets,
            Collection<MitigationAction> contextActions,
            DataMitigationOpportunityMatcher.DatasetEvidence datasetEvidence
    ) {
        List<RiskDriverDTO> dataDrivers = new ArrayList<>();
        List<RiskDriverDTO> contextDrivers = new ArrayList<>();

        if (datasetAssessment != null) {
            for (Answer answer : answerRepository.findAllForAssessment(datasetAssessment.getId())) {
                if (isDatasetQuestion(answer)) {
                    dataDrivers.add(questionDriver(
                            RiskDriverSource.DATASET_QUESTION,
                            datasetAssessment.getId(),
                            answer,
                            findActionsTriggeredByAnswer(answer, dataActions, MitigationAssessmentScope.DATASET),
                            "Risk-driving finding from the Dataset Assessment / Invasion of Privacy answers."
                    ));
                }
            }
        }

        if (datasetEvidence != null) {
            dataDrivers.addAll(datasetEvidenceDrivers(datasetEvidence, dataActionTargets));
        }

        if (recipientAssessment != null) {
            for (Answer answer : answerRepository.findAllForAssessment(recipientAssessment.getId())) {
                if (isRecipientQuestion(answer)) {
                    contextDrivers.add(questionDriver(
                            RiskDriverSource.RECIPIENT_QUESTION,
                            recipientAssessment.getId(),
                            answer,
                            findActionsTriggeredByAnswer(answer, contextActions, MitigationAssessmentScope.RECIPIENT),
                            "Risk-driving finding from the Recipient Assessment context answers."
                    ));
                }
            }
        }

        return new ExtractedRiskDrivers(sortDrivers(dataDrivers), sortDrivers(contextDrivers));
    }

    private boolean isDatasetQuestion(Answer answer) {
        RiskCategory category = category(answer);
        return category != null && "DATASET_ASSESSMENT".equalsIgnoreCase(category.getAssessmentPhase());
    }

    private boolean isRecipientQuestion(Answer answer) {
        RiskCategory category = category(answer);
        return category != null && "RECIPIENT_ASSESSMENT".equalsIgnoreCase(category.getAssessmentPhase());
    }

    private RiskDriverDTO questionDriver(
            RiskDriverSource source,
            Long assessmentId,
            Answer answer,
            List<MitigationAction> matchedActions,
            String explanation
    ) {
        Question question = answer.getQuestion();
        QuestionOption option = answer.getSelectedOption();
        RiskDriverPriority priority = priority(option);

        RiskDriverDTO driver = new RiskDriverDTO();
        driver.setId(source.name() + ":" + assessmentId + ":" + stable(question.getCode()) + ":" + stable(option.getCode()));
        driver.setSource(source);
        RiskCategory category = category(answer);
        if (category != null) {
            driver.setCategoryCode(category.getCode());
            driver.setCategoryLabel(category.getName());
        }
        driver.setQuestionCode(question.getCode());
        driver.setQuestionText(question.getText());
        driver.setSelectedOptionCode(option.getCode());
        driver.setSelectedOptionText(option.getText());
        driver.setAnswerImpact(option.getImpact());
        driver.setHighRiskTrigger(option.isHighRiskTrigger());
        driver.setPriority(priority);
        driver.setExplanation(explanationForPriority(priority, explanation));
        attachActions(driver, matchedActions);
        return driver;
    }

    private List<MitigationAction> findActionsTriggeredByAnswer(
            Answer answer,
            Collection<MitigationAction> actions,
            MitigationAssessmentScope scope
    ) {
        if (actions == null || actions.isEmpty()) {
            return List.of();
        }
        List<MitigationAction> matches = new ArrayList<>();
        for (MitigationAction action : actions) {
            for (MitigationQuestionMapping mapping : action.getQuestionMappings()) {
                if (questionMappingMatcher.matchesTrigger(mapping, answer, answer.getAssessment().getConfiguration(), scope)) {
                    matches.add(action);
                    break;
                }
            }
        }
        return matches;
    }

    private List<RiskDriverDTO> datasetEvidenceDrivers(
            DataMitigationOpportunityMatcher.DatasetEvidence evidence,
            Map<MitigationAction, List<DataTarget>> actionTargets
    ) {
        List<RiskDriverDTO> drivers = new ArrayList<>();
        for (DataMitigationOpportunityMatcher.AssessedAttribute attribute : evidence.attributes()) {
            if (attribute.directIdentifier()) {
                drivers.add(attributeDriver(attribute, MitigationAttributeRole.DIRECT_IDENTIFIER, actionTargets));
            }
            if (attribute.candidateQid()) {
                drivers.add(attributeDriver(attribute, MitigationAttributeRole.CANDIDATE_QID, actionTargets));
            }
            if (attribute.sensitive()) {
                drivers.add(attributeDriver(attribute, MitigationAttributeRole.SENSITIVE_ATTRIBUTE, actionTargets));
            }
        }
        for (DataMitigationOpportunityMatcher.AssessedCombination combination : evidence.combinations()) {
            drivers.add(combinationDriver(combination, actionTargets));
        }
        return drivers;
    }

    private RiskDriverDTO attributeDriver(
            DataMitigationOpportunityMatcher.AssessedAttribute attribute,
            MitigationAttributeRole role,
            Map<MitigationAction, List<DataTarget>> actionTargets
    ) {
        RiskDriverDTO driver = datasetEvidenceDriver(
                "DATASET_ATTRIBUTE:" + attribute.tableName() + ":" + attribute.name() + ":" + role,
                RiskDriverSource.DATASET_ATTRIBUTE,
                roleLabel(role) + " evidence from the Dataset Assessment.");
        driver.setTableName(attribute.tableName());
        driver.setAttributeNames(List.of(attribute.name()));
        driver.setAttributeRole(role);
        driver.setDataType(attribute.dataType());
        attachActions(driver, matchedDataActions(actionTargets, target ->
                target.getAttributeRole() == role
                        && same(target.getTableName(), attribute.tableName())
                        && target.getAttributeNames().size() == 1
                        && same(target.getAttributeNames().get(0), attribute.name())));
        return driver;
    }

    private RiskDriverDTO combinationDriver(
            DataMitigationOpportunityMatcher.AssessedCombination combination,
            Map<MitigationAction, List<DataTarget>> actionTargets
    ) {
        RiskDriverDTO driver = datasetEvidenceDriver(
                "QID_COMBINATION:" + combination.tableName() + ":" + String.join("+", combination.attributeNames()),
                RiskDriverSource.QID_COMBINATION,
                "Candidate QID combination retained as Dataset Assessment evidence.");
        driver.setTableName(combination.tableName());
        driver.setAttributeNames(combination.attributeNames());
        driver.setAttributeRole(MitigationAttributeRole.CANDIDATE_QID_COMBINATION);
        attachActions(driver, matchedDataActions(actionTargets, target ->
                target.getAttributeRole() == MitigationAttributeRole.CANDIDATE_QID_COMBINATION
                        && same(target.getTableName(), combination.tableName())
                        && normalizedSet(target.getAttributeNames()).equals(normalizedSet(combination.attributeNames()))));
        return driver;
    }

    private RiskDriverDTO datasetEvidenceDriver(String id, RiskDriverSource source, String explanation) {
        RiskDriverDTO driver = new RiskDriverDTO();
        driver.setId(id);
        driver.setSource(source);
        driver.setCategoryCode(DATASET_EVIDENCE_CATEGORY);
        driver.setCategoryLabel("Dataset Assessment");
        // Attribute evidence has no selected QuestionOption, so no answer impact is claimed.
        // Its HIGH priority reflects the Dataset Assessment classification itself.
        driver.setPriority(RiskDriverPriority.HIGH);
        driver.setExplanation(explanation);
        return driver;
    }

    private List<MitigationAction> matchedDataActions(
            Map<MitigationAction, List<DataTarget>> actionTargets,
            java.util.function.Predicate<DataTarget> matchesTarget
    ) {
        if (actionTargets == null || actionTargets.isEmpty()) {
            return List.of();
        }
        return actionTargets.entrySet().stream()
                .filter(entry -> entry.getValue().stream().anyMatch(matchesTarget))
                .map(Map.Entry::getKey)
                .sorted(Comparator.comparing(MitigationAction::getCode))
                .collect(Collectors.toList());
    }

    private void attachActions(RiskDriverDTO driver, List<MitigationAction> actions) {
        List<MitigationAction> distinct = actions.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(MitigationAction::getId, action -> action, (a, b) -> a),
                        map -> map.values().stream()
                                .sorted(Comparator.comparing(MitigationAction::getCode))
                                .collect(Collectors.toList())));
        driver.setMatchedMitigationActionIds(distinct.stream().map(MitigationAction::getId).collect(Collectors.toList()));
        driver.setMatchedMitigationActionCodes(distinct.stream().map(MitigationAction::getCode).collect(Collectors.toList()));
        driver.setActionable(!distinct.isEmpty());
    }

    private RiskDriverPriority priority(QuestionOption option) {
        if (option != null && option.isHighRiskTrigger()) {
            return RiskDriverPriority.CRITICAL;
        }
        String impact = option == null ? null : option.getImpact();
        if ("NEGATIVE".equalsIgnoreCase(impact)) {
            return RiskDriverPriority.HIGH;
        }
        if ("NEUTRAL".equalsIgnoreCase(impact)) {
            return RiskDriverPriority.OPTIONAL_IMPROVEMENT;
        }
        return RiskDriverPriority.NO_ACTION_REQUIRED;
    }

    private String explanationForPriority(RiskDriverPriority priority, String fallback) {
        return switch (priority) {
            case CRITICAL -> "The selected answer is configured as a high-risk trigger.";
            case HIGH -> "The selected answer is configured with negative impact.";
            case OPTIONAL_IMPROVEMENT -> "The selected answer is neutral; it may support additional improvement.";
            case NO_ACTION_REQUIRED -> fallback;
        };
    }

    private List<RiskDriverDTO> sortDrivers(List<RiskDriverDTO> drivers) {
        return drivers.stream()
                .sorted(Comparator
                        .comparing((RiskDriverDTO driver) -> priorityOrder(driver.getPriority()))
                        .thenComparing(driver -> nullSafe(driver.getCategoryCode()))
                        .thenComparing(driver -> nullSafe(driver.getQuestionCode()))
                        .thenComparing(driver -> nullSafe(String.join("+", driver.getAttributeNames()))))
                .collect(Collectors.toList());
    }

    private int priorityOrder(RiskDriverPriority priority) {
        if (priority == RiskDriverPriority.CRITICAL) return 0;
        if (priority == RiskDriverPriority.HIGH) return 1;
        if (priority == RiskDriverPriority.OPTIONAL_IMPROVEMENT) return 2;
        return 3;
    }

    private RiskCategory category(Answer answer) {
        return answer == null || answer.getQuestion() == null ? null : answer.getQuestion().getCategory();
    }

    private String roleLabel(MitigationAttributeRole role) {
        return switch (role) {
            case DIRECT_IDENTIFIER -> "Direct Identifier";
            case CANDIDATE_QID -> "Candidate QID";
            case SENSITIVE_ATTRIBUTE -> "Sensitive Attribute";
            case CANDIDATE_QID_COMBINATION -> "Candidate QID combination";
        };
    }

    private String stable(String value) {
        return value == null ? "UNKNOWN" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private boolean same(String left, String right) {
        return left != null && right != null && left.trim().equalsIgnoreCase(right.trim());
    }

    private Set<String> normalizedSet(List<String> values) {
        return values.stream()
                .map(value -> value.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
