package org.bihealth.mi.risk_assessment_api.model.scoring;

import java.util.Locale;

/**
 * Attribute-level scoring dimensions used for S/R/A/D assessment.
 *
 * <p>The enum names are stored in the database, while {@code apiKey} is the
 * lower-case key used by request and response DTOs.</p>
 */
public enum AttributeScoringDimension {
    REPLICABILITY("replicability"),
    AVAILABILITY("availability"),
    DISTINGUISHABILITY("distinguishability"),
    SENSITIVITY("sensitivity");

    private final String apiKey;

    AttributeScoringDimension(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getApiKey() {
        return apiKey;
    }

    /**
     * Accepts both enum names and public API keys so older clients and admin
     * tools can submit either representation.
     */
    public static AttributeScoringDimension fromApiKey(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Scoring dimension is required.");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        for (AttributeScoringDimension dimension : values()) {
            if (dimension.name().equals(normalized)
                    || dimension.apiKey.toUpperCase(Locale.ROOT).equals(normalized)) {
                return dimension;
            }
        }

        throw new IllegalArgumentException("Unknown scoring dimension: " + value);
    }
}
