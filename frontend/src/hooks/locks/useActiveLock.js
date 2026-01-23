import { useState, useEffect, useRef } from 'react';
import { useEntityLockApi } from 'api/locks'; // Adjust path as needed

/**
 * Manages acquiring and releasing a lock for a specific entity.
 * DOES NOT maintain a heartbeat (lock will expire based on server config).
 * @param {string} entityType - E.g., "DATASET"
 * @param {string} entityId - The ID of the entity
 * @param {Function} onError - Callback when lock cannot be acquired
 * @returns {boolean} isLocked - True if we currently hold the lock
 */
export function useActiveLock(entityType, entityId, onError) {

    const { lock, unlock } = useEntityLockApi();
    const [isLocked, setIsLocked] = useState(false);

    // Use Refs to keep functions stable across renders
    const lockRef = useRef(lock);
    const unlockRef = useRef(unlock);
    const onErrorRef = useRef(onError);

    // Track internal lock state to avoid state updates if already locked
    const isLockedRef = useRef(false);

    // Update refs if the API hook returns new instances
    useEffect(() => {
        lockRef.current = lock;
        unlockRef.current = unlock;
        onErrorRef.current = onError;
    }, [lock, unlock, onError]);

    useEffect(() => {
        if (!entityId) return;

        let active = true;

        const acquire = async () => {
            try {
                await lockRef.current(entityType, entityId);

                if (active) {
                    // Only update state if we weren't locked before
                    if (!isLockedRef.current) {
                        setIsLocked(true);
                        isLockedRef.current = true;
                    }
                }
            } catch (err) {
                if (active) {
                    console.error("[useActiveLock] Failed to acquire:", err);
                    if (onErrorRef.current) onErrorRef.current(err);
                }
            }
        };

        // 1. Acquire Lock ONCE on mount/id-change
        acquire();

        // 2. Cleanup: Release lock on unmount/id-change
        return () => {
            active = false;
            if (isLockedRef.current) {
                console.log("[useActiveLock] Releasing lock for:", entityId);
                unlockRef.current(entityType, entityId).catch(console.error);
                isLockedRef.current = false;
            }
        };
    }, [entityType, entityId]); // Only re-run if ID changes

    return isLocked;
}