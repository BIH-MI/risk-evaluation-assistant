package org.bihealth.mi.risk_assessment_api.dto.response.mitigation;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationParameterDefinition;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class MitigationParameterDefinitionDTO {
    private Long id;
    private MitigationParameterCode parameterCode;
    private String description;
    private List<String> allowedValues;

    public MitigationParameterDefinitionDTO(MitigationParameterDefinition parameterDefinition) {
        this.id = parameterDefinition.getId();
        this.parameterCode = parameterDefinition.getParameterCode();
        this.description = parameterDefinition.getDescription();
        this.allowedValues = parameterDefinition.getAllowedValues() == null
                ? List.of()
                : new ArrayList<>(parameterDefinition.getAllowedValues());
    }
}
