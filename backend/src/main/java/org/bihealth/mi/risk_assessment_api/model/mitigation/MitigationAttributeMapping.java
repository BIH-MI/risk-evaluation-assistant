package org.bihealth.mi.risk_assessment_api.model.mitigation;

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
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;

/**
 * Describes data-side evidence for which a data-transformation action applies.
 *
 * <p>The mapping is schema/evidence based. It must not encode observed dataset
 * values or claim a direct risk-reduction amount.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "mitigation_attribute_mappings")
public class MitigationAttributeMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mitigation_action_id", nullable = false)
    private MitigationAction mitigationAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "attribute_role", length = 80)
    private MitigationAttributeRole attributeRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", length = 80)
    private DataType dataType;

    @Column(name = "requires_candidate_qid", nullable = false)
    private boolean requiresCandidateQid = false;

    @Column(name = "requires_direct_identifier", nullable = false)
    private boolean requiresDirectIdentifier = false;

    @Column(name = "requires_sensitive_attribute", nullable = false)
    private boolean requiresSensitiveAttribute = false;

    @Column(name = "notes", length = 2000)
    private String notes;
}
