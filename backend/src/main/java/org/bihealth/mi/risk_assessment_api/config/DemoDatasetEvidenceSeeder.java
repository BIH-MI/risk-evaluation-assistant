package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.AttributeScreeningSnapshot;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttributeSubsetEvidence;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetType;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.service.AiModelRegistry;
import org.bihealth.mi.risk_assessment_api.service.QidDiscoveryConfigurationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Aggregate quantitative profiling evidence for the LEOSS demo dataset, applied
 * by {@link DataLoader} when it creates the demo data (never on later
 * startups, so researcher edits to the demo dataset are kept).
 *
 * <p>This is intentionally not a backend QID profiler. The values below are
 * what Add Dataset records for LEOSS_dataset_v3 (with these attribute names):
 * statistics, subset evidence, the value-pattern identifier summary, each
 * attribute's screening snapshot and the AI screening provenance with its
 * dataset-type suggestion. No raw LEOSS rows are stored.</p>
 */
@Component
public class DemoDatasetEvidenceSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDatasetEvidenceSeeder.class);
    private static final String SEED_USER = "user";

    // The Add Dataset screening run that produced the snapshots below: the
    // browser's model, prompt and thresholds versions (checked against the
    // registry before they are stored, as for any new dataset).
    private static final String SCREENING_MODEL_ID = "deberta-v3-xsmall";
    private static final String SCREENING_PROMPT_VERSION =
            "column-zero-shot-v2+9d5e08a8;column-name-rules-v2";
    private static final String SCREENING_THRESHOLDS_VERSION =
            "zero-shot-abstention-v1+8d4c2add";
    private static final DatasetType SUGGESTED_DATASET_TYPE = DatasetType.CLINICAL_HEALTHCARE;
    private static final double SUGGESTED_DATASET_TYPE_SCORE = 0.9708;

    private final DatasetRepository datasetRepository;
    private final QidDiscoveryConfigurationRepository qidConfigurationRepository;
    private final QidDiscoveryConfigurationService qidConfigurationService;
    private final AiModelRegistry aiModelRegistry;

    public DemoDatasetEvidenceSeeder(
            DatasetRepository datasetRepository,
            QidDiscoveryConfigurationRepository qidConfigurationRepository,
            QidDiscoveryConfigurationService qidConfigurationService,
            AiModelRegistry aiModelRegistry
    ) {
        this.datasetRepository = datasetRepository;
        this.qidConfigurationRepository = qidConfigurationRepository;
        this.qidConfigurationService = qidConfigurationService;
        this.aiModelRegistry = aiModelRegistry;
    }

    /**
     * Links the newly created LEOSS dataset to the default QID discovery
     * configuration and stores its precomputed statistics. Must run in the
     * caller's transaction, after QidDiscoveryConfigurationSeeder.
     */
    public void apply(Dataset leoss) {
        QidDiscoveryConfiguration defaultConfiguration =
                resolveDefaultQidConfiguration().orElse(null);
        QidDiscoveryConfigurationVersion defaultVersion = defaultConfiguration == null
                ? null
                : defaultConfiguration.getCurrentVersionEntity().orElse(null);

        applyLeossEvidence(leoss, defaultConfiguration, defaultVersion);
    }

    private Optional<QidDiscoveryConfiguration> resolveDefaultQidConfiguration() {
        return qidConfigurationRepository
                .findFirstByDefaultConfigurationTrueAndActiveTrueOrderByIdAsc()
                .or(qidConfigurationRepository::findFirstByActiveTrueOrderByIdAsc);
    }

    private void applyLeossEvidence(
            Dataset leoss,
            QidDiscoveryConfiguration qidConfiguration,
            QidDiscoveryConfigurationVersion qidConfigurationVersion
    ) {
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
        Map<String, List<SubsetEvidence>> subsetEvidenceByAttribute =
                leossSubsetEvidence();
        Map<String, Screening> screeningByAttribute = leossScreening();
        leossAttributes().forEach((name, dataType) -> {
            DatasetTableAttribute attribute = attributesByName.computeIfAbsent(
                    name,
                    key -> addAttribute(table, key, dataType)
            );
            attribute.setDataType(dataType);
            attribute.setExcluded("insurance_number".equals(name));
            clearDirectIdentifierEvidence(attribute);
            applyStatistics(attribute, leossStatistics().get(name));
            replaceSubsetEvidence(attribute, subsetEvidenceByAttribute.get(name));
            attribute.setScreening(toSnapshot(name, screeningByAttribute.get(name)));
        });

        // Only value patterns produce an identifier summary: the d.m.yyyy
        // dates match a review-level pattern. insurance_number is recognised
        // by its name (column-name rule, see its screening), not its values.
        DatasetTableAttribute dateOfDiagnosis =
                attributesByName(table).get("date_of_diagnosis");
        if (dateOfDiagnosis != null) {
            dateOfDiagnosis.setDirectIdentifierEvidenceSource("VALUE_PATTERN");
            dateOfDiagnosis.setDirectIdentifierConcept(null);
            dateOfDiagnosis.setDirectIdentifierConfidence("LOW");
        }

        applyAiScreening(leoss, qidConfigurationVersion);
        datasetRepository.save(leoss);
    }

    /**
     * Records the AI screening provenance and its dataset-type suggestion,
     * subject to the same checks as for a new dataset: the model must be in
     * the registry and allowed by the linked QID configuration version. If
     * not (e.g. a changed registry), the dataset is seeded without them.
     */
    private void applyAiScreening(Dataset leoss, QidDiscoveryConfigurationVersion version) {
        Optional<AiModelRegistry.Model> model = aiModelRegistry.find(SCREENING_MODEL_ID);
        if (model.isEmpty()
                || version == null
                || !qidConfigurationService.getEffectiveAiAllowedModelIds(version).contains(SCREENING_MODEL_ID)) {
            log.warn("Demo dataset seeded without AI screening provenance: model {} is not available.",
                    SCREENING_MODEL_ID);
            return;
        }
        AiModelRegistry.ScreeningProvenance provenance;
        try {
            provenance = aiModelRegistry.verifyScreeningProvenance(
                    SCREENING_MODEL_ID,
                    model.get().repository(),
                    model.get().revision(),
                    model.get().dtype(),
                    SCREENING_PROMPT_VERSION,
                    SCREENING_THRESHOLDS_VERSION,
                    null
            );
        } catch (IllegalArgumentException ex) {
            log.warn("Demo dataset seeded without AI screening provenance: {}", ex.getMessage());
            return;
        }
        leoss.setAiScreeningModelId(provenance.modelId());
        leoss.setAiScreeningModelRepository(provenance.repository());
        leoss.setAiScreeningModelRevision(provenance.revision());
        leoss.setAiScreeningModelDtype(provenance.dtype());
        leoss.setAiScreeningPromptVersion(provenance.promptVersion());
        leoss.setAiScreeningThresholdsVersion(provenance.thresholdsVersion());
        leoss.setAiScreeningValidationStatus(provenance.validationStatus());
        leoss.setAiSuggestedDatasetType(SUGGESTED_DATASET_TYPE);
        leoss.setAiSuggestedDatasetTypeScore(SUGGESTED_DATASET_TYPE_SCORE);
    }

    private static AttributeScreeningSnapshot toSnapshot(String name, Screening screening) {
        if (screening == null) return null;
        AttributeScreeningSnapshot snapshot = new AttributeScreeningSnapshot();
        snapshot.setStatus(screening.status());
        snapshot.setMessage(screening.message());
        snapshot.setCategory(screening.category());
        snapshot.setPotentialIdentifier(screening.potentialIdentifier());
        snapshot.setUncertain(screening.uncertain());
        snapshot.setEvidence(screening.evidence());
        snapshot.setColumnName(name);
        return snapshot;
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

    private void replaceSubsetEvidence(
            DatasetTableAttribute attribute,
            List<SubsetEvidence> evidence
    ) {
        attribute.replaceSubsetEvidence(evidence == null
                ? List.of()
                : evidence.stream()
                  .map(DemoDatasetEvidenceSeeder::toSubsetEvidenceEntity)
                  .toList());
    }

    private static DatasetTableAttributeSubsetEvidence toSubsetEvidenceEntity(SubsetEvidence item) {
        DatasetTableAttributeSubsetEvidence subsetEvidence = new DatasetTableAttributeSubsetEvidence();
        subsetEvidence.setSubsetSize(item.subsetSize());
        subsetEvidence.setEvaluatedSubsetCount(item.evaluatedSubsetCount());
        subsetEvidence.setMeanDistinction(item.meanDistinction());
        subsetEvidence.setMeanSeparation(item.meanSeparation());
        subsetEvidence.setMeanSingletonFraction(item.meanSingletonFraction());
        return subsetEvidence;
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

    /**
     * Screening shown by Add Dataset for these attribute names (column-name
     * rules, AI model, value patterns), before any researcher review.
     */
    private static Map<String, Screening> leossScreening() {
        Map<String, Screening> screening = new LinkedHashMap<>();
        screening.put("insurance_number", new Screening("autoExcluded", "autoExcludedByName",
                "HEALTH_INSURANCE_IDENTIFIER", false, false, List.of("columnName", "aiSuggestion")));
        screening.put("age_at_diagnosis", included("DEMOGRAPHIC"));
        screening.put("gender", included("DEMOGRAPHIC"));
        screening.put("date_of_diagnosis", new Screening("reviewNeeded", "valuePatternReview",
                "CLINICAL", true, false, List.of("aiSuggestion", "valuePattern")));
        screening.put("uncomplicated_phase", possibleIdentifier());
        screening.put("complicated_phase", possibleIdentifier());
        screening.put("critical_phase", possibleIdentifier());
        List.of(
                "recovery_phase",
                "vasopressors_in_complicated_phase",
                "vasopressors_in_critical_phase",
                "invasive_ventilation_in_critical_phase",
                "superinfection_uncomplicated_phase",
                "superinfection_complicated_phase",
                "superinfection_critical_phase",
                "symptoms_in_recovery_phase",
                "last_known_patient_status"
        ).forEach(name -> screening.put(name, included("CLINICAL")));
        return screening;
    }

    private static Screening included(String category) {
        return new Screening("noExclusionSuggested", "included", category, false, false,
                List.of("aiSuggestion"));
    }

    // The model leans towards an identifier without naming a category.
    private static Screening possibleIdentifier() {
        return new Screening("reviewNeeded", "possibleIdentifier", null, false, true, List.of());
    }

    private static Map<String, List<SubsetEvidence>> leossSubsetEvidence() {
        Map<String, List<SubsetEvidence>> evidence = new LinkedHashMap<>();

        // Precomputed from LEOSS_dataset_v3 using the current frontend profiling
        // semantics: insurance_number is excluded automatically (column-name
        // rule), the remaining 15 attributes are exhaustively profiled for subset sizes 2-4,
        // and missing values form one equivalence class. Each attribute therefore
        // participates in 14 pairs, 91 triplets, and 364 four-attribute subsets.
        evidence.put("age_at_diagnosis", List.of(
                subsetEvidence(2, 14L, 0.0833333333333333, 0.992114947382693, 0.0471556886227545),
                subsetEvidence(3, 91L, 0.181565440547476, 0.995513620740540, 0.122313614529183),
                subsetEvidence(4, 364L, 0.288962185519072, 0.997250823663155, 0.212998179465246)
        ));
        evidence.put("gender", List.of(
                subsetEvidence(2, 14L, 0.00896777872825777, 0.759511765114204, 0.000655831194753350),
                subsetEvidence(3, 91L, 0.0464828584589063, 0.870819317088412, 0.0182492158540063),
                subsetEvidence(4, 364L, 0.115178434340111, 0.925448644460874, 0.0632367133864141)
        ));
        evidence.put("date_of_diagnosis", List.of(
                subsetEvidence(2, 14L, 0.171991730824066, 0.998201280412952, 0.0711576846307385),
                subsetEvidence(3, 91L, 0.314211138163234, 0.998968687794828, 0.182845298414161),
                subsetEvidence(4, 364L, 0.445419600359720, 0.999364580222059, 0.306456043956044)
        ));
        evidence.put("uncomplicated_phase", List.of(
                subsetEvidence(2, 14L, 0.00857570573139435, 0.656115144840429, 0.00101226119190191),
                subsetEvidence(3, 91L, 0.0427715996578272, 0.809619283187348, 0.0175747406286328),
                subsetEvidence(4, 364L, 0.104596027724770, 0.889012888737693, 0.0581669079423572)
        ));
        evidence.put("complicated_phase", List.of(
                subsetEvidence(2, 14L, 0.00888936412888509, 0.727073994255511, 0.000712859994297120),
                subsetEvidence(3, 91L, 0.0433967230374416, 0.838916517041433, 0.0174343620451405),
                subsetEvidence(4, 364L, 0.104508291110088, 0.900710770732773, 0.0573841328332348)
        ));
        evidence.put("critical_phase", List.of(
                subsetEvidence(2, 14L, 0.00841174793270602, 0.624071623481965, 0.000962360992301112),
                subsetEvidence(3, 91L, 0.0404378057072668, 0.790956233626597, 0.0162795288543791),
                subsetEvidence(4, 364L, 0.0987456405869582, 0.880169668154950, 0.0542749665504158)
        ));
        evidence.put("recovery_phase", List.of(
                subsetEvidence(2, 14L, 0.00896065012831480, 0.744481103240598, 0.000734245794126034),
                subsetEvidence(3, 91L, 0.0443278278607620, 0.856408659786015, 0.0175835142901011),
                subsetEvidence(4, 364L, 0.107720822092080, 0.914126670435820, 0.0589971156587925)
        ));
        evidence.put("vasopressors_in_complicated_phase", List.of(
                subsetEvidence(2, 14L, 0.0130952380952381, 0.739960243202586, 0.00271599657827203),
                subsetEvidence(3, 91L, 0.0517996973086793, 0.843939735314028, 0.0232216884911496),
                subsetEvidence(4, 364L, 0.115110712640653, 0.902832995770890, 0.0663398477769736)
        ));
        evidence.put("vasopressors_in_critical_phase", List.of(
                subsetEvidence(2, 14L, 0.0163031080695751, 0.632777897358577, 0.00539635015682920),
                subsetEvidence(3, 91L, 0.0559057708758307, 0.794206011539186, 0.0281974512513435),
                subsetEvidence(4, 364L, 0.117963523502446, 0.881459182172108, 0.0713975894365117)
        ));
        evidence.put("invasive_ventilation_in_critical_phase", List.of(
                subsetEvidence(2, 14L, 0.0122112917023097, 0.629532986271052, 0.00301539777587682),
                subsetEvidence(3, 91L, 0.0479414796780066, 0.792870717228151, 0.0220186001623127),
                subsetEvidence(4, 364L, 0.108060801473975, 0.880886161000292, 0.0625082253076266)
        ));
        evidence.put("superinfection_uncomplicated_phase", List.of(
                subsetEvidence(2, 14L, 0.0162603364699173, 0.780074902168344, 0.00344311377245509),
                subsetEvidence(3, 91L, 0.0619804347349257, 0.870910112750197, 0.0279978504529403),
                subsetEvidence(4, 364L, 0.133295222741331, 0.920849302777532, 0.0776946107784433)
        ));
        evidence.put("superinfection_complicated_phase", List.of(
                subsetEvidence(2, 14L, 0.0160322212717422, 0.779474107550373, 0.00330767037353864),
                subsetEvidence(3, 91L, 0.0601445460726898, 0.863459474814308, 0.0272959575354785),
                subsetEvidence(4, 364L, 0.128267914720011, 0.912802742248218, 0.0748982803623523)
        ));
        evidence.put("superinfection_critical_phase", List.of(
                subsetEvidence(2, 14L, 0.0148702594810379, 0.631821727198505, 0.00435557456515540),
                subsetEvidence(3, 91L, 0.0533976004035884, 0.793787614985542, 0.0261992498519445),
                subsetEvidence(4, 364L, 0.114944561426597, 0.881268640404665, 0.0687040753657521)
        ));
        evidence.put("symptoms_in_recovery_phase", List.of(
                subsetEvidence(2, 14L, 0.0152480752780154, 0.801277165629387, 0.00295836897633305),
                subsetEvidence(3, 91L, 0.0586376697155140, 0.884965260965890, 0.0257068281020377),
                subsetEvidence(4, 364L, 0.128000866399070, 0.929213706795150, 0.0731153078458469)
        ));
        evidence.put("last_known_patient_status", List.of(
                subsetEvidence(2, 14L, 0.0132877102936983, 0.698918867667258, 0.00287282577701739),
                subsetEvidence(3, 91L, 0.0532111600973877, 0.833376123870054, 0.0238808098089535),
                subsetEvidence(4, 364L, 0.119506591213178, 0.903095673789977, 0.0689919611326798)
        ));

        return evidence;
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

    private static SubsetEvidence subsetEvidence(
            Integer subsetSize,
            Long evaluatedSubsetCount,
            Double meanDistinction,
            Double meanSeparation,
            Double meanSingletonFraction
    ) {
        return new SubsetEvidence(
                subsetSize,
                evaluatedSubsetCount,
                meanDistinction,
                meanSeparation,
                meanSingletonFraction
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

    private record Screening(
            String status,
            String message,
            String category,
            boolean potentialIdentifier,
            boolean uncertain,
            List<String> evidence
    ) {
    }

    private record SubsetEvidence(
            Integer subsetSize,
            Long evaluatedSubsetCount,
            Double meanDistinction,
            Double meanSeparation,
            Double meanSingletonFraction
    ) {
    }
}
