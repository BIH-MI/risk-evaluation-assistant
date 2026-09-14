import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import {
  createAttributeScoringSystemApi,
  fetchAttributeScoringSystemApi,
  fetchAttributeScoringSystemsApi,
  updateAttributeScoringSystemApi,
} from "api/attributeScoringSystems";
import { isAdminUser } from "utils/auth";

import {
  ATTRIBUTE_DIMENSIONS,
  MAX_SCORE_OPTIONS_PER_DIMENSION,
  MIN_SCORE_OPTIONS_PER_DIMENSION,
} from "./attributeScoringSystemConstants";
import {
  buildAttributeScoringSystemPayload,
  calculateDimensionValueRange,
  calculateScoringRanges,
  createEmptyScoringSystemForm,
  createScoreOptionClientId,
  getNextAvailableScoreLabel,
  hasScoringSystemFormErrors,
  normalizeDisplayNumber,
  normalizeScoreOptionValue,
  normalizeScoringSystemToForm,
  sortScoreOptionsByValue,
  validateScoringSystemForm,
} from "./attributeScoringSystemFormUtils";

const LIST_ROUTE = "/configuration/attribute-scoring-systems";

export default function useAttributeScoringSystemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language?.split("-")[0] || "en";
  const { user } = useAuth();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const isEditMode = Boolean(id);

  const [systems, setSystems] = useState([]);
  const [form, setForm] = useState(() => createEmptyScoringSystemForm());
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadEditorData = useCallback(
    async ({ isCurrent = () => true } = {}) => {
      if (!token || !isAdmin) return;

      setLoading(true);
      setErrorMessage("");

      try {
        const [systemsData, scoringSystem] = await Promise.all([
          fetchAttributeScoringSystemsApi(token),
          isEditMode ? fetchAttributeScoringSystemApi(id, token) : null,
        ]);

        if (!isCurrent()) return;

        setSystems(Array.isArray(systemsData) ? systemsData : []);
        setForm(
          scoringSystem
            ? normalizeScoringSystemToForm(scoringSystem)
            : createEmptyScoringSystemForm()
        );
        setShowErrors(false);
      } catch (error) {
        if (isCurrent()) {
          setErrorMessage(error.message || "Failed to load scoring system.");
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    },
    [id, isAdmin, isEditMode, token]
  );

  useEffect(() => {
    if (!token || !isAdmin) return undefined;

    let isMounted = true;
    loadEditorData({ isCurrent: () => isMounted });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, loadEditorData, token]);

  // currentLanguage isn't read directly here, but validateScoringSystemForm
  // translates its messages via the i18n singleton, so it must stay a
  // dependency to re-run validation (and refresh already-shown errors) on
  // language switch.
  const validationErrors = useMemo(
    () => validateScoringSystemForm(form, systems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, systems, currentLanguage]
  );
  const hasErrors = hasScoringSystemFormErrors(validationErrors);

  const ranges = useMemo(
    () => calculateScoringRanges(form.scoreOptions),
    [form.scoreOptions]
  );

  const dimensionRanges = useMemo(
    () =>
      ATTRIBUTE_DIMENSIONS.reduce((rangesByDimension, dimension) => {
        rangesByDimension[dimension.key] = calculateDimensionValueRange(
          form.scoreOptions[dimension.key]
        );
        return rangesByDimension;
      }, {}),
    [form.scoreOptions]
  );

  const updateField = useCallback((field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  }, []);

  const updateScoreOption = useCallback(
    (dimensionKey, optionClientId, changes) => {
      setForm((previous) => {
        const options = previous.scoreOptions[dimensionKey] || [];

        return {
          ...previous,
          scoreOptions: {
            ...previous.scoreOptions,
            [dimensionKey]: options.map((option) =>
              option.clientId === optionClientId
                ? { ...option, ...changes }
                : option
            ),
          },
        };
      });
    },
    []
  );

  const updateScoreOptionValue = useCallback(
    (dimensionKey, optionClientId, nextValue, { commit = true } = {}) => {
      setForm((previous) => {
        const options = previous.scoreOptions[dimensionKey] || [];
        const value = commit ? normalizeScoreOptionValue(nextValue) : nextValue;
        const nextOptions = options.map((option) =>
          option.clientId === optionClientId ? { ...option, value } : option
        );

        return {
          ...previous,
          scoreOptions: {
            ...previous.scoreOptions,
            [dimensionKey]: commit
              ? sortScoreOptionsByValue(nextOptions)
              : nextOptions,
          },
        };
      });
    },
    []
  );

  const addScoreOption = useCallback((dimensionKey) => {
    setForm((previous) => {
      const existingOptions = previous.scoreOptions[dimensionKey] || [];

      if (existingOptions.length >= MAX_SCORE_OPTIONS_PER_DIMENSION) {
        return previous;
      }

      const numericValues = existingOptions
        .map((option) => Number(option.value))
        .filter(Number.isFinite);
      const nextValue = numericValues.length
        ? Math.max(...numericValues) + 1
        : 1;

      return {
        ...previous,
        scoreOptions: {
          ...previous.scoreOptions,
          [dimensionKey]: sortScoreOptionsByValue([
            ...existingOptions,
            {
              clientId: createScoreOptionClientId(),
              label: getNextAvailableScoreLabel(existingOptions),
              value: normalizeDisplayNumber(nextValue),
            },
          ]),
        },
      };
    });
  }, []);

  const removeScoreOption = useCallback((dimensionKey, optionClientId) => {
    setForm((previous) => {
      const options = previous.scoreOptions[dimensionKey] || [];

      if (options.length <= MIN_SCORE_OPTIONS_PER_DIMENSION) {
        return previous;
      }

      return {
        ...previous,
        scoreOptions: {
          ...previous.scoreOptions,
          [dimensionKey]: options.filter(
            (option) => option.clientId !== optionClientId
          ),
        },
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    setShowErrors(true);

    if (hasErrors || !token || saving) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const payload = buildAttributeScoringSystemPayload(form);

      if (isEditMode) {
        await updateAttributeScoringSystemApi(id, payload, token);
      } else {
        await createAttributeScoringSystemApi(payload, token);
      }

      navigate(LIST_ROUTE);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save scoring system.");
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

  /**
   * Prevent accidental submission while editing numeric/text fields. Explicit
   * Save remains the only submission action, except from controls where Enter
   * is intentionally supported.
   */
  const handleFormKeyDown = useCallback((event) => {
    if (
      event.key === "Enter" &&
      event.target.tagName !== "TEXTAREA" &&
      event.target.tagName !== "BUTTON"
    ) {
      event.preventDefault();
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage("");
  }, []);

  return {
    isAdmin,
    isEditMode,
    form,
    loading,
    saving,
    errorMessage,
    ranges,
    dimensionRanges,
    validationErrors,
    showErrors,
    updateField,
    updateScoreOption,
    updateScoreOptionValue,
    addScoreOption,
    removeScoreOption,
    handleSubmit,
    handleFormKeyDown,
    clearError,
  };
}
