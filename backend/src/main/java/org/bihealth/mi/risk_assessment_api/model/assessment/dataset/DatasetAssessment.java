package org.bihealth.mi.risk_assessment_api.model.assessment.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a high-level risk assessment performed on an entire Dataset.
 * This entity links a Dataset to its questionnaire answers and its more granular
 * table-level assessments.
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_assessments")
public class DatasetAssessment extends BaseAssessment {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    @JsonBackReference
    private Dataset dataset;

    @OneToMany(
            mappedBy       = "datasetAssessment",
            cascade        = CascadeType.ALL,
            orphanRemoval  = true
    )
    @JsonManagedReference
    private List<DatasetTableAssessment> tableAssessments = new ArrayList<>();
}