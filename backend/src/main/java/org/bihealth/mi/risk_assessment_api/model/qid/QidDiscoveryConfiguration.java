package org.bihealth.mi.risk_assessment_api.model.qid;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceEntity;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Mutable root record for administrator-managed QID discovery profiles.
 *
 * <p>Search behavior is stored in immutable child versions. Dataset profiling
 * persists the selected version so later edits do not silently change the
 * provenance of generated QID combination results.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "qid_discovery_configurations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = NamedResourceConstraints.QID_DISCOVERY_CONFIGURATIONS_NORMALIZED_NAME,
                        columnNames = "normalized_name"
                )
        }
)
public class QidDiscoveryConfiguration extends NamedResourceEntity {

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "is_default")
    private boolean defaultConfiguration = false;

    @Column(name = "current_version")
    private int currentVersion = 1;

    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    @OrderBy("versionNumber DESC")
    private List<QidDiscoveryConfigurationVersion> versions = new ArrayList<>();

    public Optional<QidDiscoveryConfigurationVersion> getCurrentVersionEntity() {
        return versions.stream()
                .max(Comparator.comparing(QidDiscoveryConfigurationVersion::getVersionNumber));
    }

    public void addVersion(QidDiscoveryConfigurationVersion version) {
        version.setConfiguration(this);
        versions.add(version);
        currentVersion = Math.max(currentVersion, version.getVersionNumber());
    }
}
