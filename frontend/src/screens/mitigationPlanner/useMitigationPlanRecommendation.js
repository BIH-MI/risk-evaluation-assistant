import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateMitigationCandidatePlansApi } from "api/mitigationPlanner";

export const RECOMMENDED_PLAN_KEY = "generated-recommended";

function toTablePlan(plan, key) {
  return {
    key,
    label: plan.label,
    recommended: Boolean(plan.recommended),
    selectedActionIds: plan.selectedActionIds || [],
    criticalDriverCoverage: plan.criticalDriverCoverage,
    highDriverCoverage: plan.highDriverCoverage,
    evaluation: plan.evaluation,
  };
}

/**
 * Automatic planning workflow. As soon as the planner has its context (activity with a Project),
 * the backend generates, evaluates and ranks candidate plans against the Project's pinned
 * Knowledge Base version. The frontend never ranks plans; it shows them in backend order.
 *
 * One request per planning-input signature (activity + manual threshold): a request already in
 * flight for the same signature is reused, so re-renders, StrictMode effect replays or token
 * refreshes do not trigger duplicate generation.
 */
export default function useMitigationPlanRecommendation({ activityId, token, manualRiskThreshold, ready }) {
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const requestRef = useRef(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const signature = `${activityId ?? ""}|${manualRiskThreshold ?? ""}`;
  const enabled = Boolean(ready && activityId && token);

  useEffect(() => {
    if (!enabled) return undefined;

    let request = requestRef.current;
    if (!request || request.signature !== signature) {
      setResult(null);
      request = {
        signature,
        promise: generateMitigationCandidatePlansApi(activityId, { manualRiskThreshold }, tokenRef.current),
      };
      requestRef.current = request;
    }

    let cancelled = false;
    setGenerating(true);
    setErrorMessage("");
    request.promise
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error?.message || "Candidate plans could not be generated.");
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activityId, enabled, manualRiskThreshold, signature]);

  // Backend order is authoritative: Recommended Plan first, then up to three alternatives.
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

  return { result, plans, generating, errorMessage, clearError };
}
