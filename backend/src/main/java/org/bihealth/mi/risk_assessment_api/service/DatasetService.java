package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.dataset.*;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetResponseDTO;
import org.bihealth.mi.risk_assessment_api.exception.DatasetNameAlreadyExistsException;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.locks.EntityLockRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
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

    private final QidDiscoveryConfigurationService qidDiscoveryConfigurationService;

    private final AiModelRegistry aiModelRegistry;

    /**
     * Creates the service with repositories for datasets and edit locks.
     */
    public DatasetService(
            DatasetRepository datasetRepository,
            EntityLockRepository lockRepository,
            QidDiscoveryConfigurationService qidDiscoveryConfigurationService,
            AiModelRegistry aiModelRegistry
    ) {
        this.datasetRepository = datasetRepository;
        this.lockRepository = lockRepository;
        this.qidDiscoveryConfigurationService = qidDiscoveryConfigurationService;
        this.aiModelRegistry = aiModelRegistry;
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
        String normalizedName = requiredDatasetName(dto.getName());
        ensureDatasetNameAvailable(normalizedName, null);

        Dataset ds = dto.toEntity(username);
        ds.setName(normalizedName);
        applyQidDiscoveryConfiguration(ds, dto, true);
        applyAiScreeningProvenance(ds, dto.getAiScreening());
        ds.setDatasetType(DatasetType.fromName(dto.getDatasetType()));
        applyAiDatasetTypeSuggestion(ds, dto);
        Dataset saved = saveDatasetHandlingDuplicateName(ds, normalizedName);
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

        assertCanEditDataset(existing, username, isAdmin);
        String normalizedName = requiredDatasetName(dto.getName());
        ensureDatasetNameAvailable(normalizedName, id);

        updateDatasetMetadata(existing, dto, normalizedName);
        applyQidDiscoveryConfiguration(existing, dto, false);
        replaceSharedUsers(existing, dto.getSharedUsernames());
        syncTables(existing, dto.getTables(), username);

        Dataset saved = saveDatasetHandlingDuplicateName(existing, normalizedName);
        return new DatasetResponseDTO(saved);
    }

    /**
     * Dataset edits are allowed for admins, owners, and explicitly shared users.
     * Edit locks use the same rule.
     */
    public boolean canEditDataset(Dataset dataset, String username, boolean isAdmin) {
        return isAdmin
                || dataset.getCreatorUsername().equals(username)
                || dataset.getSharedUsernames().contains(username);
    }

    private void assertCanEditDataset(Dataset dataset, String username, boolean isAdmin) {
        if (!canEditDataset(dataset, username, isAdmin)) {
            throw new SecurityException("Not owner of dataset");
        }
    }

    private void updateDatasetMetadata(Dataset dataset, DatasetRequestDTO dto, String normalizedName) {
        dataset.setName(normalizedName);
        dataset.setDescription(dto.getDescription());
        dataset.setDatasetType(DatasetType.fromName(dto.getDatasetType()));
    }

    private void replaceSharedUsers(Dataset dataset, List<String> incomingUsernames) {
        dataset.getSharedUsernames().clear();
        dataset.getSharedUsernames().addAll(
                incomingUsernames != null ? incomingUsernames : Collections.emptyList()
        );
    }

    private void syncTables(Dataset dataset, List<DatasetTableRequestDTO> incomingTables, String username) {
        List<DatasetTableRequestDTO> tableDTOs =
                incomingTables != null ? incomingTables : Collections.emptyList();
        Map<Long, DatasetTable> tablesById = dataset.getTables().stream()
                .collect(Collectors.toMap(DatasetTable::getId, table -> table));
        Set<Long> incomingTableIds = tableDTOs.stream()
                .map(DatasetTableRequestDTO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        dataset.getTables().removeIf(table -> !incomingTableIds.contains(table.getId()));

        for (DatasetTableRequestDTO tableDTO : tableDTOs) {
            DatasetTable existingTable = tableDTO.getId() == null
                    ? null
                    : tablesById.get(tableDTO.getId());

            if (existingTable != null) {
                syncExistingTable(existingTable, tableDTO);
            } else {
                dataset.getTables().add(tableDTO.toEntity(dataset, username));
            }
        }
    }

    private void syncExistingTable(DatasetTable table, DatasetTableRequestDTO tableDTO) {
        table.setName(tableDTO.getName());
        syncAttributes(table, tableDTO.getAttributes());
    }

    private void syncAttributes(DatasetTable table, List<DatasetTableAttributeRequestDTO> incomingAttributes) {
        List<DatasetTableAttributeRequestDTO> attributeDTOs =
                incomingAttributes != null ? incomingAttributes : Collections.emptyList();
        Map<Long, DatasetTableAttribute> attributesById = table.getAttributes().stream()
                .collect(Collectors.toMap(DatasetTableAttribute::getId, attribute -> attribute));
        Set<Long> incomingAttributeIds = attributeDTOs.stream()
                .map(DatasetTableAttributeRequestDTO::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        table.getAttributes().removeIf(attribute -> !incomingAttributeIds.contains(attribute.getId()));

        for (DatasetTableAttributeRequestDTO attributeDTO : attributeDTOs) {
            DatasetTableAttribute existingAttribute = attributeDTO.getId() == null
                    ? null
                    : attributesById.get(attributeDTO.getId());

            if (existingAttribute != null) {
                updateExistingAttribute(existingAttribute, attributeDTO);
            } else {
                table.getAttributes().add(attributeDTO.toEntity(table));
            }
        }
    }

    private void updateExistingAttribute(
            DatasetTableAttribute attribute,
            DatasetTableAttributeRequestDTO attributeDTO
    ) {
        attributeDTO.applySchemaTo(attribute);
        if (attributeDTO.hasAnyStatistics()) {
            attributeDTO.applyStatisticsTo(attribute);
        }
        attributeDTO.applyDirectIdentifierEvidenceSummaryTo(attribute);
        attributeDTO.applySubsetEvidenceTo(attribute);
        attributeDTO.applyScreeningTo(attribute);
    }

    private String requiredDatasetName(String value) {
        String normalizedName = EntityNameNormalizer.normalizeForStorage(value);
        if (normalizedName == null || normalizedName.isEmpty()) {
            throw new IllegalArgumentException("Dataset name is required.");
        }
        return normalizedName;
    }

    private void ensureDatasetNameAvailable(String normalizedName, Long excludeId) {
        String normalizedNameKey = EntityNameNormalizer.normalizeForComparison(normalizedName);
        boolean exists = excludeId == null
                ? datasetRepository.existsByNormalizedName(normalizedNameKey)
                : datasetRepository.existsByNormalizedNameAndIdNot(normalizedNameKey, excludeId);

        if (exists) {
            throw new DatasetNameAlreadyExistsException(normalizedName);
        }
    }

    private Dataset saveDatasetHandlingDuplicateName(Dataset dataset, String normalizedName) {
        try {
            return datasetRepository.saveAndFlush(dataset);
        } catch (DataIntegrityViolationException ex) {
            if (isDatasetNameUniqueConstraintViolation(ex)) {
                throw new DatasetNameAlreadyExistsException(normalizedName);
            }
            throw ex;
        }
    }

    private boolean isDatasetNameUniqueConstraintViolation(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = NestedExceptionUtils.getMostSpecificCause(ex);
        String message = mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage();
        return message != null
                && message.contains(DatasetNameAlreadyExistsException.DATASET_NAME_UNIQUE_CONSTRAINT);
    }

    private void applyQidDiscoveryConfiguration(
            Dataset dataset,
            DatasetRequestDTO dto,
            boolean useDefaultWhenMissing
    ) {
        if (dto.getQidDiscoveryConfigurationId() == null
                && dto.getQidDiscoveryConfigurationVersionId() == null
                && !useDefaultWhenMissing) {
            return;
        }

        QidDiscoveryConfigurationVersion version = qidDiscoveryConfigurationService.getSelectedVersion(
                dto.getQidDiscoveryConfigurationId(),
                dto.getQidDiscoveryConfigurationVersionId()
        );
        dataset.setQidDiscoveryConfiguration(version.getConfiguration());
        dataset.setQidDiscoveryConfigurationVersion(version);
    }

    /**
     * Records the AI model that screened the column names, once, at creation. The browser reports
     * it; the model must be allowed (and AI screening enabled) by the dataset's QID discovery
     * configuration version, and the registry-controlled metadata must match the registry
     * (AiModelRegistry#verifyScreeningProvenance). The stored validation status comes from the
     * registry, so a client can never record an unapproved model as approved.
     */
    private void applyAiScreeningProvenance(Dataset dataset, DatasetAiScreeningRequestDTO aiScreening) {
        if (aiScreening == null || aiScreening.getModelId() == null || aiScreening.getModelId().isBlank()) {
            return;
        }
        AiModelRegistry.ScreeningProvenance provenance = aiModelRegistry.verifyScreeningProvenance(
                aiScreening.getModelId(),
                aiScreening.getRepository(),
                aiScreening.getRevision(),
                aiScreening.getDtype(),
                aiScreening.getPromptVersion(),
                aiScreening.getThresholdsVersion(),
                aiScreening.getValidationStatus()
        );
        QidDiscoveryConfigurationVersion version = dataset.getQidDiscoveryConfigurationVersion();
        if (version == null
                || !qidDiscoveryConfigurationService.getEffectiveAiAllowedModelIds(version).contains(provenance.modelId())) {
            throw new IllegalArgumentException(
                    "AI model " + provenance.modelId() + " is not allowed by the selected QID discovery configuration.");
        }
        dataset.setAiScreeningModelId(provenance.modelId());
        dataset.setAiScreeningModelRepository(provenance.repository());
        dataset.setAiScreeningModelRevision(provenance.revision());
        dataset.setAiScreeningModelDtype(provenance.dtype());
        dataset.setAiScreeningPromptVersion(provenance.promptVersion());
        dataset.setAiScreeningThresholdsVersion(provenance.thresholdsVersion());
        dataset.setAiScreeningValidationStatus(provenance.validationStatus());
    }

    /**
     * Records the AI model's dataset-type suggestion, once, at creation. It is
     * kept only together with recorded AI screening provenance, since only
     * that model can have produced it.
     */
    private void applyAiDatasetTypeSuggestion(Dataset dataset, DatasetRequestDTO dto) {
        DatasetType suggestion = DatasetType.fromName(dto.getAiSuggestedDatasetType());
        if (suggestion == null || dataset.getAiScreeningModelId() == null) {
            return;
        }
        Double score = dto.getAiSuggestedDatasetTypeScore();
        if (score == null || score.isNaN() || score < 0 || score > 1) {
            throw new IllegalArgumentException("Invalid AI dataset type score.");
        }
        dataset.setAiSuggestedDatasetType(suggestion);
        dataset.setAiSuggestedDatasetTypeScore(score);
    }

    /**
     * Deletes a dataset after access checks and lock cleanup.
     */
    public void deleteDataset(Long id, String username, boolean isAdmin) {
        Dataset ds = datasetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + id));

        // Dataset deletion follows the same access rule as updates.
        assertCanEditDataset(ds, username, isAdmin);

        // Remove any active edit lock first so deleting the dataset does not
        // leave a lock row pointing at an entity that no longer exists.
        lockRepository.findByEntityTypeAndEntityId("DATASET", String.valueOf(id))
                .ifPresent(lockRepository::delete);

        datasetRepository.delete(ds);
    }
}
