import React, {useState, useEffect, useMemo, useCallback} from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/Tables/DataTable/CustomDataTableComponents/DateTimeDisplay";
import RABox from "components/layout/RABox";
import getDatasetsTableData from "./getDatasetsTableData";

import {
    deleteDataset,
    fetchDatasets,
} from "../../store/datasets/datasetsThunks";
import {useLockTracker} from "../../hooks/locks/useLockTracker";

export default function Datasets() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = user?.access_token;
    const me = user?.profile?.preferred_username;
    const theme = useTheme();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [toDeleteId, setToDeleteId] = useState(null);
    const [lockError, setLockError] = useState(null);

    const status = useSelector((state) => state.datasets.status);
    const rawItems = useSelector((state) => state.datasets.items);
    const datasets = Array.isArray(rawItems) ? rawItems : [];

    useEffect(() => {
        if (!token) return;
        dispatch(fetchDatasets(token));
    }, [dispatch, token]);

    // 1. Prepare IDs for the hook
    const datasetIds = useMemo(() => datasets.map((d) => d.id), [datasets]);
    const { locks, getLockError } = useLockTracker("DATASET", datasetIds);

    const handleAdd = useCallback(() => navigate("/datasets/new"), [navigate]);

    const handleEdit = useCallback((id) => {
        if (!id) return;

        // 3. Use the helper from the hook
        const error = getLockError(id, me);
        if (error) {
            setLockError(error);
            return;
        }

        setLockError(null);
        navigate(`/datasets/${id}/edit`);
    }, [getLockError, me, navigate]); // depend on getLockError

    const handleDeleteRequest = useCallback((id) => {
        setToDeleteId(id);
        setDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        if (token && toDeleteId != null) {
            dispatch(deleteDataset({ datasetId: toDeleteId, token }));
        }
        setDialogOpen(false);
        setToDeleteId(null);
    }, [token, toDeleteId, dispatch]);

    const handleDialogClose = useCallback(() => {
        setDialogOpen(false);
        setToDeleteId(null);
    }, []);

    const handleViewAssessments = useCallback((datasetId) => {
        navigate(`/datasets/${datasetId}/assessments`);
    }, [navigate]);

    const handleAddAssessment = useCallback((datasetId) => {
        navigate(`/datasets/${datasetId}/assessments/new`);
    }, [navigate]);

    const { columns, rows } = useMemo(() => getDatasetsTableData(
        datasets,
        handleEdit,
        handleDeleteRequest,
        locks,
        me,
        handleViewAssessments,
        handleAddAssessment
    ), [datasets, handleEdit, handleDeleteRequest, locks, me, handleViewAssessments, handleAddAssessment]);


    return (
        <RABox>
            <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
                <DataTable
                    table={{ columns, rows }}
                    canSearch
                    canAdd
                    showTotalEntries
                    isSorted
                    searchColumnKey="name"
                    searchPlaceholder="datasets"
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
                Are you sure you want to permanently delete this dataset?
            </RADialog>

            <RABox
                sx={{
                    position: "fixed",
                    bottom: theme.spacing(2),
                    right: theme.spacing(2),
                    zIndex: theme.zIndex.snackbar,
                    width: 300,
                    marginBottom: theme.spacing(3),
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
                            Loading datasets…
                        </RATypography>
                    </RAAlert>
                )}
                {status === "failed" && (
                    <RAAlert color="error" dismissible>
                        <RATypography variant="body2" color="white">
                            Something went wrong. Please refresh page.
                        </RATypography>
                    </RAAlert>
                )}
            </RABox>
        </RABox>
    );
}