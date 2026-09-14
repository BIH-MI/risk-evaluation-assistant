package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringOptionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringSystemRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringDimension;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
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
 * Seeds the legacy REA S/R/A/D scale as the default attribute scoring system.
 *
 * <p>The seeder also backfills older dataset assessments that predate
 * configurable attribute scoring so they continue to resolve a concrete scoring
 * system and version.</p>
 */
@Order(2)
@Component
public class AttributeScoringSystemSeeder implements CommandLineRunner {

    public static final String DEFAULT_SCORING_SYSTEM_NAME = "REA Default Scoring System";
    private static final String LEGACY_DEFAULT_SCORING_SYSTEM_NAME = "REA Default Attribute Scoring System";

    private final AttributeScoringSystemRepository scoringSystemRepository;
    private final AttributeScoringSystemService scoringSystemService;
    private final DatasetAssessmentRepository datasetAssessmentRepository;

    public AttributeScoringSystemSeeder(
            AttributeScoringSystemRepository scoringSystemRepository,
            AttributeScoringSystemService scoringSystemService,
            DatasetAssessmentRepository datasetAssessmentRepository
    ) {
        this.scoringSystemRepository = scoringSystemRepository;
        this.scoringSystemService = scoringSystemService;
        this.datasetAssessmentRepository = datasetAssessmentRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        /*
         * Create the default scale only once. If it already exists, make sure at
         * least one active system is marked as the default.
         */
        AttributeScoringSystem existingSeedSystem = scoringSystemRepository.findAll().stream()
                .filter(system -> hasSeedSystemName(system.getName()))
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

        /*
         * Attach legacy assessments to the default version so later scoring
         * validation can rely on explicit assessment-level references.
         */
        AttributeScoringSystemVersion defaultVersion = scoringSystemService.getDefaultActiveVersion();
        List<DatasetAssessment> legacyAssessments = datasetAssessmentRepository.findByAttributeScoringSystemIsNull();
        for (DatasetAssessment assessment : legacyAssessments) {
            assessment.setAttributeScoringSystem(defaultVersion.getScoringSystem());
            assessment.setAttributeScoringSystemVersion(defaultVersion);
            assessment.setAttributeIdentifiabilityThreshold(defaultVersion.getDefaultIdentifiabilityThreshold());
            assessment.setAttributeSensitivityThreshold(defaultVersion.getDefaultSensitivityThreshold());
        }
        datasetAssessmentRepository.saveAll(legacyAssessments);
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

    private boolean hasSeedSystemName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return EntityNameNormalizer.normalizeForComparison(DEFAULT_SCORING_SYSTEM_NAME).equals(normalizedName)
                || EntityNameNormalizer.normalizeForComparison(LEGACY_DEFAULT_SCORING_SYSTEM_NAME).equals(normalizedName);
    }
}
