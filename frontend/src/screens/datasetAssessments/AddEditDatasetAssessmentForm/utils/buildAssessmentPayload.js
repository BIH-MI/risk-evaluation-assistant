const metricFields = [
  "sensitivity",
  "replicability",
  "availability",
  "distinguishability",
];

const nullAssessmentMetrics = metricFields.reduce((acc, field) => {
  acc[field] = null;
  return acc;
}, {});

const toNumberOrNull = (value) =>
  value === null || value === undefined || value === "" ? null : Number(value);

function buildAnswerPayload(answers) {
  return Object.entries(answers || {}).map(([questionId, answerData]) => ({
    id: answerData.id || null,
    questionId: Number(questionId),
    selectedOptionId: answerData.optionId,
    selectedOptionCode:
      answerData.code !== answerData.text ? answerData.code : null,
    text: answerData.text,
  }));
}

/**
 * Converts submitted assessment values only. Tooltip evidence and source
 * assessment metadata stay transient and are never included in this payload.
 */
function buildAttributePayload(attribute) {
  const directIdentifier = Boolean(attribute.isDirectIdentifier);
  const excluded = Boolean(attribute.isExcluded);
  const metrics =
    directIdentifier || excluded
      ? nullAssessmentMetrics
      : metricFields.reduce((acc, field) => {
          acc[field] = attribute[field] ?? null;
          return acc;
        }, {});

  return {
    id: attribute.id ?? null,
    attributeId: attribute.attributeId,
    isDirectIdentifier: excluded ? true : directIdentifier,
    ...metrics,
  };
}

function buildTableAssessmentPayload(table) {
  return {
    id: table.id ?? null,
    tableId: table.tableId,
    attributes: (table.attributes || []).map(buildAttributePayload),
  };
}

export function buildAssessmentPayload({
  name,
  description,
  selectedDatasetId,
  selectedConfigId,
  selectedScoringSystemId,
  selectedScoringSystem,
  answers,
  tables,
}) {
  return {
    name,
    description,
    datasetId: selectedDatasetId,
    configurationId: selectedConfigId,
    attributeScoringSystemId:
      selectedScoringSystemId !== null &&
      selectedScoringSystemId !== undefined &&
      selectedScoringSystemId !== ""
        ? toNumberOrNull(selectedScoringSystemId)
        : selectedScoringSystem?.id ?? null,
    answers: buildAnswerPayload(answers),
    tableAssessments: (tables || []).map(buildTableAssessmentPayload),
  };
}
