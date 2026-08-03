import React, { useMemo, useCallback } from "react";
import {
  MemoNameCell,
  MemoScaleCell,
  MemoCheckboxCell,
} from "../RowComponents";
import { getDefaultAttributeScaleMetrics } from "utils/AttributeScale";

export function useDatasetAssessmentFormTableConfig(
  tables,
  setTables,
  originals = {},
  options = {},
  t
) {

  const { showOverridden = false } = options;

  const addAttr = useCallback(
    (tableId) => {
      const newAttr = {
        id: Date.now(),
        attributeId: Date.now(),
        name: "",
        ...getDefaultAttributeScaleMetrics(),
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
    [setTables]
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
            const updatedAttr = { ...attr, ...changes };
            return updatedAttr;
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
    tables.forEach((tbl) => {
      map[tbl.tableId] = [
        {
          Header: t("datasetAssessments.attributesTable.name"),
          accessor: "name",
          align: "left",
          width: "30%",
          Cell: ({ row }) => (
            <MemoNameCell disabled initialValue={row.original.name} />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.replicability"),
          accessor: "replicability",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <MemoScaleCell
              initialValue={
                row.original.isDirectIdentifier
                  ? null
                  : row.original.replicability
              }
              onCommit={(val) => {
                changeAttr(tbl.tableId, row.original.attributeId, {
                  replicability: val,
                });
              }}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.availability"),
          accessor: "availability",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <MemoScaleCell
              initialValue={
                row.original.isDirectIdentifier
                  ? null
                  : row.original.availability
              }
              onCommit={(val) => {
                changeAttr(tbl.tableId, row.original.attributeId, {
                  availability: val,
                });
              }}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.distinguishability"),
          accessor: "distinguishability",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <MemoScaleCell
              initialValue={
                row.original.isDirectIdentifier
                  ? null
                  : row.original.distinguishability
              }
              onCommit={(val) => {
                changeAttr(tbl.tableId, row.original.attributeId, {
                  distinguishability: val,
                });
              }}
            />
          ),
        },
        {
          Header: t("datasetAssessments.attributesTable.sensitivity"),
          accessor: "sensitivity",
          align: "center",
          width: "10%",
          Cell: ({ row }) => (
            <MemoScaleCell
              initialValue={
                row.original.isDirectIdentifier
                  ? null
                  : row.original.sensitivity
              }
              onCommit={(val) => {
                changeAttr(tbl.tableId, row.original.attributeId, {
                  sensitivity: val,
                });
              }}
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
              initialValue={row.original.isDirectIdentifier}
              onCommit={(checked) => {
                changeAttr(tbl.tableId, row.original.attributeId, {
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
                  const overridden = isOverridden(tbl.tableId, attr);
                  return (
                    <MemoCheckboxCell
                      initialValue={overridden}
                      disabled={!overridden}
                      onCommit={(checked) => {
                        if (!checked) {
                          toggleOverride(tbl.tableId, attr.attributeId, attr);
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
    tables,
    changeAttr,
    showOverridden,
    isOverridden,
    toggleOverride,
    t,
  ]);

  return { columnsByTable, addAttr };
}
