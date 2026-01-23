import React, {useEffect, useState, useCallback, useMemo} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useDispatch, useSelector } from 'react-redux';

import DataTable from 'components/display/Tables/DataTable';
import RADialog from 'components/feedback/RADialog';
import RABox from 'components/layout/RABox';
import RAAlert from 'components/feedback/RAAlert';
import RATypography from 'components/display/RATypography';

import {deleteRecipient, fetchRecipients} from 'store/recipients/recipientsThunks';
import getRecipientsTableData from './getRecipientsTableData';

import {fetchRecipientAssessments} from "../../store/recipientAssessments/recipientAssessmentsThunks";
import { useLockTracker } from "hooks/locks/useLockTracker";

export default function Recipients() {
    const { user } = useAuth();
    const token = user?.access_token;
    const me = user?.profile?.preferred_username;
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Redux state
    const { items: recipients, status, error } = useSelector(state => state.recipients);

    // Local UI state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [toDeleteId, setToDeleteId] = useState(null);
    // locks state is now managed by the hook
    const [lockError, setLockError] = useState(null);

    // Fetch recipients & assessments
    useEffect(() => {
        if (!token) return;
        dispatch(fetchRecipients(token));
        dispatch(fetchRecipientAssessments(token));
    }, [dispatch, token]);

    // --- Locking
    const recipientIds = useMemo(() => recipients.map(r => String(r.id)), [recipients]);

    // Use the standard hook for polling and lock management
    const { locks, getLockError } = useLockTracker("RECIPIENT", recipientIds);

    // Handlers
    const handleAdd = useCallback(() => navigate('/recipients/new'), [navigate]);

    const handleEdit = useCallback(recipientId => {
        // Use helper from hook
        const error = getLockError(recipientId, me);
        if (error) {
            setLockError(error);
            return;
        }

        setLockError(null);
        const rec = recipients.find(r => r.id === recipientId);
        if (rec) {
            navigate(`/recipients/${recipientId}/edit`, { state: { recipient: rec, preLocked: true } });
        }
    }, [getLockError, me, recipients, navigate]);

    const handleViewAssessments = useCallback(
        recipientId => navigate(`/recipients/${recipientId}/assessments`),
        [navigate]
    );

    const handleAddAssessment = useCallback(
        recipientId => navigate(`/recipients/${recipientId}/assessments/new`),
        [navigate]
    );

    const handleDeleteRequest = useCallback(recipientId => {
        setToDeleteId(recipientId);
        setDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(() => {
        if (token && toDeleteId != null) {
            dispatch(deleteRecipient({ id: toDeleteId, token }));
        }
        setDialogOpen(false);
    }, [dispatch, toDeleteId, token]);

    const handleDialogClose = useCallback(() => setDialogOpen(false), []);

    // Build table
    const { columns, rows } = useMemo(() => getRecipientsTableData(
        recipients,
        handleEdit,
        handleDeleteRequest,
        handleViewAssessments,
        handleAddAssessment,
        locks,
        me
    ), [recipients, handleEdit, handleDeleteRequest, handleViewAssessments, handleAddAssessment, locks, me]);

    return (
        <RABox>
            <RABox py={3}>
                <DataTable
                    table={{ columns, rows }}
                    canSearch
                    searchColumnKey="name"
                    searchPlaceholder="recipients"
                    canAdd
                    onAddClick={handleAdd}
                />
            </RABox>

            <RADialog
                open={dialogOpen}
                title="Delete Recipient?"
                onClose={handleDialogClose}
                onConfirm={handleDeleteConfirm}
                cancelText="Cancel"
                confirmText="Delete"
            >
                Are you sure you want to delete this recipient?
            </RADialog>

            <RABox
                sx={theme => ({
                    position: 'fixed',
                    bottom: theme.spacing(2),
                    right: theme.spacing(2),
                    zIndex: theme.zIndex.snackbar,
                    width: 300,
                    marginBottom: theme.spacing(3),
                })}
            >
                {lockError && (
                    <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
                        <RATypography variant="body2" color="white">
                            {lockError}
                        </RATypography>
                    </RAAlert>
                )}
                {status === 'loading' && (
                    <RAAlert color="info">
                        <RATypography variant="body2" color="white">
                            Loading recipients…
                        </RATypography>
                    </RAAlert>
                )}
                {status === 'failed' && (
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