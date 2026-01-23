package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.activity.DataSharingActivityTableAttributeAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.toList;

/**
 * Represents a single table within a dataset in an API response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableResponseDTO {
    private Integer id;
    private Integer datasetId;
    private String creatorUsername;
    private String name;
    private List<DatasetTableAttributeResponseDTO> attributes;

    /**
     * Constructor to map a DatasetTable entity to this DTO.
     *
     * @param entity The DatasetTable entity from the database.
     */
    public DatasetTableResponseDTO(DatasetTable entity) {
        this.id               = entity.getId();
        this.datasetId        = entity.getDataset().getId();
        this.creatorUsername  = entity.getCreatorUsername();
        this.name             = entity.getName();
        this.attributes       = entity.getAttributes().stream()
                .sorted(Comparator.comparing(DatasetTableAttribute::getId))
                .map(DatasetTableAttributeResponseDTO::new)
                .collect(toList());
    }
}