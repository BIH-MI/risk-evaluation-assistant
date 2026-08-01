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
  me,
  t,
  isAdmin
) {
  const columns = [
    {
      Header: t("recipientAssessments.table.organization"),
      accessor: "organization",
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
              variant="organization"
              shape="square"
            />
          </RABox>
        </Tooltip>
      ),
    },
    {
      Header: t("recipientAssessments.table.assessmentName"),
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
              variant="recipientAssessment"
              shape="square"
            />
          </RABox>
        </Tooltip>
      ),
    },
    {
      Header: t("recipientAssessments.table.configuration"),
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
      Header: t("recipientAssessments.table.lastChange"),
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
      Header: t("recipientAssessments.table.createdBy"),
      accessor: "creatorUsername",
      width: "15%",
      align: "center",
      Cell: ({ value }) => <LabeledAvatar value={value} variant="user" />,
    },
    {
      Header: t("recipientAssessments.table.actions"),
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
              <Tooltip
                title={t("recipientAssessments.table.lockedBy", {
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
                "recipientAssessments.table.editAssessmentTooltip",
                "Edit Assessment"
              )}
              arrow
            >
              <span>
                <EditIconButton
                  size="small"
                  onClick={() => onEdit(row.original.recipientId, id)}
                />
              </span>
            </Tooltip>
            <Tooltip
              title={t(
                "recipientAssessments.table.deleteAssessmentTooltip",
                "Delete Assessment"
              )}
              arrow
            >
              <span>
                <CancelIconButton
                  size="small"
                  onClick={() => onDelete(row.original.recipientId, id)}
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
    recipientId: a.recipientId,
    assessmentName: a.assessmentName,
    organization: a.organization,
    name: a.name,
    configurationName: a.configurationName,
    creationDate: a.creationDate,
    lastModifiedDate: a.lastModifiedDate,
    creatorUsername: a.creatorUsername,
  }));

  return { columns, rows };
}
