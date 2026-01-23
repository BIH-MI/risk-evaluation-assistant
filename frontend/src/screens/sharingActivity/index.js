import React, {useCallback, useEffect, useMemo, useState} from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";

import getDataSharingActivitiesTableData from "./getDataSharingActivitiesTableData";
import {
    fetchDataSharingActivities,
    deleteDataSharingActivity,
} from "store/dataSharingActivities/dataSharingActivitiesThunks";
import {fetchReports} from "../../store/reports/reportsThunks";
import {fetchDatasets} from "../../store/datasets/datasetsThunks";
import {fetchRecipients} from "../../store/recipients/recipientsThunks";
import {fetchDatasetAssessments} from "../../store/datasetAssessments/datasetAssessmentsThunks";
import {fetchRecipientAssessments} from "../../store/recipientAssessments/recipientAssessmentsThunks";
import { useLockTracker } from "hooks/locks/useLockTracker";

export default function DataSharingActivities() {
    const theme = useTheme();
    const { user } = useAuth();
    const token = user?.access_token;
    const me = user?.profile?.preferred_username;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Local state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [toDeleteId, setToDeleteId] = useState(null);
    // locks state is now managed by the hook
    const [lockError, setLockError] = useState(null);

    // Pull in the list from Redux
    const { items: activities, status, error } = useSelector(state => state.dataSharingActivities);

    // Fetch all activities once we have a token
    useEffect(() => {
        if (!token) return;
        dispatch(fetchDatasets(token));
        dispatch(fetchRecipients(token));
        dispatch(fetchDataSharingActivities(token));
        dispatch(fetchReports(token));
        dispatch(fetchDatasetAssessments(token));
        dispatch(fetchRecipientAssessments(token));
    }, [dispatch, token]);

    // --- LOCK TRACKING ---
    const activityIds = useMemo(() => activities.map((a) => String(a.id)), [activities]);

    // Use the standard hook for polling and lock management
    const { locks, getLockError } = useLockTracker("DATA_SHARING_ACTIVITY", activityIds);

    // Handlers
    const handleAdd = useCallback(() => navigate("/data-sharing-activities/new"), [navigate]);

    const handleEdit = useCallback(id => {
        if (!id) return;

        // Use helper from hook to check lock status
        const error = getLockError(id, me);
        if (error) {
            setLockError(error);
            return;
        }

        setLockError(null);
        navigate(`/data-sharing-activities/${id}/edit`);
    }, [navigate, getLockError, me]);

    const handleViewReport = useCallback(id => {
        if (id) {
            navigate(`/data-sharing-activities/${id}/report`);
        }
    }, [navigate]);

    const handleDeleteRequest = useCallback(id => {
        setToDeleteId(id);
        setDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        if (token && toDeleteId != null) {
            dispatch(deleteDataSharingActivity({ id: toDeleteId, token }));
        }
        setDialogOpen(false);
        setToDeleteId(null);
    }, [token, toDeleteId, dispatch]);

    const handleDialogClose = useCallback(() => {
        setDialogOpen(false);
        setToDeleteId(null);
    }, []);

    // Build table columns & rows
    const { columns, rows } = useMemo(() => getDataSharingActivitiesTableData(
        activities,
        handleEdit,
        handleDeleteRequest,
        handleViewReport,
        locks, // Pass locks from hook
        me
    ), [activities, handleEdit, handleDeleteRequest, handleViewReport, locks, me]);

    return (
        <RABox>
            <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 65 } }}>
                <DataTable
                    table={{ columns, rows }}
                    canSearch
                    canAdd
                    showTotalEntries
                    isSorted
                    searchColumnKey="datasetAssessmentName"
                    searchPlaceholder="Search activities..."
                    onAddClick={handleAdd}
                />
            </RABox>

            <RADialog
                open={dialogOpen}
                title="Confirm Deletion"
                onClose={handleDialogClose}
                onConfirm={handleDeleteConfirm}
                cancelText="No, keep it"
                confirmText="Yes, delete"
            >
                Are you sure you want to permanently delete this activity?
            </RADialog>

            {/* Lock error */}
            {lockError && (
                <RABox
                    sx={{
                        position: "fixed",
                        bottom: theme.spacing(2),
                        right: theme.spacing(2),
                        zIndex: theme.zIndex.snackbar,
                        width: 300,
                    }}
                >
                    <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
                        <RATypography variant="body2" color="white">
                            {lockError}
                        </RATypography>
                    </RAAlert>
                </RABox>
            )}

            {/* Loading / fetch errors */}
            {status === "loading" && (
                <RABox
                    sx={{
                        position: "fixed",
                        bottom: theme.spacing(2),
                        right: theme.spacing(2),
                        zIndex: theme.zIndex.snackbar,
                        width: 300,
                    }}
                >
                    <RAAlert color="info">
                        <RATypography variant="body2" color="white">
                            Loading data sharing activities…
                        </RATypography>
                    </RAAlert>
                </RABox>
            )}
            {status === "failed" && (
                <RABox
                    sx={{
                        position: "fixed",
                        bottom: theme.spacing(2),
                        right: theme.spacing(2),
                        zIndex: theme.zIndex.snackbar,
                        width: 300,
                    }}
                >
                    <RAAlert color="error" dismissible>
                        <RATypography variant="body2" color="white">
                            Something went wrong. Please refresh page.
                        </RATypography>
                    </RAAlert>
                </RABox>
            )}
        </RABox>
    );
}