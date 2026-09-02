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
    // Dataset identity and audit metadata.
    private Long id;
    private String creatorUsername;
    private String name;
    private String description;
    private LocalDateTime creationDate;

    // Users with explicit access to the dataset.
    private Set<String> sharedUsernames;

    // Assessment IDs are enough for list views to link to existing assessments.
    private List<Long> assessmentIds;

    // QID discovery configuration version that generated the stored QID metadata.
    private Long qidDiscoveryConfigurationId;
    private Long qidDiscoveryConfigurationVersionId;
    private Integer qidDiscoveryConfigurationVersion;
    private String qidDiscoveryConfigurationName;

    // Full table schema returned with the dataset.
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
        if (entity.getQidDiscoveryConfiguration() != null) {
            this.qidDiscoveryConfigurationId = entity.getQidDiscoveryConfiguration().getId();
            this.qidDiscoveryConfigurationName = entity.getQidDiscoveryConfiguration().getName();
        }
        if (entity.getQidDiscoveryConfigurationVersion() != null) {
            this.qidDiscoveryConfigurationVersionId = entity.getQidDiscoveryConfigurationVersion().getId();
            this.qidDiscoveryConfigurationVersion = entity.getQidDiscoveryConfigurationVersion().getVersionNumber();
            this.qidDiscoveryConfigurationName = entity.getQidDiscoveryConfigurationVersion().getName();
        }
        this.tables = entity.getTables().stream()
                .map(DatasetTableResponseDTO::new)
                .collect(Collectors.toList());
        this.assessmentIds = entity.getDatasetAssessments().stream()
                .map(DatasetAssessment::getId)
                .collect(Collectors.toList());
    }
}
