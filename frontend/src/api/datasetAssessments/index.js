const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";


// Fetch all assessments across all datasets
export async function fetchDatasetAssessmentsApi(token) {
    const res = await fetch(`${apiUrl}/api/datasets/assessments`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new Error("Failed to fetch dataset assessments");
    }
    return res.json();
}


// If you still need per‐dataset fetch, keep this separate:
export async function fetchDatasetAssessmentsByDatasetIdApi(datasetId, token) {
    const res = await fetch(
        `${apiUrl}/api/datasets/${datasetId}/assessments`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        }
    );
    if (!res.ok) {
        throw new Error("Failed to fetch dataset assessments for dataset " + datasetId);
    }
    return res.json();
}


export async function addDatasetAssessmentApi(datasetId, newAssessment, token) {
    const res = await fetch(
        `${apiUrl}/api/datasets/${datasetId}/assessments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newAssessment),
        }
    );
    if (!res.ok) {
        throw new Error("Failed to add dataset assessment");
    }
    return res.json();
}

export async function copyDatasetAssessmentApi(datasetId, assessmentId, token) {
    const res = await fetch(
        `${apiUrl}/api/datasets/${datasetId}/assessments/${assessmentId}/copy`,
        {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (!res.ok) {
        throw new Error("Failed to copy dataset assessment");
    }
    return res.json(); // returns the newly created assessment DTO
}

export async function updateDatasetAssessmentApi(
    datasetId,
    assessmentId,
    updatedAssessment,
    token
) {
    const res = await fetch(
        `${apiUrl}/api/datasets/${datasetId}/assessments/${assessmentId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatedAssessment),
        }
    );
    if (!res.ok) {
        throw new Error("Failed to update dataset assessment");
    }
    return res.json();
}


export async function deleteDatasetAssessmentApi(
    datasetId,
    assessmentId,
    token
) {
    const res = await fetch(
        `${apiUrl}/api/datasets/${datasetId}/assessments/${assessmentId}`,
        {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (!res.ok) {
        throw new Error("Failed to delete dataset assessment");
    }
    return res.ok;
}
