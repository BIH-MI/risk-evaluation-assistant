import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { useActiveLock } from "hooks/locks/useActiveLock";
import { useUsersApi } from "api/users";
import { getErrorMessage } from "utils/errors";
import {
  addRecipient,
  fetchRecipients,
  updateRecipient,
} from "store/recipients/recipientsThunks";
import {
  buildRecipientPayload,
  EMPTY_RECIPIENT_FORM,
  getRecipientFormTargetKey,
  mapRecipientToFormValues,
  validateRecipientForm,
} from "./recipientFormUtils";

const EMPTY_ARRAY = Object.freeze([]);

export default function useRecipientForm() {
  const { recipientId: rawRecipientId } = useParams();
  const recipientId = rawRecipientId ? String(rawRecipientId) : null;
  const isEditMode = Boolean(recipientId);
  const targetKey = getRecipientFormTargetKey(recipientId);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const token = user?.access_token;
  const { t } = useTranslation();
  const { fetchUsersByUsernames } = useUsersApi();

  const recipients = useSelector(
    (state) => state.recipients.items || EMPTY_ARRAY
  );
  const recipientsStatus = useSelector((state) => state.recipients.status);

  const recipient = useMemo(
    () => recipients.find((item) => String(item.id) === recipientId) || null,
    [recipients, recipientId]
  );

  const [values, setValues] = useState(EMPTY_RECIPIENT_FORM);
  const [sharedUsernames, setSharedUsernames] = useState(EMPTY_ARRAY);
  const [sharedUsers, setSharedUsers] = useState(EMPTY_ARRAY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lockError, setLockError] = useState(null);

  const initializedTargetRef = useRef(null);
  const resolvedSharedUsersTargetRef = useRef(null);
  const lockRedirectTimerRef = useRef(null);

  useEffect(() => {
    if (!token || recipientsStatus !== "idle") return;
    dispatch(fetchRecipients(token));
  }, [dispatch, token, recipientsStatus]);

  /**
   * Initialize each route target only once so background Redux refreshes do
   * not overwrite unsaved form changes. A different recipient route receives
   * a new target key and initializes normally.
   */
  useEffect(() => {
    if (isEditMode && !recipient) return;
    if (initializedTargetRef.current === targetKey) return;

    if (isEditMode) {
      setValues(mapRecipientToFormValues(recipient));
      setSharedUsernames(recipient.sharedUsernames || EMPTY_ARRAY);
    } else {
      setValues(EMPTY_RECIPIENT_FORM);
      setSharedUsernames(EMPTY_ARRAY);
    }

    initializedTargetRef.current = targetKey;
  }, [isEditMode, recipient, targetKey]);

  /**
   * Resolved user objects are presentation state derived from the persisted
   * usernames, fetched once per target. A stale response from a previous
   * target (or a lookup failure) must never overwrite sharedUsernames itself.
   */
  useEffect(() => {
    if (initializedTargetRef.current !== targetKey) return;
    if (resolvedSharedUsersTargetRef.current === targetKey) return;

    resolvedSharedUsersTargetRef.current = targetKey;

    if (sharedUsernames.length === 0) {
      setSharedUsers(EMPTY_ARRAY);
      return undefined;
    }

    let isCurrent = true;

    fetchUsersByUsernames(sharedUsernames)
      .then((users) => {
        if (isCurrent) setSharedUsers(users);
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [targetKey, sharedUsernames, fetchUsersByUsernames]);

  const handleFieldChange = useCallback((field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSharedUsersChange = useCallback((_event, users) => {
    const nextSharedUsers = Array.isArray(users) ? users : [];
    setSharedUsers(nextSharedUsers);
    setSharedUsernames(nextSharedUsers.map((sharedUser) => sharedUser.username));
  }, []);

  const clearLockError = useCallback(() => setLockError(null), []);

  const onLockFailed = useCallback(() => {
    setLockError(t("recipients.alerts.lockFailed"));

    if (lockRedirectTimerRef.current) {
      clearTimeout(lockRedirectTimerRef.current);
    }

    /**
     * The redirect timer is cleaned up on unmount so navigation cannot fire
     * after the user has already left the form.
     */
    lockRedirectTimerRef.current = setTimeout(() => {
      navigate("/recipients");
    }, 2000);
  }, [navigate, t]);

  useEffect(
    () => () => {
      if (lockRedirectTimerRef.current) {
        clearTimeout(lockRedirectTimerRef.current);
      }
    },
    []
  );

  const hasLock = useActiveLock(
    "RECIPIENT",
    isEditMode ? recipientId : null,
    onLockFailed
  );

  const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isSubmitting) return;

      const validationErrors = validateRecipientForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setSubmitError(validationErrors.name);
        return;
      }

      if (isEditMode && !hasLock) {
        setSubmitError(t("recipients.alerts.lockLost"));
        return;
      }

      setIsSubmitting(true);
      setSubmitError("");

      try {
        const payload = buildRecipientPayload(values, sharedUsernames);

        if (isEditMode) {
          await dispatch(
            updateRecipient({
              id: Number(recipientId),
              updatedRecipient: payload,
              token,
            })
          ).unwrap();
        } else {
          await dispatch(
            addRecipient({ newRecipient: payload, token })
          ).unwrap();
        }

        dispatch(fetchRecipients(token));
        navigate("/recipients");
      } catch (error) {
        setSubmitError(
          getErrorMessage(error, t("recipients.form.submissionFailed"))
        );
        setIsSubmitting(false);
      }
    },
    [
      dispatch,
      hasLock,
      isEditMode,
      isSubmitting,
      navigate,
      recipientId,
      sharedUsernames,
      t,
      token,
      values,
    ]
  );

  return {
    values,
    sharedUsers,
    isEditMode,
    isReadOnly,
    isSubmitting,
    submitError,
    lockError,
    handleFieldChange,
    handleSharedUsersChange,
    handleSubmit,
    clearLockError,
  };
}
