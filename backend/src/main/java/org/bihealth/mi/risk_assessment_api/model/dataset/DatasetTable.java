package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.*;

/**
 * Represents a single table of data within a Dataset.
 * It extends AuditableEntity to track its own creation metadata.
 *
 * <p>The table owns its column definitions and may be referenced by
 * table-level assessments for different dataset assessments.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_tables")
public class DatasetTable extends AuditableEntity {

    // Parent dataset that owns this table.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    @JsonBackReference
    private Dataset dataset;

    // Column definitions in stable ID order for predictable UI rendering.
    @OneToMany(mappedBy = "table", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetTableAttribute> attributes = new ArrayList<>();

    // Table-level assessment records that evaluate this table under dataset assessments.
    @OneToMany(
            mappedBy = "table",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetTableAssessment> assessments = new ArrayList<>();

    /**
     * Convenience constructor used by seed/test code when creating a table with
     * an already-known parent dataset.
     */
    public DatasetTable(String name, Dataset dataset) {
        this.setName(name);
        this.dataset = dataset;
    }

    /**
     * Required by JPA.
     */
    public DatasetTable() {}
}
