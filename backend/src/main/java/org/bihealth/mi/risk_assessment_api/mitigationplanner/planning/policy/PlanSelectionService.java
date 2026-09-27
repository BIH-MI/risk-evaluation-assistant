package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.policy;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.EvaluatedCandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.PlanRecommendation;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Applies the Knowledge Base's {@link PlanSelectionPolicyDefinition} to evaluated
 * candidate plans. Criteria are applied lexicographically in configured order;
 * there is no weighted score.
 *
 * <p>The first plan is the <em>Recommended Plan</em>: preferred according to the
 * configured deterministic policy, not an optimal or proven-effective plan.</p>
 */
@Service
public class PlanSelectionService {

    static final int MAX_ALTERNATIVES = 3;

    public PlanRecommendation select(
            List<EvaluatedCandidatePlan> evaluated,
            PlanSelectionPolicyDefinition policy
    ) {
        List<String> criteria = policy == null || policy.getEnabledCriteria() == null
                ? List.of()
                : policy.getEnabledCriteria();

        List<EvaluatedCandidatePlan> selectable = evaluated.stream()
                .filter(candidate -> !criteria.contains("REJECT_INVALID")
                        || candidate.evaluation().getStatus() != MitigationPlanStatus.INVALID)
                .filter(candidate -> !criteria.contains("REJECT_INCOMPATIBLE")
                        || candidate.evaluation().getStatus() != MitigationPlanStatus.INCOMPATIBLE)
                .sorted(comparator(criteria))
                .toList();

        if (selectable.isEmpty()) {
            return new PlanRecommendation(null, List.of(), evaluated.isEmpty()
                    ? "No feasible mitigation plan could be generated under the current knowledge and Project "
                            + "constraints. Every actionable Critical Risk Driver must be structurally covered by an "
                            + "applicable action without conflicts or known hard Project failures."
                    : "No feasible mitigation plan remained: every generated candidate was invalid or failed a "
                            + "known hard Project requirement.");
        }

        EvaluatedCandidatePlan recommended = selectable.get(0);
        List<EvaluatedCandidatePlan> alternatives = new ArrayList<>();
        for (EvaluatedCandidatePlan candidate : selectable.subList(1, selectable.size())) {
            if (isUnnecessarySuperset(candidate, recommended)
                    || alternatives.stream().anyMatch(existing -> isUnnecessarySuperset(candidate, existing))) {
                continue;
            }
            alternatives.add(candidate);
            if (alternatives.size() == MAX_ALTERNATIVES) {
                break;
            }
        }

        return new PlanRecommendation(recommended, alternatives, selectionReason(criteria, recommended, alternatives));
    }

    private String selectionReason(
            List<String> criteria,
            EvaluatedCandidatePlan recommended,
            List<EvaluatedCandidatePlan> alternatives
    ) {
        String prefix = "Preferred according to the configured deterministic policy";
        if (alternatives.isEmpty()) {
            return prefix + "; it is the only distinct feasible plan.";
        }
        String decisive = criteria.stream()
                .filter(criterion -> comparatorFor(criterion).compare(recommended, alternatives.get(0)) != 0)
                .findFirst()
                .orElse("STABLE_ACTION_CODE_TIE_BREAK");
        return prefix + "; ranked ahead of the first alternative by " + decisive + ".";
    }

    private Comparator<EvaluatedCandidatePlan> comparator(List<String> criteria) {
        Comparator<EvaluatedCandidatePlan> comparator = (left, right) -> 0;
        for (String criterion : criteria) {
            comparator = comparator.thenComparing(comparatorFor(criterion));
        }
        return comparator.thenComparing(EvaluatedCandidatePlan::stableActionCodeKey);
    }

    private Comparator<EvaluatedCandidatePlan> comparatorFor(String criterion) {
        return switch (criterion) {
            case "COVER_ACTIONABLE_CRITICAL_DRIVERS" ->
                    Comparator.comparing(EvaluatedCandidatePlan::criticalDriverCoverage).reversed();
            case "PREFER_HIGH_DRIVER_COVERAGE" ->
                    Comparator.comparing(EvaluatedCandidatePlan::highDriverCoverage).reversed();
            case "PREFER_FEWER_UNRESOLVED_PROJECT_CHECKS" ->
                    Comparator.comparing(EvaluatedCandidatePlan::unresolvedProjectChecks);
            case "PREFER_FEWER_ACTIONS" ->
                    Comparator.comparing(candidate -> candidate.evaluation().getActions().size());
            case "PREFER_LOWER_KNOWN_COST" -> this::compareKnownCost;
            case "PREFER_SHORTER_KNOWN_SETUP_TIME" -> this::compareKnownSetup;
            case "STABLE_ACTION_CODE_TIE_BREAK" ->
                    Comparator.comparing(EvaluatedCandidatePlan::stableActionCodeKey);
            default -> (left, right) -> 0;
        };
    }

    private int compareKnownCost(EvaluatedCandidatePlan left, EvaluatedCandidatePlan right) {
        boolean leftKnown = left.evaluation().getCostEstimate().getAvailability() == EstimateAvailability.KNOWN;
        boolean rightKnown = right.evaluation().getCostEstimate().getAvailability() == EstimateAvailability.KNOWN;
        if (leftKnown != rightKnown) {
            return leftKnown ? -1 : 1;
        }
        if (!leftKnown) {
            return 0;
        }
        return nullSafe(left.knownCostMax()).compareTo(nullSafe(right.knownCostMax()));
    }

    private int compareKnownSetup(EvaluatedCandidatePlan left, EvaluatedCandidatePlan right) {
        boolean leftKnown = left.evaluation().getSetupEstimate().getAvailability() == EstimateAvailability.KNOWN;
        boolean rightKnown = right.evaluation().getSetupEstimate().getAvailability() == EstimateAvailability.KNOWN;
        if (leftKnown != rightKnown) {
            return leftKnown ? -1 : 1;
        }
        if (!leftKnown) {
            return 0;
        }
        return Integer.compare(
                left.knownSetupDaysMax() == null ? Integer.MAX_VALUE : left.knownSetupDaysMax(),
                right.knownSetupDaysMax() == null ? Integer.MAX_VALUE : right.knownSetupDaysMax());
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value == null ? new BigDecimal("999999999999") : value;
    }

    private boolean isUnnecessarySuperset(EvaluatedCandidatePlan candidate, EvaluatedCandidatePlan preferred) {
        Set<String> candidateDrivers = new LinkedHashSet<>(candidate.addressedRiskDriverIds());
        Set<String> preferredDrivers = new LinkedHashSet<>(preferred.addressedRiskDriverIds());
        Set<Long> candidateActions = candidate.candidate().actionIds().stream().collect(Collectors.toSet());
        Set<Long> preferredActions = preferred.candidate().actionIds().stream().collect(Collectors.toSet());
        return candidateDrivers.equals(preferredDrivers)
                && candidateActions.containsAll(preferredActions)
                && candidateActions.size() > preferredActions.size();
    }
}
