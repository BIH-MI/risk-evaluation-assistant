import { useState, useEffect, useRef } from "react";
import { useEntityLockApi } from "api/locks"; // Ensure path is correct

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

    // Use a ref to store the latest IDs so the interval doesn't need to restart
    // every time the ID list reference changes (optional optimization).
    const idsRef = useRef(entityIds);

    useEffect(() => {
        idsRef.current = entityIds;
    }, [entityIds]);

    useEffect(() => {
        //  Early exit if no IDs to check
        if (!idsRef.current || idsRef.current.length === 0) {
            setLocks({});
            return;
        }

        const fetchLocks = () => {
            // Don't poll if tab is hidden
            if (document.visibilityState === 'hidden') return;

            // Ensure IDs are strings to match the map keys
            const safeIds = idsRef.current.map(String);

            getLocks(entityType, safeIds)
                .then((list) => {
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
                .catch((err) => console.error(`Error fetching ${entityType} locks:`, err));
        };

        // Initial fetch
        fetchLocks();

        // Start polling
        const intervalId = setInterval(fetchLocks, intervalMs);

        return () => clearInterval(intervalId);
    }, [entityType, getLocks, intervalMs]); // Only restart if type/api/interval changes

    /**
     * Helper to check if an item is locked by someone else.
     * @param {string|number} id - The entity ID.
     * @param {string} myUsername - The current user's username.
     * @returns {string|null} - Error message if locked, or null if free/mine.
     */
    const getLockError = (id, myUsername) => {
        const locker = locks[String(id)];
        if (locker && locker !== myUsername) {
            return `Cannot edit: locked by ${locker}`;
        }
        return null;
    };

    return { locks, getLockError };
}