package org.bihealth.mi.risk_assessment_api.dto.response.questionnaire;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

@Data
@NoArgsConstructor
public class QuestionResponseDTO {
    private Integer id;
    private String type;
    private String text;
    private String measureType;

    /**
     * Constructor to map a Question entity to this DTO.
     */
    public QuestionResponseDTO(Question entity) {
        if (entity != null) {
            this.id = entity.getId();
            this.type = entity.getType().toString();
            this.text = entity.getText();
            this.measureType = entity.getMeasureType().name(); // Map Enum to String
        }
    }
}