package org.bihealth.mi.risk_assessment_api.dto.request.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

/**
 * Request payload for creating or updating a Project workspace.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequestDTO {
    private String name;
    private String description;
    private Set<String> sharedUsernames;
    private String notes;
    private Long templateVersionId;
    private Long mitigationKnowledgeBaseId;
    // Explicit opt-in: re-pin an existing Project to the current version of its Knowledge Base.
    private boolean upgradeMitigationKnowledgeBaseVersion;

    private List<Long> datasetIds;
    private List<Long> recipientIds;
    private List<ProjectRequirementResponseRequestDTO> requirementResponses;
}
