const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";


export async function calculateTotalRiskApi(payload, token) {
  const res = await fetch(`${API_URL}/api/risk/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to calculate risk");
  }

  return res.json();
}