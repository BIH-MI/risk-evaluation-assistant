package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model;

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
 * Mutable administrator-managed root for one mitigation expert-knowledge configuration.
 *
 * <p>The root carries display and lifecycle state. Version rows contain the expert
 * knowledge used by planning runs.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "mitigation_knowledge_bases",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = NamedResourceConstraints.MITIGATION_KNOWLEDGE_BASES_NORMALIZED_NAME,
                        columnNames = "normalized_name"
                )
        }
)
public class MitigationKnowledgeBase extends NamedResourceEntity {

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "is_default", nullable = false)
    private boolean defaultKnowledgeBase = false;

    @Column(name = "current_version", nullable = false)
    private int currentVersion = 1;

    @OneToMany(mappedBy = "knowledgeBase", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    @OrderBy("versionNumber DESC")
    private List<MitigationKnowledgeBaseVersion> versions = new ArrayList<>();

    public Optional<MitigationKnowledgeBaseVersion> getCurrentVersionEntity() {
        return versions.stream()
                .max(Comparator.comparing(MitigationKnowledgeBaseVersion::getVersionNumber));
    }

    public void addVersion(MitigationKnowledgeBaseVersion version) {
        version.setKnowledgeBase(this);
        versions.add(version);
        currentVersion = Math.max(currentVersion, version.getVersionNumber());
    }
}
