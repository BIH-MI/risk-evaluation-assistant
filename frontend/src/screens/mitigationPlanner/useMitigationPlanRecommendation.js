import { useCallback, useEffect, useMemo, useState } from "react";

import { generateMitigationCandidatePlansApi } from "api/mitigationPlanner";

export const RECOMMENDED_PLAN_KEY = "generated-recommended";

function toTablePlan(plan, key) {
  return {
    key,
    label: plan.label,
    source: plan.recommended ? "RECOMMENDED" : "ALTERNATIVE",
    selectedActionIds: plan.selectedActionIds || [],
    planSummary: plan.planSummary || [],
    actionRationales: plan.actionRationales || [],
    criticalDriverCoverage: plan.criticalDriverCoverage,
    highDriverCoverage: plan.highDriverCoverage,
    evaluation: plan.evaluation,
  };
}

/**
 * Primary planner workflow: the backend generates feasible candidate plans from the applicable
 * opportunities and ranks them with the Knowledge Base's deterministic selection policy.
 */
export default function useMitigationPlanRecommendation({ activityId, token, manualRiskThreshold }) {
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setResult(null);
    setErrorMessage("");
  }, [activityId, manualRiskThreshold]);

  const generate = useCallback(async () => {
    if (!token || !activityId) return;
    setGenerating(true);
    setErrorMessage("");
    try {
      setResult(await generateMitigationCandidatePlansApi(activityId, { manualRiskThreshold }, token));
    } catch (error) {
      setErrorMessage(error?.message || "Candidate plans could not be generated.");
    } finally {
      setGenerating(false);
    }
  }, [activityId, manualRiskThreshold, token]);

  const plans = useMemo(() => {
    if (!result) return [];
    const generated = [];
    if (result.recommendedPlan) {
      generated.push(toTablePlan(result.recommendedPlan, RECOMMENDED_PLAN_KEY));
    }
    (result.alternativePlans || []).forEach((plan, index) => {
      generated.push(toTablePlan(plan, `generated-alternative-${index + 1}`));
    });
    return generated;
  }, [result]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return { result, plans, generating, errorMessage, generate, clearError };
}
