import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchQidDiscoveryConfigurationsApi(
  token,
  { activeOnly = false } = {}
) {
  const params = activeOnly ? "?activeOnly=true" : "";
  const res = await fetch(`${apiUrl}/api/qid-discovery-configurations${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load QID discovery configurations");
  }

  return res.json();
}

export async function fetchQidDiscoveryConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/qid-discovery-configurations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load QID discovery configuration");
  }

  return res.json();
}

export async function createQidDiscoveryConfigurationApi(payload, token) {
  const res = await fetch(`${apiUrl}/api/qid-discovery-configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to create QID discovery configuration");
  }

  return res.json();
}

export async function updateQidDiscoveryConfigurationApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/qid-discovery-configurations/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to update QID discovery configuration");
  }

  return res.json();
}

export async function duplicateQidDiscoveryConfigurationApi(id, token, name) {
  const res = await fetch(
    `${apiUrl}/api/qid-discovery-configurations/${id}/duplicate`,
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
    await handleApiError(res, "Failed to duplicate QID discovery configuration");
  }

  return res.json();
}

export async function archiveQidDiscoveryConfigurationApi(id, token) {
  const res = await fetch(
    `${apiUrl}/api/qid-discovery-configurations/${id}/archive`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    await handleApiError(res, "Failed to archive QID discovery configuration");
  }

  return res.json();
}

export async function setDefaultQidDiscoveryConfigurationApi(id, token) {
  const res = await fetch(
    `${apiUrl}/api/qid-discovery-configurations/${id}/default`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    await handleApiError(res, "Failed to set default QID discovery configuration");
  }

  return res.json();
}
