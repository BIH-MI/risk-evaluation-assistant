import React, { useMemo, useCallback } from "react";
import { MemoCheckboxCell } from "../RowComponents";
import NameCellWithEvidence from "./cells/NameCellWithEvidence";
import ScaleCellWithEvidence from "./cells/ScaleCellWithEvidence";
import { getDefaultAttributeScaleMetrics } from "utils/AttributeScale";
import {
  getTableIdsKey,
  normalizeAssessmentAttributeState,
} from "./utils/assessmentTableUtils";

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
          Cell: ({ row }) => <NameCellWithEvidence row={row} t={t} />,
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
