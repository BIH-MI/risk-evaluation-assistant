package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.generator;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ContextOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan.ParameterSelection;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Combines applicable mitigation actions into feasible candidate plans under
 * configured dependencies, conflicts and Project constraints.
 *
 * <p>Feasibility does not imply proven mitigation effectiveness.</p>
 *
 * <p>Generation is deterministic backtracking. For each coverage target
 * (Critical drivers; Critical + High; Critical + High + Optional) and each
 * action pool (all, data-only, context-only) it enumerates irredundant sets of
 * actions that structurally cover the target: every chosen action covers at
 * least one target driver that no other chosen action covers. Dependencies are
 * closed transitively from the Knowledge Base snapshot, conflicting pairs are
 * rejected, and actions with a hard Project FAIL or only incompatible parameter
 * values are excluded. Actionable Critical drivers must always be covered.</p>
 *
 * <p>Automatic generation is deliberately conservative: an action whose every parameter value
 * contradicts a Project requirement (hard or preference) is not proposed. A researcher can
 * still add it to a Custom Plan, where an unmet preference is reported as a trade-off.</p>
 */
@Service
public class CandidatePlanGenerator {

    /**
     * Upper bound on actions chosen to cover drivers (dependencies may add more). It bounds the
     * search depth only: every chosen action must cover a driver no other chosen action covers,
     * and most drivers are addressed by a single action, so the branching stays small. It must
     * exceed the number of distinct data and context actions a realistic case needs (the seeded
     * SPHN demo needs 8 for full Critical + High coverage); a lower bound silently drops plans.
     */
    static final int MAX_CHOSEN_ACTIONS = 10;
    /**
     * Upper bound on generated candidates; the search stops deterministically once reached and
     * the planning response carries a warning. Only the Recommended Plan and three alternatives
     * are shown, so a larger pool would only cost evaluation time (one REA risk calculation per
     * context plan).
     */
    public static final int MAX_CANDIDATES = 200;

    private enum Pool { ALL, DATA, CONTEXT }

    /**
     * Actionable Critical drivers that no feasible (non-hard-failing) action addresses. When this
     * is non-empty, {@link #generate} returns no plan.
     */
    public List<RiskDriverDTO> uncoverableCriticalDrivers(MitigationPlanningContext context) {
        Set<String> coverable = applicableOpportunities(context).values().stream()
                .flatMap(opportunity -> opportunity.getAddressedRiskDriverIds().stream())
                .collect(Collectors.toSet());
        return actionableDrivers(context).stream()
                .filter(driver -> driver.getPriority() == RiskDriverPriority.CRITICAL)
                .filter(driver -> !coverable.contains(driver.getId()))
                .toList();
    }

    public List<CandidatePlan> generate(MitigationPlanningContext context) {
        Map<Long, Opportunity> applicable = applicableOpportunities(context);
        if (applicable.isEmpty()) {
            return List.of();
        }

        Map<Long, Set<Long>> dependencies = dependencies(context, applicable.keySet());
        Set<String> conflicts = conflicts(context);
        List<RiskDriverDTO> drivers = actionableDrivers(context);

        if (!uncoverableCriticalDrivers(context).isEmpty()) {
            // An actionable Critical driver has no feasible action left; no plan can cover it.
            return List.of();
        }
        Set<String> critical = driverIds(drivers, EnumSet.of(RiskDriverPriority.CRITICAL), null);

        Search search = new Search(applicable, dependencies, conflicts);
        List<EnumSet<RiskDriverPriority>> targets = List.of(
                EnumSet.of(RiskDriverPriority.CRITICAL),
                EnumSet.of(RiskDriverPriority.CRITICAL, RiskDriverPriority.HIGH),
                EnumSet.of(RiskDriverPriority.CRITICAL, RiskDriverPriority.HIGH, RiskDriverPriority.OPTIONAL_IMPROVEMENT));

        for (EnumSet<RiskDriverPriority> priorities : targets) {
            for (Pool pool : Pool.values()) {
                List<Long> poolActions = applicable.values().stream()
                        .filter(opportunity -> inPool(opportunity, pool))
                        .map(Opportunity::getActionId)
                        .toList();
                Set<String> poolCoverable = poolActions.stream()
                        .flatMap(id -> applicable.get(id).getAddressedRiskDriverIds().stream())
                        .collect(Collectors.toSet());
                if (!poolCoverable.containsAll(critical)) {
                    continue;
                }
                Set<String> target = driverIds(drivers, priorities, poolCoverable);
                if (!target.isEmpty()) {
                    search.cover(target, poolActions);
                }
            }
        }

        return search.results.values().stream()
                .map(closed -> new CandidatePlan(
                        closed.stream()
                                .sorted(Comparator.comparing(id -> applicable.get(id).getActionCode()))
                                .toList(),
                        selectKnownCompatibleParameters(closed, applicable)))
                .toList();
    }

    /** Backtracking search state shared across targets so duplicates collapse by action set. */
    private final class Search {
        private final Map<Long, Opportunity> applicable;
        private final Map<Long, Set<Long>> dependencies;
        private final Set<String> conflicts;
        private final Map<String, Set<Long>> results = new LinkedHashMap<>();

        private Search(Map<Long, Opportunity> applicable, Map<Long, Set<Long>> dependencies, Set<String> conflicts) {
            this.applicable = applicable;
            this.dependencies = dependencies;
            this.conflicts = conflicts;
        }

        void cover(Set<String> target, List<Long> poolActions) {
            backtrack(target, poolActions, new ArrayList<>());
        }

        private void backtrack(Set<String> target, List<Long> poolActions, List<Long> chosen) {
            if (results.size() >= MAX_CANDIDATES) {
                return;
            }
            Set<Long> closed = closeDependencies(chosen, dependencies);
            String uncovered = target.stream()
                    .filter(driverId -> !covered(closed).contains(driverId))
                    .sorted()
                    .findFirst()
                    .orElse(null);
            if (uncovered == null) {
                if (isIrredundant(chosen, target)) {
                    results.putIfAbsent(stableKey(closed), closed);
                }
                return;
            }
            if (chosen.size() >= MAX_CHOSEN_ACTIONS) {
                return;
            }
            // Branch on every pool action covering the first uncovered driver, in stable code order.
            List<Long> options = poolActions.stream()
                    .filter(id -> applicable.get(id).getAddressedRiskDriverIds().contains(uncovered))
                    .sorted(Comparator.comparing(id -> applicable.get(id).getActionCode()))
                    .toList();
            for (Long option : options) {
                chosen.add(option);
                Set<Long> next = closeDependencies(chosen, dependencies);
                if (applicable.keySet().containsAll(next) && !hasConflict(next, conflicts)) {
                    backtrack(target, poolActions, chosen);
                }
                chosen.remove(chosen.size() - 1);
            }
        }

        private boolean isIrredundant(List<Long> chosen, Set<String> target) {
            for (Long action : chosen) {
                List<Long> without = chosen.stream().filter(id -> !id.equals(action)).toList();
                if (covered(closeDependencies(without, dependencies)).containsAll(target)) {
                    return false;
                }
            }
            return true;
        }

        private Set<String> covered(Set<Long> actionIds) {
            return actionIds.stream()
                    .map(applicable::get)
                    .filter(Objects::nonNull)
                    .flatMap(opportunity -> opportunity.getAddressedRiskDriverIds().stream())
                    .collect(Collectors.toSet());
        }
    }

    private Map<Long, Opportunity> applicableOpportunities(MitigationPlanningContext context) {
        Map<Long, Opportunity> applicable = new LinkedHashMap<>();
        Stream.concat(
                        context.inference().dataOpportunities().stream(),
                        context.inference().contextOpportunities().stream())
                .filter(opportunity -> !hardFails(opportunity))
                .sorted(Comparator.comparing(Opportunity::getActionCode))
                .forEach(opportunity -> applicable.put(opportunity.getActionId(), opportunity));
        return applicable;
    }

    private boolean inPool(Opportunity opportunity, Pool pool) {
        return switch (pool) {
            case ALL -> true;
            case DATA -> opportunity.getActionType() == MitigationActionType.DATA_TRANSFORMATION;
            case CONTEXT -> opportunity.getActionType() == MitigationActionType.CONTEXT_CONTROL;
        };
    }

    /** PASS and NEEDS_EVALUATION stay feasible; FAIL or only-incompatible parameters are infeasible. */
    private boolean hardFails(Opportunity opportunity) {
        if (opportunity instanceof ContextOpportunity contextOpportunity
                && contextOpportunity.getProjectFeasibility() != null
                && contextOpportunity.getProjectFeasibility().getResult() == ProjectConstraintResult.FAIL) {
            return true;
        }
        if (opportunity instanceof DataOpportunity dataOpportunity) {
            return dataOpportunity.getParameters().stream().anyMatch(this::allKnownValuesIncompatible);
        }
        return false;
    }

    private boolean allKnownValuesIncompatible(PlanParameter parameter) {
        return !parameter.getAllowedValues().isEmpty()
                && parameter.getAllowedValues().stream()
                .allMatch(value -> value.getCompatibility() == ParameterValueCompatibility.INCOMPATIBLE);
    }

    private List<RiskDriverDTO> actionableDrivers(MitigationPlanningContext context) {
        return Stream.concat(
                        context.inference().dataRiskDrivers().stream(),
                        context.inference().contextRiskDrivers().stream())
                .filter(RiskDriverDTO::isActionable)
                .toList();
    }

    private Set<String> driverIds(List<RiskDriverDTO> drivers, Set<RiskDriverPriority> priorities, Set<String> within) {
        return drivers.stream()
                .filter(driver -> priorities.contains(driver.getPriority()))
                .map(RiskDriverDTO::getId)
                .filter(id -> within == null || within.contains(id))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> closeDependencies(List<Long> selected, Map<Long, Set<Long>> dependencies) {
        Set<Long> closed = new LinkedHashSet<>(selected);
        boolean changed;
        do {
            changed = false;
            for (Long actionId : List.copyOf(closed)) {
                for (Long required : dependencies.getOrDefault(actionId, Set.of())) {
                    changed |= closed.add(required);
                }
            }
        } while (changed);
        return closed;
    }

    private Map<Long, Set<Long>> dependencies(MitigationPlanningContext context, Set<Long> applicableActionIds) {
        Map<Long, Set<Long>> dependencies = new LinkedHashMap<>();
        for (MitigationActionDependency dependency : context.knowledge().dependencies()) {
            Long actionId = dependency.getAction() == null ? null : dependency.getAction().getId();
            Long requiredId = dependency.getRequiredAction() == null ? null : dependency.getRequiredAction().getId();
            if (actionId == null || requiredId == null || !applicableActionIds.contains(actionId)) {
                continue;
            }
            dependencies.computeIfAbsent(actionId, key -> new LinkedHashSet<>()).add(requiredId);
        }
        return dependencies;
    }

    private Set<String> conflicts(MitigationPlanningContext context) {
        return context.knowledge().conflicts().stream()
                .map(this::conflictKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String conflictKey(MitigationActionConflict conflict) {
        if (conflict.getActionA() == null || conflict.getActionB() == null) {
            return null;
        }
        return pairKey(conflict.getActionA().getId(), conflict.getActionB().getId());
    }

    private boolean hasConflict(Set<Long> actionIds, Set<String> conflicts) {
        List<Long> ids = new ArrayList<>(actionIds);
        for (int i = 0; i < ids.size(); i++) {
            for (int j = i + 1; j < ids.size(); j++) {
                if (conflicts.contains(pairKey(ids.get(i), ids.get(j)))) {
                    return true;
                }
            }
        }
        return false;
    }

    private String pairKey(Long left, Long right) {
        return left < right ? left + ":" + right : right + ":" + left;
    }

    /** Pre-selects a parameter value only when the Project makes it known-compatible; otherwise it stays unresolved. */
    private List<ParameterSelection> selectKnownCompatibleParameters(
            Set<Long> selected,
            Map<Long, Opportunity> opportunities
    ) {
        List<ParameterSelection> selections = new ArrayList<>();
        for (Long actionId : selected) {
            if (!(opportunities.get(actionId) instanceof DataOpportunity dataOpportunity)) {
                continue;
            }
            for (PlanParameter parameter : dataOpportunity.getParameters()) {
                ParameterValue value = parameter.getAllowedValues().stream()
                        .filter(candidate -> candidate.getCompatibility() == ParameterValueCompatibility.COMPATIBLE)
                        .findFirst()
                        .orElse(null);
                if (value != null) {
                    selections.add(new ParameterSelection(actionId, parameter.getParameterCode(), value.getValue()));
                }
            }
        }
        return selections;
    }

    private String stableKey(Set<Long> actionIds) {
        return actionIds.stream().sorted().map(String::valueOf).collect(Collectors.joining(":"));
    }
}
