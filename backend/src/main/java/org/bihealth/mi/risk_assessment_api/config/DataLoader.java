package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.AnswerOption;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.QuestionType;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.recipient.*;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.*;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static java.util.Map.entry;

@Order(2)
@Component
public class DataLoader implements CommandLineRunner {

    @Value("${app.setup.load-sample-data:true}")
    private boolean loadSampleData;

    private final QuestionRepository questionRepo;
    private final AnswerRepository answerRepo;
    private final DatasetRepository datasetRepo;
    private final DatasetTableRepository tableRepo;
    private final DatasetAssessmentRepository assessmentRepo;
    private final DatasetTableAssessmentRepository tableAssessmentRepo;
    private final DatasetTableAssessmentAttributeRepository tableAssessmentAttributeRepo;
    private final RecipientRepository recipientRepository;
    private final RecipientAssessmentRepository recipientAssessmentRepository;
    private final DataSharingActivityRepository dataSharingActivityRepository;

    public DataLoader(
            QuestionRepository questionRepo,
            AnswerRepository answerRepo,
            DatasetRepository datasetRepo,
            DatasetTableRepository tableRepo,
            DatasetAssessmentRepository assessmentRepo,
            DatasetTableAssessmentRepository tableAssessmentRepo,
            DatasetTableAssessmentAttributeRepository tableAssessmentAttributeRepo,
            RecipientRepository recipientRepository,
            RecipientAssessmentRepository recipientAssessmentRepository,
            DataSharingActivityRepository dataSharingActivityRepository
    ) {
        this.questionRepo = questionRepo;
        this.answerRepo = answerRepo;
        this.datasetRepo = datasetRepo;
        this.tableRepo = tableRepo;
        this.assessmentRepo = assessmentRepo;
        this.tableAssessmentRepo = tableAssessmentRepo;
        this.tableAssessmentAttributeRepo = tableAssessmentAttributeRepo;
        this.recipientRepository = recipientRepository;
        this.recipientAssessmentRepository = recipientAssessmentRepository;
        this.dataSharingActivityRepository = dataSharingActivityRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!loadSampleData) return;
        boolean datasetExists = datasetRepo.findAll().stream()
                .anyMatch(d -> "LEOSS Public Use File".equals(d.getName()));
        if (datasetExists) return;

        List<Question> allQuestions = questionRepo.findAll();
        if (allQuestions.isEmpty()) return;

        List<Dataset> datasets = createDatasets(allQuestions);
        List<Recipient> recipients = createRecipients(allQuestions);
        createDataSharingActivities(datasets, recipients);
    }

    private List<Dataset> createDatasets(List<Question> allQuestions) {
        // FIX: Compare against Enum, not String
        List<Question> datasetQuestions = allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.IP)
                .collect(Collectors.toList());

        List<Dataset> datasets = new ArrayList<>();
        Dataset leoss = new Dataset();
        leoss.setCreatorUsername("user");
        leoss.setName("LEOSS Public Use File");
        leoss.setDescription("Lean European Open Survey on SARS-CoV-2-Infected Patients (anonymized PUF)");
        leoss.setSharedUsernames(new HashSet<>(Set.of("anna.mueller", "max.mustermann", "sophie.becker")));
        leoss = datasetRepo.save(leoss);

        DatasetTable patients = new DatasetTable();
        patients.setName("Patients");
        patients.setCreatorUsername("user");
        patients.setDataset(leoss);

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

        for (Map.Entry<String, DataType> entry : attributes.entrySet()) {
            patients.getAttributes().add(new DatasetTableAttribute(patients, entry.getKey(), entry.getValue()));
        }
        patients = tableRepo.save(patients);
        leoss.getTables().add(patients);

        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(leoss);
        da.setName("LEOSS Initial Assessment");
        da.setDescription("Invasion-of-Privacy answers");
        da.setCreatorUsername("user");
        da = assessmentRepo.save(da);
        leoss.getDatasetAssessments().add(da);

        AnswerOption[] invasionAnswers = {AnswerOption.NO, AnswerOption.YES, AnswerOption.YES, AnswerOption.NO, AnswerOption.NO, AnswerOption.NO, AnswerOption.NO, AnswerOption.NO, AnswerOption.UNKNOWN, AnswerOption.UNKNOWN, AnswerOption.UNKNOWN, AnswerOption.UNKNOWN};

        for (int i = 0; i < invasionAnswers.length && i < datasetQuestions.size(); i++) {
            Answer ans = new Answer(da, datasetQuestions.get(i), invasionAnswers[i]);
            ans = answerRepo.save(ans);
            da.getAnswers().add(ans); // Add to parent list
        }

        DatasetTableAssessment dta = new DatasetTableAssessment();
        dta.setDatasetAssessment(da);
        dta.setTable(patients);
        dta = tableAssessmentRepo.save(dta);
        da.getTableAssessments().add(dta);

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

        for (DatasetTableAttribute attr : patients.getAttributes()) {
            Object[] m = metrics.get(attr.getName());
            if (m == null) continue;
            DatasetTableAssessmentAttribute dtaa = new DatasetTableAssessmentAttribute();
            dtaa.setAssessment(dta);
            dtaa.setAttribute(attr);
            dtaa.setDirectIdentifier((Boolean) m[4]);
            dtaa.setSensitivity(m[0] == null ? null : (Integer) m[0]);
            dtaa.setReplicability(m[1] == null ? null : (Integer) m[1]);
            dtaa.setAvailability(m[2] == null ? null : (Integer) m[2]);
            dtaa.setDistinguishability(m[3] == null ? null : (Integer) m[3]);
            tableAssessmentAttributeRepo.save(dtaa);
        }

        // Ensure changes propagate
        assessmentRepo.save(da);
        datasetRepo.save(leoss);
        datasets.add(leoss);
        return datasets;
    }

    private List<Recipient> createRecipients(List<Question> allQuestions) {
        List<Recipient> recipients = new ArrayList<>();

        Recipient good = new Recipient();
        good.setCreatorUsername("user");
        good.setName("Academic Research Institute");
        good.setOrganization("Academic Research Institute");
        good.setDescription("University-based lab with strict privacy controls");
        good = recipientRepository.save(good);

        RecipientAssessment raGood = new RecipientAssessment();
        raGood.setCreatorUsername("user");
        raGood.setName("Research Institute Assessment");
        raGood.setContactName("Dr. Alice Scholar");
        raGood.setEmail("alice.scholar@example.edu");
        raGood.setTelephone("+1-555-0100");
        raGood.setDepartment("Health Informatics");
        raGood.setRecipient(good);
        raGood = recipientAssessmentRepository.save(raGood);
        good.getAssessments().add(raGood);

        final RecipientAssessment finalRaGood = raGood;

        // FIX: Compare Enum
        allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.MITC)
                .forEach(q -> {
                    Answer ans = answerRepo.save(new Answer(finalRaGood, q, AnswerOption.YES));
                    finalRaGood.getAnswers().add(ans);
                });

        allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.MOTC)
                .forEach(q -> {
                    // FIX: Use getQuestion() instead of getText()
                    AnswerOption opt = q.getText().toLowerCase().contains("technical skills")
                            ? AnswerOption.YES
                            : AnswerOption.NO;
                    Answer ans = answerRepo.save(new Answer(finalRaGood, q, opt));
                    finalRaGood.getAnswers().add(ans);
                });
        recipients.add(good);

        Recipient bad = new Recipient();
        bad.setCreatorUsername("user");
        bad.setName("Public Release");
        bad.setOrganization("Public Data Portal");
        bad.setDescription("Scenario representing a public data release with minimal contextual controls.");
        bad = recipientRepository.save(bad);

        RecipientAssessment raBad = new RecipientAssessment();
        raBad.setCreatorUsername("user");
        raBad.setName("Public Release Assessment");
        raBad.setRecipient(bad);
        raBad = recipientAssessmentRepository.save(raBad);
        bad.getAssessments().add(raBad);

        final RecipientAssessment finalRaBad = raBad;
        allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.MITC)
                .forEach(q -> {
                    Answer ans = answerRepo.save(new Answer(finalRaBad, q, AnswerOption.NO));
                    finalRaBad.getAnswers().add(ans);
                });

        allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.MOTC)
                .forEach(q -> {
                    Answer ans = answerRepo.save(new Answer(finalRaBad, q, AnswerOption.YES));
                    finalRaBad.getAnswers().add(ans);
                });
        recipients.add(bad);

        Recipient moderate = new Recipient();
        moderate.setCreatorUsername("user");
        moderate.setName("Commercial Partner (Moderate Risk)");
        moderate.setOrganization("HealthTech Solutions Ltd.");
        moderate.setDescription("A commercial partner with some security controls but potential commercial motives.");
        moderate = recipientRepository.save(moderate);

        RecipientAssessment raModerate = new RecipientAssessment();
        raModerate.setCreatorUsername("user");
        raModerate.setName("Commercial Partner Assessment");
        raModerate.setContactName("John Doe");
        raModerate.setEmail("j.doe@healthtech.example.com");
        raModerate.setDepartment("R&D");
        raModerate.setRecipient(moderate);
        raModerate = recipientAssessmentRepository.save(raModerate);
        moderate.getAssessments().add(raModerate);

        List<Question> mitcQuestions = allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.MITC)
                .collect(Collectors.toList());

        for (Question q : mitcQuestions) {
            // FIX: Use getQuestion()
            AnswerOption answer = (q.getId() == 12 || q.getText().contains("Access restricted"))
                    ? AnswerOption.YES
                    : ((q.getId() % 2 == 0) ? AnswerOption.YES : AnswerOption.NO);

            Answer ans = answerRepo.save(new Answer(raModerate, q, answer));
            raModerate.getAnswers().add(ans);
        }

        List<Question> motcQuestions = allQuestions.stream()
                .filter(q -> q.getType() == QuestionType.MOTC)
                .collect(Collectors.toList());

        for (Question q : motcQuestions) {
            // FIX: Use getQuestion()
            AnswerOption answer = (q.getId() == 32 || q.getText().contains("public release"))
                    ? AnswerOption.NO
                    : ((q.getId() % 2 == 0) ? AnswerOption.YES : AnswerOption.NO);

            Answer ans = answerRepo.save(new Answer(raModerate, q, answer));
            raModerate.getAnswers().add(ans);
        }

        recipients.add(moderate);
        return recipients;
    }

    public void createDataSharingActivities(List<Dataset> datasets, List<Recipient> recipients) {
        if (datasets.isEmpty() || recipients.size() < 2) return;

        DatasetAssessment da0 = datasets.get(0).getDatasetAssessments().get(0);
        RecipientAssessment ra0 = recipients.get(0).getAssessments().get(0);
        DataSharingActivity act1 = new DataSharingActivity();
        act1.setCreatorUsername("user");
        act1.setName("LEOSS / Academic Research Institute");
        act1.setDescription("LEOSS PUF shared with a research institute (no table overrides).");
        act1.setDatasetAssessment(da0);
        act1.setRecipientAssessment(ra0);

        act1.setSharedUsernames(new HashSet<>(Set.of("anna.mueller", "max.mustermann")));
        dataSharingActivityRepository.save(act1);

        DatasetAssessment da1 = datasets.get(0).getDatasetAssessments().get(0);
        RecipientAssessment ra1 = recipients.get(1).getAssessments().get(0);
        DataSharingActivity act2 = new DataSharingActivity();
        act2.setCreatorUsername("user");
        act2.setName("LEOSS Public Release");
        act2.setDatasetAssessment(da1);
        act2.setRecipientAssessment(ra1);

        act2.setSharedUsernames(new HashSet<>(Set.of("anna.mueller", "max.mustermann")));
        dataSharingActivityRepository.save(act2);

        DatasetAssessment da2 = datasets.get(0).getDatasetAssessments().get(0);
        RecipientAssessment ra2 = recipients.get(2).getAssessments().get(0);

        DataSharingActivity act3 = new DataSharingActivity();
        act3.setCreatorUsername("user");
        act3.setName("LEOSS / Commercial Partner");
        act3.setDescription("Sharing activity with a moderate-risk commercial partner (HealthTech Solutions).");
        act3.setDatasetAssessment(da2);
        act3.setRecipientAssessment(ra2);
        act3.setSharedUsernames(new HashSet<>(Set.of("anna.mueller", "sophie.becker")));
        dataSharingActivityRepository.save(act3);
    }
}