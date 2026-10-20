package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The AI model the browser reports having used to screen this dataset's
 * column names for direct identifiers: registry id, pinned repository and
 * revision, quantisation, prompt version (prompt profile, prompt fingerprint
 * and column-name rules version), thresholds version and validation status.
 * Checked against the server-side registry before it is stored; the stored
 * validation status is derived from the registry (DatasetService).
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
