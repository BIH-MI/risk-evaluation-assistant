package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.DataType;

/**
 * Represents a single attribute (column) within a DatasetTable.
 *
 * <p>Attributes describe the dataset schema. Attribute assessment entities hold
 * risk metadata such as sensitivity and direct-identifier status.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_attributes")
public class DatasetTableAttribute {
    // Database primary key for this column.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    // Parent table that owns this column.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    @JsonBackReference
    private DatasetTable table;

    // Column name.
    @Column(name = "name", nullable = false)
    @NotNull
    private String name;

    // Stored as an enum name so the schema remains explicit in the database.
    @Column(name = "data_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private DataType dataType;

    // Excluded columns remain visible in the schema but can be ignored by workflows.
    @Column(name = "is_excluded", nullable = false)
    private boolean excluded = false;

    // These fields contain descriptive statistics calculated
    // locally during dataset definition. They provide quantitative evidence for
    // later risk assessment but are not final QID classifications.
    @Column(name = "record_count")
    private Long recordCount;

    @Column(name = "analysed_record_count")
    private Long analysedRecordCount;

    @Column(name = "missing_count")
    private Long missingCount;

    @Column(name = "missing_fraction")
    private Double missingFraction;

    @Column(name = "distinct_value_count")
    private Long distinctValueCount;

    @Column(name = "distinct_value_ratio")
    private Double distinctValueRatio;

    @Column(name = "singleton_value_count")
    private Long singletonValueCount;

    @Column(name = "singleton_record_count")
    private Long singletonRecordCount;

    @Column(name = "singleton_fraction")
    private Double singletonFraction;

    @Column(name = "minimum_equivalence_class_size")
    private Long minimumEquivalenceClassSize;

    @Column(name = "median_equivalence_class_size")
    private Double medianEquivalenceClassSize;

    @Column(name = "maximum_equivalence_class_size")
    private Long maximumEquivalenceClassSize;

    @Column(name = "distinction")
    private Double distinction;

    @Column(name = "separation")
    private Double separation;

    // Empirical Replicability evidence from repeated-measurement analysis
    // during dataset creation. Null when no subject key was selected or the
    // attribute's datatype is not yet supported by the empirical method.
    @Column(name = "replicability_available")
    private Boolean replicabilityAvailable;

    @Column(name = "replicability_score")
    private Double replicabilityScore;

    @Column(name = "replicability_comparison_count")
    private Long replicabilityComparisonCount;

    @Column(name = "replicability_method")
    private String replicabilityMethod;

    @Column(name = "replicability_unavailable_reason")
    private String replicabilityUnavailableReason;

    /**
     * Required by JPA.
     */
    public DatasetTableAttribute() {}

    /**
     * Convenience constructor for building a column with its parent table.
     */
    public DatasetTableAttribute(DatasetTable table, String name, DataType dataType) {
        this.table = table;
        this.name = name;
        this.dataType = dataType;
    }
}
