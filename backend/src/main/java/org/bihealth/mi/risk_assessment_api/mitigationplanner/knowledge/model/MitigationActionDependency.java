package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Configured REQUIRES relationship between two actions in one KB version.
 */
@Getter
@Setter
@Entity
@Table(
        name = "mitigation_kb_action_dependencies",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_mitigation_kb_action_dependency",
                        columnNames = {"knowledge_base_version_id", "action_id", "required_action_id"}
                )
        }
)
public class MitigationActionDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knowledge_base_version_id", nullable = false)
    private MitigationKnowledgeBaseVersion knowledgeBaseVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_id", nullable = false)
    private MitigationAction action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "required_action_id", nullable = false)
    private MitigationAction requiredAction;

    @Column(name = "rationale", length = 4000)
    private String rationale;

    @Column(name = "source", length = 1000)
    private String source;
}
