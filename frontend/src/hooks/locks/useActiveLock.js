import { useState, useEffect, useRef } from "react";
import { useEntityLockApi } from "api/locks";

/**
 * Manages acquiring and releasing a lock for a specific entity.
 * NOW INCLUDES A HEARTBEAT to prevent locks from expiring while the user is active.
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
    setIsLocked(false);
    isLockedRef.current = false;

    if (!entityId) return;

    let active = true;
    let heartbeatInterval = null; // <-- Reference for the interval

    const acquire = async () => {
      try {
        // This will acquire the lock initially,
        // OR refresh the 30-minute timer if we already own it.
        await lockRef.current(entityType, entityId);

        if (active) {
          if (!isLockedRef.current) {
            setIsLocked(true);
            isLockedRef.current = true;
          }
        }
      } catch (err) {
        if (active) {
          setIsLocked(false);
          isLockedRef.current = false;
          if (onErrorRef.current) onErrorRef.current(err);
        }
      }
    };

    // 1. Acquire Lock ONCE immediately on mount
    acquire();

    // 2. Start the Heartbeat
    // Run every 5 minutes (300,000 milliseconds)
    const HEARTBEAT_MS = 5 * 60 * 1000;

    heartbeatInterval = setInterval(() => {
      if (isLockedRef.current) {
        acquire(); // Pings the backend to trigger SCENARIO 1
      }
    }, HEARTBEAT_MS);

    // 3. Cleanup: Release lock and stop heartbeat on unmount
    return () => {
      active = false;

      // Clear the interval so it stops pinging
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      if (isLockedRef.current) {
        unlockRef.current(entityType, entityId).catch(() => {});
        isLockedRef.current = false;
      }
    };
  }, [entityType, entityId]);

  return isLocked;
}
