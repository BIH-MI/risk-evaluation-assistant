package org.bihealth.mi.risk_assessment_api.config.demo.epic;

import java.time.Duration;
import java.util.Objects;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.bihealth.mi.risk_assessment_api.config.AttributeScoringSystemSeeder;
import org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.service.AttributeScoringSystemService;
import org.springframework.stereotype.Component;
import static java.util.Map.entry;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.applyConfiguration;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.existingDatasetAssessment;

@Component
public class EpicPotsdamAssessmentSeeder {
    private static final String ASSESSMENT_NAME = "EPIC-Potsdam Assessment (El Emam)";
    private static final String ASSESSMENT_DESCRIPTION = "Dataset impact and attribute-level assessment for the EPIC-Potsdam NFDI4Health P1090 dairy and chronic disease use case.";

    /**
     * Identifiability threshold of the EPIC-Potsdam demo assessment. REA marks an attribute
     * as a quasi-identifier when replicability + availability + distinguishability is
     * greater than this value, so 6.0 selects the attributes scored 7 or 8: SEX, age0,
     * educc3, age_f3, age_inct2d, age_incmi and age_incstroke. These are the keys of the
     * earlier manual EPIC assessment, whose key threshold of 7 meant "score >= 7".
     * <p>
     * A threshold sweep in the DIfE project (REA thresholds 5 to 7, ARX releases for the
     * academic, commercial and public scenarios, and the Cox benchmark) found 6.0 to be the
     * broadest quasi-identifier set that keeps every benchmark model estimable, once the
     * columns excluded in {@link EpicPotsdamDatasetSeeder} are left out. The scoring default
     * of 5.0 also classifies waist, BMI, alcohol, smoking and occupation, which left no
     * analyzable release; DIfE keeps that configuration as a sensitivity analysis.
     */
    static final double EPIC_IDENTIFIABILITY_THRESHOLD = 6.0;

    /** Thresholds that earlier versions of this seeder stored for the demo assessment. */
    private static final List<Double> SUPERSEDED_DEMO_THRESHOLDS =
            List.of(7.0, AttributeScoringSystemSeeder.DEFAULT_IDENTIFIABILITY_THRESHOLD);
    private final DatasetAssessmentRepository assessmentRepo;
    private final DatasetTableAssessmentRepository tableAssessmentRepo;
    private final DatasetTableAssessmentAttributeRepository tableAssessmentAttributeRepo;
    private final AttributeScoringSystemService attributeScoringSystemService;
    private final DemoSeedSupport support;

    public EpicPotsdamAssessmentSeeder(DatasetAssessmentRepository assessmentRepo, DatasetTableAssessmentRepository tableAssessmentRepo, DatasetTableAssessmentAttributeRepository tableAssessmentAttributeRepo, AttributeScoringSystemService attributeScoringSystemService, DemoSeedSupport support) {
        this.assessmentRepo = assessmentRepo;
        this.tableAssessmentRepo = tableAssessmentRepo;
        this.tableAssessmentAttributeRepo = tableAssessmentAttributeRepo;
        this.attributeScoringSystemService = attributeScoringSystemService;
        this.support = support;
    }

    // Expert R/A/D/S assessments; these are not measured profiling evidence.
    private record EpicAttribute(String name, Double replicability, Double availability,
                                 Double distinguishability, Double sensitivity) {}
    private static final List<EpicAttribute> EPIC_ATTRIBUTES = List.of(
            new EpicAttribute("ident", null, null, null, null),
            new EpicAttribute("SEX", 3.0, 3.0, 1.0, 1.0),
            new EpicAttribute("age0", 3.0, 3.0, 2.0, 2.0),
            new EpicAttribute("waist0", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("bmi0", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("gj0", 2.0, 1.0, 2.0, 2.0),
            new EpicAttribute("za0", 1.0, 2.0, 3.0, 3.0),
            new EpicAttribute("m14bd", 2.0, 1.0, 2.0, 3.0),
            new EpicAttribute("smkst0i", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("educc3", 3.0, 2.0, 2.0, 1.0),
            new EpicAttribute("occstat6_0", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("age_f3", 3.0, 2.0, 2.0, 1.0),
            new EpicAttribute("smkst3i", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("gj_f3", 1.0, 1.0, 2.0, 1.0),
            new EpicAttribute("za_f3", 1.0, 2.0, 3.0, 3.0),
            new EpicAttribute("occstat6_f3", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("bmi_f3", 2.0, 2.0, 2.0, 2.0),
            new EpicAttribute("sr_hyp_f1", 1.0, 1.0, 2.0, 3.0),
            new EpicAttribute("sr_hyp_f2", 1.0, 1.0, 2.0, 3.0),
            new EpicAttribute("sr_hyp_f3", 1.0, 1.0, 2.0, 3.0),
            new EpicAttribute("biking0", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("sport0", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("biking_f2", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("sport_f2", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("lf_milk_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("hf_milk_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("lf_yogurt_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("hf_yogurt_sum", 1.0, 1.0, 2.0, 1.0),
            new EpicAttribute("lf_curd_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("hf_curd_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("lf_cheese_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("hf_cheese_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("cream_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("butter_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("legumes_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("red_meat_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("poultry_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("proc_meat_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("fish_sum", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("inct2d", 2.0, 1.0, 1.0, 3.0),
            new EpicAttribute("age_inct2d", 3.0, 1.0, 3.0, 2.0),
            new EpicAttribute("fup_time_diab", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("incmi", 2.0, 1.0, 1.0, 3.0),
            new EpicAttribute("age_incmi", 3.0, 1.0, 3.0, 2.0),
            new EpicAttribute("fup_time_mi", 1.0, 1.0, 3.0, 1.0),
            new EpicAttribute("incstroke", 2.0, 1.0, 1.0, 3.0),
            new EpicAttribute("age_incstroke", 3.0, 1.0, 3.0, 2.0),
            new EpicAttribute("fup_time_stroke", 1.0, 1.0, 3.0, 1.0)
    );

    public DatasetAssessment ensureAssessment(Dataset dataset, Configuration config) {
        Optional<DatasetAssessment> existing = existingDatasetAssessment(dataset, config);
        if (existing.isPresent()) {
            correctUneditedLegacyDemoThreshold(existing.get());
            return existing.get();
        }
        DatasetAssessment assessment = new DatasetAssessment();
        assessment.setCreatorUsername("user");
        assessment.setName(ASSESSMENT_NAME);
        assessment.setDescription(ASSESSMENT_DESCRIPTION);
        assessment.setDataset(dataset);
        applyConfiguration(assessment, config);
        // Select the named REA scale even if a user has changed the global default.
        Long scoringId = attributeScoringSystemService.listSystems(true, true).stream()
                .filter(system -> AttributeScoringSystemSeeder.DEFAULT_SCORING_SYSTEM_NAME.equals(system.getName()))
                .map(system -> system.getId()).findFirst()
                .orElseThrow(() -> new IllegalStateException("REA Default Scoring System is required for EPIC."));
        AttributeScoringSystemVersion scoringVersion = attributeScoringSystemService.getSelectedActiveVersion(scoringId);
        assessment.setAttributeScoringSystem(scoringVersion.getScoringSystem());
        assessment.setAttributeScoringSystemVersion(scoringVersion);
        assessment.setAttributeIdentifiabilityThreshold(EPIC_IDENTIFIABILITY_THRESHOLD);
        assessment.setAttributeSensitivityThreshold(3.0);
        assessment = assessmentRepo.save(assessment);
        List<Question> questions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "DATASET_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo))).toList();
        // N/A marks governance/consent conditions that cannot be established
        // from the dataset itself and must not be guessed in this research example.
        support.applyAnswers(assessment, questions, Map.ofEntries(
                entry("potential injury", "yes"),
                entry("conditions that were established", "n/a"),
                entry("sensitive context", "yes"),
                entry("compiled or obtained under guarantees", "n/a"),
                entry("highly detailed", "yes"),
                entry("unsolicited or given freely", "no"),
                entry("foreign laws", "no"),
                entry("commitment or promise not to disclose", "n/a"),
                entry("database is large", "yes"),
                entry("highly sensitive personal nature", "yes"),
                entry("caveat stating", "n/a")));
        applyEpicPotsdamAttributeAssessment(dataset, assessment);
        dataset.getDatasetAssessments().add(assessment);
        return assessmentRepo.save(assessment);
    }

    /**
     * Move only the original, unedited demo to {@link #EPIC_IDENTIFIABILITY_THRESHOLD} on
     * sample-data startup, when it still has a threshold that an earlier seeder stored (7
     * or the scoring default 5). An explicit user override cannot be distinguished from
     * these values alone, so unknown or changed audit metadata leaves the assessment alone.
     */
    private void correctUneditedLegacyDemoThreshold(DatasetAssessment assessment) {
        AttributeScoringSystemVersion version = assessment.getAttributeScoringSystemVersion();
        Double threshold = assessment.getAttributeIdentifiabilityThreshold();
        if (!"user".equals(assessment.getCreatorUsername())
                || !ASSESSMENT_NAME.equals(assessment.getName())
                || !ASSESSMENT_DESCRIPTION.equals(assessment.getDescription())
                || !EpicPotsdamDatasetSeeder.EPIC_POTSDAM_DATASET_NAME.equals(assessment.getDataset().getName())
                || !"El Emam Risk Exposure Model".equals(assessment.getConfiguration().getName())
                || threshold == null || !SUPERSEDED_DEMO_THRESHOLDS.contains(threshold)
                || !Objects.equals(assessment.getAttributeSensitivityThreshold(), 3.0)
                || version == null || version.getVersionNumber() != 1
                || !AttributeScoringSystemSeeder.DEFAULT_SCORING_SYSTEM_NAME.equals(version.getScoringSystem().getName())
                || !Objects.equals(version.getDefaultIdentifiabilityThreshold(),
                        AttributeScoringSystemSeeder.DEFAULT_IDENTIFIABILITY_THRESHOLD)
                || assessment.getCreationDate() == null || assessment.getLastModifiedDate() == null) {
            return;
        }
        // AuditableEntity stamps creation and modification with separate now()
        // calls on insert. Allow only that sub-millisecond gap, not later edits.
        Duration sinceCreation = Duration.between(assessment.getCreationDate(), assessment.getLastModifiedDate());
        if (sinceCreation.isNegative() || sinceCreation.compareTo(Duration.ofMillis(1)) >= 0) return;

        assessment.setAttributeIdentifiabilityThreshold(EPIC_IDENTIFIABILITY_THRESHOLD);
        assessmentRepo.save(assessment);
    }

    private void applyEpicPotsdamAttributeAssessment(Dataset dataset, DatasetAssessment assessment) {
        DatasetTable table = dataset.getTables().stream().filter(t -> "Participants".equals(t.getName()))
                .findFirst().orElseThrow(() -> new IllegalStateException("EPIC Participants table is missing"));
        DatasetTableAssessment tableAssessment = new DatasetTableAssessment();
        tableAssessment.setDatasetAssessment(assessment);
        tableAssessment.setTable(table);
        tableAssessment = tableAssessmentRepo.save(tableAssessment);
        assessment.getTableAssessments().add(tableAssessment);
        for (DatasetTableAttribute attribute : table.getAttributes()) {
            EpicAttribute spec = EPIC_ATTRIBUTES.stream().filter(a -> a.name().equals(attribute.getName()))
                    .findFirst().orElseThrow(() -> new IllegalStateException("Unexpected EPIC attribute: " + attribute.getName()));
            DatasetTableAssessmentAttribute score = new DatasetTableAssessmentAttribute();
            score.setAssessment(tableAssessment);
            score.setAttribute(attribute);
            score.setDirectIdentifier("ident".equals(spec.name()));
            score.setReplicability(spec.replicability());
            score.setAvailability(spec.availability());
            score.setDistinguishability(spec.distinguishability());
            score.setSensitivity(spec.sensitivity());
            tableAssessmentAttributeRepo.save(score);
            tableAssessment.getAttributes().add(score);
        }
    }
}
