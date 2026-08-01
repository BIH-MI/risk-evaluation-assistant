package org.bihealth.mi.risk_assessment_api.model.recipient;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.*;

/**
 * Represents a data recipient, typically an organization or research group.
 * Extends AuditableEntity to track creation metadata.
 *
 * <p>A recipient is the context-side aggregate root. It can have multiple
 * framework-specific recipient assessments that describe legal, contractual,
 * organizational, or attack-likelihood factors.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "recipients")
public class Recipient extends AuditableEntity {

    // Usernames with explicit access to this recipient in addition to the creator.
    @ElementCollection
    @CollectionTable(
            name = "recipient_shared_users",
            joinColumns = @JoinColumn(name = "recipient_id")
    )
    @Column(name = "username")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<String> sharedUsernames = new HashSet<>();

    // Organization or group that will receive the data.
    @Column(name = "organization", nullable = false)
    @NotNull
    private String organization;

    // Optional URL for the recipient organization.
    @Column(name = "organization_link", length = 255)
    private String organizationLink;

    // Assessments of this recipient under one or more risk configurations.
    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<RecipientAssessment> assessments = new ArrayList<>();

}
