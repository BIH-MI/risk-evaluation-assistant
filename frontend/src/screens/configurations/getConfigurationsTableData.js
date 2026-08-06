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

export default function getConfigurationsTableData(
  configurations,
  onEdit,
  onFork,
  onSetDefault,
  onArchive,
  isAdmin
) {
  const columns = [
    {
      Header: "Display Name",
      accessor: "displayName",
      width: "35%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="configuration" shape="square" />
      ),
    },
    {
      Header: "Status",
      accessor: "active",
      width: "22%",
      align: "center",
      Cell: ({ row }) => (
        <RABox display="flex" justifyContent="center" gap={0.75}>
          <Chip
            size="small"
            label={row.original.active ? "Active" : "Archived"}
            color={row.original.active ? "success" : "default"}
            variant={row.original.active ? "filled" : "outlined"}
          />
          {row.original.defaultConfiguration && (
            <Chip size="small" label="Default" color="primary" />
          )}
        </RABox>
      ),
    },
    {
      Header: "Last Updated",
      accessor: "lastModifiedDate",
      width: "22%",
      align: "center",
      Cell: ({ row }) => (
        <DateTimeDisplay
          value={row.original.lastModifiedDate || row.original.creationDate}
        />
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      Header: "Actions",
      accessor: "actions",
      width: "21%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => {
        const config = row.original.config;

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Edit Configuration" arrow>
              <span>
                <EditIconButton size="small" onClick={() => onEdit(config)} />
              </span>
            </Tooltip>
            <Tooltip title="Fork Configuration" arrow>
              <span>
                <ForkIconButton size="small" onClick={() => onFork(config)} />
              </span>
            </Tooltip>
            <Tooltip title="Set as Default" arrow>
              <span>
                <DefaultIconButton
                  size="small"
                  disabled={!config.isActive || config.isDefault}
                  onClick={() => onSetDefault(config)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Archive Configuration" arrow>
              <span>
                <ArchiveIconButton
                  size="small"
                  disabled={!config.isActive}
                  onClick={() => onArchive(config)}
                />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    });
  }

  const rows = configurations.map((config) => ({
    id: config.id,
    displayName: config.name,
    active: Boolean(config.isActive),
    defaultConfiguration: Boolean(config.isDefault),
    creationDate: config.creationDate,
    lastModifiedDate: config.lastModifiedDate,
    config: {
      ...config,
      isActive: Boolean(config.isActive),
      isDefault: Boolean(config.isDefault),
    },
  }));

  return { columns, rows };
}
