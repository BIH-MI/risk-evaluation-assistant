import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useActiveLock } from "hooks/locks/useActiveLock";

/**
 * Holds the edit lock of an existing activity. When someone else is editing it, the user is told so
 * and sent back to the activity list.
 */
export default function useActivityEditLock(activityId) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [lockError, setLockError] = useState(null);
  const redirectTimerRef = useRef(null);

  const handleLockFailed = () => {
    setLockError(t("dataSharingActivities.alerts.lockFailed"));
    clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => navigate("/data-sharing-activities"), 2000);
  };

  useEffect(() => () => clearTimeout(redirectTimerRef.current), []);

  const hasLock = useActiveLock(
    "DATA_SHARING_ACTIVITY",
    activityId ? String(activityId) : null,
    handleLockFailed
  );

  return { hasLock, lockError, setLockError };
}
