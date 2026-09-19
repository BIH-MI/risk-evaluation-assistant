package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;


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

    // Empirical Replicability evidence from repeated-measurement analysis.
    // Omitted by the frontend when no subject key was selected.
    private Boolean replicabilityAvailable;
    private Double replicabilityScore;
    private Long replicabilityComparisonCount;
    private String replicabilityMethod;
    private String replicabilityUnavailableReason;

    private String directIdentifierEvidenceSource;
    private String directIdentifierConcept;
    private String directIdentifierConfidence;

    /**
     * Converts this DTO into a new, non-persisted DatasetTableAttribute entity.
     *
     * @param table The parent DatasetTable entity this attribute belongs to.
     * @return A new DatasetTableAttribute entity, ready to be saved.
     */
    public DatasetTableAttribute toEntity(DatasetTable table) {
        DatasetTableAttribute attr = new DatasetTableAttribute();
        attr.setTable(table);
        attr.setName(name);
        attr.setDataType(DataType.valueOf(dataType));
        attr.setExcluded(Boolean.TRUE.equals(excluded));
        applyStatisticsTo(attr);
        applyDirectIdentifierEvidenceSummaryTo(attr);
        return attr;
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
                || separation != null
                || replicabilityAvailable != null
                || replicabilityScore != null
                || replicabilityComparisonCount != null
                || replicabilityMethod != null
                || replicabilityUnavailableReason != null;
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
        attr.setReplicabilityAvailable(replicabilityAvailable);
        attr.setReplicabilityScore(replicabilityScore);
        attr.setReplicabilityComparisonCount(replicabilityComparisonCount);
        attr.setReplicabilityMethod(replicabilityMethod);
        attr.setReplicabilityUnavailableReason(replicabilityUnavailableReason);
    }

    public void applyDirectIdentifierEvidenceSummaryTo(DatasetTableAttribute attr) {
        attr.setDirectIdentifierEvidenceSource(directIdentifierEvidenceSource);
        attr.setDirectIdentifierConcept(directIdentifierConcept);
        attr.setDirectIdentifierConfidence(directIdentifierConfidence);
    }
}
