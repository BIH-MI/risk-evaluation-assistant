const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

export async function fetchRecipientsApi(token) {
    const response = await fetch(`${apiUrl}/api/recipients`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error("Failed to fetch recipients");
    }
    return response.json();
}

export async function addRecipientApi(newRecipient, token) {
    const resp = await fetch(`${apiUrl}/api/recipients`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRecipient),
    });
    if (!resp.ok) throw new Error("Failed to add recipient");
    return resp.json();
}

export async function updateRecipientApi(id, updated, token) {
    const resp = await fetch(`${apiUrl}/api/recipients/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
    });
    if (!resp.ok) throw new Error("Failed to update recipient");
    return resp.json();
}

export async function deleteRecipientApi(id, token) {
    const resp = await fetch(`${apiUrl}/api/recipients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error("Failed to delete recipient");
    return resp.ok;
}
