package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.model.lock.EntityLock;
import org.bihealth.mi.risk_assessment_api.repository.locks.EntityLockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.temporal.ChronoUnit;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing a simple optimistic locking mechanism for entities.
 *
 * This helps prevent concurrent modifications from different users in the UI.
 * Locks are intentionally generic: callers identify the protected record by
 * entity type and entity ID, and the service handles refresh, expiration, and
 * admin override behavior.
 */
@Service
public class EntityLockService {

    // Repository for the lock table, which has a unique key on entity type + ID.
    @Autowired
    private EntityLockRepository repo;

    // Lock lease duration. Refreshing the same lock extends this window.
    private static final long LOCK_TIMEOUT_MINUTES = 30;

    /**
     * Attempts to acquire a lock on a specific entity for a given user.
     * The lock is set to expire at a specific time (usually the user's token expiry).
     *
     * @param entityType The type of entity being locked (e.g., "dataset", "recipient").
     * @param entityId   The ID of the entity being locked.
     * @param username   The username of the user acquiring the lock.
     * @param isAdmin    Whether the requesting user has admin privileges.
     * @throws IllegalStateException if another user holds a valid, unexpired lock.
     */
    @Transactional
    public void acquireLock(String entityType, String entityId, String username, boolean isAdmin) {
        Instant now = Instant.now();
        Instant newExpiry = now.plus(LOCK_TIMEOUT_MINUTES, ChronoUnit.MINUTES);

        var optLock = repo.findByEntityTypeAndEntityId(entityType, entityId);

        if (optLock.isPresent()) {
            var existing = optLock.get();

            // Same user: refresh the lock lease and keep ownership unchanged.
            if (existing.getUsername().equals(username)) {
                existing.setExpiresAt(newExpiry);
                existing.setLockedAt(now);
                repo.save(existing);
                return;
            }

            // Different user with a still-valid lock: block regular users, but
            // allow admins to take ownership.
            if (existing.getExpiresAt() != null && existing.getExpiresAt().isAfter(now)) {
                if (!isAdmin) {
                    throw new IllegalStateException(
                            String.format("%s[%s] is locked by %s", entityType, entityId, existing.getUsername())
                    );
                }
            }

            // Admin override or expired lock: update the existing row in place
            // rather than delete/reinsert, avoiding unique-constraint races.
            existing.setUsername(username);
            existing.setLockedAt(now);
            existing.setExpiresAt(newExpiry);
            repo.save(existing);
            return;
        }

        // No lock exists yet for this entity.
        var lock = new EntityLock();
        lock.setEntityType(entityType);
        lock.setEntityId(entityId);
        lock.setUsername(username);
        lock.setLockedAt(now);
        lock.setExpiresAt(newExpiry);
        repo.save(lock);
    }

    /**
     * Releases a lock on an entity. Admins can release any lock, regular users can only release their own.
     *
     * @param entityType The type of the entity.
     * @param entityId   The ID of the entity.
     * @param username   The user attempting to release the lock.
     * @param isAdmin    Whether the requesting user has admin privileges.
     */
    @Transactional
    public void releaseLock(String entityType, String entityId, String username, boolean isAdmin) {
        repo.findByEntityTypeAndEntityId(entityType, entityId)
                // Regular users can release only their own locks; admins can release any lock.
                .filter(lock -> isAdmin || lock.getUsername().equals(username))
                .ifPresent(repo::delete);
    }

    /**
     * Checks who, if anyone, currently holds a valid lock on an entity.
     *
     * @param entityType The type of the entity.
     * @param entityId   The ID of the entity.
     * @return An Optional containing the username of the lock holder, or empty if not locked.
     */
    @Transactional(readOnly = true)
    public Optional<String> whoHasLock(String entityType, String entityId) {
        // This reports the current row as-is. Expired rows are removed by the
        // scheduled cleanup job.
        return repo.findByEntityTypeAndEntityId(entityType, entityId)
                .map(lock -> lock.getUsername());
    }

    /**
     * Retrieves all locks currently in the database. Intended for admin or debugging purposes.
     *
     * @return A list of all EntityLock objects.
     */
    public List<EntityLock> findAllLocks() {
        return repo.findAll();
    }

    /**
     * Cleans up locks that have been abandoned for longer than the timeout.
     */
    @Scheduled(fixedRate = 60 * 1000)
    @Transactional
    public void cleanupExpiredLocks() {
        repo.deleteByExpiresAtBefore(Instant.now());
    }
}
