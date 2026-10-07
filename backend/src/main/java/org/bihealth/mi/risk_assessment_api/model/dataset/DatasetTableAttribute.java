package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

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
    // later risk assessment but are not final qualitative classifications.
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

    @OneToMany(mappedBy = "attribute", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("subsetSize ASC")
    @JsonManagedReference("dataset-table-attribute-subset-evidence")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetTableAttributeSubsetEvidence> subsetEvidence = new ArrayList<>();

    @Column(name = "direct_identifier_evidence_source")
    private String directIdentifierEvidenceSource;

    @Column(name = "direct_identifier_concept")
    private String directIdentifierConcept;

    @Column(name = "direct_identifier_confidence")
    private String directIdentifierConfidence;

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

    /**
     * Replaces all per-subset-size evidence, linking each entry back to this
     * attribute.
     *
     * <p>Existing rows are updated by subset size instead of being blindly
     * cleared and reinserted. That keeps seeding idempotent under the
     * database-level uniqueness rule on {@code (attribute_id, subset_size)}.</p>
     */
    public void replaceSubsetEvidence(List<DatasetTableAttributeSubsetEvidence> evidence) {
        if (evidence == null) {
            subsetEvidence.clear();
            return;
        }

        Map<Integer, DatasetTableAttributeSubsetEvidence> requestedBySize = evidence.stream()
                .filter(Objects::nonNull)
                .filter(entry -> entry.getSubsetSize() != null)
                .collect(Collectors.toMap(
                        DatasetTableAttributeSubsetEvidence::getSubsetSize,
                        entry -> entry,
                        (first, second) -> second,
                        LinkedHashMap::new));
        Map<Integer, DatasetTableAttributeSubsetEvidence> existingBySize = subsetEvidence.stream()
                .filter(entry -> entry.getSubsetSize() != null)
                .collect(Collectors.toMap(
                        DatasetTableAttributeSubsetEvidence::getSubsetSize,
                        entry -> entry,
                        (first, second) -> first,
                        LinkedHashMap::new));

        subsetEvidence.removeIf(existing ->
                existing.getSubsetSize() == null || !requestedBySize.containsKey(existing.getSubsetSize()));

        requestedBySize.forEach((subsetSize, requested) -> {
            DatasetTableAttributeSubsetEvidence target = existingBySize.get(subsetSize);
            if (target == null) {
                target = new DatasetTableAttributeSubsetEvidence();
                target.setAttribute(this);
                subsetEvidence.add(target);
            }
            copySubsetEvidence(requested, target);
        });
    }

    private void copySubsetEvidence(
            DatasetTableAttributeSubsetEvidence source,
            DatasetTableAttributeSubsetEvidence target
    ) {
        target.setAttribute(this);
        target.setSubsetSize(source.getSubsetSize());
        target.setEvaluatedSubsetCount(source.getEvaluatedSubsetCount());
        target.setMeanDistinction(source.getMeanDistinction());
        target.setMeanSeparation(source.getMeanSeparation());
        target.setMeanSingletonFraction(source.getMeanSingletonFraction());
    }
}
