import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useTheme } from "@mui/material/styles";

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
    fetchDataSharingActivities
} from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import { fetchDatasetAssessments } from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchRecipientAssessments } from "store/recipientAssessments/recipientAssessmentsThunks";

import { useUsersApi } from "api/users";
import { useActiveLock } from "hooks/locks/useActiveLock";

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
    const { user } = useAuth();
    const token = user?.access_token;
    const dispatch = useDispatch();

    // --- Redux Data ---
    const datasets = useSelector(s => s.datasets.items || []);
    const allDatasetAssessments = useSelector(s => s.datasetAssessments.items || []);
    const recipients = useSelector(s => s.recipients.items || []);
    const allRecipientAssessments = useSelector(s => s.recipientAssessments.items || []);
    const { items: allActivities } = useSelector(s => s.dataSharingActivities);

    const existingActivity = useMemo(() =>
            isEdit ? allActivities.find(a => a.id === activityId) : null,
        [allActivities, activityId, isEdit]);

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

    // Guards against overwriting form data during re-renders
    const formLoadedRef = useRef(false);

    // --- Locking ---
    const [lockError, setLockError] = useState(null);
    const onLockFailed = useCallback(() => {
        setLockError('Someone else is editing this data sharing activity.');
        setTimeout(() => navigate("/data-sharing-activities"), 2000);
    }, [navigate]);

    const hasLock = useActiveLock(
        'DATA_SHARING_ACTIVITY',
        isEdit ? String(activityId) : null,
        onLockFailed
    );
    const isReadOnly = (isEdit && !hasLock) || isSubmitting;

    const { fetchUsersByUsernames } = useUsersApi();


    // Normalize tables from either a Source Assessment or an Existing Activity
    const mapTablesToState = (sourceList) => {
        if (!sourceList) return [];
        return sourceList.map(ta => ({
            id: ta.id || null, 
            tableId: ta.tableId || ta.table?.id, 
            tableName: ta.tableName || ta.table?.name,
            attributes: (ta.attributes || []).map(attr => {
                // CORRECTION: Prioritize the Assessment Attribute ID (nested or direct)
                // Do NOT use 'attr.attributeId' first, as that points to the raw column ID (e.g., 19)
                const attrId = attr.tableAssessmentAttribute?.id || attr.id; 

                const isDI = Boolean(attr.isDirectIdentifier);
                const isExcluded = Boolean(attr.isExcluded);

                return {
                    id: attr.id || null, // Specific activity attribute ID
                    attributeId: attrId, // This is now the correct reference for the backend
                    name: attr.name,
                    isDirectIdentifier: isDI,
                    isExcluded: isExcluded,
                    sensitivity: (isDI || isExcluded) ? null : (attr.sensitivity ?? 2),
                    replicability: (isDI || isExcluded) ? null : (attr.replicability ?? 2),
                    availability: (isDI || isExcluded) ? null : (attr.availability ?? 2),
                    distinguishability: (isDI || isExcluded) ? null : (attr.distinguishability ?? 2),
                };
            })
        }));
    };

    // 1. Fetch Data
    useEffect(() => {
        if (!token) return;
        dispatch(fetchDatasets(token));
        dispatch(fetchRecipients(token));
        dispatch(fetchDatasetAssessments(token));
        dispatch(fetchRecipientAssessments(token));
        dispatch(fetchDataSharingActivities(token));
    }, [dispatch, token]);

    // 2. Initialize Form (Edit Mode)
    useEffect(() => {
        if (isEdit && existingActivity && !formLoadedRef.current) {
            setName(existingActivity.name || "");
            setDescription(existingActivity.description || "");
            setDatasetId(String(existingActivity.datasetId || ""));
            setDatasetAssessmentId(String(existingActivity.datasetAssessmentId || ""));
            setRecipientId(String(existingActivity.recipientId || ""));
            setRecipientAssessmentId(String(existingActivity.recipientAssessmentId || ""));
            setSharedUsernames(existingActivity.sharedUsernames || []);

            const hasOverrides = existingActivity.tableAssessments?.length > 0;
            setOverrideTables(hasOverrides);

            // If overrides exist, load them. Otherwise, we'll fall through to logic
            // that loads from the assessment ID (handled in next effect, but blocked by override flag if needed)
            if (hasOverrides) {
                setTables(mapTablesToState(existingActivity.tableAssessments));
            }

            formLoadedRef.current = true;
        }
    }, [isEdit, existingActivity]);

    // 3. Handle Table Loading (Create Mode or Changing Assessment)
    useEffect(() => {
        if (!datasetAssessmentId) return;

        const selectedAssessment = allDatasetAssessments.find(
            da => da.id === Number(datasetAssessmentId)
        );
        if (!selectedAssessment) return;

        // Only update tables if we are in CREATE mode or EDIT mode with no overrides
        if (!isEdit || (isEdit && !overrideTables)) {
            setTables(mapTablesToState(selectedAssessment.tableAssessments));
        }
    }, [datasetAssessmentId, isEdit, overrideTables, allDatasetAssessments]);


    // Fetch Users
    useEffect(() => {
        let active = true;
        if (sharedUsernames.length > 0) {
            fetchUsersByUsernames(sharedUsernames)
                .then(users => { if (active) setSharedUsers(users); })
                .catch(() => { if (active) setSharedUsers([]); });
        } else {
            setSharedUsers([]);
        }
        return () => { active = false; };
    }, [sharedUsernames]);

    // --- Handlers ---
    const handleSubmit = useCallback(e => {
        e.preventDefault();
        if (isEdit && !hasLock) {
            setLockError("Lost lock connectivity.");
            return;
        }

        if (!name.trim()) {
            setNameError(true);
            setErrorMessage("Name required.");
            return;
        }

        if (!datasetAssessmentId || !recipientAssessmentId) {
            setErrorMessage("Select assessments.");
            return;
        }

        setIsSubmitting(true);

        const payload = {
            name: name.trim(),
            description: description.trim(),
            sharedUsernames,
            datasetAssessmentId: Number(datasetAssessmentId),
            recipientAssessmentId: Number(recipientAssessmentId),
            tableAssessments: overrideTables ? tables.map(tbl => ({
                id: tbl.id,
                tableId: tbl.tableId,
                tableName: tbl.tableName,
                attributes: tbl.attributes
                    .filter(attr => !attr.isExcluded) // Important: Filter excluded
                    .map(attr => ({
                        id: attr.id,
                        attributeId: attr.attributeId,
                        sensitivity: attr.sensitivity,
                        replicability: attr.replicability,
                        availability: attr.availability,
                        distinguishability: attr.distinguishability,
                        isDirectIdentifier: attr.isDirectIdentifier,
                    }))
            })) : [],
        };

        const action = existingActivity
            ? updateDataSharingActivity({ id: activityId, updatedActivity: payload, token })
            : createDataSharingActivity({ newActivity: payload, token });

        dispatch(action).unwrap()
            .then(() => navigate("/data-sharing-activities"))
            .catch(err => { setErrorMessage(err.toString()); setIsSubmitting(false); });

    }, [name, description, sharedUsernames, datasetAssessmentId, recipientAssessmentId, overrideTables,
        tables, existingActivity, activityId, isEdit, hasLock, token, dispatch, navigate]);

    // --- Calculated Values ---
    const datasetOptions = datasets.map(d => ({
        value: String(d.id),
        label: <LabeledAvatar value={d.name} variant="dataset"/>
    }));
    const datasetAssessmentOptions = allDatasetAssessments
        .filter(da => String(da.datasetId) === datasetId)
        .map(da => ({
            value: String(da.id),
            label: <LabeledAvatar value={da.name} variant="datasetAssessment"/>
        }));

    const recipientOptions = recipients.map(r => ({
        value: String(r.id),
        label: <LabeledAvatar value={r.name} variant="recipient"/>
    }));
    const recipientAssessmentOptions = allRecipientAssessments
        .filter(ra => String(ra.recipientId) === recipientId)
        .map(ra => ({
            value: String(ra.id),
            label: <LabeledAvatar value={ra.name} variant="recipientAssessment"/>
        }));

    const isSubmitDisabled = !name.trim() || !datasetId || !datasetAssessmentId
        || !recipientId || !recipientAssessmentId || isReadOnly;


    return (
        <>
            <RABox py={8}
                   component="form"
                   onSubmit={handleSubmit}
                   sx={{
                       maxWidth: '80%',
                       mx: "auto",
                       gap: 3,
                       display: "flex",
                       flexDirection: "column"
            }}>
                <RATypography variant="h5" textAlign="center">
                    {existingActivity ? "Edit Data Sharing Activity" : "Create Data Sharing Activity"}
                </RATypography>

                {errorMessage &&
                    <RAAlert color="error" dismissible
                                          onClose={() => setErrorMessage("")}>{errorMessage}
                    </RAAlert>}

                <OnBlurRAInput
                    label="Activity Name"
                    value={name}
                    onCommit={val => { setName(val); if(val.trim()) setNameError(false); }}
                    fullWidth required error={nameError} disabled={isReadOnly}
                />

                <OnBlurRAInput
                    label="Description"
                    value={description}
                    onCommit={setDescription}
                    fullWidth multiline
                    rows={3}
                    disabled={isReadOnly}
                />

                <RAUserAutocomplete
                    multiple
                    label="Shared Users"
                    value={sharedUsers}
                    onChange={(_, users) => {
                        setSharedUsers(users||[]); setSharedUsernames((users||[]).map(u=>u.username));
                    }}
                    placeholder="Search users"
                    fullWidth
                    sx={selectSx}
                    disabled={isReadOnly}
                />

                <RASelect
                    label="Recipient"
                    value={recipientId}
                    onChange={e => setRecipientId(e.target.value)}
                    options={recipientOptions}
                    fullWidth
                    sx={selectSx}
                    disabled={isReadOnly}
                />

                <RASelect
                    label="Recipient Assessment"
                    value={recipientAssessmentId}
                    onChange={e => setRecipientAssessmentId(e.target.value)}
                    options={recipientAssessmentOptions}
                    fullWidth
                    disabled={!recipientId || isReadOnly}
                    sx={selectSx}
                />

                <RASelect
                    label="Dataset"
                    value={datasetId}
                    onChange={e => setDatasetId(e.target.value)}
                    options={datasetOptions}
                    fullWidth
                    sx={selectSx}
                    disabled={isReadOnly}
                />

                <RASelect
                    label="Dataset Assessment"
                    value={datasetAssessmentId}
                    onChange={e => setDatasetAssessmentId(e.target.value)}
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
                            onChange={e => setOverrideTables(e.target.checked)}
                            disabled={isReadOnly}
                        />}
                        label="Override dataset table assessments" sx={{ my: 2 }}
                    />
                )}

                {overrideTables && (
                    <RABox>
                        <RATypography
                            variant="h6"
                            align="center"
                            mt={2}>
                            Dataset Tables Assessment
                        </RATypography>

                        <DatasetTablesAssessment
                            tables={tables}
                            setTables={setTables}
                        />
                    </RABox>
                )}

                <RAButton type="submit" sx={{ alignSelf: "center", mt: 2 }} disabled={isSubmitDisabled}>
                    {existingActivity ? "Update Activity" : "Create Activity"}
                </RAButton>
            </RABox>

            {lockError &&
                <RABox sx={{ position: "fixed", bottom: 16, right: 16, width: 300, zIndex: 9999 }}>
                <RAAlert color="error" dismissible onClose={() => setLockError(null)}>{lockError}</RAAlert>
            </RABox>}
        </>
    );
}