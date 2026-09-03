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

export default function getQidDiscoveryConfigurationTableData(
  configurations,
  onEdit,
  onDuplicate,
  onSetDefault,
  onArchive
) {
  const columns = [
    {
      Header: "Display Name",
      accessor: "displayName",
      width: "42%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="configuration" shape="square" />
      ),
    },
    {
      Header: "Status",
      accessor: "active",
      width: "20%",
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
      width: "28%",
      align: "center",
      Cell: ({ row }) => (
        <DateTimeDisplay
          value={row.original.lastModifiedDate || row.original.creationDate}
        />
      ),
    },
    {
      Header: "Actions",
      accessor: "actions",
      width: "10%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => {
        const configuration = row.original.configuration;

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Edit QID Discovery Configuration" arrow>
              <span>
                <EditIconButton
                  size="small"
                  onClick={() => onEdit(configuration)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Duplicate QID Discovery Configuration" arrow>
              <span>
                <ForkIconButton
                  size="small"
                  onClick={() => onDuplicate(configuration)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Set as Default" arrow>
              <span>
                <DefaultIconButton
                  size="small"
                  disabled={
                    !configuration.active ||
                    configuration.defaultConfiguration
                  }
                  onClick={() => onSetDefault(configuration)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Archive QID Discovery Configuration" arrow>
              <span>
                <ArchiveIconButton
                  size="small"
                  disabled={!configuration.active}
                  onClick={() => onArchive(configuration)}
                />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = configurations.map((configuration) => ({
    id: configuration.id,
    displayName: configuration.name,
    active: Boolean(configuration.active),
    defaultConfiguration: Boolean(configuration.defaultConfiguration),
    creationDate: configuration.creationDate,
    lastModifiedDate: configuration.lastModifiedDate,
    configuration: {
      ...configuration,
      active: Boolean(configuration.active),
      defaultConfiguration: Boolean(configuration.defaultConfiguration),
    },
  }));

  return { columns, rows };
}
