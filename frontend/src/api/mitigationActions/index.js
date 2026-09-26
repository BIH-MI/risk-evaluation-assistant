import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchMitigationActionsApi(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.actionType) params.set("actionType", filters.actionType);
  if (filters.active !== undefined && filters.active !== null) {
    params.set("active", String(filters.active));
  }
  if (filters.sharingArrangement) {
    params.set("sharingArrangement", filters.sharingArrangement);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${apiUrl}/api/mitigation-actions${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load mitigation actions");
  }

  return res.json();
}

export async function fetchMitigationActionApi(id, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-actions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load mitigation action");
  }

  return res.json();
}

export async function createMitigationActionApi(payload, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-actions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to create mitigation action");
  }

  return res.json();
}

export async function updateMitigationActionApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-actions/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to update mitigation action");
  }

  return res.json();
}
