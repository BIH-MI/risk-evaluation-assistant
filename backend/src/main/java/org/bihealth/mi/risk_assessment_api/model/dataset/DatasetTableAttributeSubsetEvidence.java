package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Aggregated contextual Distinguishability evidence for one attribute at one
 * evaluated subset size. No subset member identities, raw values, partitions,
 * or row-level information are persisted.
 */
@Getter
@Setter
@Entity
@Table(
        name = "dataset_table_attribute_subset_evidence",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_attribute_subset_evidence_size",
                        columnNames = {"attribute_id", "subset_size"}
                )
        }
)
public class DatasetTableAttributeSubsetEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attribute_id", nullable = false)
    @JsonBackReference("dataset-table-attribute-subset-evidence")
    private DatasetTableAttribute attribute;

    @Column(name = "subset_size", nullable = false)
    private Integer subsetSize;

    @Column(name = "evaluated_subset_count")
    private Long evaluatedSubsetCount;

    @Column(name = "mean_distinction")
    private Double meanDistinction;

    @Column(name = "mean_separation")
    private Double meanSeparation;

    @Column(name = "mean_singleton_fraction")
    private Double meanSingletonFraction;
}
