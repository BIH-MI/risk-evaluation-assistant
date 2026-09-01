/**
 * Pure mapping and serialization helpers used by the Data Sharing Activity
 * form. Keeping API-shape translation here makes the React lifecycle easier to
 * reason about and allows the mappings to be unit tested independently.
 */
import {
  ATTRIBUTE_SCALE_FIELDS,
  LEGACY_ATTRIBUTE_SCORING_SYSTEM,
  normalizeAttributeScaleValue,
} from "utils/AttributeScale";

export function resolveDatasetAttributeId(attribute) {
  return (
    attribute.datasetAttributeId ||
    attribute.attributeId ||
    attribute.tableAssessmentAttribute?.attribute?.id ||
    attribute.attribute?.id
  );
}

export function resolveTableAssessmentAttributeId({
  attribute,
  datasetAttributeId,
  sourceAssessmentId,
  assessmentAttributeLookup,
  isActivityOverride,
}) {
  const lookupValue =
    sourceAssessmentId && datasetAttributeId
      ? assessmentAttributeLookup.get(
          `${sourceAssessmentId}:${datasetAttributeId}`
        )
      : null;

  // Backend responses have included flattened IDs and nested entities.
  return (
    attribute.tableAssessmentAttributeId ||
    attribute.tableAssessmentAttribute?.id ||
    lookupValue ||
    (isActivityOverride ? attribute.id : null)
  );
}

function resolveAttributeDataType({
  attribute,
  datasetId,
  datasetAttributeId,
  datasetAttributeDataTypeLookup,
}) {
  if (attribute.dataType) return attribute.dataType;
  if (!datasetId || !datasetAttributeId) return "";

  return (
    datasetAttributeDataTypeLookup.get(`${datasetId}:${datasetAttributeId}`) ||
    ""
  );
}

function resolveEditableTableId(tableAssessment, isActivityOverride) {
  if (isActivityOverride) {
    return (
      tableAssessment.tableAssessmentId ||
      tableAssessment.tableId ||
      tableAssessment.table?.id
    );
  }

  return (
    tableAssessment.tableAssessmentId ||
    tableAssessment.id ||
    tableAssessment.tableId ||
    tableAssessment.table?.id
  );
}

function resolveDatasetTableId(tableAssessment, isActivityOverride) {
  if (isActivityOverride) {
    return tableAssessment.datasetTableId || tableAssessment.table?.table?.id;
  }

  return (
    tableAssessment.datasetTableId ||
    tableAssessment.tableId ||
    tableAssessment.table?.id
  );
}

export function buildDatasetAttributeDataTypeLookup(datasets) {
  const lookup = new Map();

  (datasets || []).forEach((dataset) => {
    (dataset.tables || []).forEach((table) => {
      (table.attributes || []).forEach((attribute) => {
        lookup.set(`${dataset.id}:${attribute.id}`, attribute.dataType);
      });
    });
  });

  return lookup;
}

export function buildAssessmentAttributeLookup(datasetAssessments) {
  const lookup = new Map();

  (datasetAssessments || []).forEach((assessment) => {
    (assessment.tableAssessments || []).forEach((tableAssessment) => {
      (tableAssessment.attributes || []).forEach((attribute) => {
        const datasetAttributeId = resolveDatasetAttributeId(attribute);

        if (datasetAttributeId != null && attribute.id != null) {
          lookup.set(`${assessment.id}:${datasetAttributeId}`, attribute.id);
        }
      });
    });
  });

  return lookup;
}

export function mapAssessmentAttributeToFormState({
  attribute,
  datasetId,
  sourceAssessmentId,
  datasetAttributeDataTypeLookup,
  assessmentAttributeLookup,
  isActivityOverride = false,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
}) {
  const datasetAttributeId = resolveDatasetAttributeId(attribute);
  const tableAssessmentAttributeId = resolveTableAssessmentAttributeId({
    attribute,
    datasetAttributeId,
    sourceAssessmentId,
    assessmentAttributeLookup,
    isActivityOverride,
  });
  const isDirectIdentifier = Boolean(attribute.isDirectIdentifier);
  const isExcluded = Boolean(attribute.isExcluded);
  const shouldSkipScoredValues = isDirectIdentifier || isExcluded;

  return {
    id: isActivityOverride ? attribute.id || null : null,
    attributeId: tableAssessmentAttributeId,
    tableAssessmentAttributeId,
    datasetAttributeId,
    name: attribute.name,
    dataType: resolveAttributeDataType({
      attribute,
      datasetId,
      datasetAttributeId,
      datasetAttributeDataTypeLookup,
    }),
    isDirectIdentifier,
    isExcluded,
    sensitivity: shouldSkipScoredValues
      ? null
      : normalizeAttributeScaleValue(attribute.sensitivity, "sensitivity", {
          allowNull: false,
          scoringSystem,
        }),
    replicability: shouldSkipScoredValues
      ? null
      : normalizeAttributeScaleValue(attribute.replicability, "replicability", {
          allowNull: false,
          scoringSystem,
        }),
    availability: shouldSkipScoredValues
      ? null
      : normalizeAttributeScaleValue(attribute.availability, "availability", {
          allowNull: false,
          scoringSystem,
        }),
    distinguishability: shouldSkipScoredValues
      ? null
      : normalizeAttributeScaleValue(
          attribute.distinguishability,
          "distinguishability",
          { allowNull: false, scoringSystem }
        ),
  };
}

export function mapAssessmentTableToFormState({
  tableAssessment,
  datasetId,
  sourceAssessmentId,
  datasetAttributeDataTypeLookup,
  assessmentAttributeLookup,
  isActivityOverride = false,
  scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
}) {
  return {
    id: isActivityOverride ? tableAssessment.id || null : null,
    tableId: resolveEditableTableId(tableAssessment, isActivityOverride),
    datasetTableId: resolveDatasetTableId(tableAssessment, isActivityOverride),
    tableName: tableAssessment.tableName || tableAssessment.table?.name,
    attributes: (tableAssessment.attributes || []).map((attribute) =>
      mapAssessmentAttributeToFormState({
        attribute,
        datasetId,
        sourceAssessmentId,
        datasetAttributeDataTypeLookup,
        assessmentAttributeLookup,
        isActivityOverride,
        scoringSystem,
      })
    ),
  };
}

/**
 * Converts persisted dataset-assessment or activity-override tables into the
 * common editable table shape used by the Data Sharing Activity form.
 *
 * Dataset attribute IDs identify the underlying dataset schema, while table
 * assessment attribute IDs identify the selected assessment values. These IDs
 * must remain distinct because the activity override references the assessment,
 * not the original dataset attribute directly.
 */
export function mapAssessmentTablesToFormState(
  tableAssessments,
  {
    datasetId,
    sourceAssessmentId,
    datasetAttributeDataTypeLookup,
    assessmentAttributeLookup,
    isActivityOverride = false,
    scoringSystem = LEGACY_ATTRIBUTE_SCORING_SYSTEM,
  }
) {
  if (!tableAssessments) return [];

  return tableAssessments.map((tableAssessment) =>
    mapAssessmentTableToFormState({
      tableAssessment,
      datasetId,
      sourceAssessmentId,
      datasetAttributeDataTypeLookup,
      assessmentAttributeLookup,
      isActivityOverride,
      scoringSystem,
    })
  );
}

export function reconcileTableReferences({
  tables,
  datasetId,
  datasetAssessmentId,
  datasetAttributeDataTypeLookup,
  assessmentAttributeLookup,
}) {
  let changed = false;

  const nextTables = (tables || []).map((table) => ({
    ...table,
    attributes: (table.attributes || []).map((attribute) => {
      const updates = {};

      if (!attribute.dataType) {
        const dataType = resolveAttributeDataType({
          attribute,
          datasetId,
          datasetAttributeId: attribute.datasetAttributeId,
          datasetAttributeDataTypeLookup,
        });

        if (dataType) {
          updates.dataType = dataType;
        }
      }

      if (
        !attribute.tableAssessmentAttributeId &&
        attribute.datasetAttributeId
      ) {
        const tableAssessmentAttributeId = resolveTableAssessmentAttributeId({
          attribute,
          datasetAttributeId: attribute.datasetAttributeId,
          sourceAssessmentId: datasetAssessmentId,
          assessmentAttributeLookup,
          isActivityOverride: false,
        });

        if (tableAssessmentAttributeId) {
          updates.attributeId = tableAssessmentAttributeId;
          updates.tableAssessmentAttributeId = tableAssessmentAttributeId;
        }
      }

      if (Object.keys(updates).length === 0) {
        return attribute;
      }

      changed = true;
      return { ...attribute, ...updates };
    }),
  }));

  return changed ? nextTables : tables;
}

export function buildOriginalAssessmentValueLookup(datasetAssessment) {
  const originalValuesByAttributeId = {};

  (datasetAssessment?.tableAssessments || []).forEach((tableAssessment) => {
    (tableAssessment.attributes || []).forEach((attribute) => {
      const datasetAttributeId = resolveDatasetAttributeId(attribute);
      if (datasetAttributeId === null || datasetAttributeId === undefined) {
        return;
      }

      originalValuesByAttributeId[datasetAttributeId] =
        ATTRIBUTE_SCALE_FIELDS.reduce((values, field) => {
          values[field] = attribute[field];
          return values;
        }, {});
    });
  });

  return originalValuesByAttributeId;
}

/**
 * Builds the Data Sharing Activity API payload.
 *
 * Table-level overrides are persisted only when override mode is enabled.
 * Excluded attributes are omitted because they do not participate in the
 * activity-level attribute assessment.
 */
export function buildDataSharingActivityPayload({
  name,
  description,
  sharedUsernames,
  datasetAssessmentId,
  recipientAssessmentId,
  overrideTables,
  tables,
}) {
  return {
    name: name.trim(),
    description: description.trim(),
    sharedUsernames,
    datasetAssessmentId: Number(datasetAssessmentId),
    recipientAssessmentId: Number(recipientAssessmentId),
    tableAssessments: overrideTables
      ? tables.map((table) => ({
          id: table.id,
          tableId: table.tableAssessmentId || table.tableId,
          tableName: table.tableName,
          attributes: table.attributes
            .filter((attribute) => !attribute.isExcluded)
            .map((attribute) => ({
              id: attribute.id,
              attributeId:
                attribute.tableAssessmentAttributeId || attribute.attributeId,
              sensitivity: attribute.sensitivity,
              replicability: attribute.replicability,
              availability: attribute.availability,
              distinguishability: attribute.distinguishability,
              isDirectIdentifier: attribute.isDirectIdentifier,
            })),
        }))
      : [],
  };
}
