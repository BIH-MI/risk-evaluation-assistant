package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.request;

import lombok.Data;

@Data
public class MitigationActionConflictRequestDTO {
    private String conflictingActionCode;
    private String rationale;
    private String source;
}
