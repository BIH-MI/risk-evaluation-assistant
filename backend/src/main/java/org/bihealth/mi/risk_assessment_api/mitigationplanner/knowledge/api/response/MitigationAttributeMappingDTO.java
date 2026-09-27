package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.response;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAttributeMapping;

@Data
@NoArgsConstructor
public class MitigationAttributeMappingDTO {
    private Long id;
    private MitigationAttributeRole attributeRole;
    private DataType dataType;
    private String notes;

    public MitigationAttributeMappingDTO(MitigationAttributeMapping mapping) {
        this.id = mapping.getId();
        this.attributeRole = mapping.getAttributeRole();
        this.dataType = mapping.getDataType();
        this.notes = mapping.getNotes();
    }
}
