import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import { useUsersApi } from "api/users";
import { useActiveLock } from "hooks/locks/useActiveLock";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import { fetchDatasetAssessments } from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchRecipientAssessments } from "store/recipientAssessments/recipientAssessmentsThunks";
import {
  createDataSharingActivity,
  fetchDataSharingActivities,
  updateDataSharingActivity,
} from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { buildAttributeEvidence } from "screens/datasetAssessments/AddEditDatasetAssessmentForm/evidence/buildAttributeEvidence";
import { findPreviousAssessmentsForDataset } from "screens/datasetAssessments/AddEditDatasetAssessmentForm/evidence/previousAssessmentEvidence";
import { LEGACY_ATTRIBUTE_SCORING_SYSTEM } from "utils/AttributeScale";
import {
  buildAssessmentAttributeLookup,
  buildDataSharingActivityPayload,
  buildDatasetAttributeDataTypeLookup,
  buildOriginalAssessmentValueLookup,
  mapAssessmentTablesToFormState,
  reconcileTableReferences,
} from "./dataSharingActivityFormUtils";

/**
 * Owns Data Sharing Activity form state and lifecycle: source-data loading,
 * edit initialization, dependent assessment selection, activity-specific
 * attribute overrides, locking and persistence.
 */
export function useDataSharingActivityForm() {
  const { id: routeActivityId } = useParams();
  const activityId = routeActivityId ? Number(routeActivityId) : null;
  const isEdit = Boolean(activityId);

  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const datasets = useSelector((state) => state.datasets.items || []);
  const allDatasetAssessments = useSelector(
    (state) => state.datasetAssessments.items || []
  );
  const recipients = useSelector((state) => state.recipients.items || []);
  const allRecipientAssessments = useSelector(
    (state) => state.recipientAssessments.items || []
  );
  const { items: allActivities, status } = useSelector(
    (state) => state.dataSharingActivities
  );

  const existingActivity = useMemo(
    () =>
      isEdit
        ? allActivities.find((activity) => activity.id === activityId)
        : null,
    [activityId, allActivities, isEdit]
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [datasetAssessmentId, setDatasetAssessmentId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [recipientAssessmentId, setRecipientAssessmentId] = useState("");
  const [overrideTables, setOverrideTables] = useState(false);
  const [tables, setTables] = useState([]);
  const [sharedUsernames, setSharedUsernames] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [nameError, setNameError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockError, setLockError] = useState(null);

  const formLoadedRef = useRef(false);
  const overrideSourceAssessmentIdRef = useRef(null);
  const lockRedirectTimerRef = useRef(null);

  const datasetAttributeDataTypeLookup = useMemo(
    () => buildDatasetAttributeDataTypeLookup(datasets),
    [datasets]
  );
  const assessmentAttributeLookup = useMemo(
    () => buildAssessmentAttributeLookup(allDatasetAssessments),
    [allDatasetAssessments]
  );

  const selectedDataset = useMemo(
    () =>
      datasets.find((dataset) => String(dataset.id) === String(datasetId)) ||
      null,
    [datasetId, datasets]
  );
  const selectedDatasetAssessment = useMemo(
    () =>
      allDatasetAssessments.find(
        (assessment) => String(assessment.id) === String(datasetAssessmentId)
      ) || null,
    [allDatasetAssessments, datasetAssessmentId]
  );
  const selectedScoringSystem = useMemo(
    () =>
      selectedDatasetAssessment?.attributeScoringSystem ||
      LEGACY_ATTRIBUTE_SCORING_SYSTEM,
    [selectedDatasetAssessment]
  );
  const previousDatasetAssessments = useMemo(
    () =>
      findPreviousAssessmentsForDataset({
        assessments: allDatasetAssessments,
        selectedDatasetId: datasetId,
        assessmentId: datasetAssessmentId,
      }),
    [allDatasetAssessments, datasetAssessmentId, datasetId]
  );
  // The selected Dataset Assessment is provenance for this activity, but it is
  // still a dataset-assessment observation; the activity override value is not.
  const historicalDatasetAssessments = useMemo(
    () =>
      selectedDatasetAssessment
        ? [selectedDatasetAssessment, ...previousDatasetAssessments]
        : previousDatasetAssessments,
    [previousDatasetAssessments, selectedDatasetAssessment]
  );
  const attributeEvidenceById = useMemo(() => {
    return buildAttributeEvidence({
      dataset: selectedDataset,
      previousAssessments: historicalDatasetAssessments,
      scoringSystem: selectedScoringSystem,
    });
  }, [historicalDatasetAssessments, selectedDataset, selectedScoringSystem]);
  const originalAssessmentValuesByAttributeId = useMemo(
    () => buildOriginalAssessmentValueLookup(selectedDatasetAssessment),
    [selectedDatasetAssessment]
  );

  const mapDatasetAssessmentTables = useCallback(
    (datasetAssessment) => {
      if (!datasetAssessment) return [];

      return mapAssessmentTablesToFormState(
        datasetAssessment.tableAssessments,
        {
          datasetId: datasetAssessment.datasetId,
          sourceAssessmentId: datasetAssessment.id,
          datasetAttributeDataTypeLookup,
          assessmentAttributeLookup,
          isActivityOverride: false,
          scoringSystem:
            datasetAssessment.attributeScoringSystem ||
            LEGACY_ATTRIBUTE_SCORING_SYSTEM,
        }
      );
    },
    [assessmentAttributeLookup, datasetAttributeDataTypeLookup]
  );

  const mapActivityOverrideTables = useCallback(
    (activity, datasetAssessment) =>
      mapAssessmentTablesToFormState(activity.tableAssessments, {
        datasetId: activity.datasetId,
        sourceAssessmentId: activity.datasetAssessmentId,
        datasetAttributeDataTypeLookup,
        assessmentAttributeLookup,
        isActivityOverride: true,
        scoringSystem:
          datasetAssessment?.attributeScoringSystem ||
          LEGACY_ATTRIBUTE_SCORING_SYSTEM,
      }),
    [assessmentAttributeLookup, datasetAttributeDataTypeLookup]
  );

  const onLockFailed = useCallback(() => {
    setLockError(t("dataSharingActivities.alerts.lockFailed"));

    if (lockRedirectTimerRef.current) {
      clearTimeout(lockRedirectTimerRef.current);
    }

    lockRedirectTimerRef.current = setTimeout(() => {
      navigate("/data-sharing-activities");
    }, 2000);
  }, [navigate, t]);

  const hasLock = useActiveLock(
    "DATA_SHARING_ACTIVITY",
    isEdit ? String(activityId) : null,
    onLockFailed
  );
  const isReadOnly = (isEdit && !hasLock) || isSubmitting;

  useEffect(
    () => () => {
      if (lockRedirectTimerRef.current) {
        clearTimeout(lockRedirectTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) return;

    dispatch(fetchDatasets(token));
    dispatch(fetchRecipients(token));
    dispatch(fetchDatasetAssessments(token));
    dispatch(fetchRecipientAssessments(token));
    dispatch(fetchDataSharingActivities(token));
  }, [dispatch, token]);

  useEffect(() => {
    if (!isEdit || !existingActivity || formLoadedRef.current) return;

    const hasTableOverrides = existingActivity.tableAssessments?.length > 0;
    const activityDatasetAssessment = allDatasetAssessments.find(
      (assessment) =>
        String(assessment.id) === String(existingActivity.datasetAssessmentId)
    );

    /**
     * Edit initialization waits for the referenced assessment metadata before
     * normalizing override values. Otherwise an asynchronous fetch race could
     * incorrectly apply the legacy scoring system and then permanently mark the
     * form as initialized.
     */
    if (hasTableOverrides && !activityDatasetAssessment) return;

    setName(existingActivity.name || "");
    setDescription(existingActivity.description || "");
    setDatasetId(String(existingActivity.datasetId || ""));
    setDatasetAssessmentId(String(existingActivity.datasetAssessmentId || ""));
    setRecipientId(String(existingActivity.recipientId || ""));
    setRecipientAssessmentId(
      String(existingActivity.recipientAssessmentId || "")
    );
    setSharedUsernames(existingActivity.sharedUsernames || []);
    setOverrideTables(hasTableOverrides);

    if (hasTableOverrides) {
      setTables(
        mapActivityOverrideTables(existingActivity, activityDatasetAssessment)
      );
      overrideSourceAssessmentIdRef.current = String(
        existingActivity.datasetAssessmentId || ""
      );
    } else if (activityDatasetAssessment) {
      setTables(mapDatasetAssessmentTables(activityDatasetAssessment));
      overrideSourceAssessmentIdRef.current = null;
    }

    formLoadedRef.current = true;
  }, [
    allDatasetAssessments,
    existingActivity,
    isEdit,
    mapActivityOverrideTables,
    mapDatasetAssessmentTables,
  ]);

  useEffect(() => {
    if (!datasetAssessmentId || !selectedDatasetAssessment) return;

    if (!overrideTables) {
      setTables(mapDatasetAssessmentTables(selectedDatasetAssessment));
      overrideSourceAssessmentIdRef.current = null;
      return;
    }

    if (
      overrideSourceAssessmentIdRef.current !==
      String(selectedDatasetAssessment.id)
    ) {
      setTables(mapDatasetAssessmentTables(selectedDatasetAssessment));
      overrideSourceAssessmentIdRef.current = String(
        selectedDatasetAssessment.id
      );
    }
  }, [
    datasetAssessmentId,
    mapDatasetAssessmentTables,
    overrideTables,
    selectedDatasetAssessment,
  ]);

  useEffect(() => {
    if (!datasetId || !datasetAssessmentId) return;

    // Datasets and assessments are fetched independently, so a mapped table can
    // temporarily miss display metadata until both collections are available.
    setTables((currentTables) =>
      reconcileTableReferences({
        tables: currentTables,
        datasetId,
        datasetAssessmentId,
        datasetAttributeDataTypeLookup,
        assessmentAttributeLookup,
      })
    );
  }, [
    assessmentAttributeLookup,
    datasetAttributeDataTypeLookup,
    datasetAssessmentId,
    datasetId,
  ]);

  const { fetchUsersByUsernames } = useUsersApi();

  useEffect(() => {
    let active = true;

    if (sharedUsernames.length > 0) {
      fetchUsersByUsernames(sharedUsernames)
        .then((users) => {
          if (active) setSharedUsers(users);
        })
        .catch(() => {
          if (active) setSharedUsers([]);
        });
    } else {
      setSharedUsers([]);
    }

    return () => {
      // Ignore a completed request after the effect was invalidated/unmounted.
      active = false;
    };
  }, [fetchUsersByUsernames, sharedUsernames]);

  const handleNameCommit = useCallback((value) => {
    setName(value);
    if (value.trim()) setNameError(false);
  }, []);

  const handleDescriptionCommit = useCallback((value) => {
    setDescription(value);
  }, []);

  const handleSharedUsersChange = useCallback((_, users) => {
    const nextUsers = users || [];
    setSharedUsers(nextUsers);
    setSharedUsernames(nextUsers.map((user) => user.username));
  }, []);

  const handleDatasetChange = useCallback(
    (event) => {
      const nextDatasetId = event.target.value;
      if (String(nextDatasetId) === String(datasetId)) return;

      setDatasetId(nextDatasetId);
      setDatasetAssessmentId("");
      setOverrideTables(false);
      setTables([]);
      overrideSourceAssessmentIdRef.current = null;
    },
    [datasetId]
  );

  /**
   * Changing the source assessment invalidates local table overrides because
   * those overrides reference table-assessment attribute IDs from the previously
   * selected assessment.
   */
  const handleDatasetAssessmentChange = useCallback(
    (event) => {
      const nextDatasetAssessmentId = event.target.value;
      if (String(nextDatasetAssessmentId) === String(datasetAssessmentId)) {
        return;
      }

      const nextDatasetAssessment = allDatasetAssessments.find(
        (assessment) =>
          String(assessment.id) === String(nextDatasetAssessmentId)
      );

      setDatasetAssessmentId(nextDatasetAssessmentId);
      setTables(mapDatasetAssessmentTables(nextDatasetAssessment));
      overrideSourceAssessmentIdRef.current =
        overrideTables && nextDatasetAssessment
          ? String(nextDatasetAssessmentId)
          : null;
    },
    [
      allDatasetAssessments,
      datasetAssessmentId,
      mapDatasetAssessmentTables,
      overrideTables,
    ]
  );

  const handleRecipientChange = useCallback(
    (event) => {
      const nextRecipientId = event.target.value;
      if (String(nextRecipientId) === String(recipientId)) return;

      setRecipientId(nextRecipientId);
      setRecipientAssessmentId("");
    },
    [recipientId]
  );

  const handleRecipientAssessmentChange = useCallback((event) => {
    setRecipientAssessmentId(event.target.value);
  }, []);

  const handleOverrideTablesChange = useCallback(
    (event) => {
      const enabled = event.target.checked;
      setOverrideTables(enabled);

      if (!selectedDatasetAssessment) {
        setTables([]);
        overrideSourceAssessmentIdRef.current = null;
        return;
      }

      if (enabled) {
        if (
          overrideSourceAssessmentIdRef.current !==
          String(selectedDatasetAssessment.id)
        ) {
          setTables(mapDatasetAssessmentTables(selectedDatasetAssessment));
          overrideSourceAssessmentIdRef.current = String(
            selectedDatasetAssessment.id
          );
        }
        return;
      }

      setTables(mapDatasetAssessmentTables(selectedDatasetAssessment));
      overrideSourceAssessmentIdRef.current = null;
    },
    [mapDatasetAssessmentTables, selectedDatasetAssessment]
  );

  const handleTablesChange = useCallback((nextTables) => {
    setTables(nextTables);
  }, []);

  const formValidation = useMemo(() => {
    const hasName = Boolean(name.trim());
    const hasDataset = Boolean(datasetId);
    const hasDatasetAssessment = Boolean(datasetAssessmentId);
    const hasRecipient = Boolean(recipientId);
    const hasRecipientAssessment = Boolean(recipientAssessmentId);
    const hasRequiredFields =
      hasName &&
      hasDataset &&
      hasDatasetAssessment &&
      hasRecipient &&
      hasRecipientAssessment;
    const canSubmit =
      hasRequiredFields &&
      !isReadOnly &&
      (!isEdit || Boolean(existingActivity));

    return {
      hasName,
      hasDataset,
      hasDatasetAssessment,
      hasRecipient,
      hasRecipientAssessment,
      hasRequiredFields,
      canSubmit,
    };
  }, [
    datasetAssessmentId,
    datasetId,
    existingActivity,
    isEdit,
    isReadOnly,
    name,
    recipientAssessmentId,
    recipientId,
  ]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isEdit && !hasLock) {
        setLockError(t("dataSharingActivities.alerts.lockLost"));
        return;
      }

      if (isSubmitting || (isEdit && !existingActivity)) return;

      if (!formValidation.hasName) {
        setNameError(true);
        setErrorMessage(t("dataSharingActivities.form.nameRequired"));
        return;
      }

      if (
        !formValidation.hasDataset ||
        !formValidation.hasDatasetAssessment ||
        !formValidation.hasRecipient ||
        !formValidation.hasRecipientAssessment
      ) {
        setErrorMessage(t("dataSharingActivities.form.selectAssessments"));
        return;
      }

      setIsSubmitting(true);

      try {
        const payload = buildDataSharingActivityPayload({
          name,
          description,
          sharedUsernames,
          datasetAssessmentId,
          recipientAssessmentId,
          overrideTables,
          tables,
        });

        if (isEdit) {
          await dispatch(
            updateDataSharingActivity({
              id: activityId,
              updatedActivity: payload,
              token,
            })
          ).unwrap();
        } else {
          await dispatch(
            createDataSharingActivity({ newActivity: payload, token })
          ).unwrap();
        }

        navigate("/data-sharing-activities");
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        setIsSubmitting(false);
      }
    },
    [
      activityId,
      datasetAssessmentId,
      description,
      dispatch,
      existingActivity,
      formValidation,
      hasLock,
      isEdit,
      isSubmitting,
      name,
      navigate,
      overrideTables,
      recipientAssessmentId,
      sharedUsernames,
      t,
      tables,
      token,
    ]
  );

  const datasetOptions = useMemo(
    () =>
      datasets.map((dataset) => ({
        value: String(dataset.id),
        label: <LabeledAvatar value={dataset.name} variant="dataset" />,
      })),
    [datasets]
  );

  const datasetAssessmentOptions = useMemo(
    () =>
      allDatasetAssessments
        .filter(
          (datasetAssessment) =>
            String(datasetAssessment.datasetId) === String(datasetId)
        )
        .map((datasetAssessment) => ({
          value: String(datasetAssessment.id),
          label: (
            <LabeledAvatar
              value={datasetAssessment.name}
              variant="datasetAssessment"
            />
          ),
        })),
    [allDatasetAssessments, datasetId]
  );

  const recipientOptions = useMemo(
    () =>
      recipients.map((recipient) => ({
        value: String(recipient.id),
        label: <LabeledAvatar value={recipient.name} variant="recipient" />,
      })),
    [recipients]
  );

  const recipientAssessmentOptions = useMemo(
    () =>
      allRecipientAssessments
        .filter(
          (recipientAssessment) =>
            String(recipientAssessment.recipientId) === String(recipientId)
        )
        .map((recipientAssessment) => ({
          value: String(recipientAssessment.id),
          label: (
            <LabeledAvatar
              value={recipientAssessment.name}
              variant="recipientAssessment"
            />
          ),
        })),
    [allRecipientAssessments, recipientId]
  );

  const isSubmitDisabled = !formValidation.canSubmit;

  return {
    isEdit,
    status,
    name,
    description,
    datasetId,
    datasetAssessmentId,
    recipientId,
    recipientAssessmentId,
    overrideTables,
    tables,
    sharedUsers,
    errorMessage,
    nameError,
    lockError,
    isReadOnly,
    isSubmitDisabled,
    selectedScoringSystem,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
    datasetOptions,
    datasetAssessmentOptions,
    recipientOptions,
    recipientAssessmentOptions,
    handleNameCommit,
    handleDescriptionCommit,
    handleSharedUsersChange,
    handleDatasetChange,
    handleDatasetAssessmentChange,
    handleRecipientChange,
    handleRecipientAssessmentChange,
    handleOverrideTablesChange,
    handleTablesChange,
    handleSubmit,
    setErrorMessage,
    setLockError,
  };
}

function getErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || error.toString();
}
