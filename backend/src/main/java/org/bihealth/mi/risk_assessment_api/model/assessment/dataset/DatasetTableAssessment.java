package org.bihealth.mi.risk_assessment_api.model.assessment.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.*;

/**
 * Represents a risk assessment performed on a single DatasetTable.
 * This serves as the "master" or "default" assessment for a table's columns.
 *
 * <p>Data-sharing activities can reference this default assessment and optionally
 * override specific attribute scores for a concrete sharing context.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_assessments")
public class DatasetTableAssessment {

    // Database primary key for this table assessment.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    // Dataset table being assessed.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private DatasetTable table;

    // Parent dataset-level assessment.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_assessment_id", nullable = false)
    @JsonBackReference
    private DatasetAssessment datasetAssessment;

    // Attribute-level default risk metadata for this table.
    @OneToMany(mappedBy="assessment", cascade=CascadeType.ALL, orphanRemoval=true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetTableAssessmentAttribute> attributes = new ArrayList<>();
}
