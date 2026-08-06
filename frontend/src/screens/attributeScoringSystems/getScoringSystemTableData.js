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

export default function getScoringSystemTableData(
  scoringSystems,
  onEdit,
  onDuplicate,
  onSetDefault,
  onArchive
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
          {row.original.defaultSystem && (
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
    {
      Header: "Actions",
      accessor: "actions",
      width: "21%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => {
        const system = row.original.system;

        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Edit Scoring System" arrow>
              <span>
                <EditIconButton size="small" onClick={() => onEdit(system)} />
              </span>
            </Tooltip>
            <Tooltip title="Duplicate Scoring System" arrow>
              <span>
                <ForkIconButton
                  size="small"
                  onClick={() => onDuplicate(system)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Set as Default" arrow>
              <span>
                <DefaultIconButton
                  size="small"
                  disabled={!system.active || system.defaultSystem}
                  onClick={() => onSetDefault(system)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Archive Scoring System" arrow>
              <span>
                <ArchiveIconButton
                  size="small"
                  disabled={!system.active}
                  onClick={() => onArchive(system)}
                />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = scoringSystems.map((system) => ({
    id: system.id,
    displayName: system.name,
    active: Boolean(system.active),
    defaultSystem: Boolean(system.defaultSystem),
    creationDate: system.creationDate,
    lastModifiedDate: system.lastModifiedDate,
    system: {
      ...system,
      active: Boolean(system.active),
      defaultSystem: Boolean(system.defaultSystem),
    },
  }));

  return { columns, rows };
}
