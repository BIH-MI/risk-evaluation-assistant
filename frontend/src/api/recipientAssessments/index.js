const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

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
        const errText = await response.text();
        throw new Error(`Failed to fetch recipient assessments: ${errText}`);
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
        const errText = await response.text();
        throw new Error(`Failed to add recipient assessment: ${errText}`);
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
        const errText = await response.text();
        throw new Error(`Failed to update recipient assessment: ${errText}`);
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
        const errText = await response.text();
        throw new Error(`Failed to delete recipient assessment: ${errText}`);
    }
    return;
}
