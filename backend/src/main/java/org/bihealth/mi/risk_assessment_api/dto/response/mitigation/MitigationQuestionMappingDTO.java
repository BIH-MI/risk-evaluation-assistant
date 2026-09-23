package org.bihealth.mi.risk_assessment_api.dto.response.mitigation;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationQuestionMapping;

@Data
@NoArgsConstructor
public class MitigationQuestionMappingDTO {
    private Long id;
    private Long configurationId;
    private String configurationName;
    private MitigationAssessmentScope assessmentScope;
    private String categoryCode;
    private String questionCode;
    private String triggerOptionCode;
    private String projectedOptionCode;
    private String notes;

    public MitigationQuestionMappingDTO(MitigationQuestionMapping mapping) {
        this.id = mapping.getId();
        Configuration configuration = mapping.getConfiguration();
        if (configuration != null) {
            this.configurationId = configuration.getId();
            this.configurationName = configuration.getName();
        }
        this.assessmentScope = mapping.getAssessmentScope();
        this.categoryCode = mapping.getCategoryCode();
        this.questionCode = mapping.getQuestionCode();
        this.triggerOptionCode = mapping.getTriggerOptionCode();
        this.projectedOptionCode = mapping.getProjectedOptionCode();
        this.notes = mapping.getNotes();
    }
}
