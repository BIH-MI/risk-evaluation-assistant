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
import LockIcon from "@mui/icons-material/Lock"; // <-- Restored missing import
import Tooltip from "@mui/material/Tooltip";
import RAButton from "../../components/input/RAButton";

export default function getDatasetsTableData(
  datasets,
  onEdit,
  onDelete,
  locks,
  me,
  onViewAssessments,
  onAddAssessment,
  t,
  isAdmin
) {
  const columns = [
    {
      Header: t("datasets.table.datasetName"),
      accessor: "name",
      width: "25%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="dataset" shape="square" />
      ),
    },
    {
      Header: t("datasets.table.lastChange"),
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
      Header: t("datasets.table.createdBy"),
      accessor: "creatorUsername",
      width: "15%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("datasets.table.sharedWith"),
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
      Header: t("datasets.table.assessments"),
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
      Header: t("datasets.table.actions"),
      accessor: "actions",
      width: "20%",
      align: "center",
      Cell: ({ row }) => {
        const id = row.original.id;
        const locker = locks[id];

        // If they are an admin, treat it as if it's theirs (bypass lock)
        const isMine = locker === me || isAdmin;

        // FIX: Removed the {" "} and wrapped in a span to prevent the crash
        if (locker && !isMine) {
          return (
            <Tooltip title={t("datasets.table.lockedBy", { user: locker })}>
              <span>
                <LockIcon color="action" />
              </span>
            </Tooltip>
          );
        }

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip
              title={t(
                "datasets.table.createAssessmentTooltip",
                "Create Assessment"
              )}
              arrow
            >
              <span>
                <AssessmentIconButton
                  size="small"
                  onClick={() => onAddAssessment(id)}
                  aria-label={t("datasets.table.addAssessment")}
                />
              </span>
            </Tooltip>

            <Tooltip
              title={t("datasets.table.editDatasetTooltip", "Edit Dataset")}
              arrow
            >
              <span>
                <EditIconButton
                  size="small"
                  onClick={() => onEdit(id)}
                  disabled={!!locker && !isMine}
                />
              </span>
            </Tooltip>

            <Tooltip
              title={t("datasets.table.deleteDatasetTooltip", "Delete Dataset")}
              arrow
            >
              <span>
                <CancelIconButton
                  size="small"
                  onClick={() => onDelete(id)}
                  disabled={!!locker && !isMine}
                />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = datasets.map((dataset) => {
    const numTables = Array.isArray(dataset.tables) ? dataset.tables.length : 0;
    const numAssessments = Array.isArray(dataset.assessmentIds)
      ? dataset.assessmentIds.length
      : 0;

    return {
      id: dataset.id,
      name: dataset.name,
      sharedUsernames: dataset.sharedUsernames || [],
      creationDate: dataset.creationDate,
      lastModifiedDate: dataset.lastModifiedDate,
      creatorUsername: dataset.creatorUsername,
      tableCount: numTables,
      assessmentCount: numAssessments,
    };
  });

  return { columns, rows };
}
