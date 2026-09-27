package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

import java.util.ArrayList;
import java.util.List;

/**
 * Historical content snapshot of a mitigation knowledge base.
 */
@Getter
@Setter
@Entity
@Table(
        name = "mitigation_knowledge_base_versions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_mitigation_knowledge_base_version",
                        columnNames = {"knowledge_base_id", "version_number"}
                )
        }
)
public class MitigationKnowledgeBaseVersion extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knowledge_base_id", nullable = false)
    @JsonBackReference
    private MitigationKnowledgeBase knowledgeBase;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OrderBy("code ASC")
    private List<MitigationAction> actions = new ArrayList<>();

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationQuestionMapping> questionMappings = new ArrayList<>();

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationAttributeMapping> attributeMappings = new ArrayList<>();

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationParameterDefinition> parameterDefinitions = new ArrayList<>();

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationActionEstimate> estimates = new ArrayList<>();

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationActionDependency> dependencies = new ArrayList<>();

    @OneToMany(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationActionConflict> conflicts = new ArrayList<>();

    @OneToOne(mappedBy = "knowledgeBaseVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    private PlanSelectionPolicyDefinition selectionPolicy;

    public void addAction(MitigationAction action) {
        action.setKnowledgeBaseVersion(this);
        actions.add(action);
        for (MitigationQuestionMapping mapping : action.getQuestionMappings()) {
            if (!questionMappings.contains(mapping)) {
                questionMappings.add(mapping);
            }
        }
        for (MitigationAttributeMapping mapping : action.getAttributeMappings()) {
            if (!attributeMappings.contains(mapping)) {
                attributeMappings.add(mapping);
            }
        }
        for (MitigationParameterDefinition parameter : action.getParameterDefinitions()) {
            if (!parameterDefinitions.contains(parameter)) {
                parameterDefinitions.add(parameter);
            }
        }
        if (action.getEstimate() != null && !estimates.contains(action.getEstimate())) {
            estimates.add(action.getEstimate());
        }
    }

    public void addDependency(MitigationActionDependency dependency) {
        dependency.setKnowledgeBaseVersion(this);
        dependencies.add(dependency);
    }

    public void addConflict(MitigationActionConflict conflict) {
        conflict.setKnowledgeBaseVersion(this);
        conflicts.add(conflict);
    }

    public void setSelectionPolicy(PlanSelectionPolicyDefinition selectionPolicy) {
        this.selectionPolicy = selectionPolicy;
        if (selectionPolicy != null) {
            selectionPolicy.setKnowledgeBaseVersion(this);
        }
    }
}
