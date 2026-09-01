import React, { useMemo, useCallback } from "react";
import { IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  MemoNameCell,
  MemoScaleCell,
  MemoCheckboxCell,
} from "../RowComponents";
import {
  getDefaultAttributeScaleMetrics,
  getAttributeScaleOption,
  getOptionsForAttributeField,
} from "utils/AttributeScale";

const EVIDENCE_FIELDS = new Set([
  "replicability",
  "availability",
  "distinguishability",
  "sensitivity",
]);
const nullAssessmentMetrics = {
  sensitivity: null,
  replicability: null,
  availability: null,
  distinguishability: null,
};

const getTableIdsKey = (tables) =>
  (Array.isArray(tables) ? tables : [])
    .map((tbl) => String(tbl.tableId))
    .join("|");

const hasEvidenceValue = (value) => value !== null && value !== undefined;

const formatMetricNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
};

const titleCaseToken = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());

const formatMethod = (value) => {
  if (value === "within_subject_exact_agreement") {
    return "Within-subject exact agreement";
  }

  return titleCaseToken(value);
};

const formatUnavailableReason = (value) => {
  if (value === "insufficient_valid_comparisons") {
    return "Insufficient valid comparisons";
  }
  if (value === "unsupported_data_type") {
    return "Unsupported data type";
  }
  if (value === "unavailable") {
    return "No repeated-measure evidence";
  }

  return titleCaseToken(value);
};

const formatScaleLabel = (value, field, scoringSystem) => {
  const option = getAttributeScaleOption(value, field, scoringSystem);
  return option?.label || value;
};

function buildEquivalenceClassSizeEvidenceLine(quantitative, t) {
  const classSizeParts = [
    {
      label: t("datasetAssessments.evidence.minimumShort", "min"),
      value: quantitative.minimumEquivalenceClassSize,
    },
    {
      label: t("datasetAssessments.evidence.maximumShort", "max"),
      value: quantitative.maximumEquivalenceClassSize,
    },
  ].filter(({ value }) => hasEvidenceValue(value));

  if (!classSizeParts.length) return null;

  return {
    label: t(
      "datasetAssessments.evidence.equivalenceClassSize",
      "Equiv. class size"
    ),
    value: `${classSizeParts
      .map(({ value }) => formatMetricNumber(value))
      .join(" / ")} (${classSizeParts.map(({ label }) => label).join(" / ")})`,
  };
}

const isDirectIdentifierAttribute = (attribute) =>
  Boolean(attribute?.isDirectIdentifier || attribute?.isExcluded);

const normalizeAssessmentAttributeState = (attribute) =>
  attribute.isExcluded
    ? {
        ...attribute,
        ...nullAssessmentMetrics,
        isDirectIdentifier: true,
      }
    : attribute;

function hasEvidenceDetails(evidence) {
  if (!evidence) return false;

  return Boolean(
    hasEmpiricalEvidenceDetails(evidence.empirical) ||
      hasQuantitativeEvidenceDetails(evidence.quantitative) ||
      hasSemanticEvidenceDetails(evidence.semantic) ||
      evidence.historical?.observations?.length
  );
}

function hasEmpiricalEvidenceDetails(empirical) {
  if (!empirical) return false;

  if (empirical.available === false) {
    return hasEvidenceValue(empirical.reason);
  }

  return (
    hasEvidenceValue(empirical.score) ||
    hasEvidenceValue(empirical.method) ||
    hasEvidenceValue(empirical.comparisonCount) ||
    hasEvidenceValue(empirical.repeatedSubjectCount) ||
    hasEvidenceValue(empirical.repeatedSubjectFraction) ||
    hasEvidenceValue(empirical.analysisUnit)
  );
}

function hasQuantitativeEvidenceDetails(quantitative) {
  if (!quantitative) return false;

  return [
    "distinction",
    "separation",
    "singletonFraction",
    "minimumEquivalenceClassSize",
    "maximumEquivalenceClassSize",
  ].some((field) => hasEvidenceValue(quantitative[field]));
}

function hasSemanticEvidenceDetails(semantic) {
  if (!semantic) return false;

  return Boolean(semantic.summary || semantic.concept);
}

function EvidenceLine({ children }) {
  return (
    <RATypography
      variant="caption"
      color="white"
      display="block"
      sx={{ lineHeight: 1.35 }}
    >
      {children}
    </RATypography>
  );
}

function EvidenceGroup({ title, children }) {
  return (
    <RABox mb={0.75}>
      <RATypography
        variant="caption"
        color="white"
        fontWeight="bold"
        display="block"
        mb={0.25}
        sx={{ lineHeight: 1.35 }}
      >
        {title}
      </RATypography>
      {children}
    </RABox>
  );
}

function StatisticalEvidence({ evidence, field, t }) {
  const lines = [];
  const empirical = field === "replicability" ? evidence.empirical : null;
  const quantitative =
    field === "distinguishability" ? evidence.quantitative : null;

  if (hasEmpiricalEvidenceDetails(empirical)) {
    if (empirical.available === false) {
      lines.push({
        label: t("datasetAssessments.evidence.unavailable", "Unavailable"),
        value: formatUnavailableReason(empirical.reason),
      });
    } else {
      [
        [
          t("datasetAssessments.evidence.score", "Score"),
          empirical.score,
          formatMetricNumber,
        ],
        [
          t("datasetAssessments.evidence.method", "Method"),
          empirical.method,
          formatMethod,
        ],
        [
          t(
            "datasetAssessments.evidence.validComparisons",
            "Valid comparisons"
          ),
          empirical.comparisonCount,
          formatMetricNumber,
        ],
        [
          t(
            "datasetAssessments.evidence.repeatedSubjects",
            "Repeated subjects"
          ),
          empirical.repeatedSubjectCount,
          formatMetricNumber,
        ],
        [
          t(
            "datasetAssessments.evidence.repeatedSubjectFraction",
            "Repeated subject fraction"
          ),
          empirical.repeatedSubjectFraction,
          formatMetricNumber,
        ],
        [
          t("datasetAssessments.evidence.analysisUnit", "Analysis unit"),
          empirical.analysisUnit,
          titleCaseToken,
        ],
      ].forEach(([label, value, formatter]) => {
        if (hasEvidenceValue(value)) {
          lines.push({ label, value: formatter(value) });
        }
      });
    }
  }

  if (hasQuantitativeEvidenceDetails(quantitative)) {
    [
      [
        t("datasetAssessments.evidence.distinction", "Distinction"),
        quantitative.distinction,
      ],
      [
        t("datasetAssessments.evidence.separation", "Separation"),
        quantitative.separation,
      ],
      [
        t(
          "datasetAssessments.evidence.singletonFraction",
          "Singleton fraction"
        ),
        quantitative.singletonFraction,
      ],
    ].forEach(([label, value]) => {
      if (hasEvidenceValue(value)) {
        lines.push({ label, value: formatMetricNumber(value) });
      }
    });

    const equivalenceClassSizeLine = buildEquivalenceClassSizeEvidenceLine(
      quantitative,
      t
    );
    if (equivalenceClassSizeLine) {
      lines.push(equivalenceClassSizeLine);
    }
  }

  if (!lines.length) return null;

  return (
    <EvidenceGroup
      title={t(
        "datasetAssessments.evidence.statisticalEvidence",
        "Statistical Evidence"
      )}
    >
      {lines.map(({ label, value }) => (
        <EvidenceLine key={`${label}:${value}`}>
          {label}: {value}
        </EvidenceLine>
      ))}
    </EvidenceGroup>
  );
}

function buildHistoricalEvidenceSummary(historical, field, scoringSystem) {
  const observations = historical?.observations || [];
  const countsByLabel = new Map();
  const optionOrderByValue = new Map(
    getOptionsForAttributeField(field, scoringSystem).map((option, index) => [
      String(option.value),
      index,
    ])
  );

  observations.forEach((observation) => {
    const label =
      observation.valueLabel ||
      formatScaleLabel(observation.value, field, scoringSystem);
    if (!hasEvidenceValue(label)) return;

    const key = hasEvidenceValue(observation.value)
      ? String(observation.value)
      : String(label);
    const existingCount = countsByLabel.get(key)?.count || 0;

    countsByLabel.set(key, {
      label,
      value: observation.value,
      count: existingCount + 1,
    });
  });

  return Array.from(countsByLabel.values())
    .filter(({ count }) => count > 0)
    .sort((left, right) => {
      const countDiff = right.count - left.count;
      if (countDiff !== 0) return countDiff;

      const leftOrder =
        optionOrderByValue.get(String(left.value)) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        optionOrderByValue.get(String(right.value)) ?? Number.MAX_SAFE_INTEGER;
      return (
        leftOrder - rightOrder || String(left.label).localeCompare(right.label)
      );
    });
}

function HistoricalEvidence({ historical, field, scoringSystem, t }) {
  const summary = buildHistoricalEvidenceSummary(
    historical,
    field,
    scoringSystem
  );
  if (!summary.length) return null;

  return (
    <EvidenceGroup
      title={t(
        "datasetAssessments.evidence.historicalEvidence",
        "Historical Evidence"
      )}
    >
      {summary.map(({ label, count }) => (
        <EvidenceLine key={`${label}:${count}`}>
          {label} ({count})
        </EvidenceLine>
      ))}
    </EvidenceGroup>
  );
}

function SemanticEvidence({ semantic, t }) {
  if (!hasSemanticEvidenceDetails(semantic)) return null;

  return (
    <EvidenceGroup
      title={t("datasetAssessments.evidence.semantic", "Semantic")}
    >
      <EvidenceLine>{semantic.summary || semantic.concept}</EvidenceLine>
    </EvidenceGroup>
  );
}

function EvidenceTooltip({ evidence, field, scoringSystem, t }) {
  return (
    <RABox sx={{ maxWidth: 300 }}>
      <StatisticalEvidence evidence={evidence} field={field} t={t} />
      <HistoricalEvidence
        historical={evidence.historical}
        field={field}
        scoringSystem={scoringSystem}
        t={t}
      />
      <SemanticEvidence semantic={evidence.semantic} t={t} />
    </RABox>
  );
}

function EvidenceInfoIcon({ evidence, field, scoringSystem, t }) {
  if (!hasEvidenceDetails(evidence)) return null;

  return (
    <Tooltip
      arrow
      placement="top"
      title={
        <EvidenceTooltip
          evidence={evidence}
          field={field}
          scoringSystem={scoringSystem}
          t={t}
        />
      }
    >
      <IconButton
        size="small"
        aria-label={t("datasetAssessments.evidence.info", "Evidence")}
        sx={{
          position: "absolute",
          top: -8,
          right: -8,
          zIndex: 2,
          width: 20,
          height: 20,
          p: 0,
          color: "info.main",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          "&:hover": {
            bgcolor: "background.paper",
          },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}

function getAttributeFieldEvidence(attribute, field, attributeEvidenceById) {
  if (!EVIDENCE_FIELDS.has(field)) return null;

  const datasetAttributeEvidence =
    attribute.datasetAttributeId !== null &&
    attribute.datasetAttributeId !== undefined
      ? attributeEvidenceById?.[attribute.datasetAttributeId]?.[field]
      : null;

  return (
    datasetAttributeEvidence ||
    attributeEvidenceById?.[attribute.attributeId]?.[field] ||
    null
  );
}

function getOriginalAssessmentValue(
  attribute,
  field,
  originalAssessmentValuesByAttributeId
) {
  const datasetAttributeValues =
    attribute.datasetAttributeId !== null &&
    attribute.datasetAttributeId !== undefined
      ? originalAssessmentValuesByAttributeId?.[attribute.datasetAttributeId]
      : null;
  const attributeValues =
    originalAssessmentValuesByAttributeId?.[attribute.attributeId];

  return (datasetAttributeValues || attributeValues)?.[field];
}

function scaleValuesAreEqual(left, right) {
  if (!hasEvidenceValue(left) || !hasEvidenceValue(right)) {
    return left === right;
  }

  const numericLeft = Number(left);
  const numericRight = Number(right);
  if (Number.isFinite(numericLeft) && Number.isFinite(numericRight)) {
    return numericLeft === numericRight;
  }

  return String(left) === String(right);
}

function OriginalValueIndicator({ originalValue, field, scoringSystem, t }) {
  const originalLabel = formatScaleLabel(originalValue, field, scoringSystem);

  return (
    <RATypography
      variant="caption"
      color="text"
      sx={{
        fontSize: "0.65rem",
        lineHeight: 1.1,
        mt: 0.25,
        maxWidth: "116px",
        textAlign: "center",
        overflowWrap: "anywhere",
      }}
    >
      {t("dataSharingActivities.form.originalValue", {
        value: originalLabel,
        defaultValue: "Original: {{value}}",
      })}
    </RATypography>
  );
}

function ScaleCellWithEvidence({
  tableId,
  row,
  field,
  scoringSystem,
  changeAttr,
  attributeEvidenceById,
  originalAssessmentValuesByAttributeId,
  isReadOnly,
  t,
}) {
  const attribute = row.original;
  const evidence = getAttributeFieldEvidence(
    attribute,
    field,
    attributeEvidenceById
  );
  const receivesScaleScore = !isDirectIdentifierAttribute(attribute);
  const originalValue = getOriginalAssessmentValue(
    attribute,
    field,
    originalAssessmentValuesByAttributeId
  );
  const showOriginalValue =
    receivesScaleScore &&
    hasEvidenceValue(originalValue) &&
    !scaleValuesAreEqual(attribute[field], originalValue);

  return (
    <RABox
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{ width: "100%" }}
    >
      <RABox
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{
          position: "relative",
          width: "116px",
          minHeight: showOriginalValue ? 58 : 42,
          flexDirection: "column",
        }}
      >
        <MemoScaleCell
          field={field}
          scoringSystem={scoringSystem}
          disabled={isReadOnly || !receivesScaleScore}
          commitKey={`${tableId}:${attribute.attributeId}:${field}`}
          initialValue={receivesScaleScore ? attribute[field] : null}
          onCommit={(val) => {
            if (!receivesScaleScore) return;
            changeAttr(tableId, attribute.attributeId, {
              [field]: val,
            });
          }}
        />
        <EvidenceInfoIcon
          evidence={receivesScaleScore ? evidence : null}
          field={field}
          scoringSystem={scoringSystem}
          t={t}
        />
        {showOriginalValue && (
          <OriginalValueIndicator
            originalValue={originalValue}
            field={field}
            scoringSystem={scoringSystem}
            t={t}
          />
        )}
      </RABox>
    </RABox>
  );
}

export function useDatasetAssessmentFormTableConfig(
  tables,
  setTables,
  originals = {},
  options = {},
  t
) {
  const {
    showOverridden = false,
    scoringSystem = null,
    attributeEvidenceById = {},
    originalAssessmentValuesByAttributeId = {},
    isReadOnly = false,
  } = options;
  const tableIdsKey = getTableIdsKey(tables);

  const addAttr = useCallback(
    (tableId) => {
      if (isReadOnly) return;

      const newAttr = {
        id: Date.now(),
        attributeId: Date.now(),
        name: "",
        ...getDefaultAttributeScaleMetrics(scoringSystem),
        isDirectIdentifier: false,
        isExcluded: false,
      };
      setTables((prev) =>
        prev.map((tbl) => {
          if (tbl.tableId === tableId) {
            return { ...tbl, attributes: [...tbl.attributes, newAttr] };
          }
          return tbl;
        })
      );
    },
    [isReadOnly, scoringSystem, setTables]
  );

  const changeAttr = useCallback(
    (tblId, attrId, changes) => {
      setTables((prev) => {
        if (!prev || !Array.isArray(prev)) {
          return prev || [];
        }
        const next = prev.map((tbl) => {
          if (String(tbl.tableId) !== String(tblId)) return tbl;

          const newAttributes = tbl.attributes.map((attr) => {
            if (String(attr.attributeId) !== String(attrId)) return attr;
            return normalizeAssessmentAttributeState({ ...attr, ...changes });
          });
          return { ...tbl, attributes: newAttributes };
        });
        return next;
      });
    },
    [setTables]
  );

  const isOverridden = useCallback(
    (tblId, attr) => {
      if (!showOverridden) return false;
      if (!originals[tblId]) return false;
      const orig = originals[tblId][attr.attributeId];
      if (!orig) return false;
      return (
        attr.sensitivity !== orig.sensitivity ||
        attr.replicability !== orig.replicability ||
        attr.availability !== orig.availability ||
        attr.distinguishability !== orig.distinguishability ||
        attr.isDirectIdentifier !== orig.isDirectIdentifier
      );
    },
    [originals, showOverridden]
  );

  const toggleOverride = useCallback(
    (tblId, attrId, attr) => {
      if (!originals[tblId]) return;
      const orig = originals[tblId][attrId];
      if (!orig) return;
      if (isOverridden(tblId, attr)) {
        changeAttr(tblId, attrId, {
          sensitivity: orig.sensitivity,
          replicability: orig.replicability,
          availability: orig.availability,
          distinguishability: orig.distinguishability,
          isDirectIdentifier: orig.isDirectIdentifier,
        });
      }
    },
    [changeAttr, isOverridden, originals]
  );

  const columnsByTable = useMemo(() => {
    const map = {};
    const tableIds = tableIdsKey ? tableIdsKey.split("|") : [];

    tableIds.forEach((tableId) => {
      map[tableId] = [
        {
          Header: t("datasetAssessments.attributesTable.name"),
          accessor: "name",
          align: "left",
          width: "30%",
          Cell: ({ row }) => (
            <MemoNameCell
              disabled
              initialValue={row.original.name}
              dataType={row.original.dataType}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.replicability"),
          accessor: "replicability",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <ScaleCellWithEvidence
              tableId={tableId}
              row={row}
              field="replicability"
              scoringSystem={scoringSystem}
              changeAttr={changeAttr}
              attributeEvidenceById={attributeEvidenceById}
              originalAssessmentValuesByAttributeId={
                originalAssessmentValuesByAttributeId
              }
              isReadOnly={isReadOnly}
              t={t}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.availability"),
          accessor: "availability",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <ScaleCellWithEvidence
              tableId={tableId}
              row={row}
              field="availability"
              scoringSystem={scoringSystem}
              changeAttr={changeAttr}
              attributeEvidenceById={attributeEvidenceById}
              originalAssessmentValuesByAttributeId={
                originalAssessmentValuesByAttributeId
              }
              isReadOnly={isReadOnly}
              t={t}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.distinguishability"),
          accessor: "distinguishability",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <ScaleCellWithEvidence
              tableId={tableId}
              row={row}
              field="distinguishability"
              scoringSystem={scoringSystem}
              changeAttr={changeAttr}
              attributeEvidenceById={attributeEvidenceById}
              originalAssessmentValuesByAttributeId={
                originalAssessmentValuesByAttributeId
              }
              isReadOnly={isReadOnly}
              t={t}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.sensitivity"),
          accessor: "sensitivity",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <ScaleCellWithEvidence
              tableId={tableId}
              row={row}
              field="sensitivity"
              scoringSystem={scoringSystem}
              changeAttr={changeAttr}
              attributeEvidenceById={attributeEvidenceById}
              originalAssessmentValuesByAttributeId={
                originalAssessmentValuesByAttributeId
              }
              isReadOnly={isReadOnly}
              t={t}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.directIdentifier"),
          accessor: "isDirectIdentifier",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <MemoCheckboxCell
              initialValue={Boolean(row.original.isDirectIdentifier)}
              disabled={isReadOnly || row.original.isExcluded}
              onCommit={(checked) => {
                if (row.original.isExcluded) return;
                changeAttr(tableId, row.original.attributeId, {
                  isDirectIdentifier: checked,
                });
              }}
            />
          ),
        },
        ...(showOverridden
          ? [
              {
                Header: t("datasetAssessments.attributesTable.overridden"),
                accessor: "overridden",
                align: "center",
                Cell: ({ row }) => {
                  const attr = row.original;
                  const overridden = isOverridden(tableId, attr);
                  return (
                    <MemoCheckboxCell
                      initialValue={overridden}
                      disabled={!overridden || isReadOnly}
                      onCommit={(checked) => {
                        if (!checked) {
                          toggleOverride(tableId, attr.attributeId, attr);
                        }
                      }}
                    />
                  );
                },
              },
            ]
          : []),
      ];
    });
    return map;
  }, [
    tableIdsKey,
    changeAttr,
    showOverridden,
    isOverridden,
    scoringSystem,
    toggleOverride,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
    isReadOnly,
    t,
  ]);

  return { columnsByTable, addAttr };
}
