package org.bihealth.mi.risk_assessment_api.dto.response.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate.ProjectTemplateResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Client-facing representation of a Project workspace.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponseDTO {
    private Long id;
    private String creatorUsername;
    private String name;
    private String description;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;
    private Set<String> sharedUsernames;
    private String notes;
    private Long templateId;
    private String templateName;
    private Long templateVersionId;
    private Integer templateVersionNumber;
    private ProjectTemplateResponseDTO projectTemplate;
    private Boolean newerTemplateVersionAvailable;
    private List<ProjectRequirementResponseDTO> requirementResponses;

    private List<Long> datasetIds;
    private List<Long> recipientIds;
    private List<Long> dataSharingActivityIds;

    public ProjectResponseDTO(Project entity) {
        this.id = entity.getId();
        this.creatorUsername = entity.getCreatorUsername();
        this.name = entity.getName();
        this.description = entity.getDescription();
        this.creationDate = entity.getCreationDate();
        this.lastModifiedDate = entity.getLastModifiedDate();
        this.sharedUsernames = entity.getSharedUsernames();
        this.notes = entity.getNotes();

        ProjectTemplateVersion version = entity.getTemplateVersion();
        if (version != null) {
            this.templateId = version.getTemplate().getId();
            this.templateName = version.getName();
            this.templateVersionId = version.getId();
            this.templateVersionNumber = version.getVersionNumber();
            this.projectTemplate = new ProjectTemplateResponseDTO(version);
            this.newerTemplateVersionAvailable = version.getTemplate().getCurrentVersionEntity()
                    .map(current -> current.getVersionNumber() > version.getVersionNumber())
                    .orElse(false);
        } else {
            this.newerTemplateVersionAvailable = false;
        }

        this.requirementResponses = entity.getRequirementResponses().stream()
                .map(ProjectRequirementResponseDTO::new)
                .collect(Collectors.toList());

        this.datasetIds = entity.getDatasets().stream()
                .map(Dataset::getId)
                .collect(Collectors.toList());
        this.recipientIds = entity.getRecipients().stream()
                .map(Recipient::getId)
                .collect(Collectors.toList());
        this.dataSharingActivityIds = entity.getDataSharingActivities().stream()
                .map(DataSharingActivity::getId)
                .collect(Collectors.toList());
    }
}
