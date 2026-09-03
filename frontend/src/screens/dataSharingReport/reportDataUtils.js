import {
  ATTRIBUTE_SCALE_FIELDS,
  LEGACY_ATTRIBUTE_SCORING_SYSTEM,
  formatScoreRange,
  formatScoreValue,
  getIdentifiabilityScoreRange,
  getOptionsForAttributeField,
  getSensitivityScoreRange,
  normalizeAttributeScaleValue,
} from "utils/AttributeScale";

export const REPORT_SCALE_FIELDS = Object.freeze([
  "replicability",
  "availability",
  "distinguishability",
  "sensitivity",
]);

export const DATASET_RISK_CATEGORY_CODES = new Set([
  "IMPACT",
  "DATA_RISK",
  "IP",
]);

export const LEGACY_IDENTIFIABILITY_THRESHOLD = 5;
export const LEGACY_SENSITIVITY_THRESHOLD = 2;

const EMPTY_ARRAY = [];

export function isBlankValue(value) {
  return value === null || value === undefined || value === "";
}

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function isUnscoredAttribute(attribute) {
  return Boolean(attribute?.isDirectIdentifier || attribute?.isExcluded);
}

export function normalizeReportAttributeScores(
  attribute,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM
) {
  const unscored = isUnscoredAttribute(attribute);

  return ATTRIBUTE_SCALE_FIELDS.reduce(
    (normalizedAttribute, field) => ({
      ...normalizedAttribute,
      [field]: unscored
        ? null
        : normalizeAttributeScaleValue(attribute?.[field], field, {
            allowNull: false,
            scoringSystem,
          }),
    }),
    {
      ...attribute,
      isDirectIdentifier: Boolean(attribute?.isDirectIdentifier),
      isExcluded: Boolean(attribute?.isExcluded),
    }
  );
}

function normalizeActivityTableAssessment(tableAssessment, scoringSystem) {
  return {
    ...tableAssessment,
    id: tableAssessment?.id ?? tableAssessment?.tableId,
    tableId: tableAssessment?.tableId ?? tableAssessment?.id,
    tableName:
      tableAssessment?.tableName ||
      tableAssessment?.name ||
      tableAssessment?.table?.name,
    attributes: (tableAssessment?.attributes || EMPTY_ARRAY).map((attribute) =>
      normalizeReportAttributeScores(attribute, scoringSystem)
    ),
  };
}

function normalizeDatasetAssessmentAttribute(attribute) {
  return {
    id: attribute?.id ?? attribute?.attributeId,
    attributeId: attribute?.attributeId ?? attribute?.id,
    name: attribute?.name,
    sensitivity: attribute?.sensitivity,
    replicability: attribute?.replicability,
    availability: attribute?.availability,
    distinguishability: attribute?.distinguishability,
    isDirectIdentifier: Boolean(attribute?.isDirectIdentifier),
    isExcluded: Boolean(attribute?.isExcluded),
  };
}

function normalizeDatasetTableAssessment(tableAssessment, scoringSystem) {
  return {
    id: tableAssessment?.tableId ?? tableAssessment?.id,
    tableId: tableAssessment?.tableId ?? tableAssessment?.id,
    tableName:
      tableAssessment?.tableName ||
      tableAssessment?.name ||
      tableAssessment?.table?.name,
    attributes: (tableAssessment?.attributes || EMPTY_ARRAY).map((attribute) =>
      normalizeReportAttributeScores(
        normalizeDatasetAssessmentAttribute(attribute),
        scoringSystem
      )
    ),
  };
}

export function buildEffectiveTableAssessments({
  activityTableAssessments,
  datasetTableAssessments,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
}) {
  if (
    Array.isArray(activityTableAssessments) &&
    activityTableAssessments.length > 0
  ) {
    /**
     * Data Sharing Activity table assessments are explicit activity-level
     * overrides. When present, they replace the Dataset Assessment table values.
     */
    return activityTableAssessments.map((tableAssessment) =>
      normalizeActivityTableAssessment(tableAssessment, scoringSystem)
    );
  }

  if (!Array.isArray(datasetTableAssessments)) return [];

  return datasetTableAssessments.map((tableAssessment) =>
    normalizeDatasetTableAssessment(tableAssessment, scoringSystem)
  );
}

export function resolveAssessmentConfiguration(assessment, configurations) {
  if (assessment?.configuration) return assessment.configuration;
  if (!assessment?.configurationId) return null;

  return (
    (configurations || EMPTY_ARRAY).find(
      (configuration) =>
        String(configuration?.id) === String(assessment.configurationId)
    ) || null
  );
}

export function resolveAttributeScoringSystem(datasetAssessment) {
  return (
    datasetAssessment?.attributeScoringSystem || LEGACY_ATTRIBUTE_SCORING_SYSTEM
  );
}

export function clampThresholdToRange(value, range) {
  if (isBlankValue(value)) return "";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  return Math.max(range.min, Math.min(range.max, numericValue));
}

export function resolveAttributeThreshold({
  assessmentThreshold,
  scoringSystemThreshold,
  legacyThreshold,
  range,
}) {
  const threshold = !isBlankValue(assessmentThreshold)
    ? assessmentThreshold
    : !isBlankValue(scoringSystemThreshold)
    ? scoringSystemThreshold
    : legacyThreshold;
  const clampedThreshold = clampThresholdToRange(threshold, range);

  return isBlankValue(clampedThreshold)
    ? ""
    : formatScoreValue(clampedThreshold);
}

export function thresholdInputToNumber(value, fallback = 0) {
  if (isBlankValue(value)) return fallback;

  return toFiniteNumber(value, fallback);
}

export function getReportAttributeThresholds(datasetAssessment, scoringSystem) {
  const identifiabilityRange = getIdentifiabilityScoreRange(scoringSystem);
  const sensitivityRange = getSensitivityScoreRange(scoringSystem);

  return {
    identifiabilityThreshold: resolveAttributeThreshold({
      assessmentThreshold: datasetAssessment?.attributeIdentifiabilityThreshold,
      scoringSystemThreshold: scoringSystem?.defaultIdentifiabilityThreshold,
      legacyThreshold: LEGACY_IDENTIFIABILITY_THRESHOLD,
      range: identifiabilityRange,
    }),
    sensitivityThreshold: resolveAttributeThreshold({
      assessmentThreshold: datasetAssessment?.attributeSensitivityThreshold,
      scoringSystemThreshold: scoringSystem?.defaultSensitivityThreshold,
      legacyThreshold: LEGACY_SENSITIVITY_THRESHOLD,
      range: sensitivityRange,
    }),
  };
}

export function safeFileSegment(value, fallback) {
  const sourceValue = !isBlankValue(value)
    ? value
    : !isBlankValue(fallback)
    ? fallback
    : "report";
  const segment = String(sourceValue)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();

  return segment || fallback || "report";
}

function normalizeCategoryCode(categoryCode) {
  return String(categoryCode || "").toUpperCase();
}

function normalizeComparableCode(categoryCode) {
  return String(categoryCode || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function isDatasetRiskCategoryCode(categoryCode) {
  return DATASET_RISK_CATEGORY_CODES.has(normalizeCategoryCode(categoryCode));
}

export function getCategoryClassification(
  result,
  categoryCode,
  unknownText = "UNKNOWN"
) {
  if (!result?.categoryBreakdown) return unknownText;

  const cleanCode = normalizeComparableCode(categoryCode);

  for (const [key, value] of Object.entries(result.categoryBreakdown)) {
    const cleanKey = normalizeComparableCode(key);
    if (cleanKey === cleanCode || cleanKey.includes(cleanCode)) {
      return value?.categoricalValue || unknownText;
    }
  }

  return unknownText;
}

export function getCategoryConfiguration({
  categoryCode,
  datasetConfiguration,
  recipientConfiguration,
}) {
  const targetConfiguration = isDatasetRiskCategoryCode(categoryCode)
    ? datasetConfiguration
    : recipientConfiguration;

  return (
    targetConfiguration?.categories?.find(
      (category) =>
        normalizeCategoryCode(category?.code) ===
        normalizeCategoryCode(categoryCode)
    ) || null
  );
}

export function getCategoryDisplayName(categoryCode, configuration) {
  if (configuration?.name) return configuration.name;

  const code = String(categoryCode || "");
  return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
}

export function hasCategoryData(categoryData) {
  return (
    toFiniteNumber(categoryData?.positiveCount) > 0 ||
    toFiniteNumber(categoryData?.neutralCount) > 0 ||
    toFiniteNumber(categoryData?.negativeCount) > 0
  );
}

export function isProtectiveRiskCategory(categoryCode, configuration) {
  return (
    configuration?.riskEffect === "DECREASES_RISK" ||
    normalizeCategoryCode(categoryCode) === "CONTROLS"
  );
}

export function formatPercentageValue(value) {
  if (isBlankValue(value)) return "—";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "—";

  return `${(numericValue * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function riskThresholdToPercentage(value) {
  const formattedValue = formatPercentageValue(value);
  return formattedValue === "—" ? "" : formattedValue.replace("%", "");
}

export function percentageToRiskThreshold(value) {
  if (isBlankValue(value)) return "";

  const numericValue = toFiniteNumber(value, NaN);
  return Number.isFinite(numericValue) ? numericValue / 100 : "";
}

export function getManualRiskThresholdForPayload({
  isThresholdOverwritten,
  manualRiskThreshold,
}) {
  if (!isThresholdOverwritten || isBlankValue(manualRiskThreshold)) {
    return null;
  }

  const numericThreshold = toFiniteNumber(manualRiskThreshold, NaN);
  return Number.isFinite(numericThreshold) ? numericThreshold : null;
}

export function buildCalculateRiskPayload({
  activityId,
  isThresholdOverwritten,
  manualRiskThreshold,
}) {
  return {
    activityId,
    manualRiskThreshold: getManualRiskThresholdForPayload({
      isThresholdOverwritten,
      manualRiskThreshold,
    }),
  };
}

export function formatScoringSystemLabel(scoringSystem, fallback = "N/A") {
  if (!scoringSystem) return fallback;

  const name = scoringSystem.name || fallback;
  const version =
    scoringSystem.versionNumber || scoringSystem.currentVersion || 1;

  return `${name} v${version}`;
}

function getScoreOptionRange(field, scoringSystem) {
  const values = getOptionsForAttributeField(field, scoringSystem)
    .map((option) => Number(option.value))
    .filter(Number.isFinite);

  if (values.length === 0) return null;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function formatAttributeDimensionRanges(scoringSystem, labelsByField) {
  return REPORT_SCALE_FIELDS.map((field) => {
    const range = getScoreOptionRange(field, scoringSystem);
    const label = labelsByField?.[field] || field;

    return range ? `${label}: ${formatScoreRange(range)}` : label;
  }).join(", ");
}

export function classifyReportAttribute({
  attribute,
  identifiabilityThreshold,
  sensitivityThreshold,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
}) {
  const normalizedAttribute = normalizeReportAttributeScores(
    attribute,
    scoringSystem
  );

  if (isUnscoredAttribute(normalizedAttribute)) {
    return {
      normalizedAttribute,
      directIdentifier: Boolean(normalizedAttribute.isDirectIdentifier),
      quasiIdentifier: false,
      sensitiveAttribute: false,
      totalQiScore: null,
    };
  }

  const totalQiScore =
    normalizedAttribute.replicability +
    normalizedAttribute.availability +
    normalizedAttribute.distinguishability;

  return {
    normalizedAttribute,
    directIdentifier: false,
    quasiIdentifier:
      totalQiScore > thresholdInputToNumber(identifiabilityThreshold),
    sensitiveAttribute:
      normalizedAttribute.sensitivity >
      thresholdInputToNumber(sensitivityThreshold),
    totalQiScore,
  };
}

export function buildAttributeAssessmentRows({
  attributes,
  identifiabilityThreshold,
  sensitivityThreshold,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
}) {
  const rows = (attributes || EMPTY_ARRAY).map((attribute) => {
    const classification = classifyReportAttribute({
      attribute,
      identifiabilityThreshold,
      sensitivityThreshold,
      scoringSystem,
    });
    const { normalizedAttribute } = classification;

    return {
      id: normalizedAttribute.id ?? normalizedAttribute.attributeId,
      name: normalizedAttribute.name,
      replicability: normalizedAttribute.replicability,
      availability: normalizedAttribute.availability,
      distinguishability: normalizedAttribute.distinguishability,
      sensitivity: normalizedAttribute.sensitivity,
      isExcluded: Boolean(normalizedAttribute.isExcluded),
      directIdentifier: classification.directIdentifier,
      quasiIdentifier: classification.quasiIdentifier,
      sensitiveAttribute: classification.sensitiveAttribute,
      totalQiScore: classification.totalQiScore,
    };
  });

  return rows.sort(
    (leftRow, rightRow) =>
      getAttributeClassificationRank(leftRow) -
      getAttributeClassificationRank(rightRow)
  );
}

export function buildAttributeAssessmentTables({
  tableAssessments,
  identifiabilityThreshold,
  sensitivityThreshold,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
}) {
  if (!Array.isArray(tableAssessments) || tableAssessments.length === 0) {
    return [];
  }

  return tableAssessments.map((tableAssessment) => ({
    id: tableAssessment.id ?? tableAssessment.tableId,
    tableName:
      tableAssessment.name ||
      tableAssessment.tableName ||
      tableAssessment.table?.name,
    rows: buildAttributeAssessmentRows({
      attributes: tableAssessment.attributes,
      identifiabilityThreshold,
      sensitivityThreshold,
      scoringSystem,
    }),
  }));
}

export function getAttributeClassificationRank(attributeRow) {
  if (attributeRow.directIdentifier) return 1;
  if (attributeRow.quasiIdentifier) return 2;
  if (attributeRow.sensitiveAttribute) return 3;
  return 4;
}
