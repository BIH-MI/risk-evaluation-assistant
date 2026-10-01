package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.model.lock.EntityLock;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.locks.EntityLockRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.temporal.ChronoUnit;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Service for managing a simple optimistic locking mechanism for entities.
 *
 * This helps prevent concurrent modifications from different users in the UI.
 * Locks are generic: callers identify the protected record by entity type and
 * entity ID, and the service handles refresh, expiration, and admin override.
 *
 * <p>A lock protects editing, so acquiring one requires write permission to the
 * underlying entity and seeing a lock requires read permission. Both rules are
 * the owning services' own rules; this service defines no second policy.
 * Admins may take over a valid lock held by someone else (intentional override).</p>
 */
@Service
public class EntityLockService {

    /** Entity types that have an edit lock, as sent by the frontend. */
    public enum LockableEntityType {
        PROJECT,
        DATA_SHARING_ACTIVITY,
        DATASET,
        DATASET_ASSESSMENT,
        RECIPIENT,
        RECIPIENT_ASSESSMENT;

        /** Case-insensitive; unsupported types are a client error (400). */
        public static LockableEntityType parse(String value) {
            try {
                return valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException | NullPointerException ex) {
                throw new IllegalArgumentException("Unsupported lock entity type: " + value);
            }
        }
    }

    // Repository for the lock table, which has a unique key on entity type + ID.
    @Autowired
    private EntityLockRepository repo;

    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private ProjectService projectService;
    @Autowired
    private DataSharingActivityRepository activityRepository;
    @Autowired
    private DataSharingActivityService activityService;
    @Autowired
    private DatasetRepository datasetRepository;
    @Autowired
    private DatasetAssessmentRepository datasetAssessmentRepository;
    @Autowired
    private DatasetService datasetService;
    @Autowired
    private RecipientRepository recipientRepository;
    @Autowired
    private RecipientAssessmentRepository recipientAssessmentRepository;
    @Autowired
    private RecipientService recipientService;

    // Lock lease duration. Refreshing the same lock extends this window.
    private static final long LOCK_TIMEOUT_MINUTES = 30;

    /**
     * Attempts to acquire a lock on a specific entity for a given user.
     *
     * @param entityType The type of entity being locked (e.g., "DATASET", "PROJECT").
     * @param entityId   The ID of the entity being locked.
     * @param username   The username of the user acquiring the lock.
     * @param isAdmin    Whether the requesting user has admin privileges.
     * @throws IllegalArgumentException for an unsupported type or malformed ID (400).
     * @throws EntityNotFoundException  if the entity does not exist (404).
     * @throws SecurityException        if the user may not edit the entity (403).
     * @throws IllegalStateException    if another user holds a valid, unexpired lock (409).
     */
    @Transactional
    public void acquireLock(String entityType, String entityId, String username, boolean isAdmin) {
        LockableEntityType type = LockableEntityType.parse(entityType);
        long id = parseId(entityId);
        requireExists(type, id);
        if (!canAccess(type, id, username, isAdmin, true)) {
            throw new SecurityException("No permission to edit " + type + " " + id);
        }

        String storedType = type.name();
        String storedId = String.valueOf(id);
        Instant now = Instant.now();
        Instant newExpiry = now.plus(LOCK_TIMEOUT_MINUTES, ChronoUnit.MINUTES);

        var optLock = repo.findByEntityTypeAndEntityId(storedType, storedId);

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
            if (isActive(existing, now) && !isAdmin) {
                throw new IllegalStateException(
                        String.format("%s[%s] is locked by %s", storedType, storedId, existing.getUsername())
                );
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
        lock.setEntityType(storedType);
        lock.setEntityId(storedId);
        lock.setUsername(username);
        lock.setLockedAt(now);
        lock.setExpiresAt(newExpiry);
        try {
            // Flush now so a concurrent first acquisition hits the unique key here and is reported
            // as a lock conflict (409) instead of a raw database error at commit.
            repo.saveAndFlush(lock);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalStateException(String.format("%s[%s] is locked by another user", storedType, storedId));
        }
    }

    /**
     * Releases a lock on an entity. Admins can release any lock, regular users only their own;
     * current entity permission is not required, so an owner who lost access can still release.
     */
    @Transactional
    public void releaseLock(String entityType, String entityId, String username, boolean isAdmin) {
        LockableEntityType type = LockableEntityType.parse(entityType);
        repo.findByEntityTypeAndEntityId(type.name(), entityId.trim())
                // Regular users can release only their own locks; admins can release any lock.
                .filter(lock -> isAdmin || lock.getUsername().equals(username))
                .ifPresent(repo::delete);
    }

    /**
     * Returns the holder of a valid lock on an entity the caller may read.
     *
     * @throws IllegalArgumentException for an unsupported type or malformed ID (400).
     * @throws EntityNotFoundException  if the entity does not exist (404).
     * @throws SecurityException        if the user may not read the entity (403).
     */
    @Transactional(readOnly = true)
    public Optional<String> whoHasLock(String entityType, String entityId, String username, boolean isAdmin) {
        LockableEntityType type = LockableEntityType.parse(entityType);
        long id = parseId(entityId);
        requireExists(type, id);
        if (!canAccess(type, id, username, isAdmin, false)) {
            throw new SecurityException("No access to " + type + " " + id);
        }
        // Expired rows are ignored even if the scheduled cleanup has not removed them yet.
        Instant now = Instant.now();
        return repo.findByEntityTypeAndEntityId(type.name(), String.valueOf(id))
                .filter(lock -> isActive(lock, now))
                .map(EntityLock::getUsername);
    }

    /**
     * Valid locks for the requested entities of one type, restricted to entities the caller may
     * read. Missing, malformed or unreadable IDs are omitted so their existence is not revealed.
     */
    @Transactional(readOnly = true)
    public List<EntityLock> findReadableLocks(String entityType, Collection<String> entityIds, String username, boolean isAdmin) {
        LockableEntityType type = LockableEntityType.parse(entityType);
        List<String> readableIds = new ArrayList<>();
        for (String rawId : entityIds == null ? List.<String>of() : entityIds) {
            Long id = tryParseId(rawId);
            if (id != null && canAccess(type, id, username, isAdmin, false)) {
                readableIds.add(String.valueOf(id));
            }
        }
        if (readableIds.isEmpty()) {
            return List.of();
        }
        Instant now = Instant.now();
        return repo.findByEntityTypeAndEntityIdIn(type.name(), readableIds).stream()
                .filter(lock -> isActive(lock, now))
                .toList();
    }

    /**
     * Cleans up locks that have been abandoned for longer than the timeout.
     */
    @Scheduled(fixedRate = 60 * 1000)
    @Transactional
    public void cleanupExpiredLocks() {
        repo.deleteByExpiresAtBefore(Instant.now());
    }

    /**
     * Applies the owning service's rule without throwing, so the shared transaction is never
     * marked rollback-only by a denied check. A missing entity is reported as not accessible.
     */
    private boolean canAccess(LockableEntityType type, long id, String username, boolean isAdmin, boolean write) {
        return switch (type) {
            case PROJECT -> projectRepository.findById(id)
                    .map(project -> write
                            ? projectService.canWriteProject(project, username, isAdmin)
                            : projectService.canReadProject(project, username, isAdmin))
                    .orElse(false);
            case DATA_SHARING_ACTIVITY -> activityRepository.findById(id)
                    .map(activity -> write
                            ? activityService.canWriteActivity(activity, username, isAdmin)
                            : activityService.canReadActivity(activity, username, isAdmin))
                    .orElse(false);
            // Datasets and their assessments: shared users may read and edit (DatasetService /
            // DatasetAssessmentService use the same owner/shared/admin rule for both).
            case DATASET -> datasetRepository.findById(id)
                    .map(dataset -> datasetService.canEditDataset(dataset, username, isAdmin))
                    .orElse(false);
            case DATASET_ASSESSMENT -> datasetAssessmentRepository.findById(id)
                    .map(assessment -> datasetService.canEditDataset(assessment.getDataset(), username, isAdmin))
                    .orElse(false);
            // Recipients and their assessments: shared users may read and edit (RecipientService /
            // RecipientAssessmentService use the same owner/shared/admin rule for both).
            case RECIPIENT -> recipientRepository.findById(id)
                    .map(recipient -> recipientService.canAccessRecipient(recipient, username, isAdmin))
                    .orElse(false);
            case RECIPIENT_ASSESSMENT -> recipientAssessmentRepository.findById(id)
                    .map(assessment -> recipientService.canAccessRecipient(assessment.getRecipient(), username, isAdmin))
                    .orElse(false);
        };
    }

    /** Distinguishes "does not exist" (404) from "not permitted" (403) for single-entity calls. */
    private void requireExists(LockableEntityType type, long id) {
        boolean exists = switch (type) {
            case PROJECT -> projectRepository.existsById(id);
            case DATA_SHARING_ACTIVITY -> activityRepository.existsById(id);
            case DATASET -> datasetRepository.existsById(id);
            case DATASET_ASSESSMENT -> datasetAssessmentRepository.existsById(id);
            case RECIPIENT -> recipientRepository.existsById(id);
            case RECIPIENT_ASSESSMENT -> recipientAssessmentRepository.existsById(id);
        };
        if (!exists) {
            throw new EntityNotFoundException(type + " not found: " + id);
        }
    }

    private boolean isActive(EntityLock lock, Instant now) {
        return lock.getExpiresAt() != null && lock.getExpiresAt().isAfter(now);
    }

    private long parseId(String value) {
        Long id = tryParseId(value);
        if (id == null) {
            throw new IllegalArgumentException("Invalid entity ID: " + value);
        }
        return id;
    }

    private Long tryParseId(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
