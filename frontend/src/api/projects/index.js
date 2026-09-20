import { apiUrl, handleApiError } from "api/httpClient";

export async function fetchProjectsApi(token) {
  const response = await fetch(`${apiUrl}/api/projects`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to fetch projects");
  }

  return response.json();
}

export async function fetchProjectByIdApi(id, token) {
  const response = await fetch(`${apiUrl}/api/projects/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, `Failed to fetch project ${id}`);
  }

  return response.json();
}

export async function createProjectApi(newProject, token) {
  const response = await fetch(`${apiUrl}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newProject),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to create project");
  }

  return response.json();
}

export async function updateProjectApi(id, updatedProject, token) {
  const response = await fetch(`${apiUrl}/api/projects/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatedProject),
  });

  if (!response.ok) {
    await handleApiError(response, `Failed to update project ${id}`);
  }

  return response.json();
}

export async function deleteProjectApi(id, token) {
  const response = await fetch(`${apiUrl}/api/projects/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, `Failed to delete project ${id}`);
  }
}
