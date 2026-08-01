package org.bihealth.mi.risk_assessment_api.model.lock;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Represents a temporary, optimistic lock on an entity to prevent concurrent edits.
 * A unique constraint ensures that any given entity (type + id) can only be locked once.
 *
 * <p>The UI uses these locks to show when another user is editing a dataset,
 * recipient, configuration, or activity. Expired locks can be ignored or cleaned
 * up by the lock service.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "entity_locks",
        uniqueConstraints=@UniqueConstraint(columnNames={"entity_type","entity_id"}))
public class EntityLock {
    // Database primary key for the lock row.
    @Id
    @GeneratedValue
    private Long id;

    // Logical entity type, e.g. DATASET or RECIPIENT.
    @Column(name = "entity_type", nullable = false)
    private String entityType;

    // ID of the locked entity stored as a string for type-agnostic locking.
    @Column(name = "entity_id", nullable = false)
    private String entityId;

    // Username of the lock holder.
    @Column(name = "locked_by", nullable = false)
    private String username;

    // Time the lock was acquired.
    @Column(name = "locked_at", nullable = false)
    private Instant lockedAt;

    // Optional expiration time, usually aligned with authentication/session lifetime.
    @Column(name = "expires_at", nullable = true)
    private Instant expiresAt;

    /**
     * Required by JPA.
     */
    public EntityLock() {}

    /**
     * Explicit getter kept for compatibility with existing service/controller code.
     */
    public Instant getExpiresAt() {
        return expiresAt;
    }

    /**
     * Explicit setter kept for compatibility with existing service/controller code.
     */
    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    /**
     * Convenience constructor for creating a lock in service code.
     */
    public EntityLock(Instant lockedAt, String username, String entityId, String entityType) {
        this.lockedAt = lockedAt;
        this.username = username;
        this.entityId = entityId;
        this.entityType = entityType;
    }
}
