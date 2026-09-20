package org.bihealth.mi.risk_assessment_api.model.project;

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

@Getter
@Setter
@Entity
@Table(
        name = "project_templates",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = NamedResourceConstraints.PROJECT_TEMPLATES_NORMALIZED_NAME,
                        columnNames = "normalized_name"
                ),
                @UniqueConstraint(
                        name = NamedResourceConstraints.PROJECT_TEMPLATES_SYSTEM_KEY,
                        columnNames = "system_key"
                )
        }
)
public class ProjectTemplate extends NamedResourceEntity {

    @Column(name = "system_key", unique = true)
    private String systemKey;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "is_default", nullable = false)
    private boolean defaultTemplate = false;

    @Column(name = "current_version", nullable = false)
    private int currentVersion = 1;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    @OrderBy("versionNumber DESC")
    private List<ProjectTemplateVersion> versions = new ArrayList<>();

    public Optional<ProjectTemplateVersion> getCurrentVersionEntity() {
        return versions.stream()
                .max(Comparator.comparing(ProjectTemplateVersion::getVersionNumber));
    }

    public void addVersion(ProjectTemplateVersion version) {
        version.setTemplate(this);
        versions.add(version);
        currentVersion = Math.max(currentVersion, version.getVersionNumber());
    }
}
