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
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableAttributeRepository;

/**
 * Request DTO for creating or updating a dataset assessment.
 *
 * <p>A dataset assessment combines framework questionnaire answers with
 * table/attribute assessment metadata. Together these inputs drive the
 * dataset-side category classification, including IMPACT.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetAssessmentRequestDTO {
    // Risk configuration used to interpret questions, answers, and bands.
    private Long configurationId;

    // User-facing assessment name.
    private String name;

    // Optional assessment description or notes.
    private String description;

    // Questionnaire answers selected for dataset-assessment questions.
    private List<AnswerRequestDTO> answers;

    // Optional table/attribute risk metadata for the dataset.
    private List<DatasetTableAssessmentRequestDTO> tableAssessments;

    /**
     * Builds a new DatasetAssessment aggregate from already-resolved parent and
     * configuration entities.
     *
     * <p>The service layer prepares lookup maps for questions and tables so this
     * conversion can validate IDs while creating nested Answer and table
     * assessment entities.</p>
     */
    public DatasetAssessment toEntity(
            Dataset parent,
            Configuration config,
            String creatorUsername,
            Map<Long, Question> qMap,
            Map<Long, DatasetTable> tMap,
            DatasetTableAttributeRepository attributeRepo
    ) {
        DatasetAssessment asmt = new DatasetAssessment();
        asmt.setDataset(parent);
        asmt.setConfiguration(config);
        asmt.setName(name);
        asmt.setDescription(description);
        asmt.setCreatorUsername(creatorUsername);

        if (answers != null) {
            answers.forEach(ansDto -> {
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
