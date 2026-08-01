import { useCallback, useEffect, useMemo, useState } from "react";
import { useEntityLockApi } from "api/locks";

/**
 * Custom hook to poll lock statuses for a list of entities.
 * * @param {string} entityType - The type of entity (e.g., "DATASET", "USER").
 * @param {Array<string>} entityIds - List of IDs to monitor.
 * @param {number} intervalMs - Polling interval in ms (default 10s).
 * @returns {Object} { locks, getLockError }
 */
export function useLockTracker(entityType, entityIds, intervalMs = 10000) {

    const { getLocks } = useEntityLockApi();
    const [locks, setLocks] = useState({});

    const normalizedIds = useMemo(
        () => (Array.isArray(entityIds) ? entityIds.map(String) : []),
        [entityIds]
    );
    const idsKey = normalizedIds.join("|");

    useEffect(() => {
        if (normalizedIds.length === 0) {
            setLocks({});
            return;
        }

        let active = true;

        const fetchLocks = () => {
            // Don't poll if tab is hidden
            if (document.visibilityState === 'hidden') return;

            getLocks(entityType, normalizedIds)
                .then((list) => {
                    if (!active) return;

                    const newMap = {};
                    list.forEach((l) => {
                        newMap[String(l.entityId)] = l.lockedBy;
                    });

                    // State Update Optimization: Only update if changed
                    setLocks(prev => {
                        const isSame = JSON.stringify(prev) === JSON.stringify(newMap);
                        return isSame ? prev : newMap;
                    });
                })
                .catch(() => {
                    if (active) setLocks({});
                });
        };

        // Initial fetch
        fetchLocks();

        // Start polling
        const intervalId = setInterval(fetchLocks, intervalMs);

        return () => {
            active = false;
            clearInterval(intervalId);
        };
    }, [entityType, getLocks, intervalMs, idsKey, normalizedIds]);

    /**
     * Helper to check if an item is locked by someone else.
     * @param {string|number} id - The entity ID.
     * @param {string} myUsername - The current user's username.
     * @returns {string|null} - Error message if locked, or null if free/mine.
     */
    const getLockError = useCallback((id, myUsername) => {
        const locker = locks[String(id)];
        if (locker && locker !== myUsername) {
            return `Cannot edit: locked by ${locker}`;
        }
        return null;
    }, [locks]);

    return { locks, getLockError };
}
