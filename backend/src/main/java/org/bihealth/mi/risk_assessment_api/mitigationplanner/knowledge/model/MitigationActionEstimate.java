package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope;

import java.math.BigDecimal;

/**
 * Optional operational estimate for one mitigation action.
 *
 * <p>Missing fields mean unknown. They must not be interpreted as zero.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "mitigation_kb_action_estimates")
public class MitigationActionEstimate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knowledge_base_version_id", nullable = false)
    private MitigationKnowledgeBaseVersion knowledgeBaseVersion;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mitigation_action_id", nullable = false, unique = true)
    private MitigationAction mitigationAction;

    @Column(name = "estimated_cost_min", precision = 14, scale = 2)
    private BigDecimal estimatedCostMin;

    @Column(name = "estimated_cost_max", precision = 14, scale = 2)
    private BigDecimal estimatedCostMax;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "estimated_setup_days_min")
    private Integer estimatedSetupDaysMin;

    @Column(name = "estimated_setup_days_max")
    private Integer estimatedSetupDaysMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "estimate_scope", length = 80)
    private MitigationEstimateScope estimateScope;

    @Column(name = "source", length = 1000)
    private String source;

    @Column(name = "assumptions", length = 4000)
    private String assumptions;
}
