package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;

import java.util.*;

/**
 * Represents a single table of data within a Dataset.
 * It extends AuditableEntity to track its own creation metadata.
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_tables")
public class DatasetTable extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    @JsonBackReference
    private Dataset dataset;

    @OneToMany(mappedBy = "table", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @JsonManagedReference
    private List<DatasetTableAttribute> attributes = new ArrayList<>();

    @OneToMany(
            mappedBy = "table",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<DatasetTableAssessment> assessments = new ArrayList<>();

    public DatasetTable(String name, Dataset dataset) {
        this.setName(name);
        this.dataset = dataset;
    }

    public DatasetTable() {}
}