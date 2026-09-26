package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
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
        name = "mitigation_kb_actions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_mitigation_kb_action_version_code",
                        columnNames = {"knowledge_base_version_id", "code"}
                )
        }
)
public class MitigationAction extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knowledge_base_version_id", nullable = false)
    private MitigationKnowledgeBaseVersion knowledgeBaseVersion;

    // Stable machine-readable identifier. Immutable after creation.
    @Column(name = "code", nullable = false, updatable = false, length = 120)
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

    @Enumerated(EnumType.STRING)
    @Column(name = "resulting_data_form", length = 80)
    private MitigationResultingDataForm resultingDataForm;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_retention_effect", length = 80)
    private MitigationRecordRetentionEffect recordRetentionEffect;

    @ElementCollection
    @CollectionTable(
            name = "mitigation_kb_action_sharing_arrangements",
            joinColumns = @JoinColumn(name = "mitigation_action_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "sharing_arrangement", length = 80)
    private Set<MitigationSharingArrangement> applicableSharingArrangements = new LinkedHashSet<>();

    @OneToOne(mappedBy = "mitigationAction", cascade = CascadeType.ALL, orphanRemoval = true)
    private MitigationActionEstimate estimate;

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
        mapping.setKnowledgeBaseVersion(knowledgeBaseVersion);
    }

    public void addAttributeMapping(MitigationAttributeMapping mapping) {
        attributeMappings.add(mapping);
        mapping.setMitigationAction(this);
        mapping.setKnowledgeBaseVersion(knowledgeBaseVersion);
    }

    public void addParameterDefinition(MitigationParameterDefinition parameterDefinition) {
        parameterDefinitions.add(parameterDefinition);
        parameterDefinition.setMitigationAction(this);
        parameterDefinition.setKnowledgeBaseVersion(knowledgeBaseVersion);
    }

    public void setKnowledgeBaseVersion(MitigationKnowledgeBaseVersion knowledgeBaseVersion) {
        this.knowledgeBaseVersion = knowledgeBaseVersion;
        questionMappings.forEach(mapping -> mapping.setKnowledgeBaseVersion(knowledgeBaseVersion));
        attributeMappings.forEach(mapping -> mapping.setKnowledgeBaseVersion(knowledgeBaseVersion));
        parameterDefinitions.forEach(parameter -> parameter.setKnowledgeBaseVersion(knowledgeBaseVersion));
        if (estimate != null) {
            estimate.setKnowledgeBaseVersion(knowledgeBaseVersion);
        }
    }

    public void setEstimate(MitigationActionEstimate estimate) {
        this.estimate = estimate;
        if (estimate != null) {
            estimate.setMitigationAction(this);
            estimate.setKnowledgeBaseVersion(knowledgeBaseVersion);
        }
    }

    public BigDecimal getEstimatedCostMin() {
        return estimate == null ? null : estimate.getEstimatedCostMin();
    }

    public void setEstimatedCostMin(BigDecimal value) {
        ensureEstimate().setEstimatedCostMin(value);
    }

    public BigDecimal getEstimatedCostMax() {
        return estimate == null ? null : estimate.getEstimatedCostMax();
    }

    public void setEstimatedCostMax(BigDecimal value) {
        ensureEstimate().setEstimatedCostMax(value);
    }

    public String getCurrency() {
        return estimate == null ? null : estimate.getCurrency();
    }

    public void setCurrency(String value) {
        ensureEstimate().setCurrency(value);
    }

    public Integer getEstimatedSetupDaysMin() {
        return estimate == null ? null : estimate.getEstimatedSetupDaysMin();
    }

    public void setEstimatedSetupDaysMin(Integer value) {
        ensureEstimate().setEstimatedSetupDaysMin(value);
    }

    public Integer getEstimatedSetupDaysMax() {
        return estimate == null ? null : estimate.getEstimatedSetupDaysMax();
    }

    public void setEstimatedSetupDaysMax(Integer value) {
        ensureEstimate().setEstimatedSetupDaysMax(value);
    }

    public org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope getEstimateScope() {
        return estimate == null ? null : estimate.getEstimateScope();
    }

    public void setEstimateScope(org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope value) {
        ensureEstimate().setEstimateScope(value);
    }

    public String getEstimateSource() {
        return estimate == null ? null : estimate.getSource();
    }

    public void setEstimateSource(String value) {
        ensureEstimate().setSource(value);
    }

    public String getEstimateAssumptions() {
        return estimate == null ? null : estimate.getAssumptions();
    }

    public void setEstimateAssumptions(String value) {
        ensureEstimate().setAssumptions(value);
    }

    private MitigationActionEstimate ensureEstimate() {
        if (estimate == null) {
            setEstimate(new MitigationActionEstimate());
        }
        return estimate;
    }
}
