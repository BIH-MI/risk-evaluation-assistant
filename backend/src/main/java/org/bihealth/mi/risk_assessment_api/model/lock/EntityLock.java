package org.bihealth.mi.risk_assessment_api.model.lock;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Represents a temporary, optimistic lock on an entity to prevent concurrent edits.
 * A unique constraint ensures that any given entity (type + id) can only be locked once.
 */
@Getter
@Setter
@Entity
@Table(name = "entity_locks",
        uniqueConstraints=@UniqueConstraint(columnNames={"entity_type","entity_id"}))
public class EntityLock {
    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private String entityId;

    @Column(name = "locked_by", nullable = false)
    private String username;

    @Column(name = "locked_at", nullable = false)
    private Instant lockedAt;

    @Column(name = "expires_at", nullable = true)
    private Instant expiresAt;

    public EntityLock() {}

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public EntityLock(Instant lockedAt, String username, String entityId, String entityType) {
        this.lockedAt = lockedAt;
        this.username = username;
        this.entityId = entityId;
        this.entityType = entityType;
    }
}