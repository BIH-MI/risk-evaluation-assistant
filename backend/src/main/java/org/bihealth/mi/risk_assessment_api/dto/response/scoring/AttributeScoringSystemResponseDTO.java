package org.bihealth.mi.risk_assessment_api.dto.response.scoring;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringDimension;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringOption;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Client-facing representation of a scoring system's current or selected
 * immutable version.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScoringSystemResponseDTO {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private boolean defaultSystem;
    private Integer currentVersion;
    private Long versionId;
    private Integer versionNumber;
    private Double defaultIdentifiabilityThreshold;
    private Double defaultSensitivityThreshold;
    private Map<String, List<AttributeScoringOptionResponseDTO>> scoreOptions;
    private Map<String, AttributeScoringRangeResponseDTO> attainableScoreRanges;
    private Integer scoreOptionCount;
    private Long assessmentCount;
    private String creatorUsername;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;

    public AttributeScoringSystemResponseDTO(
            AttributeScoringSystem system,
            AttributeScoringSystemVersion version,
            long assessmentCount
    ) {
        this.id = system.getId();
        this.name = version.getName();
        this.description = version.getDescription();
        this.active = system.isActive();
        this.defaultSystem = system.isDefaultSystem();
        this.currentVersion = system.getCurrentVersion();
        this.versionId = version.getId();
        this.versionNumber = version.getVersionNumber();
        this.defaultIdentifiabilityThreshold = version.getDefaultIdentifiabilityThreshold();
        this.defaultSensitivityThreshold = version.getDefaultSensitivityThreshold();
        this.scoreOptions = groupOptions(version.getScoreOptions());
        this.attainableScoreRanges = calculateRanges(version.getScoreOptions());
        this.scoreOptionCount = version.getScoreOptions() == null ? 0 : version.getScoreOptions().size();
        this.assessmentCount = assessmentCount;
        this.creatorUsername = system.getCreatorUsername();
        this.creationDate = system.getCreationDate();
        this.lastModifiedDate = system.getLastModifiedDate();
    }

    public AttributeScoringSystemResponseDTO(AttributeScoringSystemVersion version) {
        AttributeScoringSystem system = version.getScoringSystem();
        this.id = system.getId();
        this.name = version.getName();
        this.description = version.getDescription();
        this.active = system.isActive();
        this.defaultSystem = system.isDefaultSystem();
        this.currentVersion = system.getCurrentVersion();
        this.versionId = version.getId();
        this.versionNumber = version.getVersionNumber();
        this.defaultIdentifiabilityThreshold = version.getDefaultIdentifiabilityThreshold();
        this.defaultSensitivityThreshold = version.getDefaultSensitivityThreshold();
        this.scoreOptions = groupOptions(version.getScoreOptions());
        this.attainableScoreRanges = calculateRanges(version.getScoreOptions());
        this.scoreOptionCount = version.getScoreOptions() == null ? 0 : version.getScoreOptions().size();
        this.assessmentCount = null;
        this.creatorUsername = system.getCreatorUsername();
        this.creationDate = system.getCreationDate();
        this.lastModifiedDate = system.getLastModifiedDate();
    }

    private Map<String, List<AttributeScoringOptionResponseDTO>> groupOptions(List<AttributeScoringOption> options) {
        Map<String, List<AttributeScoringOptionResponseDTO>> grouped = new LinkedHashMap<>();
        for (AttributeScoringDimension dimension : AttributeScoringDimension.values()) {
            List<AttributeScoringOptionResponseDTO> values = options == null
                    ? List.of()
                    : options.stream()
                    .filter(option -> option.getDimension() == dimension)
                    .sorted(Comparator
                            .comparing(AttributeScoringOption::getDisplayOrder)
                            .thenComparing(AttributeScoringOption::getId, Comparator.nullsLast(Long::compareTo)))
                    .map(AttributeScoringOptionResponseDTO::new)
                    .collect(Collectors.toList());
            grouped.put(dimension.getApiKey(), values);
        }
        return grouped;
    }

    private Map<String, AttributeScoringRangeResponseDTO> calculateRanges(List<AttributeScoringOption> options) {
        Map<AttributeScoringDimension, List<Double>> valuesByDimension = new LinkedHashMap<>();
        for (AttributeScoringDimension dimension : AttributeScoringDimension.values()) {
            List<Double> values = options == null
                    ? List.of()
                    : options.stream()
                    .filter(option -> option.getDimension() == dimension)
                    .map(AttributeScoringOption::getValue)
                    .sorted()
                    .collect(Collectors.toList());
            valuesByDimension.put(dimension, values);
        }

        Double identMin = min(valuesByDimension.get(AttributeScoringDimension.REPLICABILITY))
                + min(valuesByDimension.get(AttributeScoringDimension.AVAILABILITY))
                + min(valuesByDimension.get(AttributeScoringDimension.DISTINGUISHABILITY));
        Double identMax = max(valuesByDimension.get(AttributeScoringDimension.REPLICABILITY))
                + max(valuesByDimension.get(AttributeScoringDimension.AVAILABILITY))
                + max(valuesByDimension.get(AttributeScoringDimension.DISTINGUISHABILITY));

        Map<String, AttributeScoringRangeResponseDTO> ranges = new LinkedHashMap<>();
        ranges.put("identifiability", new AttributeScoringRangeResponseDTO(identMin, identMax));
        ranges.put("sensitivity", new AttributeScoringRangeResponseDTO(
                min(valuesByDimension.get(AttributeScoringDimension.SENSITIVITY)),
                max(valuesByDimension.get(AttributeScoringDimension.SENSITIVITY))
        ));
        return ranges;
    }

    private Double min(List<Double> values) {
        return values == null || values.isEmpty() ? 0.0 : values.get(0);
    }

    private Double max(List<Double> values) {
        return values == null || values.isEmpty() ? 0.0 : values.get(values.size() - 1);
    }
}
