import { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  Checkbox,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ActionParameterChooser from "./ActionParameterChooser";
import MitigationActionRowDetails from "./MitigationActionRowDetails";

function ActionRow({ row, columns, selected, expanded, choices, onToggle, onToggleDetails, onChoose }) {
  const { t } = useTranslation();
  const columnCount = columns.length + 2;

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onChange={() => onToggle(row.actionId)}
            inputProps={{ "aria-label": `${t("mitigationPlanner.actions.select", "Select")} ${row.actionName}` }}
          />
        </TableCell>
        {columns.map((column) => (
          <TableCell key={column.id} align={column.align} sx={{ overflowWrap: "anywhere" }}>
            {column.render(row)}
          </TableCell>
        ))}
        <TableCell align="center">
          <IconButton
            size="small"
            onClick={() => onToggleDetails(row.actionId)}
            aria-expanded={expanded}
            aria-label={`${t("mitigationPlanner.actions.details", "Details")}: ${row.actionName}`}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Parameters appear as soon as an action is selected so they can be chosen inline. */}
      {selected && row.parameters.length > 0 && (
        <TableRow>
          <TableCell />
          <TableCell colSpan={columnCount - 1}>
            <ActionParameterChooser
              parameters={row.parameters}
              choices={choices}
              onChoose={(code, value) => onChoose(row.actionId, code, value)}
            />
          </TableCell>
        </TableRow>
      )}

      <TableRow>
        <TableCell sx={{ py: 0, borderBottom: expanded ? undefined : "none" }} colSpan={columnCount}>
          <Collapse in={expanded} unmountOnExit>
            <RABox sx={{ pt: 1, pb: 2, pl: 6 }}>
              <MitigationActionRowDetails row={row} />
            </RABox>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

ActionRow.propTypes = {
  row: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  selected: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  choices: PropTypes.object,
  onToggle: PropTypes.func.isRequired,
  onToggleDetails: PropTypes.func.isRequired,
  onChoose: PropTypes.func.isRequired,
};

ActionRow.defaultProps = { choices: {} };

/**
 * Selectable catalogue actions. The surrounding table supplies its own columns so data and context
 * options stay visually distinct while sharing selection, parameter and detail behaviour.
 */
export default function MitigationActionSelectionTable({
  label,
  columns,
  rows,
  selectedActionIds,
  parameterChoices,
  onToggle,
  onChoose,
  emptyText,
}) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  if (rows.length === 0) {
    return (
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        {emptyText}
      </RATypography>
    );
  }

  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 960 }} aria-label={label}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" align="center">{t("mitigationPlanner.actions.select", "Select")}</TableCell>
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align}>{column.header}</TableCell>
            ))}
            <TableCell align="center">{t("mitigationPlanner.actions.details", "Details")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <ActionRow
              key={row.actionId}
              row={row}
              columns={columns}
              selected={selectedActionIds.includes(row.actionId)}
              expanded={expandedId === row.actionId}
              choices={parameterChoices[row.actionId]}
              onToggle={onToggle}
              onToggleDetails={(id) => setExpandedId((current) => (current === id ? null : id))}
              onChoose={onChoose}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

MitigationActionSelectionTable.propTypes = {
  label: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      align: PropTypes.string,
      render: PropTypes.func.isRequired,
    })
  ).isRequired,
  rows: PropTypes.array.isRequired,
  selectedActionIds: PropTypes.array.isRequired,
  parameterChoices: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onChoose: PropTypes.func.isRequired,
  emptyText: PropTypes.string.isRequired,
};
