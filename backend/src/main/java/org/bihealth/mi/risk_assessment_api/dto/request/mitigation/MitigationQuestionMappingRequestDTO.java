package org.bihealth.mi.risk_assessment_api.dto.request.mitigation;

import lombok.Data;

@Data
public class MitigationQuestionMappingRequestDTO {
    private Long id;
    private Long configurationId;
    private String questionCode;
    private String triggerOptionCode;
    private String projectedOptionCode;
    private String notes;
}
