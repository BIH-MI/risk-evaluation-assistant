package org.bihealth.mi.risk_assessment_api.dto.response.project;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectAttributeRequirement;

import java.math.BigDecimal;

/**
 * API representation of a project attribute requirement.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAttributeRequirementResponseDTO {
    private Long id;
    private Long datasetId;
    private String datasetName;
    private Long targetAttributeId;
    private String targetAttributeName;
    private Long targetTableId;
    private String targetTableName;
    private String targetAttributeDataType;
    private String requirementType;
    private String dateResolution;
    private BigDecimal numericBinWidth;
    private String notes;

    public ProjectAttributeRequirementResponseDTO(ProjectAttributeRequirement entity) {
        DatasetTableAttribute attribute = entity.getTargetAttribute();

        this.id = entity.getId();
        this.datasetId = entity.getDataset().getId();
        this.datasetName = entity.getDataset().getName();
        this.targetAttributeId = attribute.getId();
        this.targetAttributeName = attribute.getName();
        this.targetTableId = attribute.getTable().getId();
        this.targetTableName = attribute.getTable().getName();
        this.targetAttributeDataType = attribute.getDataType().name();
        this.requirementType = entity.getRequirementType().name();
        this.dateResolution = entity.getDateResolution() != null
                ? entity.getDateResolution().name()
                : null;
        this.numericBinWidth = entity.getNumericBinWidth();
        this.notes = entity.getNotes();
    }
}
