import React from "react";
import { Chip, Tooltip } from "@mui/material";

import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import RABox from "components/layout/RABox";
import { EditIconButton } from "components/input/RAButton/FixStyledButtons";

function formatEnumLabel(value) {
  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function mappingCount(action) {
  return (
    (action.questionMappings || []).length + (action.attributeMappings || []).length
  );
}

export default function getMitigationActionsTableData(actions, onEdit) {
  const columns = [
    {
      Header: "Name",
      accessor: "displayName",
      width: "40%",
      align: "left",
      Cell: ({ row }) => (
        <RABox display="flex" flexDirection="column" gap={0.5}>
          <LabeledAvatar
            value={row.original.displayName}
            variant="configuration"
            shape="square"
          />
        </RABox>
      ),
    },
    {
      Header: "Type",
      accessor: "actionTypeLabel",
      width: "18%",
      align: "center",
    },
    {
      Header: "Active",
      accessor: "active",
      width: "12%",
      align: "center",
      Cell: ({ value }) => (
        <Chip
          size="small"
          label={value ? "Active" : "Inactive"}
          color={value ? "success" : "default"}
          variant={value ? "filled" : "outlined"}
        />
      ),
    },
    {
      Header: "Mappings",
      accessor: "mappings",
      width: "20%",
      align: "center",
    },
    {
      Header: "Edit",
      accessor: "actions",
      width: "10%",
      align: "center",
      disableSortBy: true,
      Cell: ({ row }) => (
        <RABox display="flex" justifyContent="center">
          <Tooltip title="Edit Mitigation Action" arrow>
            <span>
              <EditIconButton
                size="small"
                onClick={() => onEdit(row.original.action)}
              />
            </span>
          </Tooltip>
        </RABox>
      ),
    },
  ];

  const rows = actions.map((action) => ({
    id: action.id,
    displayName: action.name,
    actionTypeLabel: formatEnumLabel(action.actionType),
    active: Boolean(action.active),
    mappings: mappingCount(action),
    action,
  }));

  return { columns, rows };
}
