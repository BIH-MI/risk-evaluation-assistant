package org.bihealth.mi.risk_assessment_api.model.project;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(
        name = "project_template_versions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_project_template_version",
                        columnNames = {"template_id", "version_number"}
                )
        }
)
public class ProjectTemplateVersion extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @JsonBackReference
    private ProjectTemplate template;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OrderBy("displayOrder ASC, id ASC")
    private List<ProjectTemplateSection> sections = new ArrayList<>();

    public void addSection(ProjectTemplateSection section) {
        section.setVersion(this);
        sections.add(section);
    }
}
