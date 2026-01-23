import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@mui/material/styles';

import DataTable from 'components/display/Tables/DataTable';
import RADialog from 'components/feedback/RADialog';
import RABox from 'components/layout/RABox';
import RAAlert from 'components/feedback/RAAlert';
import RATypography from 'components/display/RATypography';

import getRecipientAssessmentsTableData from './getRecipientAssessmentsTableData';
import {
    fetchRecipientAssessments,
    deleteRecipientAssessment,
} from 'store/recipientAssessments/recipientAssessmentsThunks';
import { useLockTracker } from "hooks/locks/useLockTracker";

export default function RecipientAssessments() {
    const { recipientId: rawId } = useParams();
    const recipientId = rawId ? Number(rawId) : null;
    const { user } = useAuth();
    const token = user?.access_token;
    const me = user?.profile?.preferred_username;
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const theme = useTheme();

    // Redux data
    const { items, status, error } = useSelector(
        state => state.recipientAssessments
    );

    // Local UI state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pending, setPending] = useState({ recipientId: null, assessmentId: null });
    // lockError is local, but 'locks' map is now managed by the hook
    const [lockError, setLockError] = useState(null);

    // Filter by context
    const assessments = useMemo(
        () =>
            recipientId != null
                ? items.filter(a => a.recipientId === recipientId)
                : items,
        [items, recipientId]
    );

    // Fetch all assessments
    useEffect(() => {
        if (!token) return;
        dispatch(fetchRecipientAssessments(token));
    }, [dispatch, token]);

    // --- LOCK TRACKING ---
    // Memoize IDs as strings for the hook
    const assessmentIds = useMemo(() =>
            assessments.map(a => String(a.id)),
        [assessments]);

    // Use the hook
    const { locks, getLockError } = useLockTracker("RECIPIENT_ASSESSMENT", assessmentIds);

    // Handlers
    const handleEdit = useCallback((rId, aId) => {
        // Use helper from hook to check lock status
        const error = getLockError(aId, me);
        if (error) {
            setLockError(error);
            return;
        }

        setLockError(null);
        const assessment = assessments.find(a => a.id === aId);
        navigate(
            `/recipients/${rId}/assessments/${aId}/edit`,
            { state: { assessment } }
        );
    }, [getLockError, me, assessments, navigate]);

    const handleDeleteRequest = useCallback((rId, aId) => {
        setPending({ recipientId: rId, assessmentId: aId });
        setDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        const { recipientId, assessmentId } = pending;
        if (token && recipientId != null && assessmentId != null) {
            dispatch(deleteRecipientAssessment({ recipientId, assessmentId, token }));
        }
        setDialogOpen(false);
        setPending({ recipientId: null, assessmentId: null });
    }, [token, pending, dispatch]);

    const handleDialogClose = useCallback(() => setDialogOpen(false), []);

    // Build table
    const { columns, rows } = useMemo(() => getRecipientAssessmentsTableData(
        assessments,
        handleEdit,
        handleDeleteRequest,
        locks, // Pass locks from hook
        me
    ), [assessments, handleEdit, handleDeleteRequest, locks, me]);

    return (
        <RABox>
            <RABox py={3} sx={{ '& .MuiTableRow-root': { height: 65 } }}>
                <DataTable
                    table={{ columns, rows }}
                    canSearch
                    showTotalEntries
                    isSorted
                    searchColumnKey="organization"
                    searchPlaceholder="organization"
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
                Are you sure you want to permanently delete this recipient assessment?
            </RADialog>

            {/* Lock error alert */}
            {lockError && (
                <RABox
                    sx={{
                        position: 'fixed',
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
            {status === 'loading' && (
                <RABox
                    sx={{
                        position: 'fixed',
                        bottom: theme.spacing(2),
                        right: theme.spacing(2),
                        zIndex: theme.zIndex.snackbar,
                        width: 300,
                    }}
                >
                    <RAAlert color="info">
                        <RATypography variant="body2" color="white">
                            Loading recipient assessments…
                        </RATypography>
                    </RAAlert>
                </RABox>
            )}
            {status === 'failed' && (
                <RABox
                    sx={{
                        position: 'fixed',
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