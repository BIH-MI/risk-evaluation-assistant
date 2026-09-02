export const QID_SEARCH_TYPE_LABELS = Object.freeze({
  AUTOMATIC: "Automatic",
  EXACT: "Exact Level-Wise Search",
  BEAM: "Beam Search",
});

export const QID_SEARCH_TYPE_OPTIONS = Object.entries(
  QID_SEARCH_TYPE_LABELS
).map(([value, label]) => ({ value, label }));

export const getQidSearchTypeLabel = (value) =>
  QID_SEARCH_TYPE_LABELS[value] || value || "";
