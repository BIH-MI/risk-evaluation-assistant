package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoverySearchConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.qid.QidDiscoveryConfigurationResponseDTO;
import org.bihealth.mi.risk_assessment_api.exception.EntityNameAlreadyExistsException;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.qid.QidSearchType;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationVersionRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Lifecycle and validation logic for QID discovery configurations.
 *
 * <p>The persisted search object is the source of truth for profiling. Runtime
 * QID search code must receive one validated version explicitly instead of
 * falling back to local defaults.</p>
 */
@Service
@Transactional
@RequiredArgsConstructor
public class QidDiscoveryConfigurationService {

    private final QidDiscoveryConfigurationRepository configurationRepository;
    private final QidDiscoveryConfigurationVersionRepository versionRepository;
    private final DatasetRepository datasetRepository;

    @Transactional(readOnly = true)
    public List<QidDiscoveryConfigurationResponseDTO> listConfigurations(boolean activeOnly, boolean isAdmin) {
        List<QidDiscoveryConfiguration> configurations = activeOnly || !isAdmin
                ? configurationRepository.findByActiveTrue()
                : configurationRepository.findAllByOrderByLastModifiedDateDesc();

        return configurations.stream()
                .sorted(Comparator
                        .comparing(QidDiscoveryConfiguration::isDefaultConfiguration, Comparator.reverseOrder())
                        .thenComparing(QidDiscoveryConfiguration::isActive, Comparator.reverseOrder())
                        .thenComparing(configuration -> configuration.getLastModifiedDate() == null
                                ? configuration.getCreationDate()
                                : configuration.getLastModifiedDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .map(configuration -> toResponse(
                        configuration,
                        datasetRepository.countByQidDiscoveryConfigurationId(configuration.getId())
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public QidDiscoveryConfigurationResponseDTO getConfiguration(Long id, boolean isAdmin) {
        QidDiscoveryConfiguration configuration = configurationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration not found: " + id));

        if (!isAdmin && !configuration.isActive()) {
            throw new EntityNotFoundException("QID discovery configuration not found: " + id);
        }

        return toResponse(configuration, datasetRepository.countByQidDiscoveryConfigurationId(configuration.getId()));
    }

    public QidDiscoveryConfigurationResponseDTO createConfiguration(
            QidDiscoveryConfigurationRequestDTO dto,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);
        validateUniqueName(dto.getName(), null);

        QidDiscoveryConfiguration configuration = new QidDiscoveryConfiguration();
        configuration.setCreatorUsername(username);
        configuration.setName(requiredName(dto.getName()));
        configuration.setDescription(trimToNull(dto.getDescription()));
        configuration.setActive(dto.getActive() == null || dto.getActive());
        configuration.setDefaultConfiguration(Boolean.TRUE.equals(dto.getDefaultConfiguration()));

        if (configuration.isDefaultConfiguration() && !configuration.isActive()) {
            throw new IllegalArgumentException("The default QID discovery configuration must be active.");
        }

        QidDiscoveryConfigurationVersion version = buildVersion(dto, username, 1);
        configuration.addVersion(version);

        if (configuration.isDefaultConfiguration()) {
            clearOtherDefaults(null);
        }

        QidDiscoveryConfiguration saved = saveConfigurationHandlingDuplicateName(configuration, configuration.getName());
        return toResponse(saved, 0);
    }

    public QidDiscoveryConfigurationResponseDTO updateConfiguration(
            Long id,
            QidDiscoveryConfigurationRequestDTO dto,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);

        QidDiscoveryConfiguration configuration = configurationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration not found: " + id));

        validateUniqueName(dto.getName(), id);

        boolean nextActive = dto.getActive() == null || dto.getActive();
        boolean nextDefault = Boolean.TRUE.equals(dto.getDefaultConfiguration());

        if (nextDefault && !nextActive) {
            throw new IllegalArgumentException("The default QID discovery configuration must be active.");
        }

        configuration.setName(requiredName(dto.getName()));
        configuration.setDescription(trimToNull(dto.getDescription()));
        configuration.setActive(nextActive);
        configuration.setDefaultConfiguration(nextActive && nextDefault);

        QidDiscoveryConfigurationVersion version = buildVersion(
                dto,
                username,
                configuration.getCurrentVersion() + 1
        );
        configuration.addVersion(version);

        if (configuration.isDefaultConfiguration()) {
            clearOtherDefaults(configuration.getId());
        }

        QidDiscoveryConfiguration saved = saveConfigurationHandlingDuplicateName(configuration, configuration.getName());
        return toResponse(saved, datasetRepository.countByQidDiscoveryConfigurationId(saved.getId()));
    }

    public QidDiscoveryConfigurationResponseDTO duplicateConfiguration(
            Long id,
            String requestedName,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);

        QidDiscoveryConfiguration source = configurationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration not found: " + id));
        QidDiscoveryConfigurationVersion sourceVersion = getCurrentVersion(source);
        String duplicateName = uniqueDuplicateName(
                requestedName == null || requestedName.trim().isEmpty()
                        ? source.getName() + " Copy"
                        : requestedName
        );

        QidDiscoveryConfigurationRequestDTO dto = new QidDiscoveryConfigurationRequestDTO();
        dto.setName(duplicateName);
        dto.setDescription(sourceVersion.getDescription());
        dto.setActive(true);
        dto.setDefaultConfiguration(false);
        dto.setSearch(toRequestSearch(sourceVersion));

        return createConfiguration(dto, username, true);
    }

    public QidDiscoveryConfigurationResponseDTO archiveConfiguration(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        QidDiscoveryConfiguration configuration = configurationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration not found: " + id));

        configuration.setActive(false);
        configuration.setDefaultConfiguration(false);

        QidDiscoveryConfiguration saved = configurationRepository.save(configuration);
        return toResponse(saved, datasetRepository.countByQidDiscoveryConfigurationId(saved.getId()));
    }

    public QidDiscoveryConfigurationResponseDTO setDefault(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        QidDiscoveryConfiguration configuration = configurationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration not found: " + id));

        if (!configuration.isActive()) {
            throw new IllegalArgumentException("Archived QID discovery configurations cannot be set as default.");
        }

        clearOtherDefaults(configuration.getId());
        configuration.setDefaultConfiguration(true);

        QidDiscoveryConfiguration saved = configurationRepository.save(configuration);
        return toResponse(saved, datasetRepository.countByQidDiscoveryConfigurationId(saved.getId()));
    }

    @Transactional(readOnly = true)
    public QidDiscoveryConfigurationVersion getSelectedActiveVersion(Long configurationId) {
        QidDiscoveryConfiguration configuration;
        if (configurationId == null) {
            configuration = getDefaultActiveConfiguration();
        } else {
            configuration = configurationRepository.findById(configurationId)
                    .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration not found: " + configurationId));
        }

        if (!configuration.isActive()) {
            throw new IllegalArgumentException("Archived QID discovery configurations cannot be selected for new profiling sessions.");
        }

        return getCurrentVersion(configuration);
    }

    @Transactional(readOnly = true)
    public QidDiscoveryConfigurationVersion getSelectedVersion(Long configurationId, Long versionId) {
        if (versionId == null) {
            return getSelectedActiveVersion(configurationId);
        }

        QidDiscoveryConfigurationVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new EntityNotFoundException("QID discovery configuration version not found: " + versionId));

        if (configurationId != null && !Objects.equals(version.getConfiguration().getId(), configurationId)) {
            throw new IllegalArgumentException("Selected QID discovery configuration version does not belong to the selected configuration.");
        }

        return version;
    }

    @Transactional(readOnly = true)
    public QidDiscoveryConfigurationVersion getDefaultActiveVersion() {
        return getCurrentVersion(getDefaultActiveConfiguration());
    }

    public QidDiscoveryConfigurationResponseDTO toSnapshotResponse(QidDiscoveryConfigurationVersion version) {
        return new QidDiscoveryConfigurationResponseDTO(version);
    }

    private QidDiscoveryConfigurationResponseDTO toResponse(
            QidDiscoveryConfiguration configuration,
            long datasetCount
    ) {
        return new QidDiscoveryConfigurationResponseDTO(
                configuration,
                getCurrentVersion(configuration),
                datasetCount
        );
    }

    private QidDiscoveryConfiguration getDefaultActiveConfiguration() {
        return configurationRepository.findFirstByDefaultConfigurationTrueAndActiveTrueOrderByIdAsc()
                .or(configurationRepository::findFirstByActiveTrueOrderByIdAsc)
                .orElseThrow(() -> new IllegalStateException("No active QID discovery configuration is configured."));
    }

    private QidDiscoveryConfigurationVersion getCurrentVersion(QidDiscoveryConfiguration configuration) {
        return configuration.getCurrentVersionEntity()
                .or(() -> versionRepository.findTopByConfigurationIdOrderByVersionNumberDesc(configuration.getId()))
                .orElseThrow(() -> new IllegalStateException("QID discovery configuration has no versions: " + configuration.getId()));
    }

    private QidDiscoveryConfigurationVersion buildVersion(
            QidDiscoveryConfigurationRequestDTO dto,
            String username,
            int versionNumber
    ) {
        QidDiscoverySearchConfigurationRequestDTO search = dto.getSearch();
        if (search == null) {
            throw new IllegalArgumentException("QID discovery search configuration is required.");
        }

        QidSearchType searchType = parseSearchType(search.getSearchType());
        Integer exactSearchMaxCandidateCount = validateOptionalInteger(
                search.getExactSearchMaxCandidateCount(),
                "Exact Search Maximum Candidate Count",
                1
        );
        Integer beamWidth = validateOptionalInteger(search.getBeamWidth(), "Beam Width", 1);
        Double minImprovement = validateOptionalDouble(search.getMinImprovement(), "Minimum Improvement", 0.0);
        Integer stagnationDepthLimit = validateOptionalInteger(search.getStagnationDepthLimit(), "Stagnation Depth Limit", 1);

        if (searchType == QidSearchType.AUTOMATIC && exactSearchMaxCandidateCount == null) {
            throw new IllegalArgumentException("Exact Search Maximum Candidate Count is required when QID Search Type is Automatic.");
        }

        if (searchType == QidSearchType.AUTOMATIC || searchType == QidSearchType.BEAM) {
            if (beamWidth == null) {
                throw new IllegalArgumentException("Beam Width is required when Beam Search may be active.");
            }
            if (minImprovement == null) {
                throw new IllegalArgumentException("Minimum Improvement is required when Beam Search may be active.");
            }
            if (stagnationDepthLimit == null) {
                throw new IllegalArgumentException("Stagnation Depth Limit is required when Beam Search may be active.");
            }
        }

        Double distinctionWeight = validateRequiredDouble(search.getDistinctionWeight(), "Distinction Weight");
        Double separationWeight = validateRequiredDouble(search.getSeparationWeight(), "Separation Weight");
        if (distinctionWeight < 0) {
            throw new IllegalArgumentException("Distinction Weight must be greater than or equal to 0.");
        }
        if (separationWeight < 0) {
            throw new IllegalArgumentException("Separation Weight must be greater than or equal to 0.");
        }
        if (distinctionWeight + separationWeight <= 0) {
            throw new IllegalArgumentException("Distinction Weight and Separation Weight cannot both be 0.");
        }

        QidDiscoveryConfigurationVersion version = new QidDiscoveryConfigurationVersion();
        version.setCreatorUsername(username);
        version.setName(requiredName(dto.getName()));
        version.setDescription(trimToNull(dto.getDescription()));
        version.setVersionNumber(versionNumber);
        version.setSearchType(searchType);
        version.setExactSearchMaxCandidateCount(exactSearchMaxCandidateCount);
        version.setMaxCombinationSize(validateRequiredInteger(search.getMaxCombinationSize(), "Maximum Combination Size", 1));
        version.setBeamWidth(beamWidth);
        version.setMinImprovement(minImprovement);
        version.setStagnationDepthLimit(stagnationDepthLimit);
        version.setTargetDistinction(validateRequiredRatio(search.getTargetDistinction(), "Target Distinction"));
        version.setTargetSeparation(validateRequiredRatio(search.getTargetSeparation(), "Target Separation"));
        version.setDistinctionWeight(distinctionWeight);
        version.setSeparationWeight(separationWeight);
        version.setAttributeCountPenalty(validateRequiredDouble(search.getAttributeCountPenalty(), "Attribute Count Penalty"));
        if (version.getAttributeCountPenalty() < 0) {
            throw new IllegalArgumentException("Attribute Count Penalty must be greater than or equal to 0.");
        }
        version.setMaxPersistedCombinations(validateRequiredInteger(search.getMaxPersistedCombinations(), "Maximum Retained Combinations", 1));

        return version;
    }

    private QidDiscoverySearchConfigurationRequestDTO toRequestSearch(QidDiscoveryConfigurationVersion version) {
        return new QidDiscoverySearchConfigurationRequestDTO(
                version.getSearchType().name(),
                version.getExactSearchMaxCandidateCount(),
                version.getMaxCombinationSize(),
                version.getBeamWidth(),
                version.getMinImprovement(),
                version.getStagnationDepthLimit(),
                version.getTargetDistinction(),
                version.getTargetSeparation(),
                version.getDistinctionWeight(),
                version.getSeparationWeight(),
                version.getAttributeCountPenalty(),
                version.getMaxPersistedCombinations()
        );
    }

    private QidSearchType parseSearchType(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("QID Search Type is required.");
        }

        try {
            return QidSearchType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("QID Search Type must be one of AUTOMATIC, EXACT, or BEAM.");
        }
    }

    private Integer validateRequiredInteger(Integer value, String label, int minValue) {
        Integer normalized = validateOptionalInteger(value, label, minValue);
        if (normalized == null) {
            throw new IllegalArgumentException(label + " is required.");
        }
        return normalized;
    }

    private Integer validateOptionalInteger(Integer value, String label, int minValue) {
        if (value == null) {
            return null;
        }
        if (value < minValue) {
            throw new IllegalArgumentException(label + " must be greater than or equal to " + minValue + ".");
        }
        return value;
    }

    private Double validateRequiredDouble(Double value, String label) {
        Double normalized = validateOptionalDouble(value, label, null);
        if (normalized == null) {
            throw new IllegalArgumentException(label + " is required.");
        }
        return normalized;
    }

    private Double validateOptionalDouble(Double value, String label, Double minValue) {
        if (value == null) {
            return null;
        }
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException(label + " must be a valid number.");
        }
        if (minValue != null && value < minValue) {
            throw new IllegalArgumentException(label + " must be greater than or equal to " + minValue + ".");
        }
        return value;
    }

    private Double validateRequiredRatio(Double value, String label) {
        Double normalized = validateRequiredDouble(value, label);
        if (normalized < 0 || normalized > 1) {
            throw new IllegalArgumentException(label + " must be between 0 and 1.");
        }
        return normalized;
    }

    private void validateUniqueName(String rawName, Long excludeId) {
        String name = requiredName(rawName);
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        boolean exists = excludeId == null
                ? configurationRepository.existsByNormalizedName(normalizedName)
                : configurationRepository.existsByNormalizedNameAndIdNot(normalizedName, excludeId);
        if (exists) {
            throw new EntityNameAlreadyExistsException("QID discovery configuration", name);
        }
    }

    private String uniqueDuplicateName(String baseName) {
        String cleanedBase = requiredName(baseName);
        if (!configurationRepository.existsByNormalizedName(EntityNameNormalizer.normalizeForComparison(cleanedBase))) {
            return cleanedBase;
        }

        int copyNumber = 2;
        while (true) {
            String candidate = cleanedBase + " " + copyNumber;
            if (!configurationRepository.existsByNormalizedName(EntityNameNormalizer.normalizeForComparison(candidate))) {
                return candidate;
            }
            copyNumber++;
        }
    }

    private void clearOtherDefaults(Long excludeId) {
        configurationRepository.findAll().stream()
                .filter(configuration -> excludeId == null || !Objects.equals(configuration.getId(), excludeId))
                .filter(QidDiscoveryConfiguration::isDefaultConfiguration)
                .forEach(configuration -> {
                    configuration.setDefaultConfiguration(false);
                    configurationRepository.save(configuration);
                });
    }

    private void requireAdmin(boolean isAdmin) {
        if (!isAdmin) {
            throw new SecurityException("Only administrators can modify QID discovery configurations.");
        }
    }

    private String requiredName(String value) {
        String name = EntityNameNormalizer.normalizeForStorage(value);
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Name is required.");
        }
        return name;
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private QidDiscoveryConfiguration saveConfigurationHandlingDuplicateName(
            QidDiscoveryConfiguration configuration,
            String name
    ) {
        try {
            return configurationRepository.saveAndFlush(configuration);
        } catch (DataIntegrityViolationException ex) {
            if (isConfigurationNameUniqueConstraintViolation(ex)) {
                throw new EntityNameAlreadyExistsException("QID discovery configuration", name);
            }
            throw ex;
        }
    }

    private boolean isConfigurationNameUniqueConstraintViolation(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = NestedExceptionUtils.getMostSpecificCause(ex);
        String message = mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage();
        return message != null && message.contains(NamedResourceConstraints.QID_DISCOVERY_CONFIGURATIONS_NORMALIZED_NAME);
    }
}
