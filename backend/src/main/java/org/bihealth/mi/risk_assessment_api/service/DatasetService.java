package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.dataset.*;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class for managing all business logic for Dataset entities.
 * This includes creating, retrieving, and deleting datasets, as well as complex
 * in-place updates of a dataset's nested tables and attributes.
 */
@Service
@Transactional
public class DatasetService {
    private final DatasetRepository datasetRepository;

    public DatasetService(DatasetRepository datasetRepository) {
        this.datasetRepository = datasetRepository;
    }

    /**
     * Finds all datasets a user can access, either as the creator or through sharing.
     *
     * @param username The username of the user.
     * @return A list of DatasetResponseDTOs.
     */
    public List<DatasetResponseDTO> findDatasetsByUsername(String username) {
        Set<Dataset> combined = new LinkedHashSet<>(datasetRepository.findByCreatorUsername(username));
        combined.addAll(datasetRepository.findBySharedUsernamesContains(username));

        return combined.stream()
                .map(DatasetResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new Dataset from a DTO.
     *
     * @param dto      The DTO containing the dataset details.
     * @param username The username of the creator.
     * @return A DTO representing the newly created dataset.
     */
    public DatasetResponseDTO addDataset(DatasetRequestDTO dto, String username) {
        Dataset ds = dto.toEntity(username);
        Dataset saved = datasetRepository.save(ds);
        return new DatasetResponseDTO(saved);
    }

    /**
     * Performs a complex in-place update of a Dataset and its entire hierarchy of
     * tables and attributes. This method syncs the state of the entity graph
     * to match the state provided in the DTO.
     *
     * @param id       The ID of the dataset to update.
     * @param dto      The DTO containing the desired state of the dataset.
     * @param username The username for the authorization check.
     * @return A DTO representing the updated dataset.
     */
    @Transactional
    public DatasetResponseDTO updateDataset(Integer id, DatasetRequestDTO dto, String username) {
        Dataset existing = datasetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + id));

        if (!existing.getCreatorUsername().equals(username)
                && !existing.getSharedUsernames().contains(username)) {
            throw new SecurityException("Not owner of dataset");
        }

        // --- Update basic fields ---
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());

        // --- Sync shared-usernames list ---
        List<String> incomingUsernames = dto.getSharedUsernames() != null
                ? dto.getSharedUsernames()
                : Collections.emptyList();
        existing.getSharedUsernames().clear();
        existing.getSharedUsernames().addAll(incomingUsernames);

        // --- Sync tables: preserve existing table & attribute IDs ---
        Map<Integer, DatasetTable> tableMap = existing.getTables().stream()
                .collect(Collectors.toMap(DatasetTable::getId, t -> t));
        List<DatasetTableRequestDTO> tableDTOs = dto.getTables() != null
                ? dto.getTables()
                : Collections.emptyList();

        // Remove tables not present in incoming DTO
        existing.getTables().removeIf(tbl ->
                tableDTOs.stream()
                        .noneMatch(td -> td.getId() != null && td.getId().equals(tbl.getId()))
        );

        // For each incoming table DTO, update or create
        for (DatasetTableRequestDTO td : tableDTOs) {
            if (td.getId() != null && tableMap.containsKey(td.getId())) {
                // Existing table: update its name and attributes
                DatasetTable tbl = tableMap.get(td.getId());
                tbl.setName(td.getName());

                // Sync attributes: preserve existing IDs
                Map<Integer, DatasetTableAttribute> attrMap = tbl.getAttributes().stream()
                        .collect(Collectors.toMap(DatasetTableAttribute::getId, a -> a));
                List<DatasetTableAttributeRequestDTO> attrDTOs = td.getAttributes() != null
                        ? td.getAttributes()
                        : Collections.emptyList();

                // Remove attributes not in DTO
                tbl.getAttributes().removeIf(attr ->
                        attrDTOs.stream()
                                .noneMatch(ad -> ad.getId() != null && ad.getId().equals(attr.getId()))
                );

                // Update existing or add new attributes
                for (DatasetTableAttributeRequestDTO ad : attrDTOs) {
                    if (ad.getId() != null && attrMap.containsKey(ad.getId())) {
                        DatasetTableAttribute existingAttr = attrMap.get(ad.getId());
                        existingAttr.setName(ad.getName());
                        existingAttr.setDataType(DataType.valueOf(ad.getDataType()));
                        existingAttr.setExcluded(ad.getExcluded());
                    } else {
                        // New attribute
                        tbl.getAttributes().add(ad.toEntity(tbl));
                    }
                }

            } else {
                // New table: convert DTO to entity and add
                existing.getTables().add(td.toEntity(existing, username));
            }
        }

        // Persist and return DTO
        Dataset saved = datasetRepository.save(existing);
        return new DatasetResponseDTO(saved);
    }

    /**
     * Deletes a Dataset by its ID after verifying ownership.
     *
     * @param id       The ID of the dataset to delete.
     * @param username The username for the authorization check.
     */
    public void deleteDataset(Integer id, String username) {
        Dataset ds = datasetRepository.findById(id)
                .orElseThrow(() ->
                        new EntityNotFoundException("Dataset not found: " + id)
                );
        if (!ds.getCreatorUsername().equals(username)
            && !ds.getSharedUsernames().contains(username)) {
            throw new SecurityException("Not owner of dataset");
        }
        datasetRepository.delete(ds);
    }
}
