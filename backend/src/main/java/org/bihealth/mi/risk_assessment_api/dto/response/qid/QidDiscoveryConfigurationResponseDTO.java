package org.bihealth.mi.risk_assessment_api.dto.response.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;

import java.time.LocalDateTime;

/**
 * Client-facing representation of a QID discovery configuration's current or
 * selected immutable version.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoveryConfigurationResponseDTO {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private boolean defaultConfiguration;
    private Integer currentVersion;
    private Long versionId;
    private Integer versionNumber;
    private QidDiscoverySearchConfigurationResponseDTO search;
    private Long datasetCount;
    private String creatorUsername;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;

    public QidDiscoveryConfigurationResponseDTO(
            QidDiscoveryConfiguration configuration,
            QidDiscoveryConfigurationVersion version,
            long datasetCount
    ) {
        this.id = configuration.getId();
        this.name = version.getName();
        this.description = version.getDescription();
        this.active = configuration.isActive();
        this.defaultConfiguration = configuration.isDefaultConfiguration();
        this.currentVersion = configuration.getCurrentVersion();
        this.versionId = version.getId();
        this.versionNumber = version.getVersionNumber();
        this.search = new QidDiscoverySearchConfigurationResponseDTO(version);
        this.datasetCount = datasetCount;
        this.creatorUsername = configuration.getCreatorUsername();
        this.creationDate = configuration.getCreationDate();
        this.lastModifiedDate = configuration.getLastModifiedDate();
    }

    public QidDiscoveryConfigurationResponseDTO(QidDiscoveryConfigurationVersion version) {
        this(
                version.getConfiguration(),
                version,
                0
        );
        this.datasetCount = null;
    }
}
