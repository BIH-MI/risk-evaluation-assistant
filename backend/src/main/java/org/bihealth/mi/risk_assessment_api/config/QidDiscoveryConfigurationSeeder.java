package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoverySearchConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.service.QidDiscoveryConfigurationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the default QID search profile used for new dataset profiling sessions.
 *
 * <p>Also repairs any configuration left over from before this typed search
 * model existed (an earlier revision stored search settings as a single JSON
 * blob with no distinct {@code searchType}). {@link QidDiscoveryConfigurationService#updateConfiguration}
 * rejects an incomplete search object, so the API can never itself create a
 * configuration with a missing {@code searchType} — any such row found here
 * can only be that kind of pre-migration data, never one an admin is
 * currently editing, which makes it safe to repair unconditionally rather
 * than rely on matching this seeder's own configuration name (that name can
 * itself have drifted from what was originally seeded).</p>
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
        repairIncompleteConfigurations();
    }

    private void ensureDefaultSeedConfigurationExists() {
        QidDiscoveryConfiguration existingSeedConfiguration = configurationRepository.findAll().stream()
                .filter(configuration -> DEFAULT_QID_DISCOVERY_CONFIGURATION_NAME.equalsIgnoreCase(configuration.getName()))
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

    /**
     * Backfills any configuration whose current version predates the
     * {@code searchType} field (and the other typed search settings),
     * regardless of its name.
     */
    private void repairIncompleteConfigurations() {
        configurationRepository.findAll().stream()
                .filter(configuration -> !hasCompleteSearchVersion(configuration))
                .forEach(configuration -> {
                    QidDiscoveryConfigurationRequestDTO request = defaultRequest();
                    request.setName(configuration.getName());
                    request.setDescription(configuration.getDescription());
                    request.setActive(configuration.isActive());
                    request.setDefaultConfiguration(configuration.isDefaultConfiguration());
                    configurationService.updateConfiguration(
                            configuration.getId(),
                            request,
                            "admin",
                            true
                    );
                });
    }

    private boolean hasCompleteSearchVersion(QidDiscoveryConfiguration configuration) {
        QidDiscoveryConfigurationVersion version = configuration.getCurrentVersionEntity().orElse(null);

        return version != null
                && version.getSearchType() != null
                && version.getMaxCombinationSize() != null
                && version.getTargetDistinction() != null
                && version.getTargetSeparation() != null
                && version.getDistinctionWeight() != null
                && version.getSeparationWeight() != null
                && version.getAttributeCountPenalty() != null
                && version.getMaxPersistedCombinations() != null;
    }

    private QidDiscoveryConfigurationRequestDTO defaultRequest() {
        QidDiscoveryConfigurationRequestDTO dto = new QidDiscoveryConfigurationRequestDTO();
        dto.setName(DEFAULT_QID_DISCOVERY_CONFIGURATION_NAME);
        dto.setDescription("Default QID combination search, ranking, pruning, and retention profile.");
        dto.setActive(true);
        dto.setDefaultConfiguration(true);
        dto.setSearch(new QidDiscoverySearchConfigurationRequestDTO(
                "AUTOMATIC",
                8,
                4,
                10,
                0.000001,
                2,
                0.95,
                0.95,
                0.7,
                0.3,
                0.03,
                20
        ));
        return dto;
    }
}
