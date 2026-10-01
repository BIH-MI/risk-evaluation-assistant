package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.policy;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.PlanSelectionCriterion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.EvaluatedCandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.PlanRecommendation;
import org.springframework.stereotype.Service;

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
        List<PlanSelectionCriterion> criteria = criteria(policy);

        // Feasibility is not a preference: INVALID and INCOMPATIBLE plans are never recommended or
        // offered as alternatives, even if a policy omits the REJECT_* criteria.
        List<EvaluatedCandidatePlan> selectable = evaluated.stream()
                .filter(candidate -> candidate.evaluation().getStatus() != MitigationPlanStatus.INVALID)
                .filter(candidate -> candidate.evaluation().getStatus() != MitigationPlanStatus.INCOMPATIBLE)
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

    /**
     * Unknown criterion codes are rejected rather than ignored: an ignored criterion would silently
     * change the ranking the administrator configured. The validator refuses such codes on save.
     */
    private List<PlanSelectionCriterion> criteria(PlanSelectionPolicyDefinition policy) {
        if (policy == null || policy.getEnabledCriteria() == null) {
            return List.of();
        }
        return policy.getEnabledCriteria().stream()
                .map(code -> PlanSelectionCriterion.parse(code).orElseThrow(() -> new IllegalStateException(
                        "Plan-selection policy uses unknown criterion '" + code + "'.")))
                .toList();
    }

    private String selectionReason(
            List<PlanSelectionCriterion> criteria,
            EvaluatedCandidatePlan recommended,
            List<EvaluatedCandidatePlan> alternatives
    ) {
        String prefix = "Preferred according to the configured deterministic selection policy, not a proven "
                + "or optimal plan";
        if (alternatives.isEmpty()) {
            return prefix + ". It is the only distinct feasible plan.";
        }
        EvaluatedCandidatePlan runnerUp = alternatives.get(0);
        PlanSelectionCriterion decisive = criteria.stream()
                .filter(criterion -> comparatorFor(criterion).compare(recommended, runnerUp) != 0)
                .findFirst()
                .orElse(PlanSelectionCriterion.STABLE_ACTION_CODE_TIE_BREAK);
        return prefix + ". It ranks ahead of Alternative 1 because " + explain(decisive, recommended, runnerUp)
                + (decisive != PlanSelectionCriterion.STABLE_ACTION_CODE_TIE_BREAK && criteria.indexOf(decisive) > 0
                        ? "; all earlier criteria tie." : ".");
    }

    private String explain(PlanSelectionCriterion criterion, EvaluatedCandidatePlan left, EvaluatedCandidatePlan right) {
        return switch (criterion) {
            case COVER_ACTIONABLE_CRITICAL_DRIVERS -> "it structurally addresses more actionable Critical Risk Drivers ("
                    + left.criticalDriverCoverage() + " vs " + right.criticalDriverCoverage() + ")";
            case PREFER_HIGH_DRIVER_COVERAGE -> "it structurally addresses more actionable High Risk Drivers ("
                    + left.highDriverCoverage() + " vs " + right.highDriverCoverage() + ")";
            case PREFER_FEWER_UNRESOLVED_PROJECT_CHECKS -> "fewer Project checks still need evaluation ("
                    + left.unresolvedProjectChecks() + " vs " + right.unresolvedProjectChecks() + ")";
            case PREFER_FEWER_ACTIONS -> "it needs fewer actions (" + actionCount(left) + " vs " + actionCount(right) + ")";
            case PREFER_LOWER_KNOWN_COST -> costKnown(left) && costKnown(right)
                    ? "its maximum estimated cost is lower (" + left.knownCostMax().stripTrailingZeros().toPlainString()
                            + " vs " + right.knownCostMax().stripTrailingZeros().toPlainString() + ")"
                    : "its cost is fully estimated while the alternative's is not (unknown cost is never treated as zero)";
            case PREFER_SHORTER_KNOWN_SETUP_TIME -> setupKnown(left) && setupKnown(right)
                    ? "its maximum estimated setup time is shorter (" + left.knownSetupDaysMax() + " vs "
                            + right.knownSetupDaysMax() + " days)"
                    : "its setup time is fully estimated while the alternative's is not";
            case REJECT_INVALID, REJECT_INCOMPATIBLE, STABLE_ACTION_CODE_TIE_BREAK ->
                    "all configured criteria tie and the stable action-code order decides";
        };
    }

    private Comparator<EvaluatedCandidatePlan> comparator(List<PlanSelectionCriterion> criteria) {
        Comparator<EvaluatedCandidatePlan> comparator = (left, right) -> 0;
        for (PlanSelectionCriterion criterion : criteria) {
            comparator = comparator.thenComparing(comparatorFor(criterion));
        }
        return comparator.thenComparing(EvaluatedCandidatePlan::stableActionCodeKey);
    }

    private Comparator<EvaluatedCandidatePlan> comparatorFor(PlanSelectionCriterion criterion) {
        return switch (criterion) {
            // Applied as a filter before sorting.
            case REJECT_INVALID, REJECT_INCOMPATIBLE -> (left, right) -> 0;
            case COVER_ACTIONABLE_CRITICAL_DRIVERS ->
                    Comparator.comparing(EvaluatedCandidatePlan::criticalDriverCoverage).reversed();
            case PREFER_HIGH_DRIVER_COVERAGE ->
                    Comparator.comparing(EvaluatedCandidatePlan::highDriverCoverage).reversed();
            case PREFER_FEWER_UNRESOLVED_PROJECT_CHECKS ->
                    Comparator.comparing(EvaluatedCandidatePlan::unresolvedProjectChecks);
            case PREFER_FEWER_ACTIONS -> Comparator.comparing(this::actionCount);
            case PREFER_LOWER_KNOWN_COST -> this::compareKnownCost;
            case PREFER_SHORTER_KNOWN_SETUP_TIME -> this::compareKnownSetup;
            case STABLE_ACTION_CODE_TIE_BREAK -> Comparator.comparing(EvaluatedCandidatePlan::stableActionCodeKey);
        };
    }

    private int actionCount(EvaluatedCandidatePlan plan) {
        return plan.evaluation().getActions().size();
    }

    /** Known before unknown; two unknown (or partial) estimates tie and are never compared as zero. */
    private int compareKnownCost(EvaluatedCandidatePlan left, EvaluatedCandidatePlan right) {
        boolean leftKnown = costKnown(left);
        boolean rightKnown = costKnown(right);
        if (leftKnown != rightKnown) {
            return leftKnown ? -1 : 1;
        }
        return leftKnown ? left.knownCostMax().compareTo(right.knownCostMax()) : 0;
    }

    private int compareKnownSetup(EvaluatedCandidatePlan left, EvaluatedCandidatePlan right) {
        boolean leftKnown = setupKnown(left);
        boolean rightKnown = setupKnown(right);
        if (leftKnown != rightKnown) {
            return leftKnown ? -1 : 1;
        }
        return leftKnown ? Integer.compare(left.knownSetupDaysMax(), right.knownSetupDaysMax()) : 0;
    }

    private boolean costKnown(EvaluatedCandidatePlan plan) {
        return plan.evaluation().getCostEstimate().getAvailability() == EstimateAvailability.KNOWN
                && plan.knownCostMax() != null;
    }

    private boolean setupKnown(EvaluatedCandidatePlan plan) {
        return plan.evaluation().getSetupEstimate().getAvailability() == EstimateAvailability.KNOWN
                && plan.knownSetupDaysMax() != null;
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
