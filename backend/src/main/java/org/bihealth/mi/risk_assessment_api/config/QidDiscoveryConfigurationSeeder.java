package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryAiScreeningConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryProfilingConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryAiScreeningDefaults;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.service.QidDiscoveryConfigurationService;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the default QID discovery configuration (profiling limits and AI
 * screening with the registry's default model) when it is missing. An
 * existing configuration, possibly edited by an administrator, is never
 * changed or given a new version; it is only marked as default when no active
 * default exists.
 */
@Order(2)
@Component
public class QidDiscoveryConfigurationSeeder implements CommandLineRunner {

    public static final String DEFAULT_QID_DISCOVERY_CONFIGURATION_NAME = "REA Default QID Discovery";

    private final QidDiscoveryConfigurationRepository configurationRepository;
    private final QidDiscoveryConfigurationService configurationService;

    public QidDiscoveryConfigurationSeeder(
            QidDiscoveryConfigurationRepository configurationRepository,
            QidDiscoveryConfigurationService configurationService
    ) {
        this.configurationRepository = configurationRepository;
        this.configurationService = configurationService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        ensureDefaultSeedConfigurationExists();
    }

    private void ensureDefaultSeedConfigurationExists() {
        QidDiscoveryConfiguration existingSeedConfiguration = configurationRepository.findAll().stream()
                .filter(configuration -> EntityNameNormalizer.normalizeForComparison(DEFAULT_QID_DISCOVERY_CONFIGURATION_NAME)
                        .equals(EntityNameNormalizer.normalizeForComparison(configuration.getName())))
                .findFirst()
                .orElse(null);

        if (existingSeedConfiguration == null) {
            configurationService.createConfiguration(defaultRequest(), "admin", true);
            return;
        }

        if (existingSeedConfiguration.isActive()
                && configurationRepository.findFirstByDefaultConfigurationTrueAndActiveTrueOrderByIdAsc().isEmpty()) {
            configurationService.setDefault(existingSeedConfiguration.getId(), true);
        }
    }

    private QidDiscoveryConfigurationRequestDTO defaultRequest() {
        QidDiscoveryConfigurationRequestDTO dto = new QidDiscoveryConfigurationRequestDTO();
        dto.setName(DEFAULT_QID_DISCOVERY_CONFIGURATION_NAME);
        dto.setDescription("Default exhaustive attribute-subset profiling limits.");
        dto.setActive(true);
        dto.setDefaultConfiguration(true);
        dto.setProfiling(new QidDiscoveryProfilingConfigurationRequestDTO(
                4,
                25000
        ));
        // Stored explicitly; the backend installs this model on startup
        // (installByDefault in the model registry).
        dto.setAiScreening(new QidDiscoveryAiScreeningConfigurationRequestDTO(
                QidDiscoveryAiScreeningDefaults.ENABLED,
                QidDiscoveryAiScreeningDefaults.ALLOWED_MODEL_IDS,
                QidDiscoveryAiScreeningDefaults.DEFAULT_MODEL_ID
        ));
        return dto;
    }
}
