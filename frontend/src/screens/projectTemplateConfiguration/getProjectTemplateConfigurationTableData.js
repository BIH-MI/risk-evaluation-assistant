import React from "react";
import { Chip, Tooltip } from "@mui/material";

import DateTimeDisplay from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import RABox from "components/layout/RABox";
import {
  ArchiveIconButton,
  DefaultIconButton,
  EditIconButton,
  ForkIconButton,
} from "components/input/RAButton/FixStyledButtons";

export default function getProjectTemplateConfigurationTableData(
  templates,
  onEdit,
  onDuplicate,
  onSetDefault,
  onArchive,
  t
) {
  const columns = [
    {
      Header: t("projectTemplateConfiguration.table.displayName"),
      accessor: "displayName",
      width: "34%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="configuration" shape="square" />
      ),
    },
    {
      Header: t("projectTemplateConfiguration.table.version"),
      accessor: "versionNumber",
      width: "12%",
      align: "center",
    },
    {
      Header: t("projectTemplateConfiguration.table.status"),
      accessor: "active",
      width: "24%",
      align: "center",
      Cell: ({ row }) => (
        <RABox display="flex" justifyContent="center" gap={0.75}>
          <Chip
            size="small"
            label={
              row.original.active
                ? t("projectTemplateConfiguration.table.statusActive")
                : t("projectTemplateConfiguration.table.statusArchived")
            }
            color={row.original.active ? "success" : "default"}
            variant={row.original.active ? "filled" : "outlined"}
          />
          {row.original.defaultTemplate && (
            <Chip
              size="small"
              label={t("projectTemplateConfiguration.table.statusDefault")}
              color="primary"
            />
          )}
        </RABox>
      ),
    },
    {
      Header: t("projectTemplateConfiguration.table.lastUpdated"),
      accessor: "lastModifiedDate",
      width: "20%",
      align: "center",
      Cell: ({ row }) => (
        <DateTimeDisplay
          value={row.original.lastModifiedDate || row.original.creationDate}
        />
      ),
    },
    {
      Header: t("projectTemplateConfiguration.table.actions"),
      accessor: "actions",
      width: "10%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => {
        const template = row.original.template;

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip title={t("projectTemplateConfiguration.table.editTooltip")} arrow>
              <span>
                <EditIconButton size="small" onClick={() => onEdit(template)} />
              </span>
            </Tooltip>
            <Tooltip title={t("projectTemplateConfiguration.table.duplicateTooltip")} arrow>
              <span>
                <ForkIconButton size="small" onClick={() => onDuplicate(template)} />
              </span>
            </Tooltip>
            <Tooltip title={t("projectTemplateConfiguration.table.setDefaultTooltip")} arrow>
              <span>
                <DefaultIconButton
                  size="small"
                  disabled={!template.active || template.defaultTemplate}
                  onClick={() => onSetDefault(template)}
                />
              </span>
            </Tooltip>
            <Tooltip title={t("projectTemplateConfiguration.table.archiveTooltip")} arrow>
              <span>
                <ArchiveIconButton
                  size="small"
                  disabled={!template.active}
                  onClick={() => onArchive(template)}
                />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = templates.map((template) => ({
    id: template.id,
    displayName: template.name,
    versionNumber: template.versionNumber,
    active: Boolean(template.active),
    defaultTemplate: Boolean(template.defaultTemplate),
    creationDate: template.creationDate,
    lastModifiedDate: template.lastModifiedDate,
    template: {
      ...template,
      active: Boolean(template.active),
      defaultTemplate: Boolean(template.defaultTemplate),
    },
  }));

  return { columns, rows };
}
