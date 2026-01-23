import { createSelector } from "@reduxjs/toolkit";

export const selectDatasetByDatasetId = createSelector(
  [(state) => state.datasets.items, (state, datasetId) => datasetId],
  (datasets, datasetId) =>
    datasets.find((dataset) => dataset.id === parseInt(datasetId))
);

export const selectDatasetNameByDatasetId = createSelector(
  [(state) => state.datasets.items, (state, datasetId) => datasetId],
  (datasets, datasetId) => {
    const dataset = datasets.find(
      (dataset) => dataset.id === parseInt(datasetId)
    );
    return dataset ? dataset.name : null;
  }
);

export const selectAttributesByDatasetId = createSelector(
  [(state) => state.datasets.items, (state, datasetId) => datasetId],
  (datasets, datasetId) => {
    const dataset = datasets.find(
      (dataset) => dataset.id === parseInt(datasetId)
    );

    return dataset ? dataset.attributes : [];
  }
);
