package org.bihealth.mi.risk_assessment_api.dto.request.mitigation;

import lombok.Data;

@Data
public class MitigationActionDependencyRequestDTO {
    private String requiredActionCode;
    private String rationale;
    private String source;
}
