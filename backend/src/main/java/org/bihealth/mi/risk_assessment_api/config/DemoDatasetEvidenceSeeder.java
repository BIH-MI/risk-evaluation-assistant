package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableQidCombination;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Seeds aggregate quantitative profiling evidence for the canonical LEOSS demo dataset.
 *
 * <p>This is intentionally not a backend QID profiler. The values below are
 * precomputed sample metadata matching the frontend profiling formulas. No raw
 * LEOSS rows are stored by this seeder.</p>
 */
@Component
@Order(4)
public class DemoDatasetEvidenceSeeder implements CommandLineRunner {

    static final String LEOSS_DATASET_NAME = "LEOSS Public Use File";
    private static final String SEED_USER = "user";

    @Value("${app.setup.load-sample-data:true}")
    private boolean loadSampleData;

    private final DatasetRepository datasetRepository;
    private final QidDiscoveryConfigurationRepository qidConfigurationRepository;

    public DemoDatasetEvidenceSeeder(
            DatasetRepository datasetRepository,
            QidDiscoveryConfigurationRepository qidConfigurationRepository
    ) {
        this.datasetRepository = datasetRepository;
        this.qidConfigurationRepository = qidConfigurationRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!loadSampleData) return;

        QidDiscoveryConfiguration defaultConfiguration =
                resolveDefaultQidConfiguration().orElse(null);
        QidDiscoveryConfigurationVersion defaultVersion = defaultConfiguration == null
                ? null
                : defaultConfiguration.getCurrentVersionEntity().orElse(null);

        upsertLeossEvidence(defaultConfiguration, defaultVersion);
    }

    private Optional<QidDiscoveryConfiguration> resolveDefaultQidConfiguration() {
        return qidConfigurationRepository
                .findFirstByDefaultConfigurationTrueAndActiveTrueOrderByIdAsc()
                .or(qidConfigurationRepository::findFirstByActiveTrueOrderByIdAsc);
    }

    private void upsertLeossEvidence(
            QidDiscoveryConfiguration qidConfiguration,
            QidDiscoveryConfigurationVersion qidConfigurationVersion
    ) {
        Dataset leoss = findDatasetByNormalizedName(LEOSS_DATASET_NAME).orElse(null);
        if (leoss == null) return;

        linkQidConfiguration(leoss, qidConfiguration, qidConfigurationVersion);
        DatasetTable table = findTable(leoss, "Patients").orElseGet(() -> {
            DatasetTable created = new DatasetTable();
            created.setCreatorUsername(SEED_USER);
            created.setName("Patients");
            created.setDataset(leoss);
            leoss.getTables().add(created);
            return created;
        });

        Map<String, DatasetTableAttribute> attributesByName =
                attributesByName(table);
        leossAttributes().forEach((name, dataType) -> {
            DatasetTableAttribute attribute = attributesByName.computeIfAbsent(
                    name,
                    key -> addAttribute(table, key, dataType)
            );
            attribute.setDataType(dataType);
            attribute.setExcluded("insurance_number".equals(name));
            clearDirectIdentifierEvidence(attribute);
            clearReplicabilityEvidence(attribute);
            applyStatistics(attribute, leossStatistics().get(name));
        });

        DatasetTableAttribute insuranceNumber =
                attributesByName(table).get("insurance_number");
        if (insuranceNumber != null) {
            insuranceNumber.setDirectIdentifierEvidenceSource("FIELD_NAME");
            insuranceNumber.setDirectIdentifierConcept(null);
            insuranceNumber.setDirectIdentifierConfidence("LOW");
        }

        replaceQidCombinations(table, List.of(
                qidCombination(
                        List.of(
                                "age_at_diagnosis",
                                "date_of_diagnosis",
                                "superinfection_uncomplicated_phase",
                                "superinfection_complicated_phase"
                        ),
                        0.9531936128,
                        0.9999898596,
                        9551L,
                        9120L,
                        9120L,
                        0.9101796407,
                        1L,
                        1.0,
                        4L
                ),
                qidCombination(
                        List.of(
                                "age_at_diagnosis",
                                "date_of_diagnosis",
                                "superinfection_uncomplicated_phase",
                                "symptoms_in_recovery_phase"
                        ),
                        0.9559880240,
                        0.9999905967,
                        9579L,
                        9167L,
                        9167L,
                        0.9148702595,
                        1L,
                        1.0,
                        4L
                ),
                qidCombination(
                        List.of(
                                "age_at_diagnosis",
                                "date_of_diagnosis",
                                "superinfection_complicated_phase",
                                "symptoms_in_recovery_phase"
                        ),
                        0.9580838323,
                        0.9999913139,
                        9600L,
                        9195L,
                        9195L,
                        0.9176646707,
                        1L,
                        1.0,
                        4L
                )
        ));

        datasetRepository.save(leoss);
    }

    private Optional<Dataset> findDatasetByNormalizedName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return datasetRepository.findAll().stream()
                .filter(dataset -> Objects.equals(
                        normalizedName,
                        EntityNameNormalizer.normalizeForComparison(dataset.getName())
                ))
                .findFirst();
    }

    private Optional<DatasetTable> findTable(Dataset dataset, String name) {
        return dataset.getTables().stream()
                .filter(table -> Objects.equals(table.getName(), name))
                .findFirst();
    }

    private Map<String, DatasetTableAttribute> attributesByName(
            DatasetTable table
    ) {
        Map<String, DatasetTableAttribute> attributes = new LinkedHashMap<>();
        table.getAttributes().stream()
                .sorted(Comparator.comparing(
                        DatasetTableAttribute::getId,
                        Comparator.nullsLast(Long::compareTo)
                ))
                .forEach(attribute -> attributes.putIfAbsent(
                        attribute.getName(),
                        attribute
                ));
        return attributes;
    }

    private DatasetTableAttribute addAttribute(
            DatasetTable table,
            String name,
            DataType dataType
    ) {
        DatasetTableAttribute attribute =
                new DatasetTableAttribute(table, name, dataType);
        table.getAttributes().add(attribute);
        return attribute;
    }

    private void linkQidConfiguration(
            Dataset dataset,
            QidDiscoveryConfiguration qidConfiguration,
            QidDiscoveryConfigurationVersion qidConfigurationVersion
    ) {
        if (qidConfiguration == null || qidConfigurationVersion == null) return;
        dataset.setQidDiscoveryConfiguration(qidConfiguration);
        dataset.setQidDiscoveryConfigurationVersion(qidConfigurationVersion);
    }

    private void applyStatistics(
            DatasetTableAttribute attribute,
            AttributeEvidence evidence
    ) {
        if (evidence == null) return;

        attribute.setRecordCount(evidence.recordCount());
        attribute.setAnalysedRecordCount(evidence.analysedRecordCount());
        attribute.setMissingCount(evidence.missingCount());
        attribute.setMissingFraction(evidence.missingFraction());
        attribute.setDistinctValueCount(evidence.distinctValueCount());
        attribute.setDistinctValueRatio(evidence.distinctValueRatio());
        attribute.setSingletonValueCount(evidence.singletonValueCount());
        attribute.setSingletonRecordCount(evidence.singletonRecordCount());
        attribute.setSingletonFraction(evidence.singletonFraction());
        attribute.setMinimumEquivalenceClassSize(
                evidence.minimumEquivalenceClassSize()
        );
        attribute.setMedianEquivalenceClassSize(
                evidence.medianEquivalenceClassSize()
        );
        attribute.setMaximumEquivalenceClassSize(
                evidence.maximumEquivalenceClassSize()
        );
        attribute.setDistinction(evidence.distinction());
        attribute.setSeparation(evidence.separation());
    }

    private void clearDirectIdentifierEvidence(DatasetTableAttribute attribute) {
        attribute.setDirectIdentifierEvidenceSource(null);
        attribute.setDirectIdentifierConcept(null);
        attribute.setDirectIdentifierConfidence(null);
    }

    private void clearReplicabilityEvidence(DatasetTableAttribute attribute) {
        attribute.setReplicabilityAvailable(null);
        attribute.setReplicabilityScore(null);
        attribute.setReplicabilityComparisonCount(null);
        attribute.setReplicabilityMethod(null);
        attribute.setReplicabilityUnavailableReason(null);
    }

    private void replaceQidCombinations(
            DatasetTable table,
            List<QidCombinationEvidence> evidence
    ) {
        Map<String, DatasetTableAttribute> attributesByName = attributesByName(table);
        table.getQidCombinations().clear();

        evidence.forEach(item -> {
            DatasetTableQidCombination combination = new DatasetTableQidCombination();
            combination.setTable(table);
            item.attributeNames().stream()
                    .map(attributesByName::get)
                    .filter(Objects::nonNull)
                    .forEach(combination.getAttributes()::add);
            combination.setAttributeCount(combination.getAttributes().size());
            combination.setDistinction(item.distinction());
            combination.setSeparation(item.separation());
            combination.setEquivalenceClassCount(item.equivalenceClassCount());
            combination.setSingletonClassCount(item.singletonClassCount());
            combination.setSingletonRecordCount(item.singletonRecordCount());
            combination.setSingletonFraction(item.singletonFraction());
            combination.setMinimumEquivalenceClassSize(
                    item.minimumEquivalenceClassSize()
            );
            combination.setMedianEquivalenceClassSize(
                    item.medianEquivalenceClassSize()
            );
            combination.setMaximumEquivalenceClassSize(
                    item.maximumEquivalenceClassSize()
            );
            combination.setTargetSatisfied(true);
            combination.setMinimalQualifying(true);
            table.getQidCombinations().add(combination);
        });
    }

    private static Map<String, DataType> leossAttributes() {
        Map<String, DataType> attributes = new LinkedHashMap<>();
        attributes.put("insurance_number", DataType.STRING);
        attributes.put("age_at_diagnosis", DataType.INTEGER);
        attributes.put("gender", DataType.STRING);
        attributes.put("date_of_diagnosis", DataType.DATETIME);
        attributes.put("uncomplicated_phase", DataType.BOOLEAN);
        attributes.put("complicated_phase", DataType.BOOLEAN);
        attributes.put("critical_phase", DataType.BOOLEAN);
        attributes.put("recovery_phase", DataType.BOOLEAN);
        attributes.put("vasopressors_in_complicated_phase", DataType.BOOLEAN);
        attributes.put("vasopressors_in_critical_phase", DataType.BOOLEAN);
        attributes.put("invasive_ventilation_in_critical_phase", DataType.BOOLEAN);
        attributes.put("superinfection_uncomplicated_phase", DataType.BOOLEAN);
        attributes.put("superinfection_complicated_phase", DataType.BOOLEAN);
        attributes.put("superinfection_critical_phase", DataType.BOOLEAN);
        attributes.put("symptoms_in_recovery_phase", DataType.STRING);
        attributes.put("last_known_patient_status", DataType.STRING);
        return attributes;
    }

    private static Map<String, AttributeEvidence> leossStatistics() {
        return mapOfStats(
                stat("insurance_number", 10020L, 10020L, 0L, 0,
                        10020L, 1, 10020L, 10020L, 1,
                        1L, 1, 1L, 1, 1),
                stat("age_at_diagnosis", 10020L, 10020L, 0L, 0,
                        98L, 0.009780439121756487, 2L, 2L,
                        0.0001996007984031936, 1L, 94, 242L,
                        0.009780439121756487, 0.9843871494459927),
                stat("gender", 10020L, 10020L, 0L, 0,
                        2L, 0.0001996007984031936, 0L, 0L, 0,
                        4345L, 5010, 5675L, 0.0001996007984031936,
                        0.4912397980762698),
                stat("date_of_diagnosis", 10020L, 10020L, 0L, 0,
                        503L, 0.05019960079840319, 16L, 16L,
                        0.001596806387225549, 1L, 12, 70L,
                        0.05019960079840319, 0.9964892452842593),
                stat("uncomplicated_phase", 10020L, 10020L, 0L, 0,
                        2L, 0.0001996007984031936, 0L, 0L, 0,
                        1956L, 5010, 8064L, 0.0001996007984031936,
                        0.3142369617487253),
                stat("complicated_phase", 10020L, 10020L, 0L, 0,
                        2L, 0.0001996007984031936, 0L, 0L, 0,
                        4725L, 5010, 5295L, 0.0001996007984031936,
                        0.4984317222427089),
                stat("critical_phase", 10020L, 10020L, 0L, 0,
                        2L, 0.0001996007984031936, 0L, 0L, 0,
                        1856L, 5010, 8164L, 0.0001996007984031936,
                        0.3018692428497631),
                stat("recovery_phase", 10020L, 10020L, 0L, 0,
                        2L, 0.0001996007984031936, 0L, 0L, 0,
                        4941L, 5010, 5079L, 0.0001996007984031936,
                        0.4999550554545167),
                stat("vasopressors_in_complicated_phase", 10020L, 10020L,
                        0L, 0, 7L, 0.0006986027944111777, 0L, 0L,
                        0, 9L, 28, 5295L, 0.0006986027944111777,
                        0.5366991538432269),
                stat("vasopressors_in_critical_phase", 10020L, 10020L,
                        0L, 0, 7L, 0.0006986027944111777, 0L, 0L,
                        0, 139L, 239, 8164L, 0.0006986027944111777,
                        0.3274752222274684),
                stat("invasive_ventilation_in_critical_phase", 10020L,
                        10020L, 0L, 0, 4L, 0.0003992015968063872,
                        0L, 0L, 0, 139L, 858.5, 8164L,
                        0.0003992015968063872, 0.3191572140677225),
                stat("superinfection_uncomplicated_phase", 10020L, 10020L,
                        0L, 0, 6L, 0.0005988023952095808, 0L, 0L,
                        0, 16L, 1079, 5868L, 0.0005988023952095808,
                        0.595510207252926),
                stat("superinfection_complicated_phase", 10020L, 10020L,
                        0L, 0, 6L, 0.0005988023952095808, 0L, 0L,
                        0, 30L, 950.5, 5295L, 0.0005988023952095808,
                        0.6224429273004046),
                stat("superinfection_critical_phase", 10020L, 10020L,
                        0L, 0, 6L, 0.0005988023952095808, 0L, 0L,
                        0, 63L, 374.5, 8164L, 0.0005988023952095808,
                        0.3251718541159023),
                stat("symptoms_in_recovery_phase", 10020L, 10020L, 0L, 0,
                        4L, 0.0003992015968063872, 0L, 0L, 0,
                        824L, 2058.5, 5079L, 0.0003992015968063872,
                        0.622378897260873),
                stat("last_known_patient_status", 10020L, 10020L, 0L, 0,
                        5L, 0.000499001996007984, 0L, 0L, 0,
                        27L, 957, 7518L, 0.000499001996007984,
                        0.4104610023390688)
        );
    }

    private static Map<String, AttributeEvidence> mapOfStats(
            AttributeEvidence... evidence
    ) {
        Map<String, AttributeEvidence> map = new LinkedHashMap<>();
        for (AttributeEvidence item : evidence) {
            map.put(item.name(), item);
        }
        return map;
    }

    private static AttributeEvidence stat(
            String name,
            Long recordCount,
            Long analysedRecordCount,
            Long missingCount,
            double missingFraction,
            Long distinctValueCount,
            double distinctValueRatio,
            Long singletonValueCount,
            Long singletonRecordCount,
            double singletonFraction,
            Long minimumEquivalenceClassSize,
            double medianEquivalenceClassSize,
            Long maximumEquivalenceClassSize,
            double distinction,
            double separation
    ) {
        return new AttributeEvidence(
                name,
                recordCount,
                analysedRecordCount,
                missingCount,
                missingFraction,
                distinctValueCount,
                distinctValueRatio,
                singletonValueCount,
                singletonRecordCount,
                singletonFraction,
                minimumEquivalenceClassSize,
                medianEquivalenceClassSize,
                maximumEquivalenceClassSize,
                distinction,
                separation
        );
    }

    private static QidCombinationEvidence qidCombination(
            List<String> attributeNames,
            Double distinction,
            Double separation,
            Long equivalenceClassCount,
            Long singletonClassCount,
            Long singletonRecordCount,
            Double singletonFraction,
            Long minimumEquivalenceClassSize,
            Double medianEquivalenceClassSize,
            Long maximumEquivalenceClassSize
    ) {
        return new QidCombinationEvidence(
                attributeNames,
                distinction,
                separation,
                equivalenceClassCount,
                singletonClassCount,
                singletonRecordCount,
                singletonFraction,
                minimumEquivalenceClassSize,
                medianEquivalenceClassSize,
                maximumEquivalenceClassSize
        );
    }

    private record AttributeEvidence(
            String name,
            Long recordCount,
            Long analysedRecordCount,
            Long missingCount,
            Double missingFraction,
            Long distinctValueCount,
            Double distinctValueRatio,
            Long singletonValueCount,
            Long singletonRecordCount,
            Double singletonFraction,
            Long minimumEquivalenceClassSize,
            Double medianEquivalenceClassSize,
            Long maximumEquivalenceClassSize,
            Double distinction,
            Double separation
    ) {
    }

    private record QidCombinationEvidence(
            List<String> attributeNames,
            Double distinction,
            Double separation,
            Long equivalenceClassCount,
            Long singletonClassCount,
            Long singletonRecordCount,
            Double singletonFraction,
            Long minimumEquivalenceClassSize,
            Double medianEquivalenceClassSize,
            Long maximumEquivalenceClassSize
    ) {
    }
}
