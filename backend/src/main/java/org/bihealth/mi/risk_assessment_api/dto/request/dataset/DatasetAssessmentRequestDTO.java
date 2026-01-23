package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.Map;

import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableAttributeRepository;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetAssessmentRequestDTO {
    private String name;
    private String description;
    private List<AnswerRequestDTO> answers;
    private List<DatasetTableAssessmentRequestDTO> tableAssessments;

    public DatasetAssessment toEntity(
            Dataset parent,
            String creatorUsername,
            Map<Integer, Question> qMap, // Use the unified Question model
            Map<Integer, DatasetTable> tMap,
            DatasetTableAttributeRepository attributeRepo
    ) {
        DatasetAssessment asmt = new DatasetAssessment();
        asmt.setDataset(parent);
        asmt.setName(name);
        asmt.setDescription(description);
        asmt.setCreatorUsername(creatorUsername);

        if (answers != null) {
            answers.forEach(ansDto -> {
                // The local variable must be of the unified Answer type
                Answer ans = ansDto.toEntity(asmt, qMap);
                asmt.getAnswers().add(ans);
            });
        }

        if (tableAssessments != null) {
            tableAssessments.forEach(tabDto -> {
                DatasetTableAssessment ta = tabDto.toEntity(asmt, tMap, attributeRepo);
                asmt.getTableAssessments().add(ta);
            });
        }
        return asmt;
    }
}