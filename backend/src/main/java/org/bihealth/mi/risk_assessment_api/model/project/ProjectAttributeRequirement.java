package org.bihealth.mi.risk_assessment_api.model.project;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.DateResolution;
import org.bihealth.mi.risk_assessment_api.enums.ProjectAttributeRequirementType;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;

import java.math.BigDecimal;

/**
 * A project-level requirement targeting one concrete dataset attribute.
 *
 * <p>The target attribute relationship is authoritative. The dataset
 * relationship makes requirements unambiguous when a project contains multiple
 * datasets and is validated against the attribute's owning dataset.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "project_attribute_requirements",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_project_attribute_requirement_type",
                        columnNames = {"project_id", "dataset_table_attribute_id", "requirement_type"}
                )
        }
)
public class ProjectAttributeRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    private Dataset dataset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_table_attribute_id", nullable = false)
    private DatasetTableAttribute targetAttribute;

    @Enumerated(EnumType.STRING)
    @Column(name = "requirement_type", nullable = false)
    private ProjectAttributeRequirementType requirementType;

    @Enumerated(EnumType.STRING)
    @Column(name = "date_resolution")
    private DateResolution dateResolution;

    @Column(name = "numeric_bin_width", precision = 19, scale = 4)
    private BigDecimal numericBinWidth;

    @Column(name = "notes", length = 4000)
    private String notes;
}
