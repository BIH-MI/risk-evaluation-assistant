package org.bihealth.mi.risk_assessment_api.dto.request.recipient;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;

import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Represents the request payload for creating or updating a RecipientAssessment.
 *
 * <p>Recipient assessments answer the recipient-side questions of a selected
 * configuration. Those answers drive CONTROLS, LIKELIHOOD, or equivalent
 * context-risk categories depending on the framework.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipientAssessmentRequestDTO {
    // Parent recipient ID. The path variable is usually authoritative.
    private Integer recipientId;

    // Configuration whose recipient questions are being answered.
    private Long configurationId;

    // User-facing assessment metadata.
    private String name;
    private String description;

    // Contact details captured for the assessed recipient/context.
    private String contactName;
    private String email;
    private String telephone;
    private String department;

    // Selected answers for the recipient-assessment questionnaire.
    private List<AnswerRequestDTO> answers;

    /**
     * Converts this DTO into a new, non-persisted RecipientAssessment entity.
     *
     * @param recipient   The parent Recipient entity this assessment belongs to.
     * @param config      The configuration that owns the answered questions.
     * @param questionMap A pre-fetched map of all Question entities for efficient answer conversion.
     * @param username    The username of the user creating the assessment.
     * @return A new RecipientAssessment entity, including its nested answers, ready to be saved.
     */
    public RecipientAssessment toEntity(Recipient recipient,
                                        Configuration config,
                                        Map<Long, Question> questionMap,
                                        String username) {
        RecipientAssessment asmt = new RecipientAssessment();
        asmt.setConfiguration(config);
        asmt.setCreatorUsername(username);
        asmt.setRecipient(recipient);
        asmt.setName(this.name);
        asmt.setDescription(this.description);
        asmt.setContactName(this.contactName);
        asmt.setEmail(this.email);
        asmt.setTelephone(this.telephone);
        asmt.setDepartment(this.department);

        if (this.answers != null) {
            asmt.setAnswers(this.answers.stream()
                    .map(dto -> dto.toEntity(asmt, questionMap))
                    .collect(Collectors.toList()));
        }
        return asmt;
    }
}
