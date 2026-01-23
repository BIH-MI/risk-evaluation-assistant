import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";
import { useTheme } from "@mui/material/styles";

import getDatasetAssessmentsTableData from "./getDatasetAssessmentsTableData";
import {
    fetchDatasetAssessments,
    fetchDatasetAssessmentsByDatasetId,
    deleteDatasetAssessment,
} from "store/datasetAssessments/datasetAssessmentsThunks";

import { useLockTracker } from "hooks/locks/useLockTracker";

export default function DatasetAssessments() {
    const { datasetId: rawId } = useParams();
    const datasetId = rawId ? Number(rawId) : null;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useAuth();
    const token = user?.access_token;
    const me = user?.profile?.preferred_username;
    const theme = useTheme();

    // UI state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState({ datasetId: null, assessmentId: null });
    // locks state is now managed by the hook
    const [lockError, setLockError] = useState(null);

    // Redux data
    const { items: assessments, status, error } = useSelector(state => state.datasetAssessments);

    // Fetch assessments
    useEffect(() => {
        if (!token) return;
        if (datasetId != null) {
            dispatch(fetchDatasetAssessmentsByDatasetId({ datasetId, token }));
        } else {
            dispatch(fetchDatasetAssessments(token));
        }
    }, [dispatch, token, datasetId]);

    // Prepare stable list of IDs
    const assessmentIds = useMemo(() =>
            assessments.map((a) => String(a.id)),
        [assessments]);

    //  Use the hook to track locks
    const { locks, getLockError } = useLockTracker("DATASET_ASSESSMENT", assessmentIds);

    // Edit handler
    const handleEdit = (dsId, assessmentId) => {
        const error = getLockError(assessmentId, me);

        if (error) {
            setLockError(error);
            return;
        }
        setLockError(null);
        navigate(`/datasets/${dsId}/assessments/${assessmentId}/edit`, {
            state: { assessmentId },
        });
    };

    // Delete handlers
    const handleDeleteRequest = (dsId, assessmentId) => {
        setPendingDelete({ datasetId: dsId, assessmentId });
        setDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        const { datasetId: dsId, assessmentId } = pendingDelete;
        if (token && dsId != null && assessmentId != null) {
            dispatch(deleteDatasetAssessment({ datasetId: dsId, assessmentId, token }));
        }
        setDialogOpen(false);
        setPendingDelete({ datasetId: null, assessmentId: null });
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setPendingDelete({ datasetId: null, assessmentId: null });
    };

    // Table setup
    const { columns, rows } = getDatasetAssessmentsTableData(
        assessments,
        handleEdit,
        handleDeleteRequest,
        locks,
        me
    );

    return (
        <RABox>
            <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 65 } }}>
                <DataTable
                    table={{ columns, rows }}
                    showTotalEntries
                    isSorted
                    noEndBorder
                    canSearch
                    searchColumnKey="name"
                    searchPlaceholder="Search by assessment name"
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
                Are you sure you want to delete this assessment?
            </RADialog>

            <RABox
                sx={{
                    position: "fixed",
                    bottom: theme.spacing(2),
                    right: theme.spacing(2),
                    zIndex: theme.zIndex.snackbar,
                    width: 300,
                }}
            >
                {lockError && (
                    <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
                        <RATypography variant="body2" color="white">
                            {lockError}
                        </RATypography>
                    </RAAlert>
                )}

                {status === "loading" && (
                    <RAAlert color="info">
                        <RATypography variant="body2" color="white">
                            Loading assessments...
                        </RATypography>
                    </RAAlert>
                )}
                {status === "failed" && (
                    <RAAlert color="error" dismissible>
                        <RATypography variant="subtitle2" color="white">
                            Error loading assessments. Please refresh page.
                        </RATypography>
                    </RAAlert>
                )}
            </RABox>
        </RABox>
    );
}