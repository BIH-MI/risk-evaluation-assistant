package org.bihealth.mi.risk_assessment_api.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.AppliedAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.AppliedQuestionChange;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.ConflictingProjection;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.ConflictingQuestionMapping;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.ContextRiskMatrix;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.ContextRiskState;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO.MatrixCell;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.RiskThresholdSource;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskBand;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskMatrix;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.mitigation.MitigationActionRepository;
import org.bihealth.mi.risk_assessment_api.utils.RiskResultBands;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Answers: "what would the existing REA context-risk calculation produce if the selected
 * context controls were implemented and verified?"
 *
 * <p>It does not predict effectiveness. It only swaps the configured hypothetical questionnaire
 * answers and reuses the existing risk engine through {@link RiskService}.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CounterfactualContextEvaluator {

    private static final String CONTROLS = "CONTROLS";
    private static final String LIKELIHOOD = "LIKELIHOOD";
    private static final String NEGATIVE = "NEGATIVE";

    private final DataSharingActivityService activityService;
    private final RiskService riskService;
    private final MitigationActionRepository actionRepository;
    private final ContextMitigationOpportunityMatcher matcher;
    private final MitigationOpportunityService opportunityService;

    /** One projected answer change and the actions that request it. */
    private record ProjectedChange(
            Answer answer,
            QuestionOption projectedOption,
            String frameworkName,
            Set<String> actionNames
    ) {}

    public CounterfactualContextResultDTO evaluate(
            Long activityId,
            Collection<Long> actionIds,
            Double manualRiskThreshold,
            String username,
            boolean isAdmin
    ) {
        DataSharingActivity activity = activityService.getAccessibleActivityEntity(activityId, username, isAdmin);
        RecipientAssessment assessment = activity.getRecipientAssessment();
        if (activity.getProject() == null) {
            throw new IllegalArgumentException("A Project is required before mitigation planning can be performed.");
        }
        if (assessment == null || activity.getDatasetAssessment() == null) {
            throw new IllegalArgumentException(
                    "Dataset and Recipient Assessments are required to evaluate context controls.");
        }
        if (manualRiskThreshold != null
                && (manualRiskThreshold.isNaN() || manualRiskThreshold <= 0 || manualRiskThreshold > 1)) {
            throw new IllegalArgumentException("manualRiskThreshold must be a fraction between 0 and 1.");
        }

        CounterfactualContextResultDTO result = new CounterfactualContextResultDTO();
        List<String> warnings = result.getWarnings();

        // Context-control evaluation keeps dataset Impact/T fixed and recalculates the
        // context-dependent attack probability using the existing REA model. Only the
        // Recipient Assessment context changes.
        List<Answer> actualAnswers = assessment.getAnswers();
        GenericRiskResponseDTO baseline = riskService.calculateRisk(activity, actualAnswers, manualRiskThreshold);
        result.setBaseline(toState(baseline));
        result.setImpactBand(RiskResultBands.categoryBand(baseline, "IMPACT"));
        result.setTargetThreshold(baseline.getThreshold());
        result.setThresholdSource(manualRiskThreshold == null ? RiskThresholdSource.CONFIGURED : RiskThresholdSource.MANUAL);
        result.setMatrix(buildMatrix(assessment));

        // No context controls selected (for example a data-only plan): context is unchanged.
        if (actionIds == null || actionIds.isEmpty()) {
            result.setProjected(toState(baseline));
            return result;
        }

        MitigationSharingArrangement arrangement =
                opportunityService.resolveSharingArrangement(activity.getProject(), warnings);
        List<MitigationAction> validActions = validateActions(actionIds, arrangement, warnings);

        Map<MitigationAction, ContextMitigationOpportunityMatcher.ContextMatch> matches = validActions.isEmpty()
                ? Map.of()
                : matcher.match(validActions, assessment, warnings);
        for (MitigationAction action : validActions) {
            if (!matches.containsKey(action)) {
                warnings.add("\"" + action.getName() + "\" is not applicable to the current Recipient Assessment and was ignored.");
            }
        }

        // question id -> projected option id -> change. Two options for one question conflict.
        Map<Long, Map<Long, ProjectedChange>> changesByQuestion = new LinkedHashMap<>();
        matches.forEach((action, match) -> match.triggers().forEach(trigger -> {
            Answer answer = trigger.answer();
            Optional<QuestionOption> projected = answer.getQuestion().getOptions().stream()
                    .filter(option -> sameCode(option.getCode(), trigger.mapping().getProjectedOptionCode()))
                    .findFirst();
            if (projected.isEmpty()) {
                warnings.add("Projected option " + trigger.mapping().getProjectedOptionCode()
                        + " does not exist for \"" + answer.getQuestion().getText() + "\"; mapping ignored.");
                return;
            }
            ProjectedChange change = changesByQuestion
                    .computeIfAbsent(answer.getQuestion().getId(), key -> new LinkedHashMap<>())
                    .computeIfAbsent(projected.get().getId(), key -> new ProjectedChange(
                            answer, projected.get(), trigger.mapping().getConfiguration() == null
                                    ? null : trigger.mapping().getConfiguration().getName(),
                            new LinkedHashSet<>()));
            change.actionNames().add(action.getName());
            if (result.getAppliedActions().stream().noneMatch(applied -> applied.getActionId().equals(action.getId()))) {
                AppliedAction applied = new AppliedAction();
                applied.setActionId(action.getId());
                applied.setActionName(action.getName());
                result.getAppliedActions().add(applied);
            }
        }));

        boolean conflict = false;
        for (Map<Long, ProjectedChange> options : changesByQuestion.values()) {
            if (options.size() > 1) {
                conflict = true;
                ProjectedChange first = options.values().iterator().next();
                ConflictingQuestionMapping conflicting = new ConflictingQuestionMapping();
                conflicting.setFrameworkName(first.frameworkName());
                conflicting.setQuestionText(first.answer().getQuestion().getText());
                conflicting.setCurrentOptionText(first.answer().getSelectedOption().getText());
                options.values().forEach(change -> {
                    ConflictingProjection projection = new ConflictingProjection();
                    projection.setActionNames(new ArrayList<>(change.actionNames()));
                    projection.setProjectedOptionText(change.projectedOption().getText());
                    conflicting.getProjections().add(projection);
                });
                result.getConflictingQuestionMappings().add(conflicting);
            } else {
                ProjectedChange change = options.values().iterator().next();
                AppliedQuestionChange applied = new AppliedQuestionChange();
                applied.setActionNames(new ArrayList<>(change.actionNames()));
                applied.setFrameworkName(change.frameworkName());
                applied.setQuestionCode(change.answer().getQuestion().getCode());
                applied.setQuestionText(change.answer().getQuestion().getText());
                QuestionOption current = change.answer().getSelectedOption();
                QuestionOption projectedOption = change.projectedOption();
                applied.setCurrentOptionText(current.getText());
                applied.setCurrentOptionImpact(current.getImpact());
                applied.setCurrentOptionHighRiskTrigger(current.isHighRiskTrigger());
                applied.setProjectedOptionText(projectedOption.getText());
                applied.setProjectedOptionImpact(projectedOption.getImpact());
                applied.setProjectedOptionHighRiskTrigger(projectedOption.isHighRiskTrigger());
                applied.setHighRiskTriggerRemoved(current.isHighRiskTrigger() && !projectedOption.isHighRiskTrigger());
                applied.setNegativeFindingAddressed(!current.isHighRiskTrigger()
                        && NEGATIVE.equalsIgnoreCase(current.getImpact())
                        && !NEGATIVE.equalsIgnoreCase(projectedOption.getImpact()));
                result.getAppliedQuestionChanges().add(applied);
            }
        }

        if (conflict) {
            result.setStatus(CounterfactualContextResultDTO.Status.INVALID);
            result.setInvalidReason("Selected controls project conflicting answers for the same question.");
            result.getAppliedQuestionChanges().clear();
            return result;
        }
        if (changesByQuestion.isEmpty()) {
            result.setStatus(CounterfactualContextResultDTO.Status.INVALID);
            result.setInvalidReason("None of the selected controls can be applied to the current Recipient Assessment.");
            return result;
        }

        // Projected recipient answers are evaluated in memory only; the persisted Recipient
        // Assessment always represents the verified current state. The copies are never attached
        // to it or saved. Replacing a high-risk trigger option removes that trigger from the
        // in-memory answer set, and RiskComputationService recalculates the category normally.
        List<Answer> hypotheticalAnswers = actualAnswers.stream()
                .map(answer -> {
                    Map<Long, ProjectedChange> options = changesByQuestion.get(answer.getQuestion().getId());
                    if (options == null) {
                        return answer;
                    }
                    return new Answer(assessment, answer.getQuestion(), options.values().iterator().next().projectedOption());
                })
                .collect(Collectors.toList());

        GenericRiskResponseDTO projected = riskService.calculateRisk(activity, hypotheticalAnswers, manualRiskThreshold);
        result.setProjected(toState(projected));
        result.setActionsApplied(!result.getAppliedQuestionChanges().isEmpty());
        result.setRiskChanged(contextRiskChanged(result));
        if (!Objects.equals(baseline.getThreshold(), projected.getThreshold())) {
            warnings.add("The target threshold T differs between baseline and what-if; only context should change.");
        }
        return result;
    }

    private List<MitigationAction> validateActions(
            Collection<Long> actionIds,
            MitigationSharingArrangement arrangement,
            List<String> warnings
    ) {
        if (actionIds == null || actionIds.isEmpty()) {
            return List.of();
        }
        Set<Long> requested = new LinkedHashSet<>(actionIds);
        Map<Long, MitigationAction> found = actionRepository.findAllById(requested).stream()
                .collect(Collectors.toMap(MitigationAction::getId, action -> action));

        List<MitigationAction> valid = new ArrayList<>();
        for (Long id : requested) {
            MitigationAction action = found.get(id);
            if (action == null) {
                warnings.add("Mitigation action " + id + " does not exist and was ignored.");
            } else if (!action.isActive()) {
                warnings.add("\"" + action.getName() + "\" is inactive and was ignored.");
            } else if (action.getActionType() != MitigationActionType.CONTEXT_CONTROL) {
                warnings.add("\"" + action.getName() + "\" is not a context control and was ignored.");
            } else if (!opportunityService.appliesTo(action, arrangement)) {
                warnings.add("\"" + action.getName() + "\" does not apply to this sharing arrangement and was ignored.");
            } else {
                valid.add(action);
            }
        }
        if (!valid.isEmpty()) {
            actionRepository.fetchQuestionMappings(valid); // hydrates mappings of the managed entities
        }
        return valid;
    }

    private ContextRiskState toState(GenericRiskResponseDTO result) {
        ContextRiskState state = new ContextRiskState();
        state.setControlsBand(RiskResultBands.categoryBand(result, CONTROLS));
        state.setLikelihoodBand(RiskResultBands.categoryBand(result, LIKELIHOOD));
        state.setAttackProbability(result.getContextRisk() == null ? null : result.getContextRisk().getNumericValue());
        state.setRecommendedAnonymizationThreshold(result.getFinalRisk() == null ? null : result.getFinalRisk().getNumericValue());
        return state;
    }

    private boolean contextRiskChanged(CounterfactualContextResultDTO result) {
        if (result == null || result.getBaseline() == null || result.getProjected() == null) {
            return false;
        }
        return !Objects.equals(result.getBaseline().getControlsBand(), result.getProjected().getControlsBand())
                || !Objects.equals(result.getBaseline().getLikelihoodBand(), result.getProjected().getLikelihoodBand())
                || !Objects.equals(result.getBaseline().getAttackProbability(), result.getProjected().getAttackProbability())
                || !Objects.equals(result.getBaseline().getRecommendedAnonymizationThreshold(),
                        result.getProjected().getRecommendedAnonymizationThreshold());
    }

    /** Exposes the framework's actual configured matrix; nothing is hard-coded or recomputed. */
    private ContextRiskMatrix buildMatrix(RecipientAssessment assessment) {
        ConfigurationVersion version = assessment.getConfigurationVersion() != null
                ? assessment.getConfigurationVersion()
                : assessment.getConfiguration() == null ? null
                        : assessment.getConfiguration().getCurrentVersionEntity().orElse(null);
        if (version == null) {
            return null;
        }
        List<String> controls = orderedBands(version, CONTROLS);
        List<String> likelihood = orderedBands(version, LIKELIHOOD);
        if (controls.isEmpty() || likelihood.isEmpty()) {
            return null;
        }

        ContextRiskMatrix matrix = new ContextRiskMatrix();
        matrix.setControlsBands(controls);
        matrix.setLikelihoodBands(likelihood);
        for (RiskMatrix row : version.getRiskMatrices()) {
            Map<String, String> conditions = row.getConditions() == null ? Map.of() : row.getConditions().entrySet().stream()
                    .collect(Collectors.toMap(e -> e.getKey().trim().toUpperCase(Locale.ROOT), Map.Entry::getValue, (a, b) -> a));
            if (conditions.size() != 2 || !conditions.containsKey(CONTROLS) || !conditions.containsKey(LIKELIHOOD)) {
                continue;
            }
            MatrixCell cell = new MatrixCell();
            cell.setControlsBand(canonicalLabel(controls, conditions.get(CONTROLS)));
            cell.setLikelihoodBand(canonicalLabel(likelihood, conditions.get(LIKELIHOOD)));
            cell.setAttackProbability(row.getContextRisk());
            matrix.getCells().add(cell);
        }
        return matrix;
    }

    private List<String> orderedBands(ConfigurationVersion version, String categoryCode) {
        return version.getRiskCategories().stream()
                .filter(category -> categoryCode.equalsIgnoreCase(category.getCode()))
                .findFirst()
                .map(RiskCategory::getRiskBands)
                .orElse(List.of()).stream()
                .sorted(Comparator.comparing(RiskBand::getRangeMinimum))
                .map(RiskBand::getLabel)
                .collect(Collectors.toList());
    }

    private String canonicalLabel(List<String> labels, String value) {
        return labels.stream().filter(label -> sameCode(label, value)).findFirst().orElse(value);
    }

    private boolean sameCode(String left, String right) {
        return left != null && right != null && left.trim().equalsIgnoreCase(right.trim());
    }
}
