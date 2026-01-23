package org.bihealth.mi.risk_assessment_api.dto.response.recipient;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;

import java.util.Set;
import java.util.List;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Represents a Recipient entity in a client-friendly format for API responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipientResponseDTO {
    private Integer id;
    private String creatorUsername;
    private LocalDateTime creationDate;
    private Set<String> sharedUsernames;
    private String name;
    private String description;
    private String organizationLink;
    private List<Integer> assessmentIds;

    /**
     * Constructor to map a Recipient entity to this DTO.
     *
     * @param entity The Recipient entity from the database.
     */
    public RecipientResponseDTO(Recipient entity) {
        this.id                = entity.getId();
        this.creatorUsername   = entity.getCreatorUsername();
        this.creationDate      = entity.getCreationDate();
        this.sharedUsernames   = entity.getSharedUsernames();
        this.name              = entity.getName();
        this.description       = entity.getDescription();
        this.organizationLink  = entity.getOrganizationLink();
        this.assessmentIds     = entity.getAssessments().stream()
                .map(RecipientAssessment::getId)
                .collect(Collectors.toList());
    }
}