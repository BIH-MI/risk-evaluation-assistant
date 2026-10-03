package org.bihealth.mi.risk_assessment_api.model.qid;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

/**
 * Immutable profiling-parameter snapshot used by a dataset profiling session.
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
}
