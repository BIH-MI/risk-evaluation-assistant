package org.bihealth.mi.risk_assessment_api.dto.response.recipient;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.questionnaire.AnswerResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;

import java.util.List;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Represents a RecipientAssessment entity in a client-friendly format for API responses.
 *
 * <p>The DTO flattens recipient and configuration names next to the saved
 * answers so detail screens can render without extra lookups.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipientAssessmentResponseDTO {
    // Assessment, parent recipient, and configuration identity.
    private Long id;
    private Long recipientId;
    private Long configurationId;
    private String configurationName;
    private Long configurationVersion;

    // Recipient/assessment metadata shown in the UI.
    private String organization;
    private String name;
    private String contactName;
    private String description;
    private String email;
    private String telephone;
    private String department;
    private String creatorUsername;
    private LocalDateTime creationDate;

    // Saved recipient-side questionnaire answers.
    private List<AnswerResponseDTO> answers;

    /**
     * Constructor to map a RecipientAssessment entity to this DTO.
     *
     * @param entity The RecipientAssessment entity from the database.
     */
    public RecipientAssessmentResponseDTO(RecipientAssessment entity) {
        this.id = entity.getId();
        this.recipientId = entity.getRecipient().getId();
        this.configurationId = entity.getConfiguration().getId();
        this.configurationName = entity.getConfiguration().getName();
        this.organization = entity.getRecipient().getOrganization();
        this.name = entity.getName();
        this.description = entity.getDescription();
        this.contactName = entity.getContactName();
        this.email = entity.getEmail();
        this.telephone = entity.getTelephone();
        this.department = entity.getDepartment();
        this.creatorUsername = entity.getCreatorUsername();
        this.creationDate = entity.getCreationDate();
        this.answers = entity.getAnswers().stream()
                .map(AnswerResponseDTO::new)
                .collect(Collectors.toList());
    }
}
