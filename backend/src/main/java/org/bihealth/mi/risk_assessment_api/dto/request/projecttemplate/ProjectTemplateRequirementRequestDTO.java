package org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTemplateRequirementRequestDTO {
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
}
