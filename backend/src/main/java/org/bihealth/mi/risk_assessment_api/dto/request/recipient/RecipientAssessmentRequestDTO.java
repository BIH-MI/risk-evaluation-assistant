package org.bihealth.mi.risk_assessment_api.dto.request.recipient;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;

import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Represents the request payload for creating or updating a RecipientAssessment.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipientAssessmentRequestDTO {
    private Integer recipientId;
    private String name;
    private String description;
    private String contactName;
    private String email;
    private String telephone;
    private String department;
    private List<AnswerRequestDTO> answers;

    /**
     * Converts this DTO into a new, non-persisted RecipientAssessment entity.
     *
     * @param recipient   The parent Recipient entity this assessment belongs to.
     * @param questionMap A pre-fetched map of all Question entities for efficient answer conversion.
     * @param username    The username of the user creating the assessment.
     * @return A new RecipientAssessment entity, including its nested answers, ready to be saved.
     */
    public RecipientAssessment toEntity(Recipient recipient,
                                        Map<Integer, Question> questionMap,
                                        String username) {
        RecipientAssessment asmt = new RecipientAssessment();
        asmt.setCreatorUsername(username);
        asmt.setRecipient(recipient);

        // Use the inherited setName() for the assessment's name
        asmt.setName(this.name);
        asmt.setDescription(this.description);

        // Use the specific setter for the contact person's name
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
