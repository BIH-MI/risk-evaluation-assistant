package org.bihealth.mi.risk_assessment_api.model.mitigation;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Framework-independent catalogue entry describing one atomic mitigation action.
 *
 * <p>The catalogue records what could be implemented. It deliberately does not
 * store risk-reduction factors; future planning milestones must evaluate
 * counterfactual questionnaire answers or measured data risk through the
 * existing scoring and anonymization evaluation paths.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "mitigation_actions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_mitigation_action_code", columnNames = "code")
        }
)
public class MitigationAction extends AuditableEntity {

    // Stable machine-readable identifier. Immutable after creation.
    @Column(name = "code", nullable = false, unique = true, updatable = false, length = 120)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, updatable = false, length = 50)
    private MitigationActionType actionType;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "implementation_description", length = 4000)
    private String implementationDescription;

    @Column(name = "verification_description", length = 4000)
    private String verificationDescription;

    @Column(name = "source", length = 1000)
    private String source;

    @Column(name = "rationale", length = 4000)
    private String rationale;

    @ElementCollection
    @CollectionTable(
            name = "mitigation_action_sharing_arrangements",
            joinColumns = @JoinColumn(name = "mitigation_action_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "sharing_arrangement", length = 80)
    private Set<MitigationSharingArrangement> applicableSharingArrangements = new LinkedHashSet<>();

    // Optional local implementation estimate metadata. Missing values mean UNKNOWN, not zero.
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

    @Column(name = "estimate_source", length = 1000)
    private String estimateSource;

    @Column(name = "estimate_assumptions", length = 4000)
    private String estimateAssumptions;

    @OneToMany(mappedBy = "mitigationAction", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationQuestionMapping> questionMappings = new ArrayList<>();

    @OneToMany(mappedBy = "mitigationAction", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationAttributeMapping> attributeMappings = new ArrayList<>();

    @OneToMany(mappedBy = "mitigationAction", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<MitigationParameterDefinition> parameterDefinitions = new ArrayList<>();

    public void addQuestionMapping(MitigationQuestionMapping mapping) {
        questionMappings.add(mapping);
        mapping.setMitigationAction(this);
    }

    public void addAttributeMapping(MitigationAttributeMapping mapping) {
        attributeMappings.add(mapping);
        mapping.setMitigationAction(this);
    }

    public void addParameterDefinition(MitigationParameterDefinition parameterDefinition) {
        parameterDefinitions.add(parameterDefinition);
        parameterDefinition.setMitigationAction(this);
    }
}
