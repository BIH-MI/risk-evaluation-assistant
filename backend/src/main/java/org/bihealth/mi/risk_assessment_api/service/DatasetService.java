package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.dataset.*;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.locks.EntityLockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for dataset metadata and schema management.
 *
 * <p>Datasets are aggregate roots that own tables and attributes. This service
 * applies access rules, converts request DTOs into entity graphs, and keeps the
 * nested table/attribute collections synchronized during updates.</p>
 */
@Service
@Transactional
public class DatasetService {
    // Root dataset repository.
    private final DatasetRepository datasetRepository;

    // Used to clear stale UI edit locks before deleting a dataset.
    private final EntityLockRepository lockRepository;

    /**
     * Creates the service with repositories for datasets and edit locks.
     */
    public DatasetService(DatasetRepository datasetRepository, EntityLockRepository lockRepository) {
        this.datasetRepository = datasetRepository;
        this.lockRepository = lockRepository;
    }

    /**
     * Returns datasets visible to the authenticated user.
     *
     * <p>Admins see all datasets. Regular users see datasets they created or
     * datasets explicitly shared with them.</p>
     */
    public List<DatasetResponseDTO> findDatasets(String username, boolean isAdmin) {
        if (isAdmin) {
            return datasetRepository.findAll().stream()
                    .map(DatasetResponseDTO::new).collect(Collectors.toList());
        }

        // Use a set to avoid duplicate results when a dataset is both owned and shared.
        Set<Dataset> combined = new LinkedHashSet<>(datasetRepository.findByCreatorUsername(username));
        combined.addAll(datasetRepository.findBySharedUsernamesContains(username));

        return combined.stream()
                .map(DatasetResponseDTO::new).collect(Collectors.toList());
    }

    /**
     * Creates a new dataset aggregate from the request DTO.
     */
    public DatasetResponseDTO addDataset(DatasetRequestDTO dto, String username) {
        Dataset ds = dto.toEntity(username);
        Dataset saved = datasetRepository.save(ds);
        return new DatasetResponseDTO(saved);
    }

    /**
     * Updates dataset metadata and synchronizes nested tables/attributes.
     *
     * <p>The incoming DTO is treated as the desired schema: missing existing
     * tables/attributes are removed, matching IDs are updated, and new entries
     * are appended.</p>
     */
    @Transactional
    public DatasetResponseDTO updateDataset(Long id, DatasetRequestDTO dto, String username, boolean isAdmin) {
        Dataset existing = datasetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + id));

        // Dataset edits are allowed for admins, owners, and explicitly shared users.
        if (!isAdmin && !existing.getCreatorUsername().equals(username)
                && !existing.getSharedUsernames().contains(username)) {
            throw new SecurityException("Not owner of dataset");
        }

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());

        List<String> incomingUsernames = dto.getSharedUsernames() != null ? dto.getSharedUsernames() : Collections.emptyList();
        existing.getSharedUsernames().clear();
        existing.getSharedUsernames().addAll(incomingUsernames);

        // Build lookups for current nested rows so updates can preserve entity IDs.
        Map<Long, DatasetTable> tableMap = existing.getTables().stream()
                .collect(Collectors.toMap(DatasetTable::getId, t -> t));
        List<DatasetTableRequestDTO> tableDTOs = dto.getTables() != null ? dto.getTables() : Collections.emptyList();

        // Remove tables that are no longer present in the request.
        existing.getTables().removeIf(tbl -> tableDTOs.stream().noneMatch(td -> td.getId() != null && td.getId().equals(tbl.getId())));

        for (DatasetTableRequestDTO td : tableDTOs) {
            if (td.getId() != null && tableMap.containsKey(td.getId())) {
                // Update an existing table and synchronize its attributes.
                DatasetTable tbl = tableMap.get(td.getId());
                tbl.setName(td.getName());

                Map<Long, DatasetTableAttribute> attrMap = tbl.getAttributes().stream()
                        .collect(Collectors.toMap(DatasetTableAttribute::getId, a -> a));
                List<DatasetTableAttributeRequestDTO> attrDTOs = td.getAttributes() != null ? td.getAttributes() : Collections.emptyList();

                // Remove attributes omitted from the request.
                tbl.getAttributes().removeIf(attr -> attrDTOs.stream().noneMatch(ad -> ad.getId() != null && ad.getId().equals(attr.getId())));

                for (DatasetTableAttributeRequestDTO ad : attrDTOs) {
                    if (ad.getId() != null && attrMap.containsKey(ad.getId())) {
                        // Update an existing column in place.
                        DatasetTableAttribute existingAttr = attrMap.get(ad.getId());
                        existingAttr.setName(ad.getName());
                        existingAttr.setDataType(DataType.valueOf(ad.getDataType()));
                        existingAttr.setExcluded(ad.getExcluded());
                    } else {
                        // Add a new column under the existing table.
                        tbl.getAttributes().add(ad.toEntity(tbl));
                    }
                }
            } else {
                // Add a new table with its nested attributes.
                existing.getTables().add(td.toEntity(existing, username));
            }
        }

        Dataset saved = datasetRepository.save(existing);
        return new DatasetResponseDTO(saved);
    }

    /**
     * Deletes a dataset after access checks and lock cleanup.
     */
    public void deleteDataset(Long id, String username, boolean isAdmin) {
        Dataset ds = datasetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + id));

        // Dataset deletion follows the same access rule as updates.
        if (!isAdmin && !ds.getCreatorUsername().equals(username)
                && !ds.getSharedUsernames().contains(username)) {
            throw new SecurityException("Not owner of dataset");
        }

        // Remove any active edit lock first so deleting the dataset does not
        // leave a lock row pointing at an entity that no longer exists.
        lockRepository.findByEntityTypeAndEntityId("DATASET", String.valueOf(id))
                .ifPresent(lockRepository::delete);

        datasetRepository.delete(ds);
    }
}
