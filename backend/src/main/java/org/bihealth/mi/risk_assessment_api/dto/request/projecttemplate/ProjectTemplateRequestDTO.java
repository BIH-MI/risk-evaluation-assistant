package org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTemplateRequestDTO {
    private String systemKey;
    private String name;
    private String description;
    private Boolean active;
    private Boolean defaultTemplate;
    private List<ProjectTemplateSectionRequestDTO> sections;
}
