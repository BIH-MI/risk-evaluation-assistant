package org.bihealth.mi.risk_assessment_api.model.recipient;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;

import java.util.*;

/**
 * Represents a data recipient, typically an organization or research group.
 * Extends AuditableEntity to track creation metadata.
 */
@Getter
@Setter
@Entity
@Table(name = "recipients")
public class Recipient extends AuditableEntity {

    /** Users this recipient record is shared with */
    @ElementCollection
    @CollectionTable(
            name = "recipient_shared_users",
            joinColumns = @JoinColumn(name = "recipient_id")
    )
    @Column(name = "username")
    private Set<String> sharedUsernames = new HashSet<>();

    /** Organization this recipient belongs to */
    @Column(name = "organization", nullable = false)
    @NotNull
    private String organization;

    @Column(name = "organization_link", length = 255)
    private String organizationLink;

    /** Linked assessments for this recipient */
    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<RecipientAssessment> assessments = new ArrayList<>();

}