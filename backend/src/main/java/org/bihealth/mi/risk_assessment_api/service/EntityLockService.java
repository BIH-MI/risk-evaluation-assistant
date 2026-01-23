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
 * This helps prevent concurrent modifications from different users in the UI.
 */
@Service
public class EntityLockService {

    @Autowired
    private EntityLockRepository repo;

    // Configurable timeout: 30 minutes of inactivity
    private static final long LOCK_TIMEOUT_MINUTES = 30;

    /**
     * Attempts to acquire a lock on a specific entity for a given user.
     * The lock is set to expire at a specific time (usually the user's token expiry).
     *
     * @param entityType The type of entity being locked (e.g., "dataset", "recipient").
     * @param entityId   The ID of the entity being locked.
     * @param username   The username of the user acquiring the lock.
     * @throws IllegalStateException if another user holds a valid, unexpired lock.
     */
    @Transactional
    public void acquireLock(String entityType, String entityId, String username) {        Instant now = Instant.now();
        Instant newExpiry = now.plus(LOCK_TIMEOUT_MINUTES, ChronoUnit.MINUTES);

        var optLock = repo.findByEntityTypeAndEntityId(entityType, entityId);

        if (optLock.isPresent()) {
            var existing = optLock.get();

            // SCENARIO 1: The SAME user is returning (refreshing the lock)
            // We allow this even if the lock technically "expired" in the DB but wasn't cleaned up yet,
            // or if the user closed the browser and came back.
            if (existing.getUsername().equals(username)) {
                existing.setExpiresAt(newExpiry);
                existing.setLockedAt(now); // Optional: update locked_at to show last activity
                repo.save(existing);
                return;
            }

            // SCENARIO 2: A DIFFERENT user wants the lock
            // We only block if the lock is still valid (time hasn't run out)
            if (existing.getExpiresAt() != null && existing.getExpiresAt().isAfter(now)) {
                throw new IllegalStateException(
                        String.format("%s[%s] is locked by %s", entityType, entityId, existing.getUsername())
                );
            }

            // If we get here, the lock exists but is expired (and owned by someone else).
            // We "steal" it by deleting the old one.
            repo.delete(existing);
        }

        // SCENARIO 3: No lock exists (or we just deleted the expired one)
        var lock = new EntityLock();
        lock.setEntityType(entityType);
        lock.setEntityId(entityId);
        lock.setUsername(username);
        lock.setLockedAt(now);
        lock.setExpiresAt(newExpiry);
        repo.save(lock);
    }

    /**
     * Releases a lock on an entity, but only if the requesting user is the one who holds it.
     *
     * @param entityType The type of the entity.
     * @param entityId   The ID of the entity.
     * @param username   The user attempting to release the lock.
     */
    @Transactional
    public void releaseLock(String entityType, String entityId, String username) {
        repo.findByEntityTypeAndEntityId(entityType, entityId)
                .filter(lock -> lock.getUsername().equals(username))
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
    @Scheduled(fixedRate = 60 * 1000) // Run every minute
    @Transactional
    public void cleanupExpiredLocks() {
        repo.deleteByExpiresAtBefore(Instant.now());
    }
}