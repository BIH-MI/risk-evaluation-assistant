import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";

import {
  createMitigationActionApi,
  fetchMitigationActionApi,
  updateMitigationActionApi,
} from "api/mitigationActions";
import { fetchConfigurationsApi } from "api/configurations";
import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import { isAdminUser } from "utils/auth";

import ActionGuidanceSection from "./components/ActionGuidanceSection";
import ApplicabilitySection from "./components/ApplicabilitySection";
import BasicSection from "./components/BasicSection";
import DataApplicabilitySection from "./components/DataApplicabilitySection";
import DataTransformationEffectSection from "./components/DataTransformationEffectSection";
import OperationalEstimatesSection from "./components/OperationalEstimatesSection";
import PlanParameterSection from "./components/PlanParameterSection";
import QuestionnaireApplicabilitySection from "./components/QuestionnaireApplicabilitySection";
import {
  PARAMETER_CODES,
  buildActionPayload,
  emptyActionForm,
  hasActionFormErrors,
  normalizeActionToForm,
  normalizeSharingArrangement,
  parameterDefaults,
  validateActionForm,
  withClientId,
} from "./mitigationActionFormUtils";

const LIST_ROUTE = "/configuration/mitigation-catalogue";

function getFirstAvailableParameterCode(parameters) {
  const usedParameterCodes = new Set(
    parameters.map((parameter) => parameter.parameterCode)
  );
  return (
    PARAMETER_CODES.find((option) => !usedParameterCodes.has(option.value))
      ?.value || null
  );
}

export default function AddEditMitigationAction() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const isEditMode = Boolean(id);

  const [form, setForm] = useState(() => emptyActionForm());
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token || !isAdmin) return undefined;

    let mounted = true;
    const loadEditorData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [configurationData, action] = await Promise.all([
          fetchConfigurationsApi(token),
          isEditMode ? fetchMitigationActionApi(id, token) : null,
        ]);
        if (!mounted) return;
        setConfigurations(Array.isArray(configurationData) ? configurationData : []);
        setForm(action ? normalizeActionToForm(action) : emptyActionForm());
        setShowErrors(false);
      } catch (error) {
        if (mounted) {
          setErrorMsg(error.message || "Failed to load mitigation action.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadEditorData();
    return () => {
      mounted = false;
    };
  }, [id, isAdmin, isEditMode, token]);

  const validationErrors = useMemo(() => validateActionForm(form), [form]);
  const hasErrors = hasActionFormErrors(validationErrors);

  const updateField = useCallback((field, value) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "currency") next.currency = String(value || "").toUpperCase();
      if (field === "applicableSharingArrangements") {
        next.applicableSharingArrangements = Array.from(
          new Set((Array.isArray(value) ? value : []).map(normalizeSharingArrangement))
        );
      }
      return next;
    });
  }, []);

  const updateCollectionItem = useCallback((collection, clientId, changes) => {
    setForm((previous) => ({
      ...previous,
      [collection]: previous[collection].map((item) =>
        item.clientId === clientId ? { ...item, ...changes } : item
      ),
    }));
  }, []);

  const addCollectionItem = useCallback((collection, item) => {
    setForm((previous) => ({
      ...previous,
      [collection]: [...previous[collection], withClientId(item)],
    }));
  }, []);

  const removeCollectionItem = useCallback((collection, clientId) => {
    setForm((previous) => ({
      ...previous,
      [collection]: previous[collection].filter((item) => item.clientId !== clientId),
    }));
  }, []);

  const addDataApplicabilityRule = useCallback(() => {
    addCollectionItem("attributeMappings", {
      attributeRole: "CANDIDATE_QID",
      dataType: "",
    });
  }, [addCollectionItem]);

  const updateDataApplicabilityRule = useCallback(
    (clientId, changes) => updateCollectionItem("attributeMappings", clientId, changes),
    [updateCollectionItem]
  );

  const removeDataApplicabilityRule = useCallback(
    (clientId) => removeCollectionItem("attributeMappings", clientId),
    [removeCollectionItem]
  );

  const addPlanParameter = useCallback(() => {
    const parameterCode = getFirstAvailableParameterCode(form.parameterDefinitions);
    if (parameterCode) {
      addCollectionItem("parameterDefinitions", parameterDefaults(parameterCode));
    }
  }, [addCollectionItem, form.parameterDefinitions]);

  const updatePlanParameter = useCallback(
    (clientId, changes) =>
      updateCollectionItem("parameterDefinitions", clientId, changes),
    [updateCollectionItem]
  );

  const removePlanParameter = useCallback(
    (clientId) => removeCollectionItem("parameterDefinitions", clientId),
    [removeCollectionItem]
  );

  const addQuestionnaireRule = useCallback(() => {
    addCollectionItem("questionMappings", {
      configurationId: "",
      assessmentScope: form.actionType === "DATA_TRANSFORMATION" ? "DATASET" : "RECIPIENT",
      categoryCode: "",
      questionCode: "",
      triggerOptionCode: "",
      projectedOptionCode: "",
    });
  }, [addCollectionItem, form.actionType]);

  const updateQuestionnaireRule = useCallback(
    (clientId, changes) => updateCollectionItem("questionMappings", clientId, changes),
    [updateCollectionItem]
  );

  const removeQuestionnaireRule = useCallback(
    (clientId) => removeCollectionItem("questionMappings", clientId),
    [removeCollectionItem]
  );

  const handleSave = useCallback(async () => {
    setShowErrors(true);
    if (hasErrors || !token || saving) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const payload = buildActionPayload(form);
      if (isEditMode) {
        await updateMitigationActionApi(id, payload, token);
      } else {
        await createMitigationActionApi(payload, token);
      }
      navigate(LIST_ROUTE);
    } catch (error) {
      setErrorMsg(error.message || "Failed to save mitigation action.");
    } finally {
      setSaving(false);
    }
  }, [form, hasErrors, id, isEditMode, navigate, saving, token]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            Only administrators can manage the mitigation catalogue.
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  if (loading) {
    return (
      <RABox p={5} display="flex" justifyContent="center">
        <CircularProgress size={60} thickness={4} color="primary" disableShrink />
      </RABox>
    );
  }

  return (
    <RABox
      component="form"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          event.target.tagName !== "TEXTAREA" &&
          event.target.tagName !== "BUTTON"
        ) {
          event.preventDefault();
        }
      }}
      display="flex"
      flexDirection="column"
      maxWidth="1100px"
      width="100%"
      mx="auto"
      gap={3}
      p={2}
    >
      <RATypography
        variant="h4"
        fontWeight="bold"
        align="center"
      >
        {isEditMode ? "Edit Mitigation Action" : "Create Mitigation Action"}
      </RATypography>

      <BasicSection
        form={form}
        errors={validationErrors}
        showErrors={showErrors}
        isEditMode={isEditMode}
        onChange={updateField}
      />

      <ApplicabilitySection form={form} onChange={updateField} />
      <ActionGuidanceSection form={form} onChange={updateField} />
      <OperationalEstimatesSection
        form={form}
        errors={validationErrors}
        showErrors={showErrors}
        onChange={updateField}
      />

      {form.actionType === "DATA_TRANSFORMATION" && (
        <>
          <DataTransformationEffectSection
            form={form}
            errors={validationErrors}
            showErrors={showErrors}
            onChange={updateField}
          />

          <DataApplicabilitySection
            mappings={form.attributeMappings}
            errors={validationErrors.attributeMappings || []}
            showErrors={showErrors}
            onAdd={addDataApplicabilityRule}
            onUpdate={updateDataApplicabilityRule}
            onRemove={removeDataApplicabilityRule}
          />

          <PlanParameterSection
            parameters={form.parameterDefinitions}
            errors={validationErrors.parameterDefinitions || []}
            showErrors={showErrors}
            onAdd={addPlanParameter}
            onUpdate={updatePlanParameter}
            onRemove={removePlanParameter}
          />
        </>
      )}

      {["DATA_TRANSFORMATION", "CONTEXT_CONTROL"].includes(form.actionType) && (
        <QuestionnaireApplicabilitySection
          mappings={form.questionMappings}
          errors={validationErrors.questionMappings || []}
          showErrors={showErrors}
          configurations={configurations}
          actionType={form.actionType}
          onAdd={addQuestionnaireRule}
          onUpdate={updateQuestionnaireRule}
          onRemove={removeQuestionnaireRule}
        />
      )}

      <RABox display="flex" justifyContent="center" mt={1}>
        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={saving}
          sx={{ minWidth: 160 }}
        >
          {saving ? "Saving..." : "Save"}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "errorMsg",
            color: "error",
            message: errorMsg,
            onClose: () => setErrorMsg(""),
          },
        ]}
      />
    </RABox>
  );
}
