package org.bihealth.mi.risk_assessment_api.model.scoring;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

import java.util.ArrayList;
import java.util.List;

/**
 * Immutable scoring-system snapshot used by dataset assessments.
 *
 * <p>Every create or update operation creates a new version instead of
 * modifying existing option rows. This preserves the scoring scale that was
 * selected for already-created assessments.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "attribute_scoring_system_versions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_attribute_scoring_system_version",
                        columnNames = {"scoring_system_id", "version_number"}
                )
        }
)
public class AttributeScoringSystemVersion extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scoring_system_id", nullable = false)
    @JsonBackReference
    private AttributeScoringSystem scoringSystem;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "default_identifiability_threshold", nullable = false)
    private Double defaultIdentifiabilityThreshold;

    @Column(name = "default_sensitivity_threshold", nullable = false)
    private Double defaultSensitivityThreshold;

    /**
     * Allowed score values grouped by scoring dimension.
     */
    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OrderBy("dimension ASC, displayOrder ASC, id ASC")
    private List<AttributeScoringOption> scoreOptions = new ArrayList<>();

    /**
     * Maintains both sides of the bidirectional relationship before persistence.
     */
    public void addScoreOption(AttributeScoringOption option) {
        option.setVersion(this);
        scoreOptions.add(option);
    }
}
