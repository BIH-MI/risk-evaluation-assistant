package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.model.NamedResourceEntity;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.bihealth.mi.risk_assessment_api.repository.scoring.AttributeScoringSystemRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Backfills normalized name keys for top-level resources that predate the
 * database uniqueness guards.
 */
@Order(2)
@Component
public class NamedResourceNormalizedNameBackfill implements CommandLineRunner {

    private final DatasetRepository datasetRepository;
    private final RecipientRepository recipientRepository;
    private final DataSharingActivityRepository dataSharingActivityRepository;
    private final RiskConfigurationRepository riskConfigurationRepository;
    private final QidDiscoveryConfigurationRepository qidDiscoveryConfigurationRepository;
    private final AttributeScoringSystemRepository attributeScoringSystemRepository;

    public NamedResourceNormalizedNameBackfill(
            DatasetRepository datasetRepository,
            RecipientRepository recipientRepository,
            DataSharingActivityRepository dataSharingActivityRepository,
            RiskConfigurationRepository riskConfigurationRepository,
            QidDiscoveryConfigurationRepository qidDiscoveryConfigurationRepository,
            AttributeScoringSystemRepository attributeScoringSystemRepository
    ) {
        this.datasetRepository = datasetRepository;
        this.recipientRepository = recipientRepository;
        this.dataSharingActivityRepository = dataSharingActivityRepository;
        this.riskConfigurationRepository = riskConfigurationRepository;
        this.qidDiscoveryConfigurationRepository = qidDiscoveryConfigurationRepository;
        this.attributeScoringSystemRepository = attributeScoringSystemRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        backfill("dataset", datasetRepository);
        backfill("recipient", recipientRepository);
        backfill("data sharing activity", dataSharingActivityRepository);
        backfill("configuration", riskConfigurationRepository);
        backfill("QID discovery configuration", qidDiscoveryConfigurationRepository);
        backfill("attribute scoring system", attributeScoringSystemRepository);
    }

    private <T extends NamedResourceEntity> void backfill(
            String resourceLabel,
            JpaRepository<T, Long> repository
    ) {
        List<T> resources = repository.findAll();
        if (resources.isEmpty()) {
            return;
        }

        Map<String, List<T>> resourcesByNormalizedName = new LinkedHashMap<>();
        for (T resource : resources) {
            String storageName = EntityNameNormalizer.normalizeForStorage(resource.getName());
            if (storageName == null || storageName.isEmpty()) {
                throw new IllegalStateException(capitalize(resourceLabel) + " " + resource.getId() + " has an empty name.");
            }

            resourcesByNormalizedName
                    .computeIfAbsent(EntityNameNormalizer.normalizeForComparison(storageName), ignored -> new ArrayList<>())
                    .add(resource);
        }

        List<String> duplicateNames = resourcesByNormalizedName.values().stream()
                .filter(matches -> matches.size() > 1)
                .map(matches -> matches.stream()
                        .map(NamedResourceEntity::getName)
                        .collect(Collectors.joining("\", \"", "\"", "\"")))
                .collect(Collectors.toList());

        if (!duplicateNames.isEmpty()) {
            throw new IllegalStateException(
                    "Duplicate " + resourceLabel + " names already exist after trimming and case normalization: "
                            + String.join("; ", duplicateNames)
            );
        }

        List<T> resourcesToUpdate = resources.stream()
                .filter(resource -> shouldUpdate(resource))
                .collect(Collectors.toList());

        resourcesToUpdate.forEach(resource ->
                resource.setName(EntityNameNormalizer.normalizeForStorage(resource.getName()))
        );
        if (!resourcesToUpdate.isEmpty()) {
            repository.saveAll(resourcesToUpdate);
        }
    }

    private String capitalize(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase() + value.substring(1);
    }

    private boolean shouldUpdate(NamedResourceEntity resource) {
        return !Objects.equals(
                resource.getName(),
                EntityNameNormalizer.normalizeForStorage(resource.getName())
        ) || !Objects.equals(
                resource.getNormalizedName(),
                EntityNameNormalizer.normalizeForComparison(resource.getName())
        );
    }
}
