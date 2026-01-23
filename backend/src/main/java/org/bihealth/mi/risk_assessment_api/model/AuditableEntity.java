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
@MappedSuperclass // This is the key annotation
public abstract class AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    @Column(name = "creator_username", nullable = false)
    @NotNull
    private String creatorUsername;

    @Column(name = "name")
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "creation_date", nullable = false, updatable = false)
    private LocalDateTime creationDate;

    @PrePersist
    protected void onCreate() {
        this.creationDate = LocalDateTime.now();
    }
}
