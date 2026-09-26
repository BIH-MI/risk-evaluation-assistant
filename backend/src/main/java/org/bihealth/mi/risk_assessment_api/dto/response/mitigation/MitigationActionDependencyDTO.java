package org.bihealth.mi.risk_assessment_api.dto.response.mitigation;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;

@Data
public class MitigationActionDependencyDTO {
    private Long id;
    private Long actionId;
    private String actionCode;
    private Long requiredActionId;
    private String requiredActionCode;
    private String rationale;
    private String source;

    public MitigationActionDependencyDTO(MitigationActionDependency dependency) {
        this.id = dependency.getId();
        this.actionId = dependency.getAction() == null ? null : dependency.getAction().getId();
        this.actionCode = dependency.getAction() == null ? null : dependency.getAction().getCode();
        this.requiredActionId = dependency.getRequiredAction() == null ? null : dependency.getRequiredAction().getId();
        this.requiredActionCode = dependency.getRequiredAction() == null ? null : dependency.getRequiredAction().getCode();
        this.rationale = dependency.getRationale();
        this.source = dependency.getSource();
    }
}
