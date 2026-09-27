import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchMitigationKnowledgeBasesApi(token, { activeOnly = false } = {}) {
  const params = activeOnly ? "?activeOnly=true" : "";
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to load mitigation Knowledge Bases");
  return res.json();
}

export async function fetchMitigationKnowledgeBaseApi(id, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to load mitigation Knowledge Base");
  return res.json();
}

export async function createMitigationKnowledgeBaseApi(payload, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await handleApiError(res, "Failed to create mitigation Knowledge Base");
  return res.json();
}

export async function updateMitigationKnowledgeBaseApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await handleApiError(res, "Failed to update mitigation Knowledge Base");
  return res.json();
}

export async function archiveMitigationKnowledgeBaseApi(id, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases/${id}/archive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to archive mitigation Knowledge Base");
  return res.json();
}

export async function setDefaultMitigationKnowledgeBaseApi(id, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases/${id}/default`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to set default mitigation Knowledge Base");
  return res.json();
}

export async function forkMitigationKnowledgeBaseApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/mitigation-knowledge-bases/${id}/fork`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) await handleApiError(res, "Failed to fork mitigation Knowledge Base");
  return res.json();
}

function actionPath(knowledgeBaseId, suffix = "") {
  return `${apiUrl}/api/mitigation-knowledge-bases/${knowledgeBaseId}/actions${suffix}`;
}

export async function fetchMitigationActionsApi(knowledgeBaseId, token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.actionType) params.set("actionType", filters.actionType);
  if (filters.active !== undefined && filters.active !== null) {
    params.set("active", String(filters.active));
  }
  if (filters.sharingArrangement) {
    params.set("sharingArrangement", filters.sharingArrangement);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(actionPath(knowledgeBaseId, query), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to load mitigation actions");
  return res.json();
}

export async function fetchMitigationActionApi(knowledgeBaseId, id, token) {
  const res = await fetch(actionPath(knowledgeBaseId, `/${id}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to load mitigation action");
  return res.json();
}

export async function createMitigationActionApi(knowledgeBaseId, payload, token) {
  const res = await fetch(actionPath(knowledgeBaseId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await handleApiError(res, "Failed to create mitigation action");
  return res.json();
}

export async function updateMitigationActionApi(knowledgeBaseId, id, payload, token) {
  const res = await fetch(actionPath(knowledgeBaseId, `/${id}`), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await handleApiError(res, "Failed to update mitigation action");
  return res.json();
}
