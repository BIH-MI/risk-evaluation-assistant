package org.bihealth.mi.risk_assessment_api.dto.request.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequirementResponseRequestDTO {
    private Long id;
    private Long requirementId;
    private String requirementKey;
    private String textValue;
    private Long integerValue;
    private BigDecimal decimalValue;
    private LocalDate dateValue;
    private Boolean booleanValue;
    private List<String> selectedValues;
    private String unit;
    private String provenance;
}
