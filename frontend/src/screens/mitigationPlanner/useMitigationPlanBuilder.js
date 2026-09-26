import { useCallback, useEffect, useMemo, useState } from "react";

import { evaluateMitigationPlanDraftApi } from "api/mitigationPlanner";
import {
  formatParameterLabel,
  humanizeCode,
  STRATEGY_PLAN_PREFIX,
} from "./utils/mitigationPlannerFormatters";
import { buildActionRows, isUnresolvableParameter } from "./utils/mitigationPlanRows";

const DUPLICATE_PLAN_MESSAGE = "This candidate plan already exists.";

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

function buildPlanSignature(actionIds, selectedParameters) {
  const parametersByAction = new Map();
  selectedParameters.forEach((parameter) => {
    const current = parametersByAction.get(parameter.actionId) || [];
    current.push(`${parameter.parameterCode}=${parameter.value}`);
    parametersByAction.set(parameter.actionId, current);
  });

  return normalizedActionIds(actionIds)
    .map((actionId) => {
      const parameters = (parametersByAction.get(actionId) || []).sort();
      return parameters.length > 0 ? `${actionId}:${parameters.join(",")}` : String(actionId);
    })
    .join("|");
}

export function nextPlanLabel(strategy, existingPlans) {
  const prefix = STRATEGY_PLAN_PREFIX[strategy] || "P";
  const strategyCount = existingPlans.filter((plan) => plan.evaluation?.strategy === strategy).length;
  return `${prefix}${strategyCount + 1}`;
}

function makePlanKey(strategy, label, signature) {
  const signatureSlug = signature.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${String(strategy || "plan").toLowerCase()}-${label.toLowerCase()}-${signatureSlug || "draft"}`;
}

function validationMessageForDraft(actionIds, parameterChoices, actionRows) {
  if (actionIds.length === 0) {
    return "Select at least one mitigation action.";
  }

  const actionsById = new Map(actionRows.map((row) => [Number(row.actionId), row]));

  for (const actionId of normalizedActionIds(actionIds)) {
    const action = actionsById.get(actionId);
    if (!action) {
      return "The selected mitigation action is no longer applicable.";
    }

    for (const parameter of action.parameters || []) {
      if (isUnresolvableParameter(parameter)) continue;

      const label = formatParameterLabel(parameter.parameterCode);
      const allowedValues = parameter.allowedValues || [];
      const selectedValue = parameterChoices[actionId]?.[parameter.parameterCode];

      if (isBlank(selectedValue)) {
        return `${label} must be selected.`;
      }

      const selectedOption = allowedValues.find((option) => option.value === selectedValue);
      if (!selectedOption) {
        return `${humanizeCode(selectedValue)} is not an allowed value for ${label.toLowerCase()}.`;
      }

      if (selectedOption.compatibility === "INCOMPATIBLE") {
        return `${humanizeCode(selectedValue)} is incompatible with the Project requirement.`;
      }
    }
  }

  return "";
}

/**
 * Draft plans are planning alternatives only. Evaluation never executes data transformations or
 * changes the persisted Dataset, Recipient, or Project assessments.
 */
export default function useMitigationPlanBuilder({
  activityId,
  token,
  manualRiskThreshold,
  overview,
}) {
  const [selectedActionIds, setSelectedActionIds] = useState([]);
  const [parameterChoices, setParameterChoices] = useState({});
  const [plans, setPlans] = useState([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const actionRows = useMemo(() => buildActionRows(overview), [overview]);
  const dataRows = useMemo(() => actionRows.filter((row) => row.group === "DATA"), [actionRows]);
  const contextRows = useMemo(() => actionRows.filter((row) => row.group === "CONTEXT"), [actionRows]);
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.key === selectedPlanKey) ?? null,
    [plans, selectedPlanKey]
  );

  useEffect(() => {
    setSelectedActionIds([]);
    setParameterChoices({});
    setPlans([]);
    setSelectedPlanKey(null);
    setErrorMessage("");
  }, [activityId, manualRiskThreshold]);

  const toggleAction = useCallback((actionId) => {
    const id = normalizedActionId(actionId);
    if (id === null) return;

    setSelectedActionIds((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]
    );
    setParameterChoices((current) => {
      const { [id]: removed, ...rest } = current;
      return removed && Object.keys(removed).length > 0 ? rest : current;
    });
  }, []);

  const chooseParameter = useCallback((actionId, parameterCode, value) => {
    const id = normalizedActionId(actionId);
    if (id === null) return;

    setParameterChoices((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [parameterCode]: value },
    }));
  }, []);

  const selectPlan = useCallback((planKey) => {
    setSelectedPlanKey(planKey);
  }, []);

  const createPlan = useCallback(async () => {
    const selectedIds = normalizedActionIds(selectedActionIds);
    const validationMessage = validationMessageForDraft(selectedIds, parameterChoices, actionRows);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    if (!token || !activityId) {
      setErrorMessage("Candidate plan could not be evaluated.");
      return;
    }

    const selectedParameters = buildSelectedParameters(selectedIds, parameterChoices);
    const signature = buildPlanSignature(selectedIds, selectedParameters);
    const duplicate = plans.find((plan) => plan.signature === signature);
    if (duplicate) {
      setSelectedPlanKey(duplicate.key);
      setErrorMessage(DUPLICATE_PLAN_MESSAGE);
      return;
    }

    setCreating(true);
    setErrorMessage("");
    try {
      const evaluation = await evaluateMitigationPlanDraftApi(
        activityId,
        {
          selectedActionIds: selectedIds,
          selectedParameters,
          manualRiskThreshold,
        },
        token
      );

      if (evaluation?.status === "INVALID") {
        setErrorMessage(
          evaluation.statusReasons?.[0] || "Candidate plan could not be evaluated."
        );
        return;
      }

      const label = nextPlanLabel(evaluation.strategy, plans);
      const candidate = {
        key: makePlanKey(evaluation.strategy, label, signature),
        label,
        signature,
        selectedActionIds: selectedIds,
        selectedParameters,
        evaluation,
      };

      setPlans((current) => [...current, candidate]);
      setSelectedPlanKey(candidate.key);
      setSelectedActionIds([]);
      setParameterChoices({});
    } catch (error) {
      setErrorMessage(error?.message || "Candidate plan could not be evaluated.");
    } finally {
      setCreating(false);
    }
  }, [
    actionRows,
    activityId,
    manualRiskThreshold,
    parameterChoices,
    plans,
    selectedActionIds,
    token,
  ]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return {
    dataRows,
    contextRows,
    selectedActionIds,
    parameterChoices,
    plans,
    selectedPlanKey,
    selectedPlan,
    creating,
    errorMessage,
    toggleAction,
    chooseParameter,
    createPlan,
    selectPlan,
    clearError,
  };
}
