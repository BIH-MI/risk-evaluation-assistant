package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.DataType;

/**
 * Represents a single attribute (column) within a DatasetTable.
 */
@Getter
@Setter
@Entity
@Table(name = "dataset_table_attributes")
public class DatasetTableAttribute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    @JsonBackReference
    private DatasetTable table;

    @Column(name = "name", nullable = false)
    @NotNull
    private String name;

    @Column(name = "data_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private DataType dataType;

    @Column(name = "is_excluded", nullable = false)
    private boolean excluded = false;

    public DatasetTableAttribute() {}

    public DatasetTableAttribute(DatasetTable table, String name, DataType dataType) {
        this.table = table;
        this.name = name;
        this.dataType = dataType;
    }
}
