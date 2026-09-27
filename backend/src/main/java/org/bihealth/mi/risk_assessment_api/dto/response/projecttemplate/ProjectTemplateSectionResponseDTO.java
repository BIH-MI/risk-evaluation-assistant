package org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTemplateSectionResponseDTO {
    private Long id;
    private String title;
    private String helpText;
    private Integer displayOrder;
    private String dependsOnRequirementKey;
    private List<String> visibleWhenValues;
    private List<ProjectTemplateRequirementResponseDTO> requirements;

    public ProjectTemplateSectionResponseDTO(ProjectTemplateSection section) {
        this.id = section.getId();
        this.title = section.getTitle();
        this.helpText = section.getHelpText();
        this.displayOrder = section.getDisplayOrder();
        this.dependsOnRequirementKey = section.getDependsOnRequirementKey();
        this.visibleWhenValues = section.getVisibleWhenValues() == null
                ? List.of()
                : new ArrayList<>(section.getVisibleWhenValues());
        this.requirements = section.getRequirements() == null
                ? List.of()
                : section.getRequirements().stream()
                .sorted(Comparator
                        .comparing(ProjectTemplateSectionResponseDTO::requirementOrder)
                        .thenComparing(ProjectTemplateSectionResponseDTO::requirementId))
                .map(ProjectTemplateRequirementResponseDTO::new)
                .collect(Collectors.toList());
    }

    private static Integer requirementOrder(org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement requirement) {
        return requirement.getDisplayOrder() == null ? Integer.MAX_VALUE : requirement.getDisplayOrder();
    }

    private static Long requirementId(org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement requirement) {
        return requirement.getId() == null ? Long.MAX_VALUE : requirement.getId();
    }
}
