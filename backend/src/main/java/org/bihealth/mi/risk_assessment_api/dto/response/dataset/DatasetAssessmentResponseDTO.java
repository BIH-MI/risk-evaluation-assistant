package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.configuration.ConfigurationResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.questionnaire.AnswerResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.scoring.AttributeScoringSystemResponseDTO;
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
    // Assessment and parent dataset identity.
    private Long id;
    private Long datasetId;
    private String datasetName;

    // Configuration used to interpret the answers.
    private Long configurationId;
    private String configurationName;
    private Long configurationVersionId;
    private Integer configurationVersion;
    private ConfigurationResponseDTO configuration;

    // Attribute scoring snapshot selected for this assessment.
    private Long attributeScoringSystemId;
    private Long attributeScoringSystemVersionId;
    private Integer attributeScoringSystemVersion;
    private String attributeScoringSystemName;
    private Double attributeIdentifiabilityThreshold;
    private Double attributeSensitivityThreshold;
    private AttributeScoringSystemResponseDTO attributeScoringSystem;

    // Assessment metadata.
    private String creatorUsername;
    private String name;
    private String description;
    private LocalDateTime creationDate;

    // Answer and table-assessment details returned for edit/detail screens.
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

        this.configurationId      = entity.getConfiguration().getId();
        if (entity.getConfigurationVersion() != null) {
            this.configurationVersionId = entity.getConfigurationVersion().getId();
            this.configurationVersion = entity.getConfigurationVersion().getVersionNumber();
            this.configurationName = entity.getConfigurationVersion().getName();
            this.configuration = new ConfigurationResponseDTO(
                    entity.getConfiguration(),
                    entity.getConfigurationVersion(),
                    0
            );
        } else {
            this.configurationName = entity.getConfiguration().getName();
            entity.getConfiguration().getCurrentVersionEntity().ifPresent(version -> {
                this.configurationVersionId = version.getId();
                this.configurationVersion = version.getVersionNumber();
                this.configurationName = version.getName();
                this.configuration = new ConfigurationResponseDTO(entity.getConfiguration(), version, 0);
            });
        }

        if (entity.getAttributeScoringSystem() != null) {
            this.attributeScoringSystemId = entity.getAttributeScoringSystem().getId();
        }
        if (entity.getAttributeScoringSystemVersion() != null) {
            this.attributeScoringSystemVersionId = entity.getAttributeScoringSystemVersion().getId();
            this.attributeScoringSystemVersion = entity.getAttributeScoringSystemVersion().getVersionNumber();
            this.attributeScoringSystemName = entity.getAttributeScoringSystemVersion().getName();
            this.attributeScoringSystem = new AttributeScoringSystemResponseDTO(entity.getAttributeScoringSystemVersion());
        }
        this.attributeIdentifiabilityThreshold = entity.getAttributeIdentifiabilityThreshold();
        this.attributeSensitivityThreshold = entity.getAttributeSensitivityThreshold();

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
