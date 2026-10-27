import { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addDataset } from "store/datasets/datasetsThunks";
import { getErrorMessage } from "utils/errors";
import { AI_MODEL_STATUS } from "features/qidDiscovery/ai/columnSuggestions";
import { buildDatasetPayload } from "../utils/buildDatasetPayload";
import { validateDatasetSubmission } from "../validation/datasetSubmissionValidation";

const DATASET_NAME_ALREADY_EXISTS = "DATASET_NAME_ALREADY_EXISTS";

/** Persists only the reviewed schema and aggregate evidence; CSV values stay local. */
export function useDatasetSubmission({
  name,
  description,
  sharedUsers,
  tables,
  selectedQidDiscoveryConfiguration,
  selectedAiModelId,
  aiStateByTable,
  aiScreeningEnabled,
  datasetType,
  datasetTypeSuggestion,
  directIdentifierValidation,
  directIdentifierSubmissionMessage,
  token,
  t,
  setErrors,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // The selected model is recorded as provenance only if it actually
  // classified at least one column (not when AI was skipped or unavailable).
  const aiScreeningModelUsed = useMemo(
    () =>
      Boolean(selectedAiModelId) &&
      Object.values(aiStateByTable).some((state) =>
        Object.values(state?.suggestions || {}).some(
          (suggestion) =>
            suggestion.model?.registryId === selectedAiModelId &&
            suggestion.modelStatus !== AI_MODEL_STATUS.UNAVAILABLE
        )
      ),
    [aiStateByTable, selectedAiModelId]
  );

  /**
   * Persists aggregate profiling output and reviewed exclusion decisions. Raw
   * rows, encoded columns, and subset partitions remain browser-local.
   */
  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!name.trim()) return;
      const validationMessage = validateDatasetSubmission({
        tables,
        selectedQidDiscoveryConfiguration,
        directIdentifierValidation,
        directIdentifierSubmissionMessage,
        aiStateByTable,
        aiScreeningEnabled,
        t,
      });
      if (validationMessage) {
        setErrors((current) => ({ ...current, tables: validationMessage }));
        return;
      }

      dispatch(
        addDataset({
          newDataset: buildDatasetPayload({
            name,
            description,
            sharedUsers,
            selectedQidDiscoveryConfiguration,
            aiScreeningModelId: aiScreeningModelUsed ? selectedAiModelId : null,
            aiStateByTable,
            aiScreeningEnabled,
            datasetType,
            datasetTypeSuggestion,
            tables,
          }),
          token,
        })
      )
        .unwrap()
        .then(() => {
          navigate("/datasets");
        })
        .catch((error) => {
          if (error?.code === DATASET_NAME_ALREADY_EXISTS) {
            setErrors((current) => ({
              ...current,
              name: t("datasets.alerts.duplicateDatasetName"),
              tables: "",
            }));
            return;
          }

          setErrors((current) => ({
            ...current,
            tables: getErrorMessage(
              error,
              t("datasets.alerts.submissionFailed")
            ),
          }));
        });
    },
    [
      aiScreeningEnabled,
      aiScreeningModelUsed,
      aiStateByTable,
      datasetType,
      datasetTypeSuggestion,
      description,
      directIdentifierSubmissionMessage,
      directIdentifierValidation,
      dispatch,
      name,
      navigate,
      selectedAiModelId,
      selectedQidDiscoveryConfiguration,
      sharedUsers,
      setErrors,
      tables,
      t,
      token,
    ]
  );

  return handleSubmit;
}
