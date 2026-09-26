package org.bihealth.mi.risk_assessment_api.dto.response.mitigation;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;

@Data
public class MitigationActionConflictDTO {
    private Long id;
    private Long actionAId;
    private String actionACode;
    private Long actionBId;
    private String actionBCode;
    private Long conflictingActionId;
    private String conflictingActionCode;
    private String rationale;
    private String source;

    public MitigationActionConflictDTO(MitigationActionConflict conflict, MitigationAction perspective) {
        this.id = conflict.getId();
        this.actionAId = conflict.getActionA() == null ? null : conflict.getActionA().getId();
        this.actionACode = conflict.getActionA() == null ? null : conflict.getActionA().getCode();
        this.actionBId = conflict.getActionB() == null ? null : conflict.getActionB().getId();
        this.actionBCode = conflict.getActionB() == null ? null : conflict.getActionB().getCode();
        MitigationAction other = conflict.getActionA() == perspective ? conflict.getActionB() : conflict.getActionA();
        this.conflictingActionId = other == null ? null : other.getId();
        this.conflictingActionCode = other == null ? null : other.getCode();
        this.rationale = conflict.getRationale();
        this.source = conflict.getSource();
    }
}
