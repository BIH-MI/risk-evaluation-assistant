package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttributeSubsetEvidence;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Represents a single attribute (column) when creating or updating a DatasetTable.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAttributeRequestDTO {
    // Existing attribute ID when updating; omitted for new columns.
    private Long id;

    // Column name as displayed in the dataset schema.
    private String name;

    // DataType enum name submitted as a string by the frontend.
    private String dataType;

    // Excluded columns remain in the schema but are ignored by relevant workflows.
    private Boolean excluded;

    private Long recordCount;
    private Long analysedRecordCount;
    private Long missingCount;
    private Double missingFraction;
    private Long distinctValueCount;
    private Double distinctValueRatio;
    private Long singletonValueCount;
    private Long singletonRecordCount;
    private Double singletonFraction;
    private Long minimumEquivalenceClassSize;
    private Double medianEquivalenceClassSize;
    private Long maximumEquivalenceClassSize;
    private Double distinction;
    private Double separation;

    private String directIdentifierEvidenceSource;
    private String directIdentifierConcept;
    private String directIdentifierConfidence;

    private List<DatasetTableAttributeSubsetEvidenceRequestDTO> subsetEvidence;

    /**
     * Converts this DTO into a new, non-persisted DatasetTableAttribute entity.
     *
     * @param table The parent DatasetTable entity this attribute belongs to.
     * @return A new DatasetTableAttribute entity, ready to be saved.
     */
    public DatasetTableAttribute toEntity(DatasetTable table) {
        DatasetTableAttribute attr = new DatasetTableAttribute();
        attr.setTable(table);
        applySchemaTo(attr);
        applyStatisticsTo(attr);
        applyDirectIdentifierEvidenceSummaryTo(attr);
        applySubsetEvidenceTo(attr);
        return attr;
    }

    public void applySchemaTo(DatasetTableAttribute attr) {
        attr.setName(name);
        attr.setDataType(DataType.valueOf(dataType));
        attr.setExcluded(Boolean.TRUE.equals(excluded));
    }

    public boolean hasAnyStatistics() {
        return recordCount != null
                || analysedRecordCount != null
                || missingCount != null
                || missingFraction != null
                || distinctValueCount != null
                || distinctValueRatio != null
                || singletonValueCount != null
                || singletonRecordCount != null
                || singletonFraction != null
                || minimumEquivalenceClassSize != null
                || medianEquivalenceClassSize != null
                || maximumEquivalenceClassSize != null
                || distinction != null
                || separation != null;
    }

    public void applyStatisticsTo(DatasetTableAttribute attr) {
        attr.setRecordCount(recordCount);
        attr.setAnalysedRecordCount(analysedRecordCount);
        attr.setMissingCount(missingCount);
        attr.setMissingFraction(missingFraction);
        attr.setDistinctValueCount(distinctValueCount);
        attr.setDistinctValueRatio(distinctValueRatio);
        attr.setSingletonValueCount(singletonValueCount);
        attr.setSingletonRecordCount(singletonRecordCount);
        attr.setSingletonFraction(singletonFraction);
        attr.setMinimumEquivalenceClassSize(minimumEquivalenceClassSize);
        attr.setMedianEquivalenceClassSize(medianEquivalenceClassSize);
        attr.setMaximumEquivalenceClassSize(maximumEquivalenceClassSize);
        attr.setDistinction(distinction);
        attr.setSeparation(separation);
    }

    public void applyDirectIdentifierEvidenceSummaryTo(DatasetTableAttribute attr) {
        attr.setDirectIdentifierEvidenceSource(directIdentifierEvidenceSource);
        attr.setDirectIdentifierConcept(directIdentifierConcept);
        attr.setDirectIdentifierConfidence(directIdentifierConfidence);
    }

    /**
     * Replaces the attribute's per-subset-size evidence. A null list means the
     * client did not send subset evidence, so existing evidence is kept.
     */
    public void applySubsetEvidenceTo(DatasetTableAttribute attr) {
        if (subsetEvidence == null) {
            return;
        }

        attr.replaceSubsetEvidence(toSubsetEvidenceEntities());
    }

    private List<DatasetTableAttributeSubsetEvidence> toSubsetEvidenceEntities() {
        return subsetEvidence.stream()
                .filter(evidence -> evidence.getSubsetSize() != null)
                .map(DatasetTableAttributeSubsetEvidenceRequestDTO::toEntity)
                .collect(Collectors.toList());
    }
}
