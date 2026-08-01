import React from "react";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  EditIconButton,
  CancelIconButton,
  ReportIconButton,
} from "components/input/RAButton/FixStyledButtons";
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
  me,
  t,
  isAdmin
) {
  const columns = [
    {
      Header: t("dataSharingActivities.table.name"),
      accessor: "name",
      width: "20%",
      align: "left",
    },
    {
      Header: t("dataSharingActivities.table.datasetAssessment"),
      accessor: "datasetAssessmentName",
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
      Header: t("dataSharingActivities.table.recipientAssessment"),
      accessor: "recipientAssessmentName",
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
            <LabeledAvatar
              value={value}
              variant="recipientAssessment"
              shape="square"
            />
          </RABox>
        </Tooltip>
      ),
    },
    {
      Header: t("dataSharingActivities.table.lastChange"),
      accessor: "lastModifiedDate",
      width: "10%",
      align: "center",
      Cell: ({ row }) => {
        const dateValue =
          row.original.lastModifiedDate || row.original.creationDate;
        return <DateTimeDisplay value={dateValue} />;
      },
    },
    {
      Header: t("dataSharingActivities.table.createdBy"),
      accessor: "creatorUsername",
      width: "15%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("dataSharingActivities.table.actions"),
      accessor: "actions",
      width: "10%",
      align: "center",
      Cell: ({ row }) => {
        const id = row.original.id;
        const locker = locks[id];

        const isLockedByOther = !isAdmin && !!locker && locker !== me;

        if (isLockedByOther) {
          return (
            <RABox display="flex" justifyContent="center">
              <Tooltip
                title={t("dataSharingActivities.table.lockedBy", {
                  user: locker,
                })}
              >
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
                "dataSharingActivities.table.viewReportTooltip",
                "View Report"
              )}
              arrow
            >
              <span>
                <ReportIconButton
                  size="small"
                  onClick={() => onViewReport(id)}
                />
              </span>
            </Tooltip>
            <Tooltip
              title={t(
                "dataSharingActivities.table.editActivityTooltip",
                "Edit Activity"
              )}
              arrow
            >
              <span>
                <EditIconButton size="small" onClick={() => onEdit(id)} />
              </span>
            </Tooltip>
            <Tooltip
              title={t(
                "dataSharingActivities.table.deleteActivityTooltip",
                "Delete Activity"
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

  const rows = activities.map((a) => ({
    id: a.id,
    name: (
      <RATypography variant="button" fontWeight="medium">
        {a.name || "—"}
      </RATypography>
    ),
    datasetAssessmentName: a.datasetAssessmentName,
    recipientAssessmentName: a.recipientAssessmentName,
    creationDate: a.creationDate,
    lastModifiedDate: a.lastModifiedDate,
    creatorUsername: a.creatorUsername || "—",
  }));

  return { columns, rows };
}
