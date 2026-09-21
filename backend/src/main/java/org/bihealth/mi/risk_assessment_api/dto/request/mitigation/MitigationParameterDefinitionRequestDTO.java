package org.bihealth.mi.risk_assessment_api.dto.request.mitigation;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;

import java.util.List;

@Data
public class MitigationParameterDefinitionRequestDTO {
    private Long id;
    private MitigationParameterCode parameterCode;
    private String description;
    private List<String> allowedValues;
}
