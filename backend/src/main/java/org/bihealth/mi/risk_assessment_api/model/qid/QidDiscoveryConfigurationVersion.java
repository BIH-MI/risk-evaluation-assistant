package org.bihealth.mi.risk_assessment_api.model.qid;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

import java.util.List;

/**
 * Immutable profiling-parameter snapshot used by a dataset profiling session.
 *
 * <p>The AI screening columns were added later and are nullable: a null
 * {@code aiScreeningEnabled} marks a version saved before AI screening was
 * configurable, which uses {@link QidDiscoveryAiScreeningDefaults}. Existing
 * versions are never rewritten.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "qid_discovery_configuration_versions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_qid_discovery_configuration_version",
                        columnNames = {"configuration_id", "version_number"}
                )
        }
)
public class QidDiscoveryConfigurationVersion extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id", nullable = false)
    @JsonBackReference
    private QidDiscoveryConfiguration configuration;

    @Column(name = "version_number")
    private int versionNumber;

    @Column(name = "max_subset_size")
    private Integer maxSubsetSize;

    @Column(name = "max_evaluated_subsets")
    private Integer maxEvaluatedSubsets;

    // AI-assisted direct-identifier screening of column names (browser-local).
    @Column(name = "ai_screening_enabled")
    private Boolean aiScreeningEnabled;

    @Convert(converter = StringListConverter.class)
    @Column(name = "ai_allowed_model_ids", length = 1024)
    private List<String> aiAllowedModelIds;

    @Column(name = "ai_default_model_id", length = 64)
    private String aiDefaultModelId;
}
