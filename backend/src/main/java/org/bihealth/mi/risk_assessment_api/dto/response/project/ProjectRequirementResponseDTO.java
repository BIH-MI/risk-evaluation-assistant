package org.bihealth.mi.risk_assessment_api.dto.response.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequirementResponseDTO {
    private Long id;
    private Long requirementId;
    private String requirementKey;
    private Long templateVersionId;
    private String textValue;
    private Long integerValue;
    private BigDecimal decimalValue;
    private LocalDate dateValue;
    private Boolean booleanValue;
    private List<String> selectedValues;
    private String unit;
    private String provenance;

    public ProjectRequirementResponseDTO(ProjectRequirementResponse response) {
        this.id = response.getId();
        this.requirementId = response.getRequirement() == null ? null : response.getRequirement().getId();
        this.requirementKey = response.getRequirementKey();
        this.templateVersionId = response.getTemplateVersion() == null ? null : response.getTemplateVersion().getId();
        this.textValue = response.getTextValue();
        this.integerValue = response.getIntegerValue();
        this.decimalValue = response.getDecimalValue();
        this.dateValue = response.getDateValue();
        this.booleanValue = response.getBooleanValue();
        this.selectedValues = response.getSelectedValues() == null
                ? List.of()
                : new ArrayList<>(response.getSelectedValues());
        this.unit = response.getUnit();
        this.provenance = response.getProvenance();
    }
}
