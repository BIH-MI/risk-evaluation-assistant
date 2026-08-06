package org.bihealth.mi.risk_assessment_api.model.scoring;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Mutable root record for an administrator-managed attribute scoring system.
 *
 * <p>Historical scoring content is stored in immutable child versions. This root
 * carries the current list/display metadata, active/archive state, and default
 * selection flag.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "attribute_scoring_systems",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_attribute_scoring_system_name",
                        columnNames = "name"
                )
        }
)
public class AttributeScoringSystem extends AuditableEntity {

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "is_default", nullable = false)
    private boolean defaultSystem = false;

    @Column(name = "current_version", nullable = false)
    private int currentVersion = 1;

    /**
     * Complete version history for this scoring system. Versions are kept after
     * edits because dataset assessments reference a specific historical version.
     */
    @OneToMany(mappedBy = "scoringSystem", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    @OrderBy("versionNumber DESC")
    private List<AttributeScoringSystemVersion> versions = new ArrayList<>();

    /**
     * Returns the newest version loaded on this entity.
     */
    public Optional<AttributeScoringSystemVersion> getCurrentVersionEntity() {
        return versions.stream()
                .max(Comparator.comparing(AttributeScoringSystemVersion::getVersionNumber));
    }

    /**
     * Adds a new immutable version and advances the root's current-version
     * pointer when needed.
     */
    public void addVersion(AttributeScoringSystemVersion version) {
        version.setScoringSystem(this);
        versions.add(version);
        currentVersion = Math.max(currentVersion, version.getVersionNumber());
    }
}
