import { AI_COLUMN_TEXT_FORMATS } from "./columnNameText";
import {
  AI_HYPOTHESIS_TEMPLATES,
  AI_SEMANTIC_CATEGORIES,
} from "./semanticCategories";

/*
 * Prompt profiles: everything a zero-shot NLI model is asked. A registry
 * entry names its profile ("promptProfile"). All profiles share the category
 * ids of semanticCategories.js, so predictions of different models are
 * comparable at the category level; premise format, label wording and
 * templates may differ per model.
 *
 * The profile id is its version. The prompt fingerprint (modelConfig.js)
 * also catches changes made without a new id, and any change makes models
 * using the profile unevaluated. Add a new profile instead of changing one
 * that a validation record refers to.
 *
 * - inputFormat: premise format (columnNameText.js).
 * - labels: candidate label per category id; omitted categories use the
 *   category's default `label`.
 * - hypothesisTemplates: scores are averaged over these templates.
 */
const AI_PROMPT_PROFILES = Object.freeze({
  // Developed and evaluated with DeBERTaV3-XSmall (see semanticCategories.js).
  "column-zero-shot-v2": Object.freeze({
    inputFormat: "column-name-text-v1",
    labels: Object.freeze({}),
    hypothesisTemplates: AI_HYPOTHESIS_TEMPLATES,
  }),
  // column-zero-shot-v2 with a premise without the word "name" (see
  // columnNameText.js), for BERT-style MNLI models. Not evaluated.
  "data-field-zero-shot-v1": Object.freeze({
    inputFormat: "data-field-text-v1",
    labels: Object.freeze({}),
    hypothesisTemplates: AI_HYPOTHESIS_TEMPLATES,
  }),
});

function buildPrompt(id, profile) {
  if (!AI_COLUMN_TEXT_FORMATS[profile.inputFormat]) {
    throw new Error(
      `Prompt profile ${id}: unknown input format ${profile.inputFormat}`
    );
  }
  const candidateLabels = AI_SEMANTIC_CATEGORIES.map(
    (category) => profile.labels[category.id] || category.label
  );
  if (new Set(candidateLabels).size !== candidateLabels.length) {
    throw new Error(`Prompt profile ${id}: candidate labels must be unique`);
  }
  const categoryByLabel = new Map(
    candidateLabels.map((label, index) => [
      label,
      AI_SEMANTIC_CATEGORIES[index],
    ])
  );
  return Object.freeze({
    id,
    inputFormat: profile.inputFormat,
    candidateLabels: Object.freeze(candidateLabels),
    hypothesisTemplates: profile.hypothesisTemplates,
    /** Semantic category of a candidate label of this profile, or null. */
    getCategoryByLabel: (label) => categoryByLabel.get(label) || null,
  });
}

const PROMPTS = new Map(
  Object.entries(AI_PROMPT_PROFILES).map(([id, profile]) => [
    id,
    buildPrompt(id, profile),
  ])
);

/** Resolved prompt profile, or null for an unknown id. */
export function getPromptProfile(id) {
  return PROMPTS.get(id) || null;
}
