// src/screens/recipientAssessments/getDataSharingActivitiesTableData.js

import React from "react";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { EditIconButton, CancelIconButton, ReportIconButton } from "components/input/RAButton/FixStyledButtons";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LockIcon from "@mui/icons-material/Lock";
import Tooltip from "@mui/material/Tooltip";

export default function getDataSharingActivitiesTableData(
    activities,
    onEdit,
    onDelete,
    onViewReport,
    locks,
    me
) {
    const columns = [
        {
            Header: "Name",
            accessor: "name",
            width: "35%",
            align: "left",
        },
        {
            Header: "Dataset Assessment",
            accessor: "datasetAssessmentName",
            width: "25%",
            align: "left",
            Cell: ({ value }) => (
                <LabeledAvatar value={value} variant="datasetAssessment" shape="square" />
            ),
        },
        {
            Header: "Recipient Assessment",
            accessor: "recipientAssessmentName",
            width: "25%",
            align: "left",
            Cell: ({ value }) => (
                <LabeledAvatar value={value} variant="recipientAssessment" shape="square" />
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
            width: "6%",
            align: "center",
            Cell: ({ row }) => {
                const id = row.original.id;
                const locker = locks[id];
                const isMine = locker === me;

                if (locker && !isMine) {
                    return (
                        <Tooltip title={`Locked by ${locker}`}>
                            <LockIcon color="action" />
                        </Tooltip>
                    );
                }

                return (
                    <RABox display="flex" justifyContent="center" gap={1}>
                        <ReportIconButton
                            size="small"
                            onClick={() => onViewReport(id)}
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

    const rows = activities.map(a => ({
        id: a.id,
        name: (
            <RATypography variant="button" fontWeight="medium">
                {a.name || "—"}
            </RATypography>
        ),
        datasetAssessmentName: a.datasetAssessmentName,
        recipientAssessmentName: a.recipientAssessmentName,
        creationDate: a.creationDate,
        creatorUsername: a.creatorUsername || "—",
    }));

    return { columns, rows };
}
