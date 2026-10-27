package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.AttributeScreeningSnapshot;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Screening result of one attribute as the browser displayed it (see
 * AttributeScreeningSnapshot). Only identifiers the frontend can display are
 * accepted, so a stored snapshot never contains free text.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScreeningRequestDTO {
    private static final Set<String> STATUSES = Set.of(
            "reviewNeeded", "autoExcluded", "reviewed", "noExclusionSuggested", "notScreened");
    private static final Set<String> EVIDENCE_SOURCES = Set.of(
            "columnName", "model", "aiSuggestion", "valuePattern");
    // Message keys, optionally one level deep (e.g. notScreened.timedOut).
    private static final Pattern MESSAGE = Pattern.compile("[A-Za-z]{1,40}(\\.[A-Za-z]{1,23})?");
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Z][A-Z_]{0,63}");
    private static final int MAX_COLUMN_NAME_LENGTH = 255;

    private String status;
    private String message;
    private String category;
    private String valueConcept;
    private Boolean potentialIdentifier;
    private Boolean uncertain;
    private List<String> evidence;
    private String columnName;

    /**
     * Validates this snapshot and converts it into the embeddable stored with
     * the attribute.
     *
     * @throws IllegalArgumentException if a value is not one the frontend displays.
     */
    public AttributeScreeningSnapshot toEmbeddable() {
        require(status != null && STATUSES.contains(status), "status");
        require(message != null && MESSAGE.matcher(message).matches(), "message");
        require(category == null || IDENTIFIER.matcher(category).matches(), "category");
        require(valueConcept == null || IDENTIFIER.matcher(valueConcept).matches(), "valueConcept");
        require(evidence == null || EVIDENCE_SOURCES.containsAll(evidence), "evidence");
        require(columnName == null || columnName.length() <= MAX_COLUMN_NAME_LENGTH, "columnName");

        AttributeScreeningSnapshot snapshot = new AttributeScreeningSnapshot();
        snapshot.setStatus(status);
        snapshot.setMessage(message);
        snapshot.setCategory(category);
        snapshot.setValueConcept(valueConcept);
        snapshot.setPotentialIdentifier(Boolean.TRUE.equals(potentialIdentifier));
        snapshot.setUncertain(Boolean.TRUE.equals(uncertain));
        snapshot.setEvidence(evidence == null ? List.of() : List.copyOf(evidence));
        snapshot.setColumnName(columnName);
        return snapshot;
    }

    private static void require(boolean valid, String field) {
        if (!valid) {
            throw new IllegalArgumentException("Invalid attribute screening " + field + ".");
        }
    }
}
