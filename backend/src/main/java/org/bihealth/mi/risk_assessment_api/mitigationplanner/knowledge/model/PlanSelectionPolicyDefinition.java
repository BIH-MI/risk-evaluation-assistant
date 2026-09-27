package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Deterministic policy metadata used later to choose among feasible evaluated plans.
 */
@Getter
@Setter
@Entity
@Table(name = "mitigation_kb_plan_selection_policies")
public class PlanSelectionPolicyDefinition {

    public static final String DEFAULT_CONSERVATIVE = "DEFAULT_CONSERVATIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knowledge_base_version_id", nullable = false, unique = true)
    private MitigationKnowledgeBaseVersion knowledgeBaseVersion;

    @Column(name = "policy_code", nullable = false, length = 120)
    private String policyCode = DEFAULT_CONSERVATIVE;

    @Column(name = "policy_name", nullable = false, length = 240)
    private String policyName = "Default conservative";

    @Column(name = "description", length = 4000)
    private String description;

    @ElementCollection
    @CollectionTable(
            name = "mitigation_kb_plan_selection_policy_criteria",
            joinColumns = @JoinColumn(name = "policy_id")
    )
    @OrderColumn(name = "display_order")
    @Column(name = "criterion_code", length = 160)
    private List<String> enabledCriteria = new ArrayList<>();
}
