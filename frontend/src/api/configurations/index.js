import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchConfigurationsApi(token) {
  const res = await fetch(`${apiUrl}/api/configurations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to load configurations");
  return res.json();
}

export async function fetchConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, `Failed to load configuration ${id}`);
  return res.json();
}

export async function createConfigurationApi(configData, token) {
  const res = await fetch(`${apiUrl}/api/configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(configData),
  });
  if (!res.ok) await handleApiError(res, "Failed to create configuration");
  return res.json();
}

export async function forkConfigurationApi(id, newConfigName, token) {
  const res = await fetch(
    `${apiUrl}/api/configurations/${id}/fork?newConfigName=${encodeURIComponent(
      newConfigName
    )}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) await handleApiError(res, "Failed to fork configuration");
  return res.json();
}

export async function updateConfigurationApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) await handleApiError(res, "Failed to update configuration");

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function archiveConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}/archive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) await handleApiError(res, "Failed to archive configuration");
  return res.json();
}

export async function setDefaultConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}/default`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) await handleApiError(res, "Failed to set default configuration");
  return res.json();
}

export async function deleteConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) await handleApiError(res, "Failed to delete configuration");
  return true;
}
