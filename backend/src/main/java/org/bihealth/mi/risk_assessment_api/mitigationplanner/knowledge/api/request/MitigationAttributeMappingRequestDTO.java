package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.request;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;

@Data
public class MitigationAttributeMappingRequestDTO {
    private Long id;
    private MitigationAttributeRole attributeRole;
    private DataType dataType;
    private String notes;
}
