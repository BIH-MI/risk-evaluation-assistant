// src/screens/datasets/getDatasetsTableData.js

import React from "react";
import RABox from "components/layout/RABox";
import {
    AssessmentIconButton,
    CancelIconButton,
    EditIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import SharedUsersList from "components/display/Tables/DataTable/CustomDataTableComponents/SharedUsersList";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import LockIcon from '@mui/icons-material/Lock';
import Tooltip from '@mui/material/Tooltip';
import RAButton from "../../components/input/RAButton";

/**
 * Build react-table columns & rows given your datasets and row-level handlers.
 * @param {Array} datasets
 * @param {Function} onEdit
 * @param {Function} onDelete
 * @param {Object} locks        map of datasetId -> lockedBy username
 * @param {string} me           current user's username
 * @param {Function} onViewAssessments
 * @param {Function} onAddAssessment
 */
export default function getDatasetsTableData(
    datasets,
    onEdit,
    onDelete,
    locks,
    me,
    onViewAssessments,
    onAddAssessment
) {
    const columns = [
        {
            Header: "Dataset Name",
            accessor: "name",
            width: "25%",
            align: "left",
            Cell: ({ value }) => (
                <LabeledAvatar value={value} variant="dataset" shape="square" />
            ),
        },
        {
            Header: "Created On",
            accessor: "creationDate",
            width: "15%",
            align: "center",
            Cell: ({ value }) => <DateTimeDisplay value={value} />,
        },
        {
            Header: "Created By",
            accessor: "creatorUsername",
            width: "15%",
            align: "center",
            Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
        },
        {
            Header: "Shared With",
            accessor: "sharedUsernames",
            width: "15%",
            align: "left",
            Cell: ({ value }) => (
                <SharedUsersList
                    usernames={value}
                    avatarVariant="shared"
                    avatarShape="circular"
                    avatarSize="xs"
                />
            ),
        },
        {
            Header: "Assessments",
            accessor: "assessmentCount",
            width: "10%",
            align: "center",
            Cell: ({ row }) => {
                const datasetId = row.original.id;
                const count = row.original.assessmentCount;
                return (
                    <RAButton
                        size="small"
                        onClick={() => onViewAssessments(datasetId)}
                        disabled={count === 0}
                        variant="text"
                        color="secondary"
                    >
                        {count}
                    </RAButton>
                );
            },
        },
        {
            Header: "Actions",
            accessor: "actions",
            width: "20%",
            align: "center",
            Cell: ({ row }) => {
                const id = row.original.id;
                const locker = locks[id];
                const isMine = locker === me;

                // If locked by someone else, show lock icon with tooltip
                if (locker && !isMine) {
                    return (
                        <Tooltip title={`Locked by ${locker}`}>
                            <LockIcon color="action" />
                        </Tooltip>
                    );
                }

                // Otherwise show action buttons (disable if locked by someone else)
                return (
                    <RABox display="flex" justifyContent="center" gap={1}>
                        <AssessmentIconButton
                            size="small"
                            onClick={() => onAddAssessment(id)}
                            aria-label="add assessment"
                        />
                        <EditIconButton
                            size="small"
                            onClick={() => onEdit(id)}
                            disabled={!!locker && !isMine}
                        />
                        <CancelIconButton
                            size="small"
                            onClick={() => onDelete(id)}
                            disabled={!!locker && !isMine}
                        />
                    </RABox>
                );
            },
        },
    ];

    const rows = datasets.map((dataset) => {
        const numTables = Array.isArray(dataset.tables)
            ? dataset.tables.length
            : 0;
        const numAssessments = Array.isArray(dataset.assessmentIds)
            ? dataset.assessmentIds.length
            : 0;

        return {
            id: dataset.id,
            name: dataset.name,
            sharedUsernames: dataset.sharedUsernames || [],
            creationDate: dataset.creationDate,
            creatorUsername: dataset.creatorUsername,
            tableCount: numTables,
            assessmentCount: numAssessments,
        };
    });

    return { columns, rows };
}
