package org.bihealth.mi.risk_assessment_api.model.mitigation;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;

import java.util.ArrayList;
import java.util.List;

/**
 * Typed description of a parameter a future concrete mitigation plan may need.
 *
 * <p>Values are not selected automatically here. Project-specific compatibility
 * checks belong to the future candidate-plan generator.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "mitigation_parameter_definitions")
public class MitigationParameterDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mitigation_action_id", nullable = false)
    private MitigationAction mitigationAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "parameter_code", nullable = false, length = 100)
    private MitigationParameterCode parameterCode;

    @Column(name = "description", length = 1000)
    private String description;

    @ElementCollection
    @CollectionTable(
            name = "mitigation_parameter_allowed_values",
            joinColumns = @JoinColumn(name = "parameter_definition_id")
    )
    @OrderColumn(name = "display_order")
    @Column(name = "allowed_value", length = 160)
    private List<String> allowedValues = new ArrayList<>();
}
