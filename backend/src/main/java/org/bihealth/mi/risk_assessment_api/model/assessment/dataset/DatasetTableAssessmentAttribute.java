package org.bihealth.mi.risk_assessment_api.model.assessment.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import static org.bihealth.mi.risk_assessment_api.utils.AttributeScale.MAX_VALUE;
import static org.bihealth.mi.risk_assessment_api.utils.AttributeScale.MIN_VALUE;

/**
 * Represents the assessed risk scores for a single attribute (column) within a DatasetTableAssessment.
 * This stores the "default" risk profile for a column.
 *
 * <p>The four metric fields use the common S/R/A/D scale: sensitivity,
 * replicability, availability, and distinguishability. Direct identifiers are
 * handled separately because they do not need all metric values.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_assessment_attributes")
public class DatasetTableAssessmentAttribute {
    // Database primary key for this attribute assessment.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    // Parent table assessment.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    @JsonBackReference
    private DatasetTableAssessment assessment;

    // Dataset column being assessed.
     @ManyToOne(fetch = FetchType.LAZY)
     @JoinColumn(name = "dataset_table_attribute_id", nullable = false)
     @JsonBackReference
     private DatasetTableAttribute attribute;

    // True when the column directly identifies a person.
    @Column(name = "is_direct_identifier", nullable = false)
    private boolean isDirectIdentifier;

    // Metric values are nullable for direct identifiers where S/R/A/D scoring is not applicable.
    @Column(name = "sensitivity", nullable = true)
    @Min(MIN_VALUE) @Max(MAX_VALUE)
    private Integer sensitivity;

    @Column(name = "replicability", nullable = true)
    @Min(MIN_VALUE) @Max(MAX_VALUE)
    private Integer replicability;

    @Column(name = "availability", nullable = true)
    @Min(MIN_VALUE) @Max(MAX_VALUE)
    private Integer availability;

    @Column(name = "distinguishability", nullable = true)
    @Min(MIN_VALUE) @Max(MAX_VALUE)
    private Integer distinguishability;

    /**
     * Required by JPA.
     */
    public DatasetTableAssessmentAttribute() {}
}
