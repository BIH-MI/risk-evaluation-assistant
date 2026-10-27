import { apiUrl, handleApiError } from "api/httpClient";

/** Installation status of every supported AI model. */
export async function fetchAiModelsApi(token) {
  const res = await fetch(`${apiUrl}/api/ai-models`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to load AI model installation status");
  }

  return res.json();
}

/** Starts installing an approved model (administrators only). */
export async function installAiModelApi(modelId, token) {
  const res = await fetch(
    `${apiUrl}/api/ai-models/${encodeURIComponent(modelId)}/install`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    await handleApiError(res, "Failed to install AI model");
  }

  return res.json();
}
