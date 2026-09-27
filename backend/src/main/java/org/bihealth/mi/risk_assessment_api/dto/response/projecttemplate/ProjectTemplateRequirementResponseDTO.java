package org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTemplateRequirementResponseDTO {
    private Long id;
    private String stableKey;
    private String label;
    private String helpText;
    private Integer displayOrder;
    private String valueType;
    private Boolean required;
    private String constraintType;
    private String defaultValue;
    private String fixedValue;
    private String unit;
    private BigDecimal minValue;
    private BigDecimal maxValue;
    private List<String> allowedValues;
    private String evaluatorKey;
    private String source;
    private String rationale;

    public ProjectTemplateRequirementResponseDTO(ProjectTemplateRequirement requirement) {
        this.id = requirement.getId();
        this.stableKey = requirement.getStableKey();
        this.label = requirement.getLabel();
        this.helpText = requirement.getHelpText();
        this.displayOrder = requirement.getDisplayOrder();
        this.valueType = requirement.getValueType() == null ? null : requirement.getValueType().name();
        this.required = requirement.isRequired();
        this.constraintType = requirement.getConstraintType() == null ? null : requirement.getConstraintType().name();
        this.defaultValue = requirement.getDefaultValue();
        this.fixedValue = requirement.getFixedValue();
        this.unit = requirement.getUnit();
        this.minValue = requirement.getMinValue();
        this.maxValue = requirement.getMaxValue();
        this.allowedValues = requirement.getAllowedValues() == null
                ? List.of()
                : new ArrayList<>(requirement.getAllowedValues());
        this.evaluatorKey = requirement.getEvaluatorKey();
        this.source = requirement.getSource();
        this.rationale = requirement.getRationale();
    }
}
