import { buildDirectIdentifierEvidenceFromFieldName } from "./profiling/directIdentifierEvidence";
import {
  DIRECT_IDENTIFIER_CONFIDENCE,
  GENERIC_IDENTIFIER_FIELD_SOURCE,
} from "./profiling/directIdentifierRules";

/*
 * Answers "what should REA do with Direct Identifier evidence?": default
 * exclusion, preserving or clearing user override decisions, submission
 * validation, and override warnings. Detection itself lives in
 * profiling/directIdentifierEvidence.js.
 *
 * Direct Identifier detection happens before subset profiling. Excluded
 * identifiers remain available to transient profiling for field evidence, but
 * are omitted from quantitative Distinguishability subset evidence.
 */

const formatFallbackLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getTableAttributes = (table = {}) =>
  Array.isArray(table.columnMeta) && table.columnMeta.length > 0
    ? table.columnMeta
    : table.attributes || [];

const getAttributeName = (column = {}) =>
  column.field || column.name || "";

const hasDirectIdentifierExclusionDecision = (column = {}) =>
  (column.autoExcludedDirectIdentifier === true && column.excluded === true) ||
  column.directIdentifierExclusionOverridden === true;

const getDirectIdentifierConcept = (evidence) => evidence?.concept || null;

/**
 * True only for HIGH-confidence evidence (a strong field-name alias or a
 * supported value pattern). LOW-confidence/`requiresReview` evidence is kept
 * semantically separate from confirmed Direct Identifiers.
 */
export function shouldAutoExcludeDirectIdentifier(evidence) {
  return (
    evidence?.detected === true &&
    evidence.confidence === DIRECT_IDENTIFIER_CONFIDENCE.HIGH
  );
}

/**
 * Detects generic ID-like field-name evidence without changing its LOW
 * confidence classification. REA policy uses this to default-exclude generic
 * IDs from subset profiling while still surfacing them for review.
 */
function hasGenericIdentifierFieldEvidence(evidence) {
  return Boolean(evidence?.sources?.includes(GENERIC_IDENTIFIER_FIELD_SOURCE));
}

/**
 * Returns true when an identifier should be excluded from subset profiling by
 * default. Confirmed Direct Identifiers qualify through HIGH evidence; generic
 * IDs qualify through their LOW generic field-name source.
 */
function shouldExcludeIdentifierByDefault(evidence) {
  return (
    shouldAutoExcludeDirectIdentifier(evidence) ||
    hasGenericIdentifierFieldEvidence(evidence)
  );
}

const shouldResetAutomaticDirectIdentifierDecision = (
  previousEvidence,
  nextEvidence
) =>
  getDirectIdentifierConcept(previousEvidence) !==
    getDirectIdentifierConcept(nextEvidence) ||
  shouldExcludeIdentifierByDefault(previousEvidence) !==
    shouldExcludeIdentifierByDefault(nextEvidence);

function resetAutomaticDirectIdentifierDecision(column = {}) {
  const wasOnlyAutoExcludedDirectIdentifier =
    column.autoExcludedDirectIdentifier === true && column.excluded === true;

  return {
    ...column,
    excluded: wasOnlyAutoExcludedDirectIdentifier
      ? false
      : Boolean(column.excluded),
    autoExcludedDirectIdentifier: false,
    directIdentifierExclusionOverridden: false,
  };
}

const getDirectIdentifierConceptLabel = (t, concept) => {
  if (!concept) return "";
  return t(
    `datasets.directIdentifiers.concepts.${concept}`,
    formatFallbackLabel(concept)
  );
};

const getDirectIdentifierEvidenceSourceSummary = (t, evidence) => {
  const sourceKinds = [];

  (evidence?.sources || []).forEach((source) => {
    if (
      source.startsWith("field-name:") &&
      !sourceKinds.includes("fieldName")
    ) {
      sourceKinds.push("fieldName");
    }
    if (
      source.startsWith("value-pattern:") &&
      !sourceKinds.includes("valuePattern")
    ) {
      sourceKinds.push("valuePattern");
    }
  });

  return sourceKinds
    .map((sourceKind) =>
      t(
        `datasets.directIdentifiers.evidenceSources.${sourceKind}`,
        formatFallbackLabel(sourceKind)
      )
    )
    .join(" + ");
};

const formatDirectIdentifierItem = (t, item) => {
  const attributeName = getAttributeName(item.column);
  const evidence = item.column?.directIdentifierEvidence;
  const conceptLabel = evidence?.concept
    ? getDirectIdentifierConceptLabel(t, evidence.concept)
    : hasGenericIdentifierFieldEvidence(evidence)
    ? t(
        "datasets.directIdentifiers.potentialIdentifier",
        "Potential identifier"
      )
    : "";
  const tablePrefix = item.tableName ? `${item.tableName}: ` : "";

  return `${tablePrefix}${attributeName}${
    conceptLabel ? ` (${conceptLabel})` : ""
  }`;
};

export const buildDirectIdentifierSubmissionMessage = (t, validation) => {
  if (!validation?.includedDirectIdentifiers?.length) return "";

  return [
    t("datasets.directIdentifiers.includedTitle"),
    ...validation.includedDirectIdentifiers.map(
      (item) => `- ${formatDirectIdentifierItem(t, item)}`
    ),
    "",
    t("datasets.directIdentifiers.includedAction"),
  ].join("\n");
};

export const buildDirectIdentifierReviewMessage = (t, validation) => {
  if (!validation?.reviewItems?.length) return "";

  return [
    t("datasets.directIdentifiers.reviewTitle"),
    ...validation.reviewItems.map(
      (item) => `- ${formatDirectIdentifierItem(t, item)}`
    ),
    "",
    t("datasets.directIdentifiers.reviewAction"),
  ].join("\n");
};

export const buildDirectIdentifierOverrideWarning = (t, column, excluded) => {
  if (excluded !== false || !isHighConfidenceDirectIdentifierColumn(column)) {
    return "";
  }

  const evidence = column?.directIdentifierEvidence;
  const conceptLabel = getDirectIdentifierConceptLabel(t, evidence?.concept);
  const sourceSummary = getDirectIdentifierEvidenceSourceSummary(t, evidence);

  return [
    t("datasets.directIdentifiers.overrideWarning", {
      attribute: getAttributeName(column),
    }),
    t("datasets.directIdentifiers.overrideGuidance"),
    conceptLabel
      ? t("datasets.directIdentifiers.detectedAs", {
          concept: conceptLabel,
        })
      : "",
    sourceSummary
      ? t("datasets.directIdentifiers.evidence", {
          sources: sourceSummary,
        })
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * Applies initial exclusion defaults from Direct Identifier evidence while
 * preserving explicit user overrides. This is where generic IDs become excluded
 * by default without being promoted to HIGH-confidence Direct Identifiers.
 */
export function applyDirectIdentifierEvidenceDefaults(
  column = {},
  directIdentifierEvidence = column.directIdentifierEvidence || null,
  options = {}
) {
  const nextColumn =
    options.resetDecisionOnConceptChange &&
    shouldResetAutomaticDirectIdentifierDecision(
      column.directIdentifierEvidence,
      directIdentifierEvidence
    )
      ? resetAutomaticDirectIdentifierDecision(column)
      : column;
  const wasExplicitlyExcludedBeforeDirectIdentifier =
    nextColumn.excluded === true &&
    nextColumn.autoExcludedDirectIdentifier !== true &&
    nextColumn.directIdentifierExclusionOverridden !== true;

  const shouldForceIdentifierExclusion =
    shouldExcludeIdentifierByDefault(directIdentifierEvidence) &&
    !hasDirectIdentifierExclusionDecision(nextColumn);
  const applyInitialAutoExclusion =
    shouldForceIdentifierExclusion &&
    !wasExplicitlyExcludedBeforeDirectIdentifier;

  return {
    ...nextColumn,
    directIdentifierEvidence,
    excluded: shouldForceIdentifierExclusion
      ? true
      : Boolean(nextColumn.excluded),
    autoExcludedDirectIdentifier: Boolean(
      nextColumn.autoExcludedDirectIdentifier || applyInitialAutoExclusion
    ),
  };
}

/**
 * Builds schema-only Direct Identifier evidence for an attribute whose raw
 * values are not being scanned, then applies the same default-exclusion policy
 * used by full CSV profiling.
 */
export function applySchemaDirectIdentifierEvidence(column = {}, fieldName) {
  const directIdentifierEvidence = {
    ...buildDirectIdentifierEvidenceFromFieldName(
      fieldName || getAttributeName(column)
    ),
    schemaOnly: true,
  };

  return applyDirectIdentifierEvidenceDefaults(
    column,
    directIdentifierEvidence,
    {
      resetDecisionOnConceptChange: true,
    }
  );
}

/**
 * Checks the reviewed schema before submit. Confirmed Direct Identifiers must
 * be excluded; LOW/review potential identifiers are reported only when the user
 * has chosen to include them.
 */
export function validateDirectIdentifierExclusions(tables = []) {
  const includedDirectIdentifiers = [];
  const reviewItems = [];

  tables.forEach((table) => {
    getTableAttributes(table).forEach((column) => {
      const evidence = column.directIdentifierEvidence;

      if (shouldAutoExcludeDirectIdentifier(evidence)) {
        if (column.excluded !== true) {
          includedDirectIdentifiers.push({
            tableName: table.name,
            column,
          });
        }
        return;
      }

      if (evidence?.requiresReview && column.excluded !== true) {
        reviewItems.push({
          tableName: table.name,
          column,
        });
      }
    });
  });

  return {
    canSubmit: includedDirectIdentifiers.length === 0,
    includedDirectIdentifiers,
    reviewItems,
  };
}

/**
 * True only for confirmed Direct Identifier evidence. This keeps blocking
 * validation and override warnings separate from generic ID default exclusion.
 */
function isHighConfidenceDirectIdentifierColumn(column) {
  return shouldAutoExcludeDirectIdentifier(column?.directIdentifierEvidence);
}

/**
 * True for identifiers that the UI should exclude by default. Generic ID-like
 * fields satisfy this through LOW/review evidence, not by pretending they are
 * confirmed Direct Identifiers.
 */
export function isDefaultExcludedIdentifierColumn(column) {
  return shouldExcludeIdentifierByDefault(column?.directIdentifierEvidence);
}
