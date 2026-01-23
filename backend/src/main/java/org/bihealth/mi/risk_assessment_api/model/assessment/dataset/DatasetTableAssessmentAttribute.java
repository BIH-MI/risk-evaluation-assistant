package org.bihealth.mi.risk_assessment_api.model.assessment.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Represents the assessed risk scores for a single attribute (column) within a DatasetTableAssessment.
 * This stores the "default" risk profile for a column.
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_assessment_attributes")
public class DatasetTableAssessmentAttribute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonBackReference
    private DatasetTableAssessment assessment;

     @ManyToOne(fetch = FetchType.LAZY)
     @JoinColumn(name = "dataset_table_attribute_id", nullable = false)
     @JsonBackReference
     private DatasetTableAttribute attribute;

    @Column(name = "is_direct_identifier", nullable = false)
    private boolean isDirectIdentifier;

    @Column(name = "sensitivity", nullable = true)
    @Min(1) @Max(3)
    private Integer sensitivity;

    @Column(name = "replicability", nullable = true)
    @Min(1) @Max(3)
    private Integer replicability;

    @Column(name = "availability", nullable = true)
    @Min(1) @Max(3)
    private Integer availability;

    @Column(name = "distinguishability", nullable = true)
    @Min(1) @Max(3)
    private Integer distinguishability;

    public DatasetTableAssessmentAttribute() {}
}