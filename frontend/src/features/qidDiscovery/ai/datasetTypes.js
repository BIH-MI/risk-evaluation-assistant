import { toReadableColumnName } from "./columnNameText";

/*
 * Dataset types (domains of a dataset's content) and how the column
 * classifier model is asked for one. Ids match the backend's DatasetType.
 *
 * The suggestion only pre-fills the researcher's choice: it describes the
 * dataset and never affects screening, exclusion or profiling. The prompt is
 * not evaluated, so the suggestion is shown with its score and only when the
 * score is at least DATASET_TYPE_MIN_SCORE.
 */

// The Dataset Type field is hidden for now. The AI model's suggestion is
// still recorded with the dataset (aiSuggestedDatasetType); no type is
// chosen, and a stored type is kept unchanged on edit.
export const SHOW_DATASET_TYPE_FIELD = false;

// `label`: the candidate label given to the model; null for types that are
// only chosen manually.
export const DATASET_TYPES = Object.freeze([
  { id: "CLINICAL_HEALTHCARE", label: "clinical and healthcare data" },
  { id: "FINANCIAL", label: "financial and banking data" },
  {
    id: "GEOSPATIAL_ENVIRONMENTAL",
    label: "geospatial and environmental data",
  },
  { id: "ECOMMERCE_RETAIL", label: "e-commerce and retail sales data" },
  { id: "SOCIAL_DEMOGRAPHIC", label: "social survey and census data" },
  { id: "EDUCATION", label: "education and student data" },
  { id: "EMPLOYMENT_HR", label: "employment and human resources data" },
  { id: "OTHER", label: null },
]);

export const DATASET_TYPE_IDS = Object.freeze(
  DATASET_TYPES.map((type) => type.id)
);

const CLASSIFIED_TYPES = DATASET_TYPES.filter((type) => type.label);

export const DATASET_TYPE_PROMPT = Object.freeze({
  candidateLabels: Object.freeze(CLASSIFIED_TYPES.map((type) => type.label)),
  hypothesisTemplates: Object.freeze(["This dataset contains {}."]),
});

// Below this, no type is suggested (seven candidate labels: 1/7 is chance).
export const DATASET_TYPE_MIN_SCORE = 0.35;

// Long schemas are cut so the premise stays well within the model's input.
const MAX_PREMISE_COLUMNS = 60;

/**
 * Premise text listing a dataset's column names, e.g.
 * "A dataset with the columns: age at diagnosis, sex, date of diagnosis."
 * Only names are used, never values. Empty when there are no names.
 */
export function buildDatasetTypePremise(columnNames = []) {
  const names = Array.from(
    new Set(columnNames.map(toReadableColumnName).filter(Boolean))
  ).slice(0, MAX_PREMISE_COLUMNS);
  return names.length ? `A dataset with the columns: ${names.join(", ")}.` : "";
}

/**
 * The suggested type from the model's ranked labels and scores, or null
 * when the best score is below DATASET_TYPE_MIN_SCORE.
 *
 * @returns {{ type: string, score: number } | null}
 */
export function interpretDatasetTypeClassification({ labels, scores }) {
  const type = CLASSIFIED_TYPES.find((entry) => entry.label === labels?.[0]);
  const score = Number(scores?.[0]);
  if (!type || !Number.isFinite(score) || score < DATASET_TYPE_MIN_SCORE) {
    return null;
  }
  return { type: type.id, score };
}
