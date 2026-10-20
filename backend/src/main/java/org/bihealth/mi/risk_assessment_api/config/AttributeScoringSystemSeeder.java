package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringOptionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringSystemRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringDimension;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.bihealth.mi.risk_assessment_api.repository.scoring.AttributeScoringSystemRepository;
import org.bihealth.mi.risk_assessment_api.service.AttributeScoringSystemService;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds the REA S/R/A/D scale as the default attribute scoring system when it
 * is missing. An existing system (possibly edited by an administrator) is
 * never changed; it is only marked as default when no active default exists.
 */
@Order(2)
@Component
public class AttributeScoringSystemSeeder implements CommandLineRunner {

    public static final String DEFAULT_SCORING_SYSTEM_NAME = "REA Default Scoring System";

    private final AttributeScoringSystemRepository scoringSystemRepository;
    private final AttributeScoringSystemService scoringSystemService;

    public AttributeScoringSystemSeeder(
            AttributeScoringSystemRepository scoringSystemRepository,
            AttributeScoringSystemService scoringSystemService
    ) {
        this.scoringSystemRepository = scoringSystemRepository;
        this.scoringSystemService = scoringSystemService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        AttributeScoringSystem existingSeedSystem = scoringSystemRepository.findAll().stream()
                .filter(system -> EntityNameNormalizer.normalizeForComparison(DEFAULT_SCORING_SYSTEM_NAME)
                        .equals(EntityNameNormalizer.normalizeForComparison(system.getName())))
                .findFirst()
                .orElse(null);

        if (existingSeedSystem == null) {
            scoringSystemService.createSystem(defaultRequest(), "admin", true);
        } else {
            if (existingSeedSystem.isActive()) {
                boolean hasDefault = scoringSystemRepository
                        .findFirstByDefaultSystemTrueAndActiveTrueOrderByIdAsc()
                        .isPresent();
                if (!hasDefault) {
                    scoringSystemService.setDefault(existingSeedSystem.getId(), true);
                }
            }
        }
    }

    private AttributeScoringSystemRequestDTO defaultRequest() {
        AttributeScoringSystemRequestDTO dto = new AttributeScoringSystemRequestDTO();
        dto.setName(DEFAULT_SCORING_SYSTEM_NAME);
        dto.setDescription("Legacy REA 1-3 Low/Moderate/High attribute scoring scale.");
        dto.setActive(true);
        dto.setDefaultSystem(true);
        dto.setDefaultIdentifiabilityThreshold(5.0);
        dto.setDefaultSensitivityThreshold(2.0);

        Map<String, List<AttributeScoringOptionRequestDTO>> options = new LinkedHashMap<>();
        for (AttributeScoringDimension dimension : AttributeScoringDimension.values()) {
            // The legacy REA system uses the same Low/Moderate/High scale for every dimension.
            options.put(dimension.getApiKey(), List.of(
                    new AttributeScoringOptionRequestDTO(null, "Low", 1.0, null, 1),
                    new AttributeScoringOptionRequestDTO(null, "Moderate", 2.0, null, 2),
                    new AttributeScoringOptionRequestDTO(null, "High", 3.0, null, 3)
            ));
        }
        dto.setScoreOptions(options);
        return dto;
    }
}
