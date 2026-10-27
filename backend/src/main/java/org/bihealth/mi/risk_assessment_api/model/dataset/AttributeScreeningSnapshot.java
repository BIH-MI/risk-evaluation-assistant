package org.bihealth.mi.risk_assessment_api.model.dataset;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.qid.StringListConverter;

import java.util.List;

/**
 * Direct-identifier screening result of one attribute as shown in Add Dataset
 * (status indicator and its details), kept so later screens can show it too.
 *
 * <p>Descriptive only: it records what the screening (column-name rules, AI
 * model, value patterns) suggested and whether the researcher decided. It is
 * never Direct Identifier evidence; the persisted exclusion decision is the
 * attribute's excluded flag and the evidence summary its directIdentifier*
 * fields. Values are the frontend's identifiers (screeningStatus.js).</p>
 */
@Getter
@Setter
@NoArgsConstructor
@Embeddable
public class AttributeScreeningSnapshot {
    // reviewNeeded, autoExcluded, reviewed, noExclusionSuggested or notScreened.
    @Column(name = "screening_status", length = 32)
    private String status;

    // Explanation key (datasets.aiSuggestions.tooltip.message).
    @Column(name = "screening_message", length = 64)
    private String message;

    // Predicted semantic category (e.g. CLINICAL), if one was named.
    @Column(name = "screening_category", length = 64)
    private String category;

    // Identifier concept of a detected value pattern (e.g. EMAIL).
    @Column(name = "screening_value_concept", length = 64)
    private String valueConcept;

    // A potential identifier without a named category or concept.
    @Column(name = "screening_potential_identifier")
    private Boolean potentialIdentifier;

    // The prediction itself was uncertain.
    @Column(name = "screening_uncertain")
    private Boolean uncertain;

    // Sources that produced the result (columnName, model, aiSuggestion, valuePattern).
    @Column(name = "screening_evidence", length = 128)
    @Convert(converter = StringListConverter.class)
    private List<String> evidence;

    // Attribute name the screening was computed for; a later rename does not re-screen.
    @Column(name = "screening_column_name")
    private String columnName;
}
