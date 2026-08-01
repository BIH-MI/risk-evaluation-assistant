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
import LockIcon from "@mui/icons-material/Lock";
import Tooltip from "@mui/material/Tooltip";
import RAButton from "components/input/RAButton";

export default function getRecipientsTableData(
  recipients,
  onEdit,
  onDelete,
  onViewAssessments,
  onAddAssessment,
  locks,
  me,
  t,
  isAdmin
) {
  const columns = [
    {
      Header: t("recipients.table.organization"),
      accessor: "organization",
      width: "10%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="organization" shape="square" />
      ),
    },
    {
      Header: t("recipients.table.lastChange"),
      accessor: "lastModifiedDate",
      width: "15%",
      align: "center",
      Cell: ({ row }) => {
        const dateValue =
          row.original.lastModifiedDate || row.original.creationDate;
        return <DateTimeDisplay value={dateValue} />;
      },
    },
    {
      Header: t("recipients.table.createdBy"),
      accessor: "creatorUsername",
      width: "15%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("recipients.table.sharedWith"),
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
      Header: t("recipients.table.assessments"),
      accessor: "assessmentCount",
      width: "10%",
      align: "center",
      Cell: ({ row }) => {
        const recipientId = row.original.id;
        const count = row.original.assessmentCount;
        return (
          <RAButton
            size="small"
            onClick={() => onViewAssessments(recipientId)}
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
      Header: t("recipients.table.actions"),
      accessor: "actions",
      width: "15%",
      align: "center",
      Cell: ({ row }) => {
        const id = row.original.id;
        const locker = locks[id];

        const isLockedByOther = !isAdmin && !!locker && locker !== me;

        if (isLockedByOther) {
          return (
            <RABox display="flex" justifyContent="center">
              <Tooltip title={t("recipients.table.lockedBy", { user: locker })}>
                <span>
                  <LockIcon color="action" />
                </span>
              </Tooltip>
            </RABox>
          );
        }

        return (
          <RABox
            display="flex"
            justifyContent="center"
            alignItems="center"
            gap={1}
          >
            <Tooltip
              title={t(
                "recipients.table.createAssessmentTooltip",
                "Create Assessment"
              )}
              arrow
            >
              <span>
                <AssessmentIconButton
                  size="small"
                  onClick={() => onAddAssessment(id)}
                  aria-label={t("recipients.table.addAssessment")}
                />
              </span>
            </Tooltip>
            <Tooltip
              title={t(
                "recipients.table.editRecipientTooltip",
                "Edit Recipient"
              )}
              arrow
            >
              <span>
                <EditIconButton size="small" onClick={() => onEdit(id)} />
              </span>
            </Tooltip>
            <Tooltip
              title={t(
                "recipients.table.deleteRecipientTooltip",
                "Delete Recipient"
              )}
              arrow
            >
              <span>
                <CancelIconButton size="small" onClick={() => onDelete(id)} />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = recipients.map((r) => ({
    id: r.id,
    organization: r.name,
    creationDate: r.creationDate,
    lastModifiedDate: r.lastModifiedDate,
    creatorUsername: r.creatorUsername,
    sharedUsernames: Array.isArray(r.sharedUsernames) ? r.sharedUsernames : [],
    assessmentCount: Array.isArray(r.assessmentIds)
      ? r.assessmentIds.length
      : 0,
  }));

  return { columns, rows };
}
