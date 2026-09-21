package org.bihealth.mi.risk_assessment_api.dto.request.mitigation;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;

@Data
public class MitigationAttributeMappingRequestDTO {
    private Long id;
    private MitigationAttributeRole attributeRole;
    private DataType dataType;
    private boolean requiresCandidateQid;
    private boolean requiresDirectIdentifier;
    private boolean requiresSensitiveAttribute;
    private String notes;
}
