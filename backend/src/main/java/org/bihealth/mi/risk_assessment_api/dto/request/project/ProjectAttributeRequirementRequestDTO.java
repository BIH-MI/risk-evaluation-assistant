package org.bihealth.mi.risk_assessment_api.dto.request.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request payload for one project-level requirement targeting a dataset
 * attribute.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAttributeRequirementRequestDTO {
    private Long id;
    private Long datasetId;
    private Long targetAttributeId;
    private String requirementType;
    private String dateResolution;
    private BigDecimal numericBinWidth;
    private String notes;
}
