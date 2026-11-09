package org.bihealth.mi.risk_assessment_api.config.demo.leoss;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
public class LeossAssessmentSeeder {
    private final DatasetAssessmentRepository assessmentRepo;
    private final DatasetTableAssessmentRepository tableAssessmentRepo;
    private final DatasetTableAssessmentAttributeRepository tableAssessmentAttributeRepo;
    private final AttributeScoringSystemService attributeScoringSystemService;
    private final DemoSeedSupport support;

    public LeossAssessmentSeeder(DatasetAssessmentRepository assessmentRepo,
                                 DatasetTableAssessmentRepository tableAssessmentRepo,
                                 DatasetTableAssessmentAttributeRepository tableAssessmentAttributeRepo,
                                 AttributeScoringSystemService attributeScoringSystemService,
                                 DemoSeedSupport support) {
        this.assessmentRepo = assessmentRepo;
        this.tableAssessmentRepo = tableAssessmentRepo;
        this.tableAssessmentAttributeRepo = tableAssessmentAttributeRepo;
        this.attributeScoringSystemService = attributeScoringSystemService;
        this.support = support;
    }

    public DatasetAssessment ensureElEmamAssessment(Dataset dataset, Configuration config) {
        Optional<DatasetAssessment> existing = existingDatasetAssessment(dataset, config);
        if (existing.isPresent()) return existing.get();
        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(dataset);
        applyConfiguration(da, config);
        applyDefaultAttributeScoringSystem(da);
        da.setName("LEOSS Assessment (El Emam)");
        da.setDescription("Invasion-of-Privacy answers for the LEOSS Public Use File (No critical triggers applied).");
        da.setCreatorUsername("user");
        da = assessmentRepo.save(da);

        // Dataset-assessment questions are the only questions that contribute
        // to the dataset-side IMPACT calculation for this assessment.
        List<Question> datasetQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "DATASET_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        Map<String, String> answers = Map.ofEntries(
                entry("highly detailed", "no"),
                entry("database is large", "yes"),
                entry("highly sensitive personal nature", "no"),
                entry("sensitive context", "no"),
                entry("conditions that were established", "n/a"),
                entry("commitment or promise not to disclose", "no"),
                entry("caveat stating", "no"),
                entry("compiled or obtained under guarantees", "no"),
                entry("unsolicited or given freely", "no"),
                entry("foreign laws", "no"),
                entry("potential injury", "no")
        );

        support.applyAnswers(da, datasetQuestions, answers);
        applyLeossAttributeAssessment(dataset, da);

        dataset.getDatasetAssessments().add(da);
        return assessmentRepo.save(da);
    }

    public DatasetAssessment ensureSphnAssessment(Dataset dataset, Configuration config) {
        Optional<DatasetAssessment> existing = existingDatasetAssessment(dataset, config);
        if (existing.isPresent()) return existing.get();
        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(dataset);
        applyConfiguration(da, config);
        applyDefaultAttributeScoringSystem(da);
        da.setName("LEOSS Assessment (SPHN)");
        da.setDescription("SPHN Data Risk evaluation mapped for the LEOSS Public Use File (No critical triggers applied).");
        da.setCreatorUsername("user");
        da = assessmentRepo.save(da);

        // Fetch all questions mapped to the DATASET_ASSESSMENT phase. In the
        // SPHN configuration these are the DATA_RISK questions.
        List<Question> datasetQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "DATASET_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        Map<String, String> answers = Map.ofEntries(
                entry("[d-01]", "replaced by plausible"),
                entry("[d-02]", "no mapping table is kept"),
                entry("[d-03]", "not use"),
                entry("[d-04]", "not used"),
                entry("[d-05]", "not used"),
                entry("[d-06]", "within +/- 90 days"),
                entry("[d-07]", "Only the year"),
                entry("[d-08]", "not used"),
                entry("[d-09]", "groups of 5"),
                entry("[d-10]", "not used"),
                entry("[d-11]", "generalized to the region"),
                entry("[d-12]", "not used"),
                entry("[d-13]", "not used"),
                entry("[m-01]", "no audio data"),
                entry("[m-02]", "no images"),
                entry("[dcm-01]", "suppressed"),
                entry("[dcm-02]", "suppressed"),
                entry("[dcm-03]", "suppressed"),
                entry("[dcm-04]", "suppressed"),
                entry("[dcm-05]", "suppressed"),
                entry("[dcm-06]", "suppressed"),
                entry("[g-01]", "no genomic"),
                entry("[o-01]", "no other quasi")
        );

        // Persist one answer per SPHN data-risk question.
        support.applyAnswers(da, datasetQuestions, answers);

        // Attach the standard LEOSS table and attribute risk metrics so the UI
        // can display the same attribute assessment details for both frameworks.
        applyLeossAttributeAssessment(dataset, da);

        dataset.getDatasetAssessments().add(da);
        return assessmentRepo.save(da);
    }

    private void applyLeossAttributeAssessment(Dataset dataset, DatasetAssessment da) {
        DatasetTable patientsTable = dataset.getTables().stream()
                .filter(t -> "Patients".equals(t.getName()))
                .findFirst()
                .orElse(null);

        if (patientsTable == null) return;

        DatasetTableAssessment dta = new DatasetTableAssessment();
        dta.setDatasetAssessment(da);
        dta.setTable(patientsTable);
        dta = tableAssessmentRepo.save(dta);

        if (da.getTableAssessments() == null) {
            da.setTableAssessments(new ArrayList<>());
        }
        da.getTableAssessments().add(dta);

        // Format:
        // {Sensitivity, Replicability, Availability, Distinguishability, isDirectIdentifier}
        // Null metric values are used only for direct identifiers where the
        // individual metric scores are not applicable.
        Map<String, Object[]> metrics = Map.ofEntries(
                entry("insurance_number", new Object[]{null, null, null, null, true}),
                entry("age_at_diagnosis", new Object[]{1, 3, 3, 2, false}),
                entry("gender", new Object[]{1, 3, 3, 1, false}),
                entry("date_of_diagnosis", new Object[]{2, 3, 2, 2, false}),
                entry("uncomplicated_phase", new Object[]{2, 1, 1, 1, false}),
                entry("complicated_phase", new Object[]{2, 1, 1, 2, false}),
                entry("critical_phase", new Object[]{3, 1, 1, 2, false}),
                entry("recovery_phase", new Object[]{2, 1, 1, 2, false}),
                entry("vasopressors_in_complicated_phase", new Object[]{3, 1, 1, 2, false}),
                entry("vasopressors_in_critical_phase", new Object[]{3, 1, 1, 2, false}),
                entry("invasive_ventilation_in_critical_phase", new Object[]{3, 1, 1, 2, false}),
                entry("superinfection_uncomplicated_phase", new Object[]{2, 1, 1, 2, false}),
                entry("superinfection_complicated_phase", new Object[]{2, 1, 1, 2, false}),
                entry("superinfection_critical_phase", new Object[]{2, 1, 1, 2, false}),
                entry("symptoms_in_recovery_phase", new Object[]{2, 1, 1, 2, false}),
                entry("last_known_patient_status", new Object[]{3, 1, 1, 2, false})
        );

        for (DatasetTableAttribute attr : patientsTable.getAttributes()) {
            Object[] m = metrics.get(attr.getName());
            if (m == null) continue;
            DatasetTableAssessmentAttribute dtaa = new DatasetTableAssessmentAttribute();
            dtaa.setAssessment(dta);
            dtaa.setAttribute(attr);
            dtaa.setDirectIdentifier((Boolean) m[4]);
            dtaa.setSensitivity(m[0] == null ? null : ((Number) m[0]).doubleValue());
            dtaa.setReplicability(m[1] == null ? null : ((Number) m[1]).doubleValue());
            dtaa.setAvailability(m[2] == null ? null : ((Number) m[2]).doubleValue());
            dtaa.setDistinguishability(m[3] == null ? null : ((Number) m[3]).doubleValue());
            tableAssessmentAttributeRepo.save(dtaa);
        }
    }

    private void applyDefaultAttributeScoringSystem(DatasetAssessment assessment) {
        AttributeScoringSystemVersion scoringVersion = attributeScoringSystemService.getDefaultActiveVersion();
        assessment.setAttributeScoringSystem(scoringVersion.getScoringSystem());
        assessment.setAttributeScoringSystemVersion(scoringVersion);
        assessment.setAttributeIdentifiabilityThreshold(scoringVersion.getDefaultIdentifiabilityThreshold());
        assessment.setAttributeSensitivityThreshold(scoringVersion.getDefaultSensitivityThreshold());
    }
}
