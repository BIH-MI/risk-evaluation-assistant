const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

export async function fetchDatasetsApi(token) {
  const response = await fetch(`${apiUrl}/api/datasets`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch datasets");
  }

  return response.json();
}

export async function addDatasetApi(newDataset, token) {
  const response = await fetch(`${apiUrl}/api/datasets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newDataset),
  });

  if (!response.ok) {
    throw new Error("Failed to add dataset");
  }

  return response.json();
}

export async function updateDatasetApi(datasetId, updatedDataset, token) {
  const response = await fetch(`${apiUrl}/api/datasets/${datasetId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatedDataset),
  });

  if (!response.ok) {
    throw new Error("Failed to update dataset");
  }
  return response.json();
}

export async function deleteDatasetApi(datasetId, token) {
  const response = await fetch(`${apiUrl}/api/datasets/${datasetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to delete the dataset");
  }

  return response.ok;
}
