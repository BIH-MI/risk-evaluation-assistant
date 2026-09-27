import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchProjectTemplatesApi(token, { activeOnly = false } = {}) {
  const params = activeOnly ? "?activeOnly=true" : "";
  const res = await fetch(`${apiUrl}/api/project-templates${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load Project Templates");
  }

  return res.json();
}

export async function fetchProjectTemplateApi(id, token) {
  const res = await fetch(`${apiUrl}/api/project-templates/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load Project Template");
  }

  return res.json();
}

export async function createProjectTemplateApi(payload, token) {
  const res = await fetch(`${apiUrl}/api/project-templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to create Project Template");
  }

  return res.json();
}

export async function updateProjectTemplateApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/project-templates/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to update Project Template");
  }

  return res.json();
}

export async function duplicateProjectTemplateApi(id, token, name) {
  const res = await fetch(`${apiUrl}/api/project-templates/${id}/duplicate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(name ? { name } : {}),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to duplicate Project Template");
  }

  return res.json();
}

export async function archiveProjectTemplateApi(id, token) {
  const res = await fetch(`${apiUrl}/api/project-templates/${id}/archive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to archive Project Template");
  }

  return res.json();
}

export async function setDefaultProjectTemplateApi(id, token) {
  const res = await fetch(`${apiUrl}/api/project-templates/${id}/default`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to set default Project Template");
  }

  return res.json();
}
