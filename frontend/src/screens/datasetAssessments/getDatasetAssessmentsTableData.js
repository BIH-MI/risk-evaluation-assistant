import React from "react";
import RABox from "components/layout/RABox";
import {
  EditIconButton,
  CancelIconButton,
} from "components/input/RAButton/FixStyledButtons";
import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LabeledAvatar from "../../components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import LockIcon from "@mui/icons-material/Lock";
import Tooltip from "@mui/material/Tooltip";

/**
 * Build react-table columns & rows for dataset assessments,
 * including lock-aware action buttons.
 */
export default function getDatasetAssessmentsTableData(
  assessments,
  onEdit,
  onDelete,
  locks = {},
  me = null,
  t,
  isAdmin // <-- 1. Added isAdmin parameter
) {
  const columns = [
    {
      Header: t("datasetAssessments.table.datasetName"),
      accessor: "datasetName",
      width: "15%",
      align: "left",
      Cell: ({ value }) => (
        <Tooltip title={value || ""} placement="top-start" arrow>
          <RABox
            sx={{
              maxWidth: 160,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              "& .MuiTypography-root": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            }}
          >
            <LabeledAvatar value={value} variant="dataset" shape="square" />
          </RABox>
        </Tooltip>
      ),
    },
    {
      Header: t("datasetAssessments.table.assessmentName"),
      accessor: "name",
      width: "20%",
      align: "left",
      Cell: ({ value }) => (
        <Tooltip title={value || ""} placement="top-start" arrow>
          <RABox
            sx={{
              maxWidth: 160,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              "& .MuiTypography-root": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            }}
          >
            <LabeledAvatar
              value={value}
              variant="datasetAssessment"
              shape="square"
            />
          </RABox>
        </Tooltip>
      ),
    },
    {
      Header: t("datasetAssessments.table.configuration"),
      accessor: "configurationName",
      width: "20%",
      align: "left",
      Cell: ({ value }) => (
        <Tooltip title={value || ""} placement="top-start" arrow>
          <RABox
            sx={{
              maxWidth: 200,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              "& .MuiTypography-root": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            }}
          >
            <LabeledAvatar
              value={value}
              variant="configuration"
              shape="square"
            />
          </RABox>
        </Tooltip>
      ),
    },
    {
      Header: t("datasetAssessments.table.lastChange"),
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
      Header: t("datasetAssessments.table.createdBy"),
      accessor: "creatorUsername",
      width: "15%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("datasetAssessments.table.actions"),
      accessor: "actions",
      width: "15%",
      align: "center",
      Cell: ({ row }) => {
        const dsId = row.original.datasetId;
        const id = row.original.id;
        const locker = locks[id];

        // 2. Allow admins to bypass lock
        const isMine = locker === me || isAdmin;

        if (locker && !isMine) {
          return (
            <Tooltip
              title={t("datasetAssessments.table.lockedBy", { user: locker })}
            >
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
                "datasetAssessments.table.editAssessmentTooltip",
                "Edit Assessment"
              )}
              arrow
            >
              <span>
                <EditIconButton
                  size="small"
                  onClick={() => onEdit(dsId, id)}
                  disabled={!!locker && !isMine}
                />
              </span>
            </Tooltip>
            <Tooltip
              title={t(
                "datasetAssessments.table.deleteAssessmentTooltip",
                "Delete Assessment"
              )}
              arrow
            >
              <span>
                <CancelIconButton
                  size="small"
                  onClick={() => onDelete(dsId, id)}
                  disabled={!!locker && !isMine}
                />
              </span>
            </Tooltip>
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
    configurationName: a.configurationName,
    creationDate: a.creationDate,
    lastModifiedDate: a.lastModifiedDate,
    creatorUsername: a.creatorUsername,
  }));

  return { columns, rows };
}
