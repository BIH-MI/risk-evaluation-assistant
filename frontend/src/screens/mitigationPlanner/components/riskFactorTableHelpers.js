import PropTypes from "prop-types";
import { Chip } from "@mui/material";

import { formatRiskDriverPriority } from "../utils/mitigationPlannerFormatters";
import { driverTitle } from "../utils/mitigationPlanRows";

export const RISK_FACTOR_COLUMN_COUNT = 4;

export const BODY_CELL_SX = {
  verticalAlign: "middle",
  py: 1,
  px: 1.5,
};

export const CENTER_CELL_SX = {
  ...BODY_CELL_SX,
  textAlign: "center",
};

export function RiskPriorityChip({ priority }) {
  if (!priority) return "—";
  const color = priority === "CRITICAL" ? "error" : priority === "HIGH" ? "warning" : "default";
  return <Chip size="small" variant="outlined" color={color} label={formatRiskDriverPriority(priority)} />;
}

RiskPriorityChip.propTypes = { priority: PropTypes.string };
RiskPriorityChip.defaultProps = { priority: null };

export function actionIdKey(actionId) {
  return String(actionId);
}

export function riskFactorId(driver) {
  if (driver.id !== null && driver.id !== undefined) return String(driver.id);
  return [
    driver.source || "risk-factor",
    driver.categoryCode,
    driver.questionCode,
    (driver.attributeNames || []).join("+"),
    driver.attributeRole,
  ]
    .filter(Boolean)
    .join(":");
}

export function domId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function buildActionsById(actionRows) {
  return actionRows.reduce((actionsById, action) => {
    actionsById.set(action.actionId, action);
    actionsById.set(String(action.actionId), action);
    actionsById.set(Number(action.actionId), action);
    return actionsById;
  }, new Map());
}

export function resolveActions(driver, actionsById) {
  const seen = new Set();
  return (driver.matchedMitigationActionIds || [])
    .map((id) => actionsById.get(id) || actionsById.get(String(id)) || actionsById.get(Number(id)))
    .filter(Boolean)
    .filter((action) => {
      const key = actionIdKey(action.actionId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function hasSelectedAction(selectedActionIds, actionId) {
  return selectedActionIds.some((selectedId) => actionIdKey(selectedId) === actionIdKey(actionId));
}

export function parameterChoicesForAction(parameterChoices, actionId) {
  return parameterChoices[actionId] || parameterChoices[actionIdKey(actionId)] || {};
}

export function toggleSetValue(setValue, value) {
  setValue((current) => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}

export function mitigationControlsId(driver) {
  return `risk-factor-mitigations-${domId(riskFactorId(driver))}`;
}

export function riskFactorLabel(driver) {
  return driverTitle(driver);
}
