const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

export async function calculateExposureRiskApi(dto, save = false, token) {
    const url = new URL(`${apiUrl}/api/reports/total-risk`);

    if (save) {
        url.searchParams.append("save", "true");
    }

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
    });

    if (!response.ok) {
        throw new Error("Failed to calculate total exposure risk");
    }

    return response.json();
}

export async function fetchReportsApi(token) {
    const response = await fetch(`${apiUrl}/api/reports`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`},
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch reports: ${errText}`);
    }
    return response.json();
}