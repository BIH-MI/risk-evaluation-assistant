import { useCallback, useEffect, useMemo, useState } from "react";

import { evaluateMitigationPlanDraftApi } from "api/mitigationPlanner";
import { formatParameterLabel, humanizeCode } from "./utils/mitigationPlannerFormatters";
import { buildActionRows, isUnresolvableParameter } from "./utils/mitigationPlanRows";

export const CUSTOM_PLAN_KEY = "custom-plan";

const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";

const normalizedActionIds = (actionIds) =>
  [...new Set((actionIds || []).map((id) => Number(id)).filter(Number.isFinite))].sort(
    (left, right) => left - right
  );

const normalizedActionId = (actionId) => {
  const value = Number(actionId);
  return Number.isFinite(value) ? value : null;
};

function buildSelectedParameters(actionIds, parameterChoices) {
  return normalizedActionIds(actionIds)
    .flatMap((actionId) =>
      Object.entries(parameterChoices[actionId] || {})
        .filter(([, value]) => !isBlank(value))
        .map(([parameterCode, value]) => ({
          actionId,
          parameterCode,
          value,
        }))
    )
    .sort((left, right) =>
      left.actionId === right.actionId
        ? left.parameterCode.localeCompare(right.parameterCode)
        : left.actionId - right.actionId
    );
}

/**
 * Everything that must be completed before the Custom Plan can be evaluated, per selected action.
 * Parameters without allowed values stay unresolved by design (decided during transformation
 * evaluation); every other parameter needs an allowed, non-incompatible value.
 */
export function customPlanIssues(actionIds, parameterChoices, actionsById) {
  const issues = [];
  normalizedActionIds(actionIds).forEach((actionId) => {
    const action = actionsById.get(actionId);
    if (!action) {
      issues.push({ actionId, message: "A selected mitigation action is no longer applicable." });
      return;
    }
    (action.parameters || []).forEach((parameter) => {
      if (isUnresolvableParameter(parameter)) return;
      const label = formatParameterLabel(parameter.parameterCode);
      const selectedValue = parameterChoices[actionId]?.[parameter.parameterCode];
      const selectedOption = (parameter.allowedValues || []).find((option) => option.value === selectedValue);
      let message = null;
      if (isBlank(selectedValue)) {
        message = `Select ${label.toLowerCase()} for "${action.actionName}".`;
      } else if (!selectedOption) {
        message = `${humanizeCode(selectedValue)} is not an allowed value for ${label.toLowerCase()} of "${action.actionName}".`;
      } else if (selectedOption.compatibility === "INCOMPATIBLE") {
        message = `${humanizeCode(selectedValue)} is incompatible with the Project requirement for "${action.actionName}".`;
      }
      if (message) issues.push({ actionId, parameterCode: parameter.parameterCode, message });
    });
  });
  return issues;
}

/** A value is pre-selected only when it is the single value known to be Project-compatible. */
export function defaultParameterChoices(action) {
  const choices = {};
  (action?.parameters || []).forEach((parameter) => {
    if (isUnresolvableParameter(parameter)) return;
    const compatible = (parameter.allowedValues || []).filter((option) => option.compatibility === "COMPATIBLE");
    if (compatible.length === 1) choices[parameter.parameterCode] = compatible[0].value;
  });
  return choices;
}

/**
 * Custom Plan: a researcher-assembled combination of applicable actions. It is evaluated by the
 * backend with the same evaluator as generated candidates (plan-drafts/evaluate) but is never
 * ranked by the selection policy, so it cannot change the Recommended Plan or the alternatives.
 * Evaluation never executes transformations or changes stored assessments.
 */
export default function useMitigationPlanBuilder({ activityId, token, manualRiskThreshold, overview }) {
  const [selectedActionIds, setSelectedActionIds] = useState([]);
  const [parameterChoices, setParameterChoices] = useState({});
  const [customPlan, setCustomPlan] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const actionRows = useMemo(() => buildActionRows(overview), [overview]);
  const dataRows = useMemo(() => actionRows.filter((row) => row.group === "DATA"), [actionRows]);
  const contextRows = useMemo(() => actionRows.filter((row) => row.group === "CONTEXT"), [actionRows]);
  const actionsById = useMemo(
    () => new Map(actionRows.map((row) => [Number(row.actionId), row])),
    [actionRows]
  );
  const issues = useMemo(
    () => customPlanIssues(selectedActionIds, parameterChoices, actionsById),
    [actionsById, parameterChoices, selectedActionIds]
  );

  const clear = useCallback(() => {
    setSelectedActionIds([]);
    setParameterChoices({});
    setCustomPlan(null);
    setErrorMessage("");
  }, []);

  // A Custom Plan belongs to one activity and threshold; never carry it over.
  useEffect(() => {
    clear();
  }, [activityId, manualRiskThreshold, clear]);

  // Only actions that are applicable in the current overview may stay selected.
  useEffect(() => {
    setSelectedActionIds((current) => {
      const next = current.filter((id) => actionsById.has(id));
      return next.length === current.length ? current : next;
    });
    setParameterChoices((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([id]) => actionsById.has(Number(id))));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [actionsById]);

  const toggleAction = useCallback((actionId) => {
    const id = normalizedActionId(actionId);
    if (id === null) return;

    const deselecting = selectedActionIds.includes(id);
    setSelectedActionIds((current) => {
      if (deselecting) return current.filter((currentId) => currentId !== id);
      return current.includes(id) ? current : [...current, id];
    });
    // Deselecting drops the action's parameter choices; selecting starts from safe defaults.
    setParameterChoices((choices) => {
      const { [id]: removed, ...rest } = choices;
      if (deselecting) return removed ? rest : choices;
      const defaults = defaultParameterChoices(actionsById.get(id));
      return Object.keys(defaults).length > 0 ? { ...rest, [id]: defaults } : rest;
    });
  }, [actionsById, selectedActionIds]);

  const chooseParameter = useCallback((actionId, parameterCode, value) => {
    const id = normalizedActionId(actionId);
    if (id === null) return;

    setParameterChoices((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [parameterCode]: value },
    }));
  }, []);

  /** Evaluates the current selection; resolves to the Custom Plan, or null when it is invalid. */
  const evaluate = useCallback(async () => {
    const selectedIds = normalizedActionIds(selectedActionIds);
    // The button is disabled while issues exist; this guard only protects programmatic calls.
    if (selectedIds.length === 0 || issues.length > 0) return null;
    if (!token || !activityId) {
      setErrorMessage("Custom Plan could not be evaluated.");
      return null;
    }

    const selectedParameters = buildSelectedParameters(selectedIds, parameterChoices);
    setEvaluating(true);
    setErrorMessage("");
    try {
      const evaluation = await evaluateMitigationPlanDraftApi(
        activityId,
        { selectedActionIds: selectedIds, selectedParameters, manualRiskThreshold },
        token
      );
      if (evaluation?.status === "INVALID") {
        setErrorMessage(evaluation.statusReasons?.[0] || "Custom Plan could not be evaluated.");
        return null;
      }
      const plan = {
        key: CUSTOM_PLAN_KEY,
        label: "Custom Plan",
        custom: true,
        selectedActionIds: selectedIds,
        selectedParameters,
        evaluation,
      };
      setCustomPlan(plan);
      return plan;
    } catch (error) {
      setErrorMessage(error?.message || "Custom Plan could not be evaluated.");
      return null;
    } finally {
      setEvaluating(false);
    }
  }, [activityId, issues, manualRiskThreshold, parameterChoices, selectedActionIds, token]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return {
    dataRows,
    contextRows,
    selectedActionIds,
    parameterChoices,
    customPlan,
    issues,
    canEvaluate: selectedActionIds.length > 0 && issues.length === 0,
    evaluating,
    errorMessage,
    toggleAction,
    chooseParameter,
    evaluate,
    clear,
    clearError,
  };
}
