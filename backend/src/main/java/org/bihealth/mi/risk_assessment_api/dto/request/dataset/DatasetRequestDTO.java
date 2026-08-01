package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;

import java.util.HashSet;
import java.util.List;

/**
 * Represents the top-level request payload for creating or updating a Dataset.
 *
 * <p>The payload can include nested table and attribute definitions so the
 * service can persist the dataset aggregate in one workflow.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetRequestDTO {
    // User-facing dataset name.
    private String name;

    // Optional dataset description.
    private String description;

    // Additional users who should be able to access the dataset.
    private List<String> sharedUsernames;

    // Tables and columns that make up the dataset schema.
    private List<DatasetTableRequestDTO> tables;

    /**
     * Converts this DTO into a new, non-persisted Dataset entity graph.
     * This method orchestrates the conversion of its nested table and attribute DTOs.
     *
     * @param creatorUsername The username of the user creating the dataset.
     * @return A complete Dataset entity with its nested tables and attributes, ready to be saved by the service layer.
     */
    public Dataset toEntity(String creatorUsername) {
        Dataset ds = new Dataset();
        ds.setCreatorUsername(creatorUsername);
        ds.setName(name);
        ds.setDescription(description);

        if (sharedUsernames != null) {
            ds.setSharedUsernames(new HashSet<>(sharedUsernames));
        }

        if (tables != null) {
            tables.forEach(t -> ds.getTables().add(t.toEntity(ds, creatorUsername)));
        }

        return ds;
    }
}
