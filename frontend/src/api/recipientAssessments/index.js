import { apiUrl, handleApiError } from "api/httpClient";

/**
 * Fetches all recipient assessments (global endpoint).
 * GET /api/recipients/assessments
 */
export async function fetchRecipientAssessmentsApi(token) {
    const response = await fetch(`${apiUrl}/api/recipients/assessments`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        await handleApiError(response, "Failed to fetch recipient assessments");
    }
    return response.json();
}

/**
 * Fetches all recipient assessments for a specific recipient.
 * GET /api/recipients/{recipientId}/assessments
 */
export async function fetchRecipientAssessmentsByRecipientIdApi(recipientId, token) {
    const response = await fetch(
        `${apiUrl}/api/recipients/${recipientId}/assessments`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (!response.ok) {
        await handleApiError(
            response,
            `Failed to fetch recipient assessments for recipient ${recipientId}`
        );
    }
    return response.json();
}

/**
 * Adds a new recipient assessment under a specific recipient.
 * POST /api/recipients/{recipientId}/assessments
 */
export async function addRecipientAssessmentApi(recipientId, newAssessment, token) {
    const response = await fetch(
        `${apiUrl}/api/recipients/${recipientId}/assessments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(newAssessment),
        }
    );
    if (!response.ok) {
        await handleApiError(response, "Failed to add recipient assessment");
    }
    return response.json();
}

/**
 * Updates an existing recipient assessment by ID.
 * PUT /api/recipients/{recipientId}/assessments/{assessmentId}
 */
export async function updateRecipientAssessmentApi(
    recipientId,
    assessmentId,
    updatedAssessment,
    token
) {
    const response = await fetch(
        `${apiUrl}/api/recipients/${recipientId}/assessments/${assessmentId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updatedAssessment),
        }
    );
    if (!response.ok) {
        await handleApiError(response, "Failed to update recipient assessment");
    }
    return response.json();
}

/**
 * Deletes a recipient assessment by ID.
 * DELETE /api/recipients/{recipientId}/assessments/{assessmentId}
 */
export async function deleteRecipientAssessmentApi(recipientId, assessmentId, token) {
    // Construct the URL here using the consistent BASE_URL
    const response = await fetch(
        `${apiUrl}/api/recipients/${recipientId}/assessments/${assessmentId}`,
        {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (!response.ok) {
        await handleApiError(response, "Failed to delete recipient assessment");
    }
    return;
}
