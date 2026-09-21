package org.bihealth.mi.risk_assessment_api.dto.response.mitigation;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAttributeMapping;

@Data
@NoArgsConstructor
public class MitigationAttributeMappingDTO {
    private Long id;
    private MitigationAttributeRole attributeRole;
    private DataType dataType;
    private boolean requiresCandidateQid;
    private boolean requiresDirectIdentifier;
    private boolean requiresSensitiveAttribute;
    private String notes;

    public MitigationAttributeMappingDTO(MitigationAttributeMapping mapping) {
        this.id = mapping.getId();
        this.attributeRole = mapping.getAttributeRole();
        this.dataType = mapping.getDataType();
        this.requiresCandidateQid = mapping.getAttributeRole() == MitigationAttributeRole.CANDIDATE_QID;
        this.requiresDirectIdentifier = mapping.getAttributeRole() == MitigationAttributeRole.DIRECT_IDENTIFIER;
        this.requiresSensitiveAttribute = mapping.getAttributeRole() == MitigationAttributeRole.SENSITIVE_ATTRIBUTE;
        this.notes = mapping.getNotes();
    }
}
