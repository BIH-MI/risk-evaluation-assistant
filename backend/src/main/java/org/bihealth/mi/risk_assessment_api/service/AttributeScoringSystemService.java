package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringOptionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringSystemRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.scoring.AttributeScoringSystemResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringDimension;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringOption;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.scoring.AttributeScoringSystemRepository;
import org.bihealth.mi.risk_assessment_api.repository.scoring.AttributeScoringSystemVersionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lifecycle and validation logic for configurable attribute-level scoring
 * systems.
 *
 * <p>Administrators edit scoring systems through this service. Each edit writes
 * a new immutable version, while dataset assessments keep references to the
 * version that was selected when they were created.</p>
 */
@Service
@Transactional
@RequiredArgsConstructor
public class AttributeScoringSystemService {

    private static final int MAX_SCORE_OPTIONS_PER_DIMENSION = 5;
    private static final Set<String> PREDEFINED_SCORE_LABELS = Set.of(
            "low",
            "moderate",
            "high",
            "very high",
            "critical"
    );

    private final AttributeScoringSystemRepository scoringSystemRepository;
    private final AttributeScoringSystemVersionRepository scoringSystemVersionRepository;
    private final DatasetAssessmentRepository datasetAssessmentRepository;

    @Transactional(readOnly = true)
    public List<AttributeScoringSystemResponseDTO> listSystems(boolean activeOnly, boolean isAdmin) {
        // Non-admin users can only discover active scoring systems.
        List<AttributeScoringSystem> systems = activeOnly || !isAdmin
                ? scoringSystemRepository.findByActiveTrue()
                : scoringSystemRepository.findAllByOrderByLastModifiedDateDesc();

        return systems.stream()
                .sorted(Comparator.comparing(AttributeScoringSystem::isDefaultSystem, Comparator.reverseOrder())
                        .thenComparing(AttributeScoringSystem::isActive, Comparator.reverseOrder())
                        .thenComparing(system -> system.getLastModifiedDate() == null
                                ? system.getCreationDate()
                                : system.getLastModifiedDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .map(system -> toResponse(system, datasetAssessmentRepository.countByAttributeScoringSystemId(system.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AttributeScoringSystemResponseDTO getSystem(Long id, boolean isAdmin) {
        AttributeScoringSystem system = scoringSystemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attribute scoring system not found: " + id));

        if (!isAdmin && !system.isActive()) {
            throw new EntityNotFoundException("Attribute scoring system not found: " + id);
        }

        return toResponse(system, datasetAssessmentRepository.countByAttributeScoringSystemId(system.getId()));
    }

    public AttributeScoringSystemResponseDTO createSystem(
            AttributeScoringSystemRequestDTO dto,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);
        validateUniqueName(dto.getName(), null);

        AttributeScoringSystem system = new AttributeScoringSystem();
        system.setCreatorUsername(username);
        system.setName(requiredName(dto.getName()));
        system.setDescription(trimToNull(dto.getDescription()));
        system.setActive(dto.getActive() == null || dto.getActive());
        system.setDefaultSystem(Boolean.TRUE.equals(dto.getDefaultSystem()));

        // A default system must be selectable for new assessments.
        if (system.isDefaultSystem() && !system.isActive()) {
            throw new IllegalArgumentException("The default scoring system must be active.");
        }

        AttributeScoringSystemVersion version = buildVersion(dto, username, 1);
        system.addVersion(version);

        if (system.isDefaultSystem()) {
            clearOtherDefaults(null);
        }

        AttributeScoringSystem saved = scoringSystemRepository.save(system);
        return toResponse(saved, 0);
    }

    public AttributeScoringSystemResponseDTO updateSystem(
            Long id,
            AttributeScoringSystemRequestDTO dto,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);

        AttributeScoringSystem system = scoringSystemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attribute scoring system not found: " + id));

        validateUniqueName(dto.getName(), id);

        boolean nextActive = dto.getActive() == null || dto.getActive();
        boolean nextDefault = Boolean.TRUE.equals(dto.getDefaultSystem());

        // Archive and default are mutually exclusive states.
        if (nextDefault && !nextActive) {
            throw new IllegalArgumentException("The default scoring system must be active.");
        }

        system.setName(requiredName(dto.getName()));
        system.setDescription(trimToNull(dto.getDescription()));
        system.setActive(nextActive);
        system.setDefaultSystem(nextActive && nextDefault);

        int nextVersionNumber = system.getCurrentVersion() + 1;
        AttributeScoringSystemVersion version = buildVersion(dto, username, nextVersionNumber);
        system.addVersion(version);

        if (system.isDefaultSystem()) {
            clearOtherDefaults(system.getId());
        }

        AttributeScoringSystem saved = scoringSystemRepository.save(system);
        return toResponse(saved, datasetAssessmentRepository.countByAttributeScoringSystemId(saved.getId()));
    }

    public AttributeScoringSystemResponseDTO duplicateSystem(
            Long id,
            String requestedName,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);

        AttributeScoringSystem source = scoringSystemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attribute scoring system not found: " + id));
        AttributeScoringSystemVersion sourceVersion = getCurrentVersion(source);

        /*
         * Duplicate from the current version rather than from root metadata so
         * the copied system preserves the exact scoring options and thresholds.
         */
        String duplicateName = uniqueDuplicateName(
                requestedName == null || requestedName.trim().isEmpty()
                        ? source.getName() + " Copy"
                        : requestedName
        );

        AttributeScoringSystemRequestDTO dto = new AttributeScoringSystemRequestDTO();
        dto.setName(duplicateName);
        dto.setDescription(sourceVersion.getDescription());
        dto.setActive(true);
        dto.setDefaultSystem(false);
        dto.setDefaultIdentifiabilityThreshold(sourceVersion.getDefaultIdentifiabilityThreshold());
        dto.setDefaultSensitivityThreshold(sourceVersion.getDefaultSensitivityThreshold());
        dto.setScoreOptions(toRequestOptions(sourceVersion));

        return createSystem(dto, username, true);
    }

    public AttributeScoringSystemResponseDTO archiveSystem(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        AttributeScoringSystem system = scoringSystemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attribute scoring system not found: " + id));

        system.setActive(false);
        system.setDefaultSystem(false);

        AttributeScoringSystem saved = scoringSystemRepository.save(system);
        return toResponse(saved, datasetAssessmentRepository.countByAttributeScoringSystemId(saved.getId()));
    }

    public AttributeScoringSystemResponseDTO setDefault(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        AttributeScoringSystem system = scoringSystemRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Attribute scoring system not found: " + id));

        if (!system.isActive()) {
            throw new IllegalArgumentException("Archived scoring systems cannot be set as default.");
        }

        // Keep the invariant that only one active scoring system is default.
        clearOtherDefaults(system.getId());
        system.setDefaultSystem(true);
        AttributeScoringSystem saved = scoringSystemRepository.save(system);
        return toResponse(saved, datasetAssessmentRepository.countByAttributeScoringSystemId(saved.getId()));
    }

    @Transactional(readOnly = true)
    public AttributeScoringSystemVersion getSelectedActiveVersion(Long scoringSystemId) {
        AttributeScoringSystem system;
        if (scoringSystemId == null) {
            // Missing selection means "use the currently configured default".
            system = getDefaultActiveSystem();
        } else {
            system = scoringSystemRepository.findById(scoringSystemId)
                    .orElseThrow(() -> new EntityNotFoundException("Attribute scoring system not found: " + scoringSystemId));
        }

        if (!system.isActive()) {
            throw new IllegalArgumentException("Archived scoring systems cannot be selected for new assessments.");
        }

        return getCurrentVersion(system);
    }

    @Transactional(readOnly = true)
    public AttributeScoringSystemVersion getDefaultActiveVersion() {
        return getCurrentVersion(getDefaultActiveSystem());
    }

    public void validateScoreValue(
            AttributeScoringSystemVersion version,
            AttributeScoringDimension dimension,
            Double value,
            String context
    ) {
        if (value == null || !Double.isFinite(value)) {
            throw new IllegalArgumentException(context + " requires a valid " + dimension.getApiKey() + " score.");
        }

        boolean allowed = version.getScoreOptions().stream()
                .filter(option -> option.getDimension() == dimension)
                .anyMatch(option -> sameNumber(option.getValue(), value));

        if (!allowed) {
            throw new IllegalArgumentException(context + " uses " + dimension.getApiKey()
                    + " score " + value + ", which is not part of scoring system '"
                    + version.getName() + "' v" + version.getVersionNumber() + ".");
        }
    }

    public AttributeScoringSystemResponseDTO toSnapshotResponse(AttributeScoringSystemVersion version) {
        return new AttributeScoringSystemResponseDTO(version);
    }

    private AttributeScoringSystem getDefaultActiveSystem() {
        // Fall back to the oldest active system so bootstrapping remains usable if no default flag is set.
        return scoringSystemRepository.findFirstByDefaultSystemTrueAndActiveTrueOrderByIdAsc()
                .or(scoringSystemRepository::findFirstByActiveTrueOrderByIdAsc)
                .orElseThrow(() -> new IllegalStateException("No active scoring system is configured."));
    }

    private AttributeScoringSystemResponseDTO toResponse(AttributeScoringSystem system, long assessmentCount) {
        return new AttributeScoringSystemResponseDTO(system, getCurrentVersion(system), assessmentCount);
    }

    private AttributeScoringSystemVersion getCurrentVersion(AttributeScoringSystem system) {
        return system.getCurrentVersionEntity()
                .or(() -> scoringSystemVersionRepository.findTopByScoringSystemIdOrderByVersionNumberDesc(system.getId()))
                .orElseThrow(() -> new IllegalStateException("Attribute scoring system has no versions: " + system.getId()));
    }

    private AttributeScoringSystemVersion buildVersion(
            AttributeScoringSystemRequestDTO dto,
            String username,
            int versionNumber
    ) {
        Map<AttributeScoringDimension, List<AttributeScoringOptionRequestDTO>> validatedOptions =
                validateAndNormalizeOptions(dto.getScoreOptions());

        // Versions snapshot display metadata, thresholds, and all score options together.
        AttributeScoringSystemVersion version = new AttributeScoringSystemVersion();
        version.setCreatorUsername(username);
        version.setName(requiredName(dto.getName()));
        version.setDescription(trimToNull(dto.getDescription()));
        version.setVersionNumber(versionNumber);

        Double identifiabilityThreshold = dto.getDefaultIdentifiabilityThreshold();
        Double sensitivityThreshold = dto.getDefaultSensitivityThreshold();
        validateThresholds(validatedOptions, identifiabilityThreshold, sensitivityThreshold);

        version.setDefaultIdentifiabilityThreshold(identifiabilityThreshold);
        version.setDefaultSensitivityThreshold(sensitivityThreshold);

        for (AttributeScoringDimension dimension : AttributeScoringDimension.values()) {
            List<AttributeScoringOptionRequestDTO> options = validatedOptions.get(dimension);
            for (int index = 0; index < options.size(); index++) {
                AttributeScoringOptionRequestDTO optionDto = options.get(index);
                AttributeScoringOption option = new AttributeScoringOption();
                option.setDimension(dimension);
                option.setLabel(optionDto.getLabel().trim());
                option.setValue(optionDto.getValue());
                option.setDescription(null);
                option.setDisplayOrder(index + 1);
                version.addScoreOption(option);
            }
        }

        return version;
    }

    private Map<AttributeScoringDimension, List<AttributeScoringOptionRequestDTO>> validateAndNormalizeOptions(
            Map<String, List<AttributeScoringOptionRequestDTO>> rawOptions
    ) {
        if (rawOptions == null) {
            throw new IllegalArgumentException("Score options are required.");
        }

        Map<AttributeScoringDimension, List<AttributeScoringOptionRequestDTO>> normalized =
                new EnumMap<>(AttributeScoringDimension.class);

        for (AttributeScoringDimension dimension : AttributeScoringDimension.values()) {
            List<AttributeScoringOptionRequestDTO> options = rawOptions.get(dimension.getApiKey());
            if (options == null) {
                // Accept enum names for compatibility with callers that mirror server-side constants.
                options = rawOptions.get(dimension.name());
            }
            if (options == null || options.isEmpty()) {
                throw new IllegalArgumentException("At least one " + dimension.getApiKey() + " score option is required.");
            }
            if (options.size() > MAX_SCORE_OPTIONS_PER_DIMENSION) {
                throw new IllegalArgumentException("At most " + MAX_SCORE_OPTIONS_PER_DIMENSION + " "
                        + dimension.getApiKey() + " score options are allowed.");
            }

            Set<Double> values = new HashSet<>();
            Set<String> labels = new HashSet<>();
            List<AttributeScoringOptionRequestDTO> cleaned = new ArrayList<>();

            for (int index = 0; index < options.size(); index++) {
                AttributeScoringOptionRequestDTO option = options.get(index);
                if (option == null) {
                    throw new IllegalArgumentException("Score option cannot be empty.");
                }
                if (option.getLabel() == null || option.getLabel().trim().isEmpty()) {
                    throw new IllegalArgumentException("Score option labels cannot be empty.");
                }
                String label = option.getLabel().trim();
                String labelKey = label.toLowerCase(Locale.ROOT);
                if (!PREDEFINED_SCORE_LABELS.contains(labelKey)) {
                    throw new IllegalArgumentException("Score option label '" + label
                            + "' is not one of the predefined labels.");
                }
                if (!labels.add(labelKey)) {
                    throw new IllegalArgumentException("Score option labels must be unique within "
                            + dimension.getApiKey() + ".");
                }
                if (option.getValue() == null || !Double.isFinite(option.getValue())) {
                    throw new IllegalArgumentException("Score option values must be valid numbers.");
                }
                boolean duplicate = values.stream().anyMatch(existing -> sameNumber(existing, option.getValue()));
                if (duplicate) {
                    throw new IllegalArgumentException("Score option values must be unique within " + dimension.getApiKey() + ".");
                }
                values.add(option.getValue());

                AttributeScoringOptionRequestDTO copy = new AttributeScoringOptionRequestDTO();
                copy.setId(option.getId());
                copy.setLabel(label);
                copy.setValue(option.getValue());
                copy.setDescription(null);
                copy.setDisplayOrder(option.getDisplayOrder() == null ? index + 1 : option.getDisplayOrder());
                cleaned.add(copy);
            }

            cleaned.sort(Comparator
                    .comparing(AttributeScoringOptionRequestDTO::getDisplayOrder, Comparator.nullsLast(Integer::compareTo))
                    .thenComparing(AttributeScoringOptionRequestDTO::getLabel, String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(AttributeScoringOptionRequestDTO::getValue));

            // Store options in deterministic display order before creating entity rows.
            normalized.put(dimension, cleaned);
        }

        return normalized;
    }

    private void validateThresholds(
            Map<AttributeScoringDimension, List<AttributeScoringOptionRequestDTO>> options,
            Double identifiabilityThreshold,
            Double sensitivityThreshold
    ) {
        if (identifiabilityThreshold == null || !Double.isFinite(identifiabilityThreshold)) {
            throw new IllegalArgumentException("Default identifiability threshold must be a valid number.");
        }
        if (sensitivityThreshold == null || !Double.isFinite(sensitivityThreshold)) {
            throw new IllegalArgumentException("Default sensitivity threshold must be a valid number.");
        }

        double identMin = min(options.get(AttributeScoringDimension.REPLICABILITY))
                + min(options.get(AttributeScoringDimension.AVAILABILITY))
                + min(options.get(AttributeScoringDimension.DISTINGUISHABILITY));
        double identMax = max(options.get(AttributeScoringDimension.REPLICABILITY))
                + max(options.get(AttributeScoringDimension.AVAILABILITY))
                + max(options.get(AttributeScoringDimension.DISTINGUISHABILITY));
        double sensMin = min(options.get(AttributeScoringDimension.SENSITIVITY));
        double sensMax = max(options.get(AttributeScoringDimension.SENSITIVITY));

        /*
         * Identifiability is calculated from R/A/D, while sensitivity is a
         * standalone threshold against the sensitivity dimension.
         */
        if (identifiabilityThreshold < identMin || identifiabilityThreshold > identMax) {
            throw new IllegalArgumentException("Default identifiability threshold must be between "
                    + identMin + " and " + identMax + ".");
        }
        if (sensitivityThreshold < sensMin || sensitivityThreshold > sensMax) {
            throw new IllegalArgumentException("Default sensitivity threshold must be between "
                    + sensMin + " and " + sensMax + ".");
        }
    }

    private double min(List<AttributeScoringOptionRequestDTO> options) {
        return options.stream()
                .map(AttributeScoringOptionRequestDTO::getValue)
                .min(Double::compareTo)
                .orElse(0.0);
    }

    private double max(List<AttributeScoringOptionRequestDTO> options) {
        return options.stream()
                .map(AttributeScoringOptionRequestDTO::getValue)
                .max(Double::compareTo)
                .orElse(0.0);
    }

    private void validateUniqueName(String rawName, Long excludeId) {
        String name = requiredName(rawName);
        boolean exists = excludeId == null
                ? scoringSystemRepository.existsByNameIgnoreCase(name)
                : scoringSystemRepository.existsByNameIgnoreCaseAndIdNot(name, excludeId);
        if (exists) {
            throw new IllegalArgumentException("A scoring system with this name already exists.");
        }
    }

    private String uniqueDuplicateName(String baseName) {
        String cleanedBase = requiredName(baseName);
        if (!scoringSystemRepository.existsByNameIgnoreCase(cleanedBase)) {
            return cleanedBase;
        }

        int copyNumber = 2;
        while (true) {
            String candidate = cleanedBase + " " + copyNumber;
            if (!scoringSystemRepository.existsByNameIgnoreCase(candidate)) {
                return candidate;
            }
            copyNumber++;
        }
    }

    private Map<String, List<AttributeScoringOptionRequestDTO>> toRequestOptions(AttributeScoringSystemVersion version) {
        Map<String, List<AttributeScoringOptionRequestDTO>> grouped = new LinkedHashMap<>();
        for (AttributeScoringDimension dimension : AttributeScoringDimension.values()) {
            List<AttributeScoringOptionRequestDTO> options = version.getScoreOptions().stream()
                    .filter(option -> option.getDimension() == dimension)
                    .sorted(Comparator.comparing(AttributeScoringOption::getDisplayOrder))
                    .map(option -> new AttributeScoringOptionRequestDTO(
                            null,
                            option.getLabel(),
                            option.getValue(),
                            null,
                            option.getDisplayOrder()
                    ))
                    .collect(Collectors.toList());
            grouped.put(dimension.getApiKey(), options);
        }
        return grouped;
    }

    private void clearOtherDefaults(Long excludeId) {
        // Database uniqueness is intentionally not used here because archived systems may keep history.
        scoringSystemRepository.findAll().stream()
                .filter(system -> excludeId == null || !Objects.equals(system.getId(), excludeId))
                .filter(AttributeScoringSystem::isDefaultSystem)
                .forEach(system -> {
                    system.setDefaultSystem(false);
                    scoringSystemRepository.save(system);
                });
    }

    private boolean sameNumber(Double left, Double right) {
        return left != null && right != null && Double.compare(left, right) == 0;
    }

    private void requireAdmin(boolean isAdmin) {
        if (!isAdmin) {
            throw new SecurityException("Only administrators can modify scoring systems.");
        }
    }

    private String requiredName(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Name is required.");
        }
        return value.trim();
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    @SuppressWarnings("unused")
    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
