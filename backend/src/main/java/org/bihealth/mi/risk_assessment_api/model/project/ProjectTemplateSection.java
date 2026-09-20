package org.bihealth.mi.risk_assessment_api.model.project;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(
        name = "project_template_sections",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_project_template_section_order",
                        columnNames = {"version_id", "display_order"}
                )
        }
)
public class ProjectTemplateSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    @JsonBackReference
    private ProjectTemplateVersion version;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "help_text", length = 4000)
    private String helpText;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    // Stable key of an earlier-section requirement this section's visibility depends on.
    // Null means the section is always visible.
    @Column(name = "depends_on_requirement_key")
    private String dependsOnRequirementKey;

    // Values of that requirement's response for which this section becomes visible.
    @ElementCollection
    @CollectionTable(
            name = "project_template_section_visible_when_values",
            joinColumns = @JoinColumn(name = "section_id")
    )
    @OrderColumn(name = "display_order")
    @Column(name = "value")
    private List<String> visibleWhenValues = new ArrayList<>();

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OrderBy("displayOrder ASC, id ASC")
    private List<ProjectTemplateRequirement> requirements = new ArrayList<>();

    public void addRequirement(ProjectTemplateRequirement requirement) {
        requirement.setSection(this);
        requirements.add(requirement);
    }
}
