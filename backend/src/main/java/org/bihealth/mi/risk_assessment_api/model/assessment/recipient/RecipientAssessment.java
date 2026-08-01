package org.bihealth.mi.risk_assessment_api.model.assessment.recipient;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;

/**
 * Represents a risk assessment performed on a Recipient.
 * This entity links a Recipient to its questionnaire answers and stores
 * contact information relevant to the assessment.
 *
 * <p>Recipient assessments provide the context-side inputs for the risk engine,
 * such as controls, safeguards, motives, and likelihood factors.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "recipient_assessments")
public class RecipientAssessment extends BaseAssessment {
    // Contact person for the assessed sharing relationship.
    @Column(name = "contact_name")
    private String contactName;

    // Contact email for the recipient assessment.
    @Column(name = "email")
    private String email;

    // Contact telephone number.
    @Column(name = "telephone")
    private String telephone;

    // Department or unit within the recipient organization.
    @Column(name = "department")
    private String department;

    // Recipient being assessed.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    @JsonBackReference
    private Recipient recipient;
}
