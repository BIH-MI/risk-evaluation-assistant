package org.bihealth.mi.risk_assessment_api.dto.response.activity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;

import java.util.List;
import java.util.Set;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Represents a DataSharingActivity in a client-friendly format for API responses.
 * This DTO flattens some of the nested entity structure to provide key information
 * from linked assessments directly.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSharingActivityResponseDTO {
    private Integer id;
    private Integer reportId;
    private String creatorUsername;
    private String name;
    private String description;

    private LocalDateTime creationDate;
    private Set<String> sharedUsernames;

    private Integer datasetId;
    private Integer datasetAssessmentId;
    private String datasetAssessmentName;

    private Integer recipientId;
    private Integer recipientAssessmentId;
    private String recipientAssessmentName;

    private List<DataSharingActivityTableAssessmentResponseDTO> tableAssessments;

    /**
     * Constructor to map a DataSharingActivity entity to this DTO.
     *
     * @param act The DataSharingActivity entity from the database.
     */
    public DataSharingActivityResponseDTO(DataSharingActivity act) {
        this.id                       = act.getId();
        this.reportId                 = act.getReport() != null ? act.getReport().getId() : null;
        this.creatorUsername          = act.getCreatorUsername();
        this.name                     = act.getName();
        this.description              = act.getDescription();
        this.creationDate             = act.getCreationDate();
        this.sharedUsernames          = act.getSharedUsernames();

        this.datasetId = act.getDatasetAssessment().getDataset().getId();
        this.datasetAssessmentId = act.getDatasetAssessment() != null
                ? act.getDatasetAssessment().getId()
                : null;
        this.datasetAssessmentName = act.getDatasetAssessment().getName();

        this.recipientId = act.getRecipientAssessment().getRecipient().getId();
        this.recipientAssessmentId = act.getRecipientAssessment() != null
                ? act.getRecipientAssessment().getId()
                : null;
        this.recipientAssessmentName = act.getRecipientAssessment().getName();

        this.tableAssessments = act.getTableAssessments() != null
                ? act.getTableAssessments().stream()
                .map(DataSharingActivityTableAssessmentResponseDTO::new)
                .collect(Collectors.toList())
                : List.of();
    }
}
