// src/screens/recipientAssessments/getRecipientAssessmentsTableData.js

import React from "react";
import RABox from "components/layout/RABox";
import {
    EditIconButton,
    CancelIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import LockIcon from "@mui/icons-material/Lock";
import Tooltip from "@mui/material/Tooltip";

/**
 * Build react-table columns & rows for recipient assessments.
 * Uses LabeledAvatar and DateTimeDisplay for consistent styling.
 */
export default function getRecipientAssessmentsTableData(
    assessments,
    onEdit,
    onDelete,
    locks,
    me
) {
    const columns = [
        {
            Header: "Organization",
            accessor: "organization",
            width: "15%",
            align: "left",
            Cell: ({ value }) => <LabeledAvatar value={value} variant="organization" shape="square" />,
        },
        {
            Header: "Assessment Name",
            accessor: "name",
            width: "25%",
            align: "left",
            Cell: ({ value }) => <LabeledAvatar value={value} variant="recipientAssessment" shape="square" />,
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
            width: "15%",
            align: "center",
            Cell: ({ row }) => {
                const id = row.original.id;
                const locker = locks[id];
                const isMine = locker === me;

                if (locker && !isMine) {
                    // locked by someone else
                    return (
                        <Tooltip title={`Locked by ${locker}`}>
                            <LockIcon color="action" />
                        </Tooltip>
                    );
                }

                return (
                    <RABox display="flex" justifyContent="center" gap={1}>
                        <EditIconButton
                            size="small"
                            onClick={() => onEdit(row.original.recipientId, id)}
                            disabled={!!locker && !isMine}
                        />
                        <CancelIconButton
                            size="small"
                            onClick={() => onDelete(row.original.recipientId, id)}
                            disabled={!!locker && !isMine}
                        />
                    </RABox>
                );
            },
        },
    ];

    const rows = assessments.map((a) => ({
        id: a.id,
        recipientId: a.recipientId,
        assessmentName: a.assessmentName,
        organization: a.organization,
        name: a.name,
        creationDate: a.creationDate,
        creatorUsername: a.creatorUsername,
    }));

    return { columns, rows };
}
