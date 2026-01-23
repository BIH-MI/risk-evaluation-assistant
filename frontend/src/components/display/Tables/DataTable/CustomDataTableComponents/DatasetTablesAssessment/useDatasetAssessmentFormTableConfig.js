import React, { useMemo, useCallback } from "react";
import {
    MemoNameCell,
    MemoScaleCell,
    MemoCheckboxCell
} from '../RowComponents';

export function useDatasetAssessmentFormTableConfig(tables, setTables, originals = {}, options = {}) {
    const { showOverridden = false } = options;

    const addAttr = useCallback((tableId) => {
        const newAttr = {
            id: Date.now(),
            attributeId: Date.now(),
            name: "",
            sensitivity: 1,
            replicability: 1,
            availability: 1,
            distinguishability: 1,
            isDirectIdentifier: false,
            isExcluded: false,
        };
        setTables(prev => prev.map(tbl => {
            if (tbl.tableId === tableId) {
                return { ...tbl, attributes: [...tbl.attributes, newAttr] };
            }
            return tbl;
        }));
    }, [setTables]);

    const changeAttr = useCallback((tblId, attrId, changes) => {
        setTables(prev => {
            if (!prev || !Array.isArray(prev)) {
                return prev || [];
            }
            const next = prev.map(tbl => {
                if (String(tbl.tableId) !== String(tblId)) return tbl;

                const newAttributes = tbl.attributes.map(attr => {
                    if (String(attr.attributeId) !== String(attrId)) return attr;
                    const updatedAttr = { ...attr, ...changes };
                    return updatedAttr;
                });
                return { ...tbl, attributes: newAttributes };
            });
            return next;
        });
    }, [setTables]);

    const isOverridden = useCallback((tblId, attr) => {
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
    }, [originals, showOverridden]);

    const toggleOverride = useCallback((tblId, attrId, attr) => {
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
    }, [changeAttr, isOverridden, originals]);

    const tableStructureKey = JSON.stringify(tables.map(t => ({
        id: t.tableId,
        name: t.tableName,
        attributes: t.attributes.map(a => ({
            id: a.attributeId,
            name: a.name,
            isDirectIdentifier: a.isDirectIdentifier,
            isExcluded: a.isExcluded,
            sensitivity: a.sensitivity,
            replicability: a.replicability,
            availability: a.availability,
            distinguishability: a.distinguishability
        }))
    })));

    const columnsByTable = useMemo(() => {
        const map = {};
        tables.forEach(tbl => {
            map[tbl.tableId] = [
                {
                    Header: "Name",
                    accessor: "name",
                    align: "left",
                    width: "30%",
                    Cell: ({ row }) => (
                        <MemoNameCell
                            disabled
                            initialValue={row.original.name}
                        />
                    ),
                },
                {
                    Header: "Replicability",
                    accessor: "replicability",
                    align: "center",
                    width: "10%",
                    Cell: ({ row }) => (
                        <MemoScaleCell
                            initialValue={row.original.isDirectIdentifier ? null : row.original.replicability}
                            onCommit={(val) => {
                                changeAttr(tbl.tableId, row.original.attributeId, { replicability: val });
                            }}
                        />
                    ),
                },
                {
                    Header: "Availability",
                    accessor: "availability",
                    align: "center",
                    width: "10%",
                    Cell: ({ row }) => (
                        <MemoScaleCell
                            initialValue={row.original.isDirectIdentifier ? null : row.original.availability}
                            onCommit={(val) => {
                                changeAttr(tbl.tableId, row.original.attributeId, { availability: val });
                            }}
                        />
                    ),
                },
                {
                    Header: "Distinguishability",
                    accessor: "distinguishability",
                    align: "center",
                    width: "10%",
                    Cell: ({ row }) => (
                        <MemoScaleCell
                            initialValue={row.original.isDirectIdentifier ? null : row.original.distinguishability}
                            onCommit={(val) => {
                                changeAttr(tbl.tableId, row.original.attributeId, { distinguishability: val });
                            }}
                        />
                    ),
                },
                {
                    Header: "Sensitivity",
                    accessor: "sensitivity",
                    align: "center",
                    width: "10%",
                    Cell: ({ row }) => (
                        <MemoScaleCell
                            initialValue={row.original.isDirectIdentifier ? null : row.original.sensitivity}
                            onCommit={(val) => {
                                changeAttr(tbl.tableId, row.original.attributeId, { sensitivity: val });
                            }}
                        />
                    ),
                },
                {
                    Header: "Direct Identifier",
                    accessor: "isDirectIdentifier",
                    align: "center",
                    width: "10%",
                    Cell: ({ row }) => (
                      <MemoCheckboxCell
                        initialValue={row.original.isDirectIdentifier}
                        onCommit={(checked) => {
                            changeAttr(tbl.tableId, row.original.attributeId, { isDirectIdentifier: checked });
                        }}
                      />
                    ),
                },
                ...(showOverridden ? [{
                    Header: "Overridden",
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
                }] : []),
            ];
        });
        return map;

    }, [tableStructureKey, changeAttr, showOverridden, isOverridden, toggleOverride]);

    return { columnsByTable, addAttr };
}