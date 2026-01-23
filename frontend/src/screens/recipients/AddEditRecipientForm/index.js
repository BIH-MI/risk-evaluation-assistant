import React, {useEffect, useState, useCallback, useMemo, useRef} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import {useDispatch, useSelector} from 'react-redux';
import { useTheme } from '@mui/material/styles';

import OnBlurRAInput from 'components/input/RAInput/OnBlurRAInput';
import RAUserAutocomplete from 'components/input/RAUserAutocomplete';
import RAButton from 'components/input/RAButton';
import RATypography from 'components/display/RATypography';
import RABox from 'components/layout/RABox';
import RAAlert from 'components/feedback/RAAlert';

import {addRecipient, updateRecipient} from 'store/recipients/recipientsThunks';
import { useUsersApi } from 'api/users';
import { useActiveLock } from "hooks/locks/useActiveLock";
import { fetchRecipients } from "store/recipients/recipientsThunks";

export default function AddEditRecipientForm() {
    const { recipientId: rawId } = useParams();
    const recipientId = rawId ? String(rawId) : null;
    const isEditMode = !!recipientId;

    const theme = useTheme();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useAuth();
    const token = user?.access_token;

    const allRecipients = useSelector(state => state.recipients.items || []);

    // form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [organizationLink, setOrganizationLink] = useState('');
    const [errors, setErrors] = useState({ submit: '' });

    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // shared users
    const { fetchUsersByUsernames } = useUsersApi();
    const [sharedUsernames, setSharedUsernames] = useState([]);
    const [sharedUsers, setSharedUsers] = useState([]);

    // --- INITIALIZATION GUARD ---
    const formInitialized = useRef(false);
    const initializedId = useRef(null);
    const currentTargetId = isEditMode ? recipientId : 'new-recipient';

    // --- LOCKING LOGIC ---
    const [lockError, setLockError] = useState(null);

    const onLockFailed = useCallback((err) => {
        setLockError('Someone else is editing this recipient.');
        setTimeout(() => navigate('/recipients'), 2000);
    }, [navigate]);

    const hasLock = useActiveLock(
        'RECIPIENT',
        isEditMode ? recipientId : null,
        onLockFailed
    );

    const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

    // --- DATA LOADING ---
    const recipient = useMemo(() =>
            allRecipients.find(r => String(r.id) === recipientId),
        [allRecipients, recipientId]
    );

    useEffect(() => {
        // Wait for data if editing
        if (isEditMode && !recipient) return;

        // GUARD: Prevent re-initialization overriding local state
        if (formInitialized.current && initializedId.current === currentTargetId) {
            return;
        }

        if (isEditMode && recipient) {
            setName(recipient.name || '');
            setDescription(recipient.description || '');
            setOrganizationLink(recipient.organizationLink || '');

            // Handle Shared Users init
            const initialUsernames = recipient.sharedUsernames || [];
            setSharedUsernames(initialUsernames);

            if (initialUsernames.length > 0) {
                fetchUsersByUsernames(initialUsernames)
                    .then(users => setSharedUsers(users))
                    .catch(() => setSharedUsers([]));
            } else {
                setSharedUsers([]);
            }
        } else {
            // Create Mode
            setName('');
            setDescription('');
            setOrganizationLink('');
            setSharedUsernames([]);
            setSharedUsers([]);
        }

        // Mark initialized
        formInitialized.current = true;
        initializedId.current = currentTargetId;

    }, [recipient, isEditMode, currentTargetId, fetchUsersByUsernames]);

    // Shared User Handler
    const handleSharedChange = useCallback((_e, users) => {
        const list = Array.isArray(users) ? users : [];
        setSharedUsers(list);
        setSharedUsernames(list.map(u => u.username));
    }, []);

    // Submit handler
    const handleSubmit = useCallback(e => {
        e.preventDefault();

        if (isEditMode && !hasLock) {
            setLockError("Lost lock connectivity. Cannot save.");
            return;
        }

        setIsSubmitting(true);

        const payload = { name, description, organizationLink, sharedUsernames };

        const action = isEditMode
            ? updateRecipient({ id: Number(recipientId), updatedRecipient: payload, token })
            : addRecipient({ newRecipient: payload, token });

        dispatch(action)
            .unwrap()
            .then(() => {
                // Lock is auto-released by hook on unmount
                dispatch(fetchRecipients(token));
                navigate('/recipients');
            })
            .catch(err => {
                console.error(err);
                setErrors({ submit: err.message || 'Submission failed' });
                setIsSubmitting(false);
            });
    }, [name, description, organizationLink, sharedUsernames, isEditMode,
        recipientId, token, dispatch, navigate, hasLock]);


    return (
        <>
            <RABox py={8}>
                <RABox
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ maxWidth: 600, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                    <RATypography variant="h5" textAlign="center">
                        {isEditMode ? 'Edit' : 'Add'} Recipient
                    </RATypography>

                    <OnBlurRAInput
                        label="Organization"
                        value={name}
                        onCommit={setName}
                        required
                        fullWidth
                        disabled={isReadOnly}
                    />

                    <OnBlurRAInput
                        label="Description"
                        value={description}
                        onCommit={setDescription}
                        fullWidth
                        multiline rows={3}
                        disabled={isReadOnly}
                    />

                    <OnBlurRAInput
                        label="Organization Link"
                        value={organizationLink}
                        onCommit={setOrganizationLink}
                        fullWidth
                        disabled={isReadOnly}
                    />

                    <RAUserAutocomplete
                        multiple
                        label="Shared With"
                        value={sharedUsers}
                        onChange={handleSharedChange}
                        placeholder="Search users"
                        disabled={isReadOnly}
                    />

                    <RAButton
                        type="submit"
                        sx={{ alignSelf: 'center', mt: 2 }}
                        disabled={isReadOnly}
                    >
                        {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Recipient')}
                    </RAButton>
                </RABox>

                {errors.submit && (
                    <RAAlert severity="error" sx={{ mt: 2, mx: 'auto', maxWidth: 600 }}>
                        {errors.submit}
                    </RAAlert>
                )}
            </RABox>

            {/* Lock error alert */}
            {lockError && (
                <RABox sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    width: 300,
                    zIndex: theme.zIndex.snackbar
                }}>
                    <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
                        <RATypography variant="body2" color="white">
                            Something went wrong. Please refresh page.
                        </RATypography>
                    </RAAlert>
                </RABox>
            )}
        </>
    );
}