import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RASelect from "components/input/RASelect";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAAlert from "components/feedback/RAAlert";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import DatasetTablesAssessment from "components/display/Tables/DataTable/CustomDataTableComponents/DatasetTablesAssessment";

import {
  createDataSharingActivity,
  updateDataSharingActivity,
  fetchDataSharingActivities,
} from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import { fetchDatasetAssessments } from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchRecipientAssessments } from "store/recipientAssessments/recipientAssessmentsThunks";

import { useUsersApi } from "api/users";
import { useActiveLock } from "hooks/locks/useActiveLock";
import { normalizeAttributeScaleValue } from "utils/AttributeScale";

const selectSx = {
  "& .MuiOutlinedInput-root": { height: 56 },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
};

export default function AddEditDataSharingActivity() {
  const { id: rawId } = useParams();
  const activityId = rawId ? Number(rawId) : null;
  const isEdit = !!activityId;

  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // --- Redux Data ---
  const datasets = useSelector((s) => s.datasets.items || []);
  const allDatasetAssessments = useSelector(
    (s) => s.datasetAssessments.items || []
  );
  const recipients = useSelector((s) => s.recipients.items || []);
  const allRecipientAssessments = useSelector(
    (s) => s.recipientAssessments.items || []
  );
  const { items: allActivities, status } = useSelector(
    (s) => s.dataSharingActivities
  );

  const existingActivity = useMemo(
    () => (isEdit ? allActivities.find((a) => a.id === activityId) : null),
    [allActivities, activityId, isEdit]
  );

  // --- Form State ---
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

  const formLoadedRef = useRef(false);

  // --- Locking ---
  const [lockError, setLockError] = useState(null);
  const onLockFailed = useCallback(() => {
    setLockError(t("dataSharingActivities.alerts.lockFailed"));
    setTimeout(() => navigate("/data-sharing-activities"), 2000);
  }, [navigate, t]);

  const hasLock = useActiveLock(
    "DATA_SHARING_ACTIVITY",
    isEdit ? String(activityId) : null,
    onLockFailed
  );
  const isReadOnly = (isEdit && !hasLock) || isSubmitting;

  const { fetchUsersByUsernames } = useUsersApi();

  const dataTypeByDatasetAttribute = useMemo(() => {
    const map = new Map();
    datasets.forEach((dataset) => {
      (dataset.tables || []).forEach((table) => {
        (table.attributes || []).forEach((attribute) => {
          map.set(`${dataset.id}:${attribute.id}`, attribute.dataType);
        });
      });
    });
    return map;
  }, [datasets]);

  const tableAssessmentAttributeByDatasetAttribute = useMemo(() => {
    const map = new Map();
    allDatasetAssessments.forEach((assessment) => {
      (assessment.tableAssessments || []).forEach((tableAssessment) => {
        (tableAssessment.attributes || []).forEach((attribute) => {
          if (attribute.attributeId != null && attribute.id != null) {
            map.set(`${assessment.id}:${attribute.attributeId}`, attribute.id);
          }
        });
      });
    });
    return map;
  }, [allDatasetAssessments]);

  const getDataTypeForAttribute = useCallback(
    (sourceDatasetId, datasetAttributeId) => {
      if (!sourceDatasetId || !datasetAttributeId) return "";
      return dataTypeByDatasetAttribute.get(
        `${sourceDatasetId}:${datasetAttributeId}`
      ) || "";
    },
    [dataTypeByDatasetAttribute]
  );

  const getTableAssessmentAttributeId = useCallback(
    (sourceDatasetAssessmentId, datasetAttributeId) => {
      if (!sourceDatasetAssessmentId || !datasetAttributeId) return null;
      return tableAssessmentAttributeByDatasetAttribute.get(
        `${sourceDatasetAssessmentId}:${datasetAttributeId}`
      ) || null;
    },
    [tableAssessmentAttributeByDatasetAttribute]
  );

  const mapTablesToState = useCallback((sourceList, sourceDatasetId, sourceDatasetAssessmentId, isActivityOverride = false) => {
    if (!sourceList) return [];
    return sourceList.map((ta) => ({
      id: isActivityOverride ? ta.id || null : null,
      tableId: isActivityOverride
        ? ta.tableAssessmentId || ta.tableId || ta.table?.id
        : ta.tableAssessmentId || ta.id || ta.tableId || ta.table?.id,
      datasetTableId: isActivityOverride
        ? ta.datasetTableId || ta.table?.table?.id
        : ta.datasetTableId || ta.tableId || ta.table?.id,
      tableName: ta.tableName || ta.table?.name,
      attributes: (ta.attributes || []).map((attr) => {
        const datasetAttributeId =
          attr.datasetAttributeId ||
          attr.attributeId ||
          attr.tableAssessmentAttribute?.attribute?.id ||
          attr.attribute?.id;
        const tableAssessmentAttributeId =
          attr.tableAssessmentAttributeId ||
          attr.tableAssessmentAttribute?.id ||
          getTableAssessmentAttributeId(
            sourceDatasetAssessmentId,
            datasetAttributeId
          ) ||
          (isActivityOverride ? attr.id : null);
        const isDI = Boolean(attr.isDirectIdentifier);
        const isExcluded = Boolean(attr.isExcluded);

        return {
          id: isActivityOverride ? attr.id || null : null,
          attributeId: tableAssessmentAttributeId,
          tableAssessmentAttributeId,
          datasetAttributeId,
          name: attr.name,
          dataType:
            attr.dataType ||
            getDataTypeForAttribute(sourceDatasetId, datasetAttributeId),
          isDirectIdentifier: isDI,
          isExcluded: isExcluded,
          sensitivity:
            isDI || isExcluded
              ? null
              : normalizeAttributeScaleValue(attr.sensitivity, "sensitivity", {
                  allowNull: false,
                }),
          replicability:
            isDI || isExcluded
              ? null
              : normalizeAttributeScaleValue(
                  attr.replicability,
                  "replicability",
                  { allowNull: false }
                ),
          availability:
            isDI || isExcluded
              ? null
              : normalizeAttributeScaleValue(
                  attr.availability,
                  "availability",
                  { allowNull: false }
                ),
          distinguishability:
            isDI || isExcluded
              ? null
              : normalizeAttributeScaleValue(
                  attr.distinguishability,
                  "distinguishability",
                  { allowNull: false }
                ),
        };
      }),
    }));
  }, [getDataTypeForAttribute, getTableAssessmentAttributeId]);

  // 1. Fetch Data
  useEffect(() => {
    if (!token) return;
    dispatch(fetchDatasets(token));
    dispatch(fetchRecipients(token));
    dispatch(fetchDatasetAssessments(token));
    dispatch(fetchRecipientAssessments(token));
    dispatch(fetchDataSharingActivities(token));
  }, [dispatch, token]);

  // 2. Initialize Form
  useEffect(() => {
    if (isEdit && existingActivity && !formLoadedRef.current) {
      setName(existingActivity.name || "");
      setDescription(existingActivity.description || "");

      setDatasetId(String(existingActivity.datasetId || ""));
      setDatasetAssessmentId(
        String(existingActivity.datasetAssessmentId || "")
      );
      setRecipientId(String(existingActivity.recipientId || ""));
      setRecipientAssessmentId(
        String(existingActivity.recipientAssessmentId || "")
      );
      setSharedUsernames(existingActivity.sharedUsernames || []);

      const hasOverrides = existingActivity.tableAssessments?.length > 0;
      setOverrideTables(hasOverrides);

      if (hasOverrides) {
        setTables(
          mapTablesToState(
            existingActivity.tableAssessments,
            existingActivity.datasetId,
            existingActivity.datasetAssessmentId,
            true
          )
        );
      }

      formLoadedRef.current = true;
    }
  }, [isEdit, existingActivity, mapTablesToState]);

  // 3. Handle Table Loading
  useEffect(() => {
    if (!datasetAssessmentId) return;

    const selectedAssessment = allDatasetAssessments.find(
      (da) => da.id === Number(datasetAssessmentId)
    );
    if (!selectedAssessment) return;

    if (!isEdit || (isEdit && !overrideTables)) {
      setTables(
        mapTablesToState(
          selectedAssessment.tableAssessments,
          selectedAssessment.datasetId,
          selectedAssessment.id
        )
      );
    }
  }, [
    datasetAssessmentId,
    isEdit,
    overrideTables,
    allDatasetAssessments,
    mapTablesToState,
  ]);

  useEffect(() => {
    setTables((prevTables) => {
      let changed = false;
      const nextTables = prevTables.map((table) => ({
        ...table,
        attributes: table.attributes.map((attr) => {
          const updates = {};

          if (!attr.dataType) {
            const dataType = getDataTypeForAttribute(
              datasetId,
              attr.datasetAttributeId
            );
            if (dataType) {
              updates.dataType = dataType;
            }
          }

          if (!attr.tableAssessmentAttributeId && attr.datasetAttributeId) {
            const tableAssessmentAttributeId = getTableAssessmentAttributeId(
              datasetAssessmentId,
              attr.datasetAttributeId
            );
            if (tableAssessmentAttributeId) {
              updates.attributeId = tableAssessmentAttributeId;
              updates.tableAssessmentAttributeId = tableAssessmentAttributeId;
            }
          }

          if (Object.keys(updates).length === 0) {
            return attr;
          }

          changed = true;
          return { ...attr, ...updates };
        }),
      }));

      return changed ? nextTables : prevTables;
    });
  }, [
    datasetId,
    datasetAssessmentId,
    getDataTypeForAttribute,
    getTableAssessmentAttributeId,
  ]);

  // Fetch Users
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
      active = false;
    };
  }, [fetchUsersByUsernames, sharedUsernames]);

  // --- Handlers ---
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (isEdit && !hasLock) {
        setLockError(t("dataSharingActivities.alerts.lockLost"));
        return;
      }

      if (!name.trim()) {
        setNameError(true);
        setErrorMessage(t("dataSharingActivities.form.nameRequired"));
        return;
      }

      if (!datasetAssessmentId || !recipientAssessmentId) {
        setErrorMessage(t("dataSharingActivities.form.selectAssessments"));
        return;
      }

      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        sharedUsernames,
        datasetAssessmentId: Number(datasetAssessmentId),
        recipientAssessmentId: Number(recipientAssessmentId),
        tableAssessments: overrideTables
          ? tables.map((tbl) => ({
              id: tbl.id,
              tableId: tbl.tableAssessmentId || tbl.tableId,
              tableName: tbl.tableName,
              attributes: tbl.attributes
                .filter((attr) => !attr.isExcluded)
                .map((attr) => ({
                  id: attr.id,
                  attributeId:
                    attr.tableAssessmentAttributeId || attr.attributeId,
                  sensitivity: attr.sensitivity,
                  replicability: attr.replicability,
                  availability: attr.availability,
                  distinguishability: attr.distinguishability,
                  isDirectIdentifier: attr.isDirectIdentifier,
                })),
            }))
          : [],
      };

      const action = existingActivity
        ? updateDataSharingActivity({
            id: activityId,
            updatedActivity: payload,
            token,
          })
        : createDataSharingActivity({ newActivity: payload, token });

      dispatch(action)
        .unwrap()
        .then(() => navigate("/data-sharing-activities"))
        .catch((err) => {
          setErrorMessage(err.message || err.toString());
          setIsSubmitting(false);
        });
    },
    [
      name,
      description,
      sharedUsernames,
      datasetAssessmentId,
      recipientAssessmentId,
      overrideTables,
      tables,
      existingActivity,
      activityId,
      isEdit,
      hasLock,
      token,
      dispatch,
      navigate,
      t,
    ]
  );

  // --- Calculated Values ---

  const datasetOptions = datasets.map((d) => ({
    value: String(d.id),
    label: <LabeledAvatar value={d.name} variant="dataset" />,
  }));

  const datasetAssessmentOptions = allDatasetAssessments
    .filter((da) => String(da.datasetId) === String(datasetId))
    .map((da) => ({
      value: String(da.id),
      label: <LabeledAvatar value={da.name} variant="datasetAssessment" />,
    }));

  const recipientOptions = recipients.map((r) => ({
    value: String(r.id),
    label: <LabeledAvatar value={r.name} variant="recipient" />,
  }));

  const recipientAssessmentOptions = allRecipientAssessments
    .filter((ra) => String(ra.recipientId) === String(recipientId))
    .map((ra) => ({
      value: String(ra.id),
      label: <LabeledAvatar value={ra.name} variant="recipientAssessment" />,
    }));

  const isSubmitDisabled =
    !name.trim() ||
    !datasetId ||
    !datasetAssessmentId ||
    !recipientId ||
    !recipientAssessmentId ||
    isReadOnly;

  return (
    <>
      <RABox
        py={8}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: "80%",
          mx: "auto",
          gap: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <RATypography variant="h5" textAlign="center">
          {existingActivity
            ? t("dataSharingActivities.form.editTitle")
            : t("dataSharingActivities.form.createTitle")}{" "}
        </RATypography>

        <OnBlurRAInput
          label={t("dataSharingActivities.form.activityNameLabel")}
          value={name}
          onCommit={(val) => {
            setName(val);
            if (val.trim()) setNameError(false);
          }}
          fullWidth
          required
          error={nameError}
          disabled={isReadOnly}
        />

        <OnBlurRAInput
          label={t("dataSharingActivities.form.descriptionLabel")}
          value={description}
          onCommit={setDescription}
          fullWidth
          multiline
          rows={3}
          disabled={isReadOnly}
        />

        <RAUserAutocomplete
          multiple
          label={t("dataSharingActivities.form.sharedUsersLabel")}
          value={sharedUsers}
          onChange={(_, users) => {
            setSharedUsers(users || []);
            setSharedUsernames((users || []).map((u) => u.username));
          }}
          placeholder={t("dataSharingActivities.form.searchUsersPlaceholder")}
          fullWidth
          sx={selectSx}
          disabled={isReadOnly}
        />

        <RASelect
          label={t("dataSharingActivities.form.recipientLabel")}
          value={recipientId}
          onChange={(e) => {
            setRecipientId(e.target.value);
            setRecipientAssessmentId(""); // Reset assessment on parent change
          }}
          options={recipientOptions}
          fullWidth
          sx={selectSx}
          disabled={isReadOnly}
        />

        <RASelect
          label={t("dataSharingActivities.form.recipientAssessmentLabel")}
          value={recipientAssessmentId}
          onChange={(e) => setRecipientAssessmentId(e.target.value)}
          options={recipientAssessmentOptions}
          fullWidth
          disabled={!recipientId || isReadOnly}
          sx={selectSx}
        />

        <RASelect
          label={t("dataSharingActivities.form.datasetLabel")}
          value={datasetId}
          onChange={(e) => {
            setDatasetId(e.target.value);
            setDatasetAssessmentId(""); // Reset assessment on parent change
            if (!overrideTables) setTables([]);
          }}
          options={datasetOptions}
          fullWidth
          sx={selectSx}
          disabled={isReadOnly}
        />

        <RASelect
          label={t("dataSharingActivities.form.datasetAssessmentLabel")}
          value={datasetAssessmentId}
          onChange={(e) => setDatasetAssessmentId(e.target.value)}
          options={datasetAssessmentOptions}
          fullWidth
          disabled={!datasetId || isReadOnly}
          sx={selectSx}
        />

        {datasetAssessmentId && (
          <FormControlLabel
            control={
              <Checkbox
                checked={overrideTables}
                onChange={(e) => setOverrideTables(e.target.checked)}
                disabled={isReadOnly}
              />
            }
            label={t("dataSharingActivities.form.overrideTablesLabel")}
            sx={{ my: 2 }}
          />
        )}

        {overrideTables && (
          <RABox>
            <RATypography variant="h6" align="center" mt={2}>
              {t("dataSharingActivities.form.datasetTablesAssessment")}{" "}
            </RATypography>

            <DatasetTablesAssessment tables={tables} setTables={setTables} />
          </RABox>
        )}

        <RAButton
          type="submit"
          sx={{ alignSelf: "center", mt: 2 }}
          disabled={isSubmitDisabled}
        >
          {existingActivity
            ? t("dataSharingActivities.form.updateButton")
            : t("dataSharingActivities.form.createButton")}{" "}
        </RAButton>
      </RABox>

      {/* Styled Corner Alerts */}
      <RABox
        sx={{
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          zIndex: theme.zIndex.snackbar,
          width: 300,
          marginBottom: theme.spacing(3),
          display: "flex",
          flexDirection: "column",
          gap: 1, // Space out multiple alerts if they appear together
        }}
      >
        {lockError && (
          <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
            <RATypography variant="body2" color="white">
              {lockError}
            </RATypography>
          </RAAlert>
        )}

        {errorMessage && (
          <RAAlert
            color="error"
            dismissible
            onClose={() => setErrorMessage("")}
          >
            <RATypography variant="body2" color="white">
              {errorMessage}
            </RATypography>
          </RAAlert>
        )}

        {status === "loading" && (
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              {t("dataSharingActivities.alerts.loading")}
            </RATypography>
          </RAAlert>
        )}

        {status === "failed" && !errorMessage && (
          <RAAlert color="error" dismissible>
            <RATypography variant="body2" color="white">
              {t("dataSharingActivities.alerts.error")}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    </>
  );
}
