package org.bihealth.mi.risk_assessment_api.model.project;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(
        name = "project_requirement_responses",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_project_requirement_response",
                        columnNames = {"project_id", "requirement_id"}
                )
        }
)
public class ProjectRequirementResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_version_id", nullable = false)
    private ProjectTemplateVersion templateVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id", nullable = false)
    private ProjectTemplateRequirement requirement;

    @Column(name = "requirement_key", nullable = false)
    private String requirementKey;

    @Column(name = "text_value", length = 4000)
    private String textValue;

    @Column(name = "integer_value")
    private Long integerValue;

    @Column(name = "decimal_value", precision = 19, scale = 4)
    private BigDecimal decimalValue;

    @Column(name = "date_value")
    private LocalDate dateValue;

    @Column(name = "boolean_value")
    private Boolean booleanValue;

    @ElementCollection
    @CollectionTable(
            name = "project_requirement_response_selected_values",
            joinColumns = @JoinColumn(name = "response_id")
    )
    @OrderColumn(name = "display_order")
    @Column(name = "selected_value")
    private List<String> selectedValues = new ArrayList<>();

    @Column(name = "unit", length = 64)
    private String unit;

    @Column(name = "provenance", length = 1000)
    private String provenance;
}
