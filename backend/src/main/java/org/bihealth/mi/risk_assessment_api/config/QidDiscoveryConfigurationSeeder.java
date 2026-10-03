package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryProfilingConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.service.QidDiscoveryConfigurationService;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the default QID profiling limits used for new dataset profiling
 * sessions.
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
        return dto;
    }
}
