package org.bihealth.mi.risk_assessment_api.model.qid;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

/**
 * Immutable search-behavior snapshot used by a dataset profiling session.
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

    @Enumerated(EnumType.STRING)
    @Column(name = "search_type")
    private QidSearchType searchType;

    @Column(name = "exact_search_max_candidate_count")
    private Integer exactSearchMaxCandidateCount;

    @Column(name = "max_combination_size")
    private Integer maxCombinationSize;

    @Column(name = "beam_width")
    private Integer beamWidth;

    @Column(name = "min_improvement")
    private Double minImprovement;

    @Column(name = "stagnation_depth_limit")
    private Integer stagnationDepthLimit;

    @Column(name = "target_distinction")
    private Double targetDistinction;

    @Column(name = "target_separation")
    private Double targetSeparation;

    @Column(name = "distinction_weight")
    private Double distinctionWeight;

    @Column(name = "separation_weight")
    private Double separationWeight;

    @Column(name = "attribute_count_penalty")
    private Double attributeCountPenalty;

    @Column(name = "max_persisted_combinations")
    private Integer maxPersistedCombinations;
}
