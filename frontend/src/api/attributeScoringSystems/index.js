import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchAttributeScoringSystemsApi(token, { activeOnly = false } = {}) {
  const params = activeOnly ? "?activeOnly=true" : "";
  const res = await fetch(`${apiUrl}/api/attribute-scoring-systems${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load scoring systems");
  }

  return res.json();
}

export async function fetchAttributeScoringSystemApi(id, token) {
  const res = await fetch(`${apiUrl}/api/attribute-scoring-systems/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load scoring system");
  }

  return res.json();
}

export async function createAttributeScoringSystemApi(payload, token) {
  const res = await fetch(`${apiUrl}/api/attribute-scoring-systems`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to create scoring system");
  }

  return res.json();
}

export async function updateAttributeScoringSystemApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/attribute-scoring-systems/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to update scoring system");
  }

  return res.json();
}

export async function duplicateAttributeScoringSystemApi(id, token, name) {
  const res = await fetch(
    `${apiUrl}/api/attribute-scoring-systems/${id}/duplicate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(name ? { name } : {}),
    }
  );

  if (!res.ok) {
    await handleApiError(res, "Failed to duplicate scoring system");
  }

  return res.json();
}

export async function archiveAttributeScoringSystemApi(id, token) {
  const res = await fetch(`${apiUrl}/api/attribute-scoring-systems/${id}/archive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to archive scoring system");
  }

  return res.json();
}

export async function setDefaultAttributeScoringSystemApi(id, token) {
  const res = await fetch(`${apiUrl}/api/attribute-scoring-systems/${id}/default`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to set default scoring system");
  }

  return res.json();
}
