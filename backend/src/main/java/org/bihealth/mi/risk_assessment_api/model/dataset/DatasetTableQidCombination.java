package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Stores aggregate quantitative evidence for one evaluated QID candidate
 * combination within a dataset table.
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_qid_combinations")
public class DatasetTableQidCombination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    @JsonBackReference("dataset-table-qid-combinations")
    private DatasetTable table;

    @ManyToMany
    @JoinTable(
            name = "dataset_table_qid_combination_attributes",
            joinColumns = @JoinColumn(name = "qid_combination_id"),
            inverseJoinColumns = @JoinColumn(name = "attribute_id")
    )
    @OrderBy("id ASC")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<DatasetTableAttribute> attributes = new LinkedHashSet<>();

    @Column(name = "attribute_count", nullable = false)
    private Integer attributeCount;

    @Column(name = "distinction")
    private Double distinction;

    @Column(name = "separation")
    private Double separation;

    @Column(name = "equivalence_class_count")
    private Long equivalenceClassCount;

    @Column(name = "singleton_class_count")
    private Long singletonClassCount;

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

    @Column(name = "target_satisfied")
    private Boolean targetSatisfied;

    @Column(name = "minimal_qualifying")
    private Boolean minimalQualifying;
}
