package org.bihealth.mi.risk_assessment_api.model.report;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@Entity
@Table(name = "reports")
public class Report extends AuditableEntity {

    // Context Risk (Probability of Attack)
    @Column(name = "context_risk")
    private Double contextRisk;

    // IP Threshold
    @Column(name = "risk_threshold")
    private Double riskThreshold;

    // Max Data Risk Target
    @Column(name = "maximum_data_risk")
    private Double maximumDataRisk;

    // ——— Motives & Capacity (MOTC) ———
    @Column(name = "motives_capacity_normalized_score")
    private Double motivesCapacityNormalizedScore;

    @Column(name = "motives_capacity_classification")
    private String motivesCapacityClassification;


    // ——— Mitigating Controls (MITC) ———
    @Column(name = "mitigating_controls_normalized_score")
    private Double mitigatingControlsNormalizedScore;

    @Column(name = "mitigating_controls_classification")
    private String mitigatingControlsClassification;

    // ——— Invasion of Privacy (IP) ———
    @Column(name = "invasion_privacy_normalized_score")
    private Double invasionPrivacyNormalizedScore;

    @Column(name = "invasion_privacy_classification")
    private String invasionPrivacyClassification;

    // Relationship
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_sharing_activity_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private DataSharingActivity dataSharingActivity;

    public Report() {}
}