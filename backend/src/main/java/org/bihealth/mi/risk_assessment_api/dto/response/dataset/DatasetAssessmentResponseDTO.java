package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.questionnaire.AnswerResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;

import java.util.List;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Represents a high-level DatasetAssessment in a client-friendly format for API responses.
 * This includes the assessment's metadata, its questionnaire answers, and its nested table assessments.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetAssessmentResponseDTO {
    private Integer id;
    private Integer datasetId;
    private String datasetName;
    private String creatorUsername;
    private String name;
    private String description;
    private LocalDateTime creationDate;
    private List<AnswerResponseDTO> answers;
    private List<DatasetTableAssessmentResponseDTO> tableAssessments;

    /**
     * Constructor to map a DatasetAssessment entity to this DTO.
     *
     * @param entity The DatasetAssessment entity from the database.
     */
    public DatasetAssessmentResponseDTO(DatasetAssessment entity) {
        this.id               = entity.getId();
        this.datasetId        = entity.getDataset().getId();
        this.datasetName      = entity.getDataset().getName();
        this.creatorUsername  = entity.getCreatorUsername();
        this.name             = entity.getName();
        this.description      = entity.getDescription();
        if (entity.getCreationDate() != null) {
            this.creationDate = entity.getCreationDate();
        } else {
            this.creationDate = LocalDateTime.now();
        }
        this.answers = entity.getAnswers().stream()
                .map(AnswerResponseDTO::new)
                .collect(Collectors.toList());
        this.tableAssessments = entity.getTableAssessments().stream()
                .map(DatasetTableAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }
}
