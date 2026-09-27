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

/**
 * POST /api/data-sharing-activities/{id}/mitigation-planner/candidate-plans
 * Generates, evaluates and ranks candidate plans against the Project's pinned Knowledge Base
 * version. Read-only: nothing is persisted and no assessment is modified.
 */
export async function generateMitigationCandidatePlansApi(activityId, payload, token) {
  const response = await fetch(
    `${apiUrl}/api/data-sharing-activities/${activityId}/mitigation-planner/candidate-plans`,
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
    await handleApiError(response, "Candidate plans could not be generated.");
  }

  return response.json();
}
