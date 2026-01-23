package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;

import java.util.List;
import java.util.Set;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Represents a top-level Dataset in a client-friendly format for API responses.
 * This DTO includes the dataset's metadata, its tables, and a list of IDs for its assessments.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetResponseDTO {
    private Integer id;
    private String creatorUsername;
    private String name;
    private String description;
    private LocalDateTime creationDate;
    private Set<String> sharedUsernames;
    private List<Integer> assessmentIds;
    private List<DatasetTableResponseDTO> tables;

    /**
     * Constructor to map a Dataset entity to this DTO.
     *
     * @param entity The Dataset entity from the database.
     */
    public DatasetResponseDTO(Dataset entity) {
        this.id               = entity.getId();
        this.creatorUsername  = entity.getCreatorUsername();
        this.name             = entity.getName();
        this.description      = entity.getDescription();
        this.creationDate     = entity.getCreationDate();
        this.sharedUsernames  = entity.getSharedUsernames();
        this.tables = entity.getTables().stream()
                .map(DatasetTableResponseDTO::new)
                .collect(Collectors.toList());
        this.assessmentIds = entity.getDatasetAssessments().stream()
                .map(DatasetAssessment::getId)
                .collect(Collectors.toList());
    }
}