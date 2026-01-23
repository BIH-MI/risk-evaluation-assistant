package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;

import java.util.List;

/**
 * Represents a single table within a dataset creation or update request.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableRequestDTO {
    private Integer id;
    private String name;
    private List<DatasetTableAttributeRequestDTO> attributes;

    /**
     * Converts this DTO into a new, non-persisted DatasetTable entity.
     *
     * @param parent          The parent Dataset entity that this table will belong to.
     * @param creatorUsername The username of the user, to be set on the table entity.
     * @return A new DatasetTable entity, including its nested attributes, ready to be saved.
     */
    public DatasetTable toEntity(Dataset parent, String creatorUsername) {
        DatasetTable tbl = new DatasetTable();
        tbl.setDataset(parent);
        tbl.setCreatorUsername(creatorUsername);
        tbl.setName(name);

        if (attributes != null) {
            attributes.forEach(a -> tbl.getAttributes().add(a.toEntity(tbl)));
        }

        return tbl;
    }
}
