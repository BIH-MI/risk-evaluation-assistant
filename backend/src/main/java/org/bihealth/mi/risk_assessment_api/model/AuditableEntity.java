package org.bihealth.mi.risk_assessment_api.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * An abstract base class for entities that require auditing information, such as
 * who created them and when. As a @MappedSuperclass, it is not an entity itself,
 * but its fields are persisted in the tables of its subclasses.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class AuditableEntity {

    // Database primary key inherited by all auditable entities.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    // Username of the user or seed process that created the record.
    @Column(name = "creator_username", nullable = false)
    @NotNull
    private String creatorUsername;

    // Common display name used by datasets, recipients, configurations, etc.
    @Column(name = "name")
    private String name;

    // Optional common description field for UI detail screens.
    @Column(name = "description")
    private String description;

    // Set once when the entity is first persisted.
    @Column(name = "creation_date", nullable = false, updatable = false)
    private LocalDateTime creationDate;

    // Updated whenever JPA flushes a modified entity.
    @Column(name = "last_modified_date")
    private LocalDateTime lastModifiedDate;

    /**
     * Initializes creation and modification timestamps before the first insert.
     */
    @PrePersist
    protected void onCreate() {
        this.creationDate = LocalDateTime.now();
        this.lastModifiedDate = LocalDateTime.now();
    }

    /**
     * Refreshes the modification timestamp before updates.
     */
    @PreUpdate
    protected void onUpdate() {
        this.lastModifiedDate = LocalDateTime.now();
    }
}
