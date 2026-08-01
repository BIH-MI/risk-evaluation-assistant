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
