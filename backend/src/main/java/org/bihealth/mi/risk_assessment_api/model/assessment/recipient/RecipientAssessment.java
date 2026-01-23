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
 */
@Getter
@Setter
@Entity
@Table(name = "recipient_assessments")
public class RecipientAssessment extends BaseAssessment {
    @Column(name = "contact_name")
    private String contactName; // 'name' field from Person/Contact

    @Column(name = "email")
    private String email;

    @Column(name = "telephone")
    private String telephone;

    @Column(name = "department")
    private String department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    @JsonBackReference
    private Recipient recipient;
}
