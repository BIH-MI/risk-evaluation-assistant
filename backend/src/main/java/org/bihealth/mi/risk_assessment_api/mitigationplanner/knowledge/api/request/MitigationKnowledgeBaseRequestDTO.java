package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.request;

import lombok.Data;

@Data
public class MitigationKnowledgeBaseRequestDTO {
    private String name;
    private String description;
    private Boolean active;
    private Boolean defaultKnowledgeBase;
}
