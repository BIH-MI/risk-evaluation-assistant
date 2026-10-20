package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The AI model actually used to screen this dataset's column names for
 * direct identifiers (browser-local): registry id, pinned repository and
 * revision, quantisation, prompt configuration version (prompt profile and
 * column-name rules), thresholds version and the model's validation status
 * for that exact configuration.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetAiScreeningRequestDTO {
    private String modelId;
    private String repository;
    private String revision;
    private String dtype;
    private String promptVersion;
    private String thresholdsVersion;
    private String validationStatus;
}
