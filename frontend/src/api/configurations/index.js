const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

// Safely extract the exact error message from Spring Boot's JSON response
async function handleApiError(res, defaultMsg) {
  let errorMsg = defaultMsg;
  const resClone = res.clone(); // Clone to prevent "body stream already read" if JSON fails

  try {
    const errorData = await res.json();
    if (errorData) {
      if (errorData.message) {
        errorMsg = errorData.message;
      } else if (errorData.error && typeof errorData.error === "string") {
        errorMsg = errorData.error; // Fallback to 'error' field
      }
    }
  } catch (e) {
    try {
      const text = await resClone.text();
      // Only use the text if it's not raw HTML (e.g., standard Spring Boot 404 page)
      if (text && !text.trim().startsWith("<")) {
        errorMsg = text;
      }
    } catch (inner) {}
  }

  // Always throw a standard Javascript Error containing a primitive string
  throw new Error(errorMsg);
}

export async function fetchConfigurationsApi(token) {
  const res = await fetch(`${apiUrl}/api/configurations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, "Failed to load configurations");
  return res.json();
}

export async function fetchConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) await handleApiError(res, `Failed to load configuration ${id}`);
  return res.json();
}

export async function createConfigurationApi(configData, token) {
  const res = await fetch(`${apiUrl}/api/configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(configData),
  });
  if (!res.ok) await handleApiError(res, "Failed to create configuration");
  return res.json();
}

export async function forkConfigurationApi(id, newConfigName, token) {
  const res = await fetch(
    `${apiUrl}/api/configurations/${id}/fork?newConfigName=${encodeURIComponent(
      newConfigName
    )}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) await handleApiError(res, "Failed to fork configuration");
  return res.json();
}

export async function updateConfigurationApi(id, payload, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) await handleApiError(res, "Failed to update configuration");

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function deleteConfigurationApi(id, token) {
  const res = await fetch(`${apiUrl}/api/configurations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) await handleApiError(res, "Failed to delete configuration");
  return true;
}
