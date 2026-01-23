import React from "react";
import RABox from "components/layout/RABox";
import {
    AssessmentIconButton,
    EditIconButton,
    CancelIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import SharedUsersList from "components/display/Tables/DataTable/CustomDataTableComponents/SharedUsersList";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import LockIcon from '@mui/icons-material/Lock';
import Tooltip from '@mui/material/Tooltip';
import RAButton from "components/input/RAButton";


export default function getRecipientsTableData(
    recipients,
    onEdit,
    onDelete,
    onViewAssessments,
    onAddAssessment,
    locks,
    me
) {

    const columns = [
        {
            Header: "Organization",
            accessor: "organization",
            width: "10%",
            align: "left",
            Cell: ({ value }) => <LabeledAvatar value={value} variant="organization" shape="square" />,
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
            width: "20%",
            align: "center",
            Cell: ({ value }) => (
                <SharedUsersList
                    usernames={value}
                    avatarVariant="user"
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
                const id = row.original.id;
                const count = row.original.assessmentCount;
                return (
                    <RAButton
                        size="small"
                        onClick={() => onViewAssessments(id)}
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

                // If locked by someone else, show lock icon
                if (locker && !isMine) {
                    return (
                        <Tooltip title={`Locked by ${locker}`}>
                            <LockIcon color="action" />
                        </Tooltip>
                    );
                }

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
                            title={locker && !isMine ? `Locked by ${locker}` : "Edit"}
                        />
                        <CancelIconButton
                            size="small"
                            onClick={() => onDelete(id)}
                            disabled={!!locker && !isMine}
                            title={locker && !isMine ? `Locked by ${locker}` : "Delete"}
                        />
                    </RABox>
                );
            },
        },
    ];

    const rows = recipients.map(r => ({
        id: r.id,
        organization: r.name,
        creationDate: r.creationDate,
        creatorUsername: r.creatorUsername,
        sharedUsernames: Array.isArray(r.sharedUsernames) ? r.sharedUsernames : [],
        assessmentCount: Array.isArray(r.assessmentIds) ? r.assessmentIds.length : 0,
    }));

    return { columns, rows };
}