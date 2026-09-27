package org.bihealth.mi.risk_assessment_api.model.project;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(
        name = "project_template_requirements",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_project_template_requirement_key",
                        columnNames = {"section_id", "stable_key"}
                ),
                @UniqueConstraint(
                        name = "uk_project_template_requirement_order",
                        columnNames = {"section_id", "display_order"}
                )
        }
)
public class ProjectTemplateRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    @JsonBackReference
    private ProjectTemplateSection section;

    @Column(name = "stable_key", nullable = false)
    private String stableKey;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "help_text", length = 4000)
    private String helpText;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "value_type", nullable = false, length = 40)
    private ProjectTemplateRequirementValueType valueType;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    @Enumerated(EnumType.STRING)
    @Column(name = "constraint_type", nullable = false, length = 40)
    private ProjectTemplateRequirementConstraintType constraintType;

    @Column(name = "default_value", length = 4000)
    private String defaultValue;

    @Column(name = "fixed_value", length = 4000)
    private String fixedValue;

    @Column(name = "unit", length = 64)
    private String unit;

    @Column(name = "min_value", precision = 19, scale = 4)
    private BigDecimal minValue;

    @Column(name = "max_value", precision = 19, scale = 4)
    private BigDecimal maxValue;

    @ElementCollection
    @CollectionTable(
            name = "project_template_requirement_allowed_values",
            joinColumns = @JoinColumn(name = "requirement_id")
    )
    @OrderColumn(name = "display_order")
    @Column(name = "allowed_value")
    private List<String> allowedValues = new ArrayList<>();

    @Column(name = "evaluator_key")
    private String evaluatorKey;

    @Column(name = "source", length = 1000)
    private String source;

    @Column(name = "rationale", length = 4000)
    private String rationale;
}
