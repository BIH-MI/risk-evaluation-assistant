package org.bihealth.mi.risk_assessment_api.model.mitigation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;

/**
 * Connects a context-control action to a framework question state.
 *
 * <p>{@code triggerOptionCode} means the action can be considered when that
 * option is currently selected. {@code projectedOptionCode} means that, if the
 * action is implemented and verified, a future counterfactual assessment may
 * use that answer in memory. This mapping never changes stored answers.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "mitigation_question_mappings")
public class MitigationQuestionMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mitigation_action_id", nullable = false)
    private MitigationAction mitigationAction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id")
    private Configuration configuration;

    @Column(name = "question_code", nullable = false, length = 160)
    private String questionCode;

    @Column(name = "trigger_option_code", nullable = false, length = 160)
    private String triggerOptionCode;

    @Column(name = "projected_option_code", nullable = false, length = 160)
    private String projectedOptionCode;

    @Column(name = "notes", length = 2000)
    private String notes;
}
