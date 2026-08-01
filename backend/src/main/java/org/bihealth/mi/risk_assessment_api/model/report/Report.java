package org.bihealth.mi.risk_assessment_api.model.report;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Persisted risk report for a data-sharing activity.
 *
 * <p>The current risk endpoint can return stateless report DTOs, but this entity
 * represents the stored report shape when results are saved. The fields capture
 * the final formula inputs and selected framework category classifications.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "reports")
public class Report extends AuditableEntity {

    // Context risk, also interpreted as P_attack in the anonymization formula.
    @Column(name = "context_risk")
    private Double contextRisk;

    // Re-identification threshold T selected from the dataset impact classification.
    @Column(name = "risk_threshold")
    private Double riskThreshold;

    // Final maximum data/anonymization risk target produced by the calculation.
    @Column(name = "maximum_data_risk")
    private Double maximumDataRisk;

    // Motives and capacity category score and classification.
    @Column(name = "motives_capacity_normalized_score")
    private Double motivesCapacityNormalizedScore;

    @Column(name = "motives_capacity_classification")
    private String motivesCapacityClassification;


    // Mitigating controls category score and classification.
    @Column(name = "mitigating_controls_normalized_score")
    private Double mitigatingControlsNormalizedScore;

    @Column(name = "mitigating_controls_classification")
    private String mitigatingControlsClassification;

    // Invasion of privacy / impact category score and classification.
    @Column(name = "invasion_privacy_normalized_score")
    private Double invasionPrivacyNormalizedScore;

    @Column(name = "invasion_privacy_classification")
    private String invasionPrivacyClassification;

    // Activity this report evaluates. The activity links the dataset and recipient assessments.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_sharing_activity_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private DataSharingActivity dataSharingActivity;

    /**
     * Required by JPA.
     */
    public Report() {}
}
