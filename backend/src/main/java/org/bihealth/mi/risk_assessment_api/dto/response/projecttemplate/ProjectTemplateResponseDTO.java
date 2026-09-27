package org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplate;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectTemplateResponseDTO {
    private Long id;
    private String creatorUsername;
    private String systemKey;
    private String name;
    private String description;
    private Boolean active;
    private Boolean defaultTemplate;
    private Integer currentVersion;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;
    private Long versionId;
    private Integer versionNumber;
    private String versionCreatedBy;
    private LocalDateTime versionCreationDate;
    private Long projectCount;
    private List<ProjectTemplateSectionResponseDTO> sections;

    public ProjectTemplateResponseDTO(ProjectTemplate template, ProjectTemplateVersion version, long projectCount) {
        this.id = template.getId();
        this.creatorUsername = template.getCreatorUsername();
        this.systemKey = template.getSystemKey();
        this.name = template.getName();
        this.description = template.getDescription();
        this.active = template.isActive();
        this.defaultTemplate = template.isDefaultTemplate();
        this.currentVersion = template.getCurrentVersion();
        this.creationDate = template.getCreationDate();
        this.lastModifiedDate = template.getLastModifiedDate();
        this.projectCount = projectCount;

        if (version != null) {
            this.versionId = version.getId();
            this.versionNumber = version.getVersionNumber();
            this.versionCreatedBy = version.getCreatorUsername();
            this.versionCreationDate = version.getCreationDate();
            this.name = version.getName();
            this.description = version.getDescription();
            this.sections = version.getSections() == null
                    ? List.of()
                    : version.getSections().stream()
                    .sorted(Comparator
                            .comparing(ProjectTemplateResponseDTO::sectionOrder)
                            .thenComparing(ProjectTemplateResponseDTO::sectionId))
                    .map(ProjectTemplateSectionResponseDTO::new)
                    .collect(Collectors.toList());
        } else {
            this.sections = List.of();
        }
    }

    public ProjectTemplateResponseDTO(ProjectTemplateVersion version) {
        this(version.getTemplate(), version, 0);
    }

    private static Integer sectionOrder(ProjectTemplateSection section) {
        return section.getDisplayOrder() == null ? Integer.MAX_VALUE : section.getDisplayOrder();
    }

    private static Long sectionId(ProjectTemplateSection section) {
        return section.getId() == null ? Long.MAX_VALUE : section.getId();
    }
}
