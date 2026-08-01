import React from "react";
import RABox from "components/layout/RABox";
import {
  EditIconButton,
  CancelIconButton,
  ForkIconButton,
  ViewIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import SharedUsersList from "components/display/Tables/DataTable/CustomDataTableComponents/SharedUsersList";
import Tooltip from "@mui/material/Tooltip";
import RATypography from "../../components/display/RATypography";

export default function getConfigurationsTableData(
  configurations,
  onEdit,
  onView,
  onFork,
  onDelete,
  t,
  isAdmin
) {
  // Base columns that everyone sees
  const columns = [
    {
      Header: t("configurations.table.name", "Configuration Name"),
      accessor: "name",
      width: "25%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="configuration" shape="square" />
      ),
    },
    {
      Header: t("configurations.table.lastChange", "Last Change"),
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
      Header: t("configurations.table.createdBy", "Created By"),
      accessor: "creatorUsername",
      width: "15%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("configurations.table.sharedWith", "Shared With"),
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
      Header: t("configurations.table.assessments", "#Assessments"),
      accessor: "assessmentCount",
      width: "10%",
      align: "center",
      Cell: ({ value }) => (
        <RATypography
          variant="button"
          fontWeight="medium"
          sx={(theme) => ({
            color: theme.palette.mode === "dark" ? "#ffffff" : "#7b809a",
          })}
        >
          {value || 0}
        </RATypography>
      ),
    },
  ];

  // 2. Conditionally append the Actions column ONLY if the user is an Admin
  if (isAdmin) {
    columns.push({
      Header: t("configurations.table.actions", "Actions"),
      accessor: "actions",
      width: "10%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => {
        const id = row.original.id;
        const isActive = row.original.isActive;

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            {/* 1. View OR Edit (Depending on Active state) */}
            {isActive ? (
              <Tooltip
                title={t(
                  "configurations.table.viewTooltip",
                  "View Configuration"
                )}
                arrow
              >
                <span>
                  <ViewIconButton size="small" onClick={() => onView(id)} />
                </span>
              </Tooltip>
            ) : (
              <Tooltip
                title={t(
                  "configurations.table.editTooltip",
                  "Edit Configuration"
                )}
                arrow
              >
                <span>
                  <EditIconButton size="small" onClick={() => onEdit(id)} />
                </span>
              </Tooltip>
            )}

            {/* 2. ALWAYS Show Fork */}
            <Tooltip
              title={t(
                "configurations.table.forkTooltip",
                "Fork Configuration"
              )}
              arrow
            >
              <span>
                <ForkIconButton
                  size="small"
                  onClick={() => onFork(id, row.original.name)}
                />
              </span>
            </Tooltip>

            {/* 3. ONLY Show Delete if Inactive */}
            {!isActive && (
              <Tooltip
                title={t(
                  "configurations.table.deleteTooltip",
                  "Delete Configuration"
                )}
                arrow
              >
                <span>
                  <CancelIconButton size="small" onClick={() => onDelete(id)} />
                </span>
              </Tooltip>
            )}
          </RABox>
        );
      },
    });
  }

  const rows = configurations.map((config) => ({
    id: config.id,
    name: config.name,
    isActive: config.isActive,
    creationDate: config.creationDate,
    lastModifiedDate: config.lastModifiedDate,
    creatorUsername: config.creatorUsername,
    sharedUsernames: config.sharedUsernames || [],
    assessmentCount: config.assessmentCount || 0,
  }));

  return { columns, rows };
}
