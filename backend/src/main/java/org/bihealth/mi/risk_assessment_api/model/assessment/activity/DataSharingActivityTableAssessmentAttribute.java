package org.bihealth.mi.risk_assessment_api.model.assessment.activity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;

/**
 * Represents the specific, overridden risk scores for a single attribute
 * within the context of a DataSharingActivity.
 */
@Entity
@Table(name = "data_sharing_activity_table_assessment_attributes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DataSharingActivityTableAssessmentAttribute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    /** Back‐pointer to the parent table assessment */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_assessment_id", nullable = false)
    @JsonBackReference
    private DataSharingActivityTableAssessment tableAssessment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_assessment_attribute_id", nullable = false)
    @JsonBackReference
    private DatasetTableAssessmentAttribute tableAssessmentAttribute;

    @Column(name = "sensitivity", nullable = false)
    private Integer sensitivity;

    @Column(name = "replicability", nullable = false)
    private Integer replicability;

    @Column(name = "availability", nullable = false)
    private Integer availability;

    @Column(name = "distinguishability", nullable = false)
    private Integer distinguishability;

    @Column(name = "is_direct_identifier", nullable = false)
    private boolean isDirectIdentifier;
}