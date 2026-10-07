import { Fragment, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

import RiskFactorRow from "./RiskFactorRow";
import {
  BODY_CELL_SX,
  CENTER_CELL_SX,
  buildActionsById,
  resolveActions,
  riskFactorColumnCount,
  riskFactorId,
  toggleSetValue,
} from "./riskFactorTableHelpers";

export default function RiskFactorTable({ drivers, actionRows, builder, currentHeader, showDataType }) {
  const { t } = useTranslation();
  const [expandedRiskFactorIds, setExpandedRiskFactorIds] = useState(() => new Set());
  const [expandedActionIds, setExpandedActionIds] = useState(() => new Set());
  const actionsById = buildActionsById(actionRows);
  const columnCount = riskFactorColumnCount(showDataType);

  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table
        size="small"
        sx={{ minWidth: showDataType ? 860 : 760 }}
        aria-label={t("mitigationPlanner.factors.tableLabel", "Risk factors")}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={CENTER_CELL_SX}>{t("mitigationPlanner.factors.priority", "Priority")}</TableCell>
            <TableCell sx={BODY_CELL_SX}>{t("mitigationPlanner.factors.riskFactor", "Risk Factor")}</TableCell>
            {showDataType && (
              <TableCell sx={BODY_CELL_SX}>{t("mitigationPlanner.factors.dataType", "Data type")}</TableCell>
            )}
            <TableCell sx={BODY_CELL_SX}>{currentHeader || t("mitigationPlanner.factors.current", "Current answer")}</TableCell>
            <TableCell sx={CENTER_CELL_SX}>{t("mitigationPlanner.factors.possibleMitigation", "Mitigation options")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {drivers.map((driver) => {
            const key = riskFactorId(driver);
            const actions = resolveActions(driver, actionsById);
            const expanded = expandedRiskFactorIds.has(key);

            return (
              <Fragment key={key}>
                <RiskFactorRow
                  driver={driver}
                  actions={actions}
                  expanded={expanded}
                  onToggleRiskFactor={() => toggleSetValue(setExpandedRiskFactorIds, key)}
                  selectedActionIds={builder.selectedActionIds}
                  parameterChoices={builder.parameterChoices}
                  onToggleAction={builder.toggleAction}
                  onToggleDetails={(actionId) => toggleSetValue(setExpandedActionIds, actionId)}
                  onChooseParameter={builder.chooseParameter}
                  expandedActionIds={expandedActionIds}
                  showDataType={showDataType}
                  columnCount={columnCount}
                />
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

RiskFactorTable.propTypes = {
  drivers: PropTypes.array.isRequired,
  actionRows: PropTypes.array,
  builder: PropTypes.shape({
    selectedActionIds: PropTypes.array.isRequired,
    parameterChoices: PropTypes.object.isRequired,
    toggleAction: PropTypes.func.isRequired,
    chooseParameter: PropTypes.func.isRequired,
  }).isRequired,
  currentHeader: PropTypes.string,
  showDataType: PropTypes.bool,
};

RiskFactorTable.defaultProps = { actionRows: [], currentHeader: null, showDataType: false };
