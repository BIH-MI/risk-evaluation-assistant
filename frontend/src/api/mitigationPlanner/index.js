import { apiUrl, handleApiError } from "api/httpClient";

/** GET /api/data-sharing-activities/{id}/mitigation-planner/opportunities */
export async function fetchMitigationOpportunitiesApi(
  activityId,
  token,
  manualRiskThreshold = null
) {
  // Explicit user-defined target threshold (fraction); omitted means the configured threshold.
  const query =
    manualRiskThreshold === null
      ? ""
      : `?manualRiskThreshold=${encodeURIComponent(manualRiskThreshold)}`;
  const response = await fetch(
    `${apiUrl}/api/data-sharing-activities/${activityId}/mitigation-planner/opportunities${query}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    await handleApiError(
      response,
      `Failed to fetch mitigation opportunities for activity ${activityId}`
    );
  }

  return response.json();
}

/** POST /api/data-sharing-activities/{id}/mitigation-planner/context-what-if (read-only evaluation) */
export async function evaluateContextWhatIfApi(activityId, payload, token) {
  const response = await fetch(
    `${apiUrl}/api/data-sharing-activities/${activityId}/mitigation-planner/context-what-if`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to evaluate the context what-if scenario");
  }

  return response.json();
}

/** POST /api/data-sharing-activities/{id}/mitigation-planner/plan-drafts/evaluate (read-only, not persisted) */
export async function evaluateMitigationPlanDraftApi(activityId, payload, token) {
  const response = await fetch(
    `${apiUrl}/api/data-sharing-activities/${activityId}/mitigation-planner/plan-drafts/evaluate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    await handleApiError(response, "Candidate plan could not be evaluated.");
  }

  return response.json();
}
