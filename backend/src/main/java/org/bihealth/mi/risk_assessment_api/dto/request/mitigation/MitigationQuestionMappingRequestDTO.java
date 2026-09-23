package org.bihealth.mi.risk_assessment_api.dto.request.mitigation;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;

@Data
public class MitigationQuestionMappingRequestDTO {
    private Long id;
    private Long configurationId;
    private MitigationAssessmentScope assessmentScope;
    private String categoryCode;
    private String questionCode;
    private String triggerOptionCode;
    private String projectedOptionCode;
    private String notes;
}
