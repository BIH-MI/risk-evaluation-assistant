package org.bihealth.mi.risk_assessment_api.model.assessment.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;

import java.util.*;

/**
 * Represents a risk assessment performed on a single DatasetTable.
 * This serves as the "master" or "default" assessment for a table's columns.
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_assessments")
public class DatasetTableAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private DatasetTable table;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_assessment_id", nullable = false)
    @JsonBackReference
    private DatasetAssessment datasetAssessment;

    @OneToMany(mappedBy="assessment", cascade=CascadeType.ALL, orphanRemoval=true)
    private List<DatasetTableAssessmentAttribute> attributes = new ArrayList<>();
}