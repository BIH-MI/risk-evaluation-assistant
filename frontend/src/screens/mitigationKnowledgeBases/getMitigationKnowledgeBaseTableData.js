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

export default function getMitigationKnowledgeBaseTableData(
  knowledgeBases,
  onEdit,
  onFork,
  onSetDefault,
  onArchive
) {
  const columns = [
    {
      Header: "Name",
      accessor: "displayName",
      width: "30%",
      align: "left",
      Cell: ({ value }) => (
        <LabeledAvatar value={value} variant="configuration" shape="square" />
      ),
    },
    {
      Header: "Status",
      accessor: "active",
      width: "16%",
      align: "center",
      Cell: ({ row }) => (
        <RABox display="flex" justifyContent="center" gap={0.75}>
          <Chip
            size="small"
            label={row.original.active ? "Active" : "Archived"}
            color={row.original.active ? "success" : "default"}
            variant={row.original.active ? "filled" : "outlined"}
          />
        </RABox>
      ),
    },
    {
      Header: "Default",
      accessor: "defaultKnowledgeBase",
      width: "12%",
      align: "center",
      Cell: ({ value }) =>
        value ? <Chip size="small" label="Default" color="primary" /> : null,
    },
    {
      Header: "Current Version",
      accessor: "currentVersion",
      width: "14%",
      align: "center",
      Cell: ({ value }) => `v${value || 1}`,
    },
    {
      Header: "Last Updated",
      accessor: "lastModifiedDate",
      width: "16%",
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
      width: "12%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => {
        const kb = row.original.knowledgeBase;
        return (
          <RABox display="flex" justifyContent="center" gap={1}>
            <Tooltip title="Edit Knowledge Base" arrow>
              <span>
                <EditIconButton size="small" onClick={() => onEdit(kb)} />
              </span>
            </Tooltip>
            <Tooltip title="Fork Knowledge Base" arrow>
              <span>
                <ForkIconButton size="small" onClick={() => onFork(kb)} />
              </span>
            </Tooltip>
            <Tooltip title="Set as Default" arrow>
              <span>
                <DefaultIconButton
                  size="small"
                  disabled={!kb.active || kb.defaultKnowledgeBase}
                  onClick={() => onSetDefault(kb)}
                />
              </span>
            </Tooltip>
            <Tooltip title="Archive Knowledge Base" arrow>
              <span>
                <ArchiveIconButton
                  size="small"
                  disabled={!kb.active || kb.defaultKnowledgeBase}
                  onClick={() => onArchive(kb)}
                />
              </span>
            </Tooltip>
          </RABox>
        );
      },
    },
  ];

  const rows = knowledgeBases.map((knowledgeBase) => ({
    id: knowledgeBase.id,
    displayName: knowledgeBase.name,
    active: Boolean(knowledgeBase.active),
    defaultKnowledgeBase: Boolean(knowledgeBase.defaultKnowledgeBase),
    currentVersion: knowledgeBase.currentVersion,
    creationDate: knowledgeBase.creationDate,
    lastModifiedDate: knowledgeBase.lastModifiedDate,
    knowledgeBase,
  }));

  return { columns, rows };
}
