const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

/** GET /api/data-sharing-activities */
export async function fetchDataSharingActivitiesApi(token) {
    const response = await fetch(`${apiUrl}/api/data-sharing-activities`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`},
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch data sharing activities: ${errText}`);
    }
    return response.json();
}

/** GET /api/data-sharing-activities/{id} */
export async function fetchDataSharingActivityByIdApi(id, token) {
    const response = await fetch(`${apiUrl}/api/data-sharing-activities/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch data sharing activity ${id}: ${errText}`);
    }
    return response.json();
}

/** POST /api/data-sharing-activities */
export async function createDataSharingActivityApi(newActivity, token) {
    const response = await fetch(`${apiUrl}/api/data-sharing-activities`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newActivity),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to create data sharing activity: ${errText}`);
    }

    return response.json();
}

/** PUT /api/data-sharing-activities/{id} */
export async function updateDataSharingActivityApi(id, updatedActivity, token) {
    const response = await fetch(`${apiUrl}/api/data-sharing-activities/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedActivity),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to update data sharing activity ${id}: ${errText}`);
    }

    return response.json();
}

/** DELETE /api/data-sharing-activities/{id} */
export async function deleteDataSharingActivityApi(id, token) {
    const response = await fetch(`${apiUrl}/api/data-sharing-activities/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to delete data sharing activity ${id}: ${errText}`);
    }

    return;
}

export async function computeRiskOfExposureApi(id, identifiabilityThreshold, sensitivityThreshold, token) {
    const response = await fetch(`${apiUrl}/api/data-sharing-activities/score/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            identifiabilityThreshold,
            sensitivityThreshold,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to compute risk of exposure: ${errText}`);
    }

    return response.json();
}

export async function saveRiskExposureApi(id, riskPayload, token) {
    const response = await fetch(
        `${apiUrl}/api/data-sharing-activities/score/${id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(riskPayload),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to save risk exposure: ${errText}`);
    }
    return response.json();
}
