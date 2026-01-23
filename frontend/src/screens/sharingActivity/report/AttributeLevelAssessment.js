import React, { useMemo } from "react";
import DataTable from "../../../components/display/Tables/DataTable";
import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import Checkbox from "@mui/material/Checkbox";
import RAInput from "../../../components/input/RAInput";
import { MemoScaleCell } from "../../../components/display/Tables/DataTable/CustomDataTableComponents/RowComponents";

export default function AttributeLevelAssessment({ tableAssessments, identifiabilityThreshold, sensitivityThreshold }) {
    // Column definitions
    const columns = useMemo(
        () => [
            {
                Header: "Name",
                accessor: "name",
                width: "13%",
                align: "left",
                Cell: ({ value }) => <RATypography variant="subtitle">{value}</RATypography>,
            },
            {
                Header: "Replicability",
                accessor: "replicability",
                width: "10%",
                align: "center",
                // FIX: Added disabled={true}
                Cell: ({ value }) => (<MemoScaleCell initialValue={value} onCommit={() => {}} disabled={true} />),
            },
            {
                Header: "Availability",
                accessor: "availability",
                width: "10%",
                align: "center",
                // FIX: Added disabled={true}
                Cell: ({ value }) => (<MemoScaleCell initialValue={value} onCommit={() => {}} disabled={true} />),
            },
            {
                Header: "Distinguishability",
                accessor: "distinguishability",
                width: "10%",
                align: "center",
                // FIX: Added disabled={true}
                Cell: ({ value }) => (<MemoScaleCell initialValue={value} onCommit={() => {}} disabled={true} />),
            },
            {
                Header: "Sensitivity",
                accessor: "sensitivity",
                width: "10%",
                align: "center",
                // FIX: Added disabled={true}
                Cell: ({ value }) => (<MemoScaleCell initialValue={value} onCommit={() => {}} disabled={true} />),
            },
            {
                Header: "Direct Identifier",
                accessor: "directIdentifier",
                width: "10%",
                align: "center",
                // Checkboxes are also likely read-only here, so you might want to disable them too if needed:
                Cell: ({ value }) => <Checkbox checked={value} disabled />,
            },
            {
                Header: "Quasi Identifier",
                accessor: "quasiIdentifier",
                width: "10%",
                align: "center",
                Cell: ({ value }) => <Checkbox checked={value} disabled />,
            },
            {
                Header: "Sensitive Attribute",
                accessor: "sensitiveAttribute",
                width: "10%",
                align: "center",
                Cell: ({ value }) => <Checkbox checked={value} disabled />,
            },
        ],
        []
    );

    // Build the per-table data
    const tableData = useMemo(() => {
        if (!Array.isArray(tableAssessments) || tableAssessments.length === 0) {
            return [];
        }

        return tableAssessments.map((ta) => {
            const rows = (ta.attributes || []).map((attr) => {
                if (attr.isDirectIdentifier) {
                    return {
                        name: attr.name,
                        replicability: null,
                        availability: null,
                        distinguishability: null,
                        sensitivity: null,
                        directIdentifier: true,
                        quasiIdentifier: false,
                        sensitiveAttribute: false,
                    };
                }

                const r = attr.replicability ?? 0;
                const a = attr.availability ?? 0;
                const d = attr.distinguishability ?? 0;
                const s = attr.sensitivity ?? 0;
                const totalScore = r + a + d;

                return {
                    name: attr.name,
                    replicability: r,
                    availability: a,
                    distinguishability: d,
                    sensitivity: s,
                    directIdentifier: false,
                    quasiIdentifier: totalScore > (identifiabilityThreshold || 0),
                    sensitiveAttribute: s > (sensitivityThreshold || 0),
                };
            });

            return {
                id: ta.id,
                tableName: ta.name || ta.tableName,
                rows,
            };
        });
    }, [tableAssessments, identifiabilityThreshold, sensitivityThreshold]); // Add props to dependency array

    return (
        <RABox mt={3} mb={3}>
            <RATypography variant="body2" paragraph mb={4}>
                Each table’s attributes are scored on replicability, availability,
                distinguishability, and sensitivity (1–3). An attribute is automatically
                marked as a “Quasi-Identifier” if the sum of its Replicability, Availability,
                and Distinguishability scores is greater than <strong>{identifiabilityThreshold}</strong>. It is marked as a
                “Sensitive Attribute” if its Sensitivity score is greater than <strong>{sensitivityThreshold}</strong>.
            </RATypography>

            {tableData.length === 0 ? (
                <RATypography variant="body2">
                    No table assessments available.
                </RATypography>
            ) : (
                tableData.map((td) => (
                    <RABox key={td.id} mb={4}>
                        <RABox mb={2}>
                            <RAInput
                                label="Table Name"
                                value={td.tableName}
                                disabled
                                variant="standard"
                                mb={1}
                                sx={{ maxWidth: 300 }}
                            />
                        </RABox>

                        <DataTable
                            table={{ columns, rows: td.rows }}
                            canSearch={false}
                            canAdd={false}
                        />
                    </RABox>
                ))
            )}
        </RABox>
    );
}