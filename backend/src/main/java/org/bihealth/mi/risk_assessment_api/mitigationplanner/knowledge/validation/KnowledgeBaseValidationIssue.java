package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseValidationIssue {

    public enum Severity {
        ERROR,
        WARNING
    }

    private Severity severity;
    private String code;
    private String message;
    private String entityType;
    private Long entityId;
}
