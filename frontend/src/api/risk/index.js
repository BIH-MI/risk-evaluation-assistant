import { apiUrl, handleApiError } from "api/httpClient";

export async function calculateTotalRiskApi(payload, token) {
  const res = await fetch(`${apiUrl}/api/risk/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await handleApiError(res, "Failed to calculate risk");
  }

  return res.json();
}