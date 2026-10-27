package org.bihealth.mi.risk_assessment_api.model.dataset;

/**
 * Domain of a dataset's content. Chosen by the researcher, optionally from the
 * AI model's suggestion on the column names (datasetTypes.js in the frontend).
 */
public enum DatasetType {
    CLINICAL_HEALTHCARE,
    FINANCIAL,
    GEOSPATIAL_ENVIRONMENTAL,
    ECOMMERCE_RETAIL,
    SOCIAL_DEMOGRAPHIC,
    EDUCATION,
    EMPLOYMENT_HR,
    OTHER;

    /** Parses an enum name; null or blank means no type. */
    public static DatasetType fromName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return DatasetType.valueOf(value);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unknown dataset type: " + value);
        }
    }
}
