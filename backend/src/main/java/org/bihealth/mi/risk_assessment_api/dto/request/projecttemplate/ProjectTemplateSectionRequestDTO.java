package org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTemplateSectionRequestDTO {
    private Long id;
    private String title;
    private String helpText;
    private Integer displayOrder;
    private String dependsOnRequirementKey;
    private List<String> visibleWhenValues;
    private List<ProjectTemplateRequirementRequestDTO> requirements;
}
