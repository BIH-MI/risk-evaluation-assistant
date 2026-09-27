import React from "react";
import Tooltip from "@mui/material/Tooltip";
import LockIcon from "@mui/icons-material/Lock";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import {
  CancelIconButton,
  EditIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import SharedUsersList from "components/display/Tables/DataTable/CustomDataTableComponents/SharedUsersList";

export default function getProjectsTableData(
  projects,
  onEdit,
  onDelete,
  locks,
  me,
  t,
  isAdmin
) {
  const columns = [
    {
      Header: t("projects.table.name"),
      accessor: "name",
      width: "25%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="configuration" shape="square" />
      ),
    },
    {
      Header: t("projects.table.datasets"),
      accessor: "datasetCount",
      width: "10%",
      align: "center",
      Cell: ({ value }) => (
        <RAButton size="small" variant="text" color="secondary" disabled>
          {value}
        </RAButton>
      ),
    },
    {
      Header: t("projects.table.recipients"),
      accessor: "recipientCount",
      width: "10%",
      align: "center",
      Cell: ({ value }) => (
        <RAButton size="small" variant="text" color="secondary" disabled>
          {value}
        </RAButton>
      ),
    },
    {
      Header: t("projects.table.activities"),
      accessor: "activityCount",
      width: "10%",
      align: "center",
      Cell: ({ value }) => (
        <RAButton size="small" variant="text" color="secondary" disabled>
          {value}
        </RAButton>
      ),
    },
    {
      Header: t("projects.table.lastChange"),
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
      Header: t("projects.table.createdBy"),
      accessor: "creatorUsername",
      width: "12%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("projects.table.sharedWith"),
      accessor: "sharedUsernames",
      width: "13%",
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
      Header: t("projects.table.actions"),
      accessor: "actions",
      width: "10%",
      align: "center",
      Cell: ({ row }) => {
        const id = row.original.id;
        const locker = locks[id];
        const isMine = locker === me || isAdmin;

        if (locker && !isMine) {
          return (
            <Tooltip title={t("projects.table.lockedBy", { user: locker })}>
              <span>
                <LockIcon color="action" />
              </span>
            </Tooltip>
          );
        }

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip title={t("projects.table.editTooltip")} arrow>
              <span>
                <EditIconButton size="small" onClick={() => onEdit(id)} />
              </span>
            </Tooltip>
            <Tooltip title={t("projects.table.deleteTooltip")} arrow>
              <span>
                <CancelIconButton size="small" onClick={() => onDelete(id)} />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = projects.map((project) => ({
    id: project.id,
    name: project.name,
    datasetCount: project.datasetIds?.length || 0,
    recipientCount: project.recipientIds?.length || 0,
    activityCount: project.dataSharingActivityIds?.length || 0,
    sharedUsernames: project.sharedUsernames || [],
    creationDate: project.creationDate,
    lastModifiedDate: project.lastModifiedDate,
    creatorUsername: project.creatorUsername,
  }));

  return { columns, rows };
}
