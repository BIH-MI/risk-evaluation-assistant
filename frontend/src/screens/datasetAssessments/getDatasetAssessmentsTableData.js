import React from "react";
import RABox from "components/layout/RABox";
import {
    EditIconButton,
    CancelIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LabeledAvatar from "../../components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import LockIcon from '@mui/icons-material/Lock';
import Tooltip from '@mui/material/Tooltip';

/**
 * Build react-table columns & rows for dataset assessments,
 * including lock-aware action buttons.
 *
 * @param {Array} assessments
 * @param {Function} onEdit(dsId, assessmentId)
 * @param {Function} onDelete(dsId, assessmentId)
 * @param {Object} locks        map of assessmentId -> lockedBy username
 * @param {string} me           current user's username
 */
export default function getDatasetAssessmentsTableData(
    assessments,
    onEdit,
    onDelete,
    locks = {},
    me = null
) {
    const columns = [
        {
            Header: "Dataset Name",
            accessor: "datasetName",
            width: "15%",
            align: "left",
            Cell: ({ value }) => (
                <LabeledAvatar value={value} variant="dataset" shape="square" />
            ),
        },
        {
            Header: "Assessment Name",
            accessor: "name",
            width: "20%",
            align: "left",
            Cell: ({ value }) => (
                <LabeledAvatar value={value} variant="datasetAssessment" shape="square" />
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
            width: "20%",
            align: "center",
            Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
        },
        {
            Header: "Actions",
            accessor: "actions",
            width: "20%",
            align: "center",
            Cell: ({ row }) => {
                const dsId = row.original.datasetId;
                const id = row.original.id;
                const locker = locks[id];
                const isMine = locker === me;

                // If locked by someone else, show lock icon
                if (locker && !isMine) {
                    return (
                        <Tooltip title={`Locked by ${locker}`}>
                            <LockIcon color="action" />
                        </Tooltip>
                    );
                }

                // Otherwise show edit/delete buttons
                return (
                    <RABox display="flex" justifyContent="center" gap={1}>
                        <EditIconButton
                            size="small"
                            onClick={() => onEdit(dsId, id)}
                            disabled={!!locker && !isMine}
                        />
                        <CancelIconButton
                            size="small"
                            onClick={() => onDelete(dsId, id)}
                            disabled={!!locker && !isMine}
                        />
                    </RABox>
                );
            },
        },
    ];

    const rows = assessments.map((a) => ({
        id: a.id,
        datasetId: a.datasetId,
        datasetName: a.datasetName,
        name: a.name,
        creationDate: a.creationDate,
        creatorUsername: a.creatorUsername,
    }));

    return { columns, rows };
}
