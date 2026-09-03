import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { calculateTotalRiskApi } from "api/risk";
import {
  fetchDataSharingActivityById,
  fetchDataSharingActivities,
} from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { fetchDatasetAssessments } from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchRecipientAssessments } from "store/recipientAssessments/recipientAssessmentsThunks";
import { fetchConfiguration } from "store/configurations/configurationThunks";
import {
  buildCalculateRiskPayload,
  buildEffectiveTableAssessments,
  clampThresholdToRange,
  getReportAttributeThresholds,
  isBlankValue,
  resolveAssessmentConfiguration,
  resolveAttributeScoringSystem,
} from "./reportDataUtils";
import {
  getIdentifiabilityScoreRange,
  getSensitivityScoreRange,
} from "utils/AttributeScale";

const EMPTY_ARRAY = [];

function useReportSourceData(token, activityId) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [sourceDataError, setSourceDataError] = useState("");
  const mountedRef = useRef(true);

  const dataSharingActivitiesState = useSelector(
    (state) => state.dataSharingActivities
  );
  const datasetAssessmentsState = useSelector(
    (state) => state.datasetAssessments
  );
  const recipientAssessmentsState = useSelector(
    (state) => state.recipientAssessments
  );
  const configurationsState = useSelector((state) => state.configurations);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    if (!token || !activityId) return;

    setSourceDataError("");

    dispatch(fetchDataSharingActivityById({ id: activityId, token }))
      .unwrap()
      .catch((error) => {
        if (!mountedRef.current) return;
        setSourceDataError(error || t("report.notFound", "Report Not Found"));
      });

    dispatch(fetchDataSharingActivities(token))
      .unwrap()
      .catch(() => {});
    dispatch(fetchDatasetAssessments(token))
      .unwrap()
      .catch(() => {});
    dispatch(fetchRecipientAssessments(token))
      .unwrap()
      .catch(() => {});
  }, [activityId, dispatch, t, token]);

  const clearSourceDataError = useCallback(() => {
    setSourceDataError("");
  }, []);

  return {
    dataSharingActivitiesState,
    datasetAssessmentsState,
    recipientAssessmentsState,
    configurationsState,
    sourceDataError,
    clearSourceDataError,
  };
}

export default function useDataSharingReport() {
  const { id: rawId } = useParams();
  const numericActivityId = Number(rawId);
  const activityId = Number.isFinite(numericActivityId)
    ? numericActivityId
    : null;
  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const {
    dataSharingActivitiesState,
    datasetAssessmentsState,
    recipientAssessmentsState,
    configurationsState,
    sourceDataError,
    clearSourceDataError,
  } = useReportSourceData(token, activityId);

  const activities = useMemo(
    () => dataSharingActivitiesState.items || EMPTY_ARRAY,
    [dataSharingActivitiesState.items]
  );
  const currentActivity = dataSharingActivitiesState.current;
  const datasetAssessments = useMemo(
    () => datasetAssessmentsState.items || EMPTY_ARRAY,
    [datasetAssessmentsState.items]
  );
  const recipientAssessments = useMemo(
    () => recipientAssessmentsState.items || EMPTY_ARRAY,
    [recipientAssessmentsState.items]
  );
  const configurations = useMemo(
    () => configurationsState.items || EMPTY_ARRAY,
    [configurationsState.items]
  );

  const activity = useMemo(() => {
    const listMatch = activities.find(
      (candidate) => String(candidate.id) === String(activityId)
    );
    const currentMatch =
      currentActivity && String(currentActivity.id) === String(activityId)
        ? currentActivity
        : null;

    return currentMatch || listMatch || null;
  }, [activities, activityId, currentActivity]);

  const datasetAssessment = useMemo(() => {
    if (!activity?.datasetAssessmentId) return null;

    return (
      datasetAssessments.find(
        (assessment) =>
          String(assessment.id) === String(activity.datasetAssessmentId)
      ) || null
    );
  }, [activity, datasetAssessments]);

  const recipientAssessment = useMemo(() => {
    if (!activity?.recipientAssessmentId) return null;

    return (
      recipientAssessments.find(
        (assessment) =>
          String(assessment.id) === String(activity.recipientAssessmentId)
      ) || null
    );
  }, [activity, recipientAssessments]);

  const datasetConfiguration = useMemo(
    () => resolveAssessmentConfiguration(datasetAssessment, configurations),
    [configurations, datasetAssessment]
  );
  const recipientConfiguration = useMemo(
    () => resolveAssessmentConfiguration(recipientAssessment, configurations),
    [configurations, recipientAssessment]
  );
  const attributeScoringSystem = useMemo(
    () => resolveAttributeScoringSystem(datasetAssessment),
    [datasetAssessment]
  );
  const identifiabilityRange = useMemo(
    () => getIdentifiabilityScoreRange(attributeScoringSystem),
    [attributeScoringSystem]
  );
  const sensitivityRange = useMemo(
    () => getSensitivityScoreRange(attributeScoringSystem),
    [attributeScoringSystem]
  );
  const effectiveTables = useMemo(
    () =>
      buildEffectiveTableAssessments({
        activityTableAssessments: activity?.tableAssessments,
        datasetTableAssessments: datasetAssessment?.tableAssessments,
        scoringSystem: attributeScoringSystem,
      }),
    [
      activity?.tableAssessments,
      attributeScoringSystem,
      datasetAssessment?.tableAssessments,
    ]
  );

  const requestedConfigurationIdsRef = useRef(new Set());

  useEffect(() => {
    if (!token) return;

    const fetchMissingConfiguration = (assessment) => {
      const configurationId = assessment?.configurationId;
      if (!configurationId || assessment?.configuration) return;

      const alreadyLoaded = configurations.some(
        (configuration) => String(configuration.id) === String(configurationId)
      );
      const alreadyRequested = requestedConfigurationIdsRef.current.has(
        String(configurationId)
      );

      if (alreadyLoaded || alreadyRequested) return;

      /**
       * Assessments retain the configuration version they were created with.
       * The report fetches that persisted reference if the list view has not
       * already loaded the full configuration hierarchy.
       */
      requestedConfigurationIdsRef.current.add(String(configurationId));
      dispatch(fetchConfiguration({ id: configurationId, token }))
        .unwrap()
        .catch(() => {})
        .finally(() => {
          requestedConfigurationIdsRef.current.delete(String(configurationId));
        });
    };

    fetchMissingConfiguration(datasetAssessment);
    fetchMissingConfiguration(recipientAssessment);
  }, [configurations, datasetAssessment, dispatch, recipientAssessment, token]);

  const initialThresholds = getReportAttributeThresholds(
    datasetAssessment,
    attributeScoringSystem
  );
  const [identifiabilityThreshold, setIdentifiabilityThreshold] = useState(
    initialThresholds.identifiabilityThreshold
  );
  const [sensitivityThreshold, setSensitivityThreshold] = useState(
    initialThresholds.sensitivityThreshold
  );
  const [isThresholdOverwritten, setThresholdOverwritten] = useState(false);
  const [manualRiskThreshold, setManualRiskThreshold] = useState("");
  const [totalRiskResult, setTotalRiskResult] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const mountedRef = useRef(true);
  const calculationRequestIdRef = useRef(0);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  useEffect(() => {
    const nextThresholds = getReportAttributeThresholds(
      datasetAssessment,
      attributeScoringSystem
    );

    setIdentifiabilityThreshold(nextThresholds.identifiabilityThreshold);
    setSensitivityThreshold(nextThresholds.sensitivityThreshold);
  }, [attributeScoringSystem, datasetAssessment]);

  const updateIdentifiabilityThreshold = useCallback(
    (value) => {
      if (value === "") {
        setIdentifiabilityThreshold("");
        return;
      }

      const clampedValue = clampThresholdToRange(value, identifiabilityRange);
      if (!isBlankValue(clampedValue)) {
        setIdentifiabilityThreshold(String(clampedValue));
      }
    },
    [identifiabilityRange]
  );

  const updateSensitivityThreshold = useCallback(
    (value) => {
      if (value === "") {
        setSensitivityThreshold("");
        return;
      }

      const clampedValue = clampThresholdToRange(value, sensitivityRange);
      if (!isBlankValue(clampedValue)) {
        setSensitivityThreshold(String(clampedValue));
      }
    },
    [sensitivityRange]
  );

  const calculateRisk = useCallback(async () => {
    if (!activityId || !token) return;

    const requestId = calculationRequestIdRef.current + 1;
    calculationRequestIdRef.current = requestId;
    setIsComputing(true);
    setCalculationError("");

    try {
      const payload = buildCalculateRiskPayload({
        activityId,
        isThresholdOverwritten,
        manualRiskThreshold,
      });
      const result = await calculateTotalRiskApi(payload, token);
      if (mountedRef.current && calculationRequestIdRef.current === requestId) {
        setTotalRiskResult(result);
      }
    } catch (error) {
      if (mountedRef.current && calculationRequestIdRef.current === requestId) {
        setCalculationError(
          error?.message ||
            t("report.calculateError", "Failed to calculate risk")
        );
      }
    } finally {
      if (mountedRef.current && calculationRequestIdRef.current === requestId) {
        setIsComputing(false);
      }
    }
  }, [activityId, isThresholdOverwritten, manualRiskThreshold, t, token]);

  useEffect(() => {
    calculateRisk();
  }, [calculateRisk]);

  const clearError = useCallback(() => {
    setCalculationError("");
    clearSourceDataError();
  }, [clearSourceDataError]);

  const isLoadingReportData =
    (dataSharingActivitiesState.status === "loading" && !activity) ||
    (datasetAssessmentsState.status === "loading" &&
      Boolean(activity?.datasetAssessmentId) &&
      !datasetAssessment) ||
    (recipientAssessmentsState.status === "loading" &&
      Boolean(activity?.recipientAssessmentId) &&
      !recipientAssessment);

  return {
    activityId,
    activity,
    datasetAssessment,
    recipientAssessment,

    datasetConfiguration,
    recipientConfiguration,
    attributeScoringSystem,

    effectiveTables,

    totalRiskResult,
    isComputing,
    isLoadingReportData,
    errorMessage: calculationError || sourceDataError,

    manualRiskThreshold,
    isThresholdOverwritten,

    identifiabilityThreshold,
    sensitivityThreshold,
    identifiabilityRange,
    sensitivityRange,

    setManualRiskThreshold,
    setThresholdOverwritten,
    updateIdentifiabilityThreshold,
    updateSensitivityThreshold,

    clearError,
  };
}
