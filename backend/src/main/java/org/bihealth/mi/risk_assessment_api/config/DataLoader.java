package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.model.recipient.*;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static java.util.Map.entry;

/**
 * Creates the demo dataset, recipient profiles, framework-specific assessments,
 * and predefined {@link DataSharingActivity} examples used by the application.
 *
 * <p>This loader runs after {@link ConfigLoader}. It assumes that the bundled
 * risk configurations are already persisted and then creates sample data that
 * exercises those configurations without changing the risk formula itself.</p>
 */
@Order(2)
@Component
public class DataLoader implements CommandLineRunner {

    // Allows deployments and tests to opt out of creating demo records.
    @Value("${app.setup.load-sample-data:true}")
    private boolean loadSampleData;

    // Repositories are injected separately because this loader creates several
    // aggregate roots and then connects them through assessments and activities.
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
    private final RiskConfigurationRepository configRepo;

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
            DataSharingActivityRepository dataSharingActivityRepository,
            RiskConfigurationRepository configRepo
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
        this.configRepo = configRepo;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // The loader is intentionally optional and idempotent. If the canonical
        // demo dataset already exists, the rest of the sample graph is assumed to
        // have been created in a previous startup.
        if (!loadSampleData) return;
        boolean datasetExists = datasetRepo.findAll().stream()
                .anyMatch(d -> "LEOSS Public Use File".equals(d.getName()));
        if (datasetExists) return;

        // Fetch the two seeded frameworks. The exact names are part of the
        // bundled JSON seed data and keep the following assessments tied to the
        // correct scoring model.
        List<Configuration> allConfigs = configRepo.findAll();

        Configuration elEmamConfig = allConfigs.stream()
                .filter(c -> "El Emam Risk Exposure Model".equals(c.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("El Emam configuration not found."));

        Configuration sphnConfig = allConfigs.stream()
                .filter(c -> "SPHN Risk Assessment Framework (v2.1.2)".equals(c.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("SPHN configuration not found."));

        // Create one common dataset and assess it independently under each
        // framework. The dataset stays the same; only the question set and
        // scoring configuration differ.
        Dataset leossDataset = createLeossDataset();

        DatasetAssessment elEmamDatasetAssessment = createElEmamDatasetAssessment(leossDataset, elEmamConfig);
        DatasetAssessment sphnDatasetAssessment = createSphnDatasetAssessment(leossDataset, sphnConfig);

        // Create three recipient archetypes that should produce meaningfully
        // different context-risk results: trusted academic, commercial partner,
        // and public/open release.
        List<Recipient> baseRecipients = createBaseRecipients();

        // Each recipient is assessed once per framework because El Emam and SPHN
        // ask different contextual-control and likelihood questions.
        List<RecipientAssessment> elEmamRecipientAssessments = createElEmamRecipientAssessments(baseRecipients, elEmamConfig);
        List<RecipientAssessment> sphnRecipientAssessment = createSphnRecipientAssessments(baseRecipients, sphnConfig);

        // Finally, pair the dataset assessments with matching recipient
        // assessments to create the examples shown in the UI.
        createDemoDataSharingActivities(
                elEmamConfig, elEmamDatasetAssessment, elEmamRecipientAssessments,
                sphnConfig, sphnDatasetAssessment, sphnRecipientAssessment
        );
    }

    /**
     * Creates a small LEOSS-inspired tabular dataset used by every sample
     * scenario.
     *
     * <p>The same persisted dataset is reused for El Emam and SPHN assessments
     * so differences in the final recommendation come from framework scoring
     * and recipient context, not from different source data.</p>
     */
    private Dataset createLeossDataset() {
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

        // LinkedHashMap preserves the display/order of attributes in the sample
        // table, which makes seeded assessments and UI inspection predictable.
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

        tableRepo.save(patients);
        leoss.getTables().add(patients);

        return datasetRepo.save(leoss);
    }

    /**
     * Adds attribute-level metadata to a dataset assessment.
     *
     * <p>These values model the direct identifier and quasi-identifier
     * characteristics of the LEOSS table. They are saved separately from the
     * questionnaire answers because table/attribute assessment screens use this
     * structured metadata directly.</p>
     */
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
            dtaa.setSensitivity(m[0] == null ? null : (Integer) m[0]);
            dtaa.setReplicability(m[1] == null ? null : (Integer) m[1]);
            dtaa.setAvailability(m[2] == null ? null : (Integer) m[2]);
            dtaa.setDistinguishability(m[3] == null ? null : (Integer) m[3]);
            tableAssessmentAttributeRepo.save(dtaa);
        }
    }

    // ==========================================
    // ASSESSMENT GENERATORS
    // ==========================================
    /**
     * Creates one {@link Answer} per framework question for the supplied
     * assessment.
     *
     * <p>The predefined answer map is keyed by stable fragments from the
     * question text, such as an SPHN question code. This avoids relying on JPA
     * collection order, which is not guaranteed and was the source of misleading
     * sample classifications.</p>
     */
    private void applyAnswers(BaseAssessment assessment, List<Question> questions, Map<String, String> predefinedAnswers) {
        if (assessment.getAnswers() == null) {
            assessment.setAnswers(new ArrayList<>());
        }

        for (Question q : questions) {
            String preferredAnswer = findAnswerForQuestion(q, predefinedAnswers);
            QuestionOption opt = findOption(q, preferredAnswer);

            Answer ans = new Answer(assessment, q, opt);
            ans = answerRepo.save(ans);
            assessment.getAnswers().add(ans);
        }
    }

    /**
     * Selects the configured seed answer for a question by matching the
     * question text against the map keys.
     *
     * <p>Every question in the seeded assessment must have a matching entry.
     * Failing fast here is intentional: if a question label or code changes in a
     * configuration JSON, the sample data should be reviewed rather than silently
     * choosing a wrong option.</p>
     */
    private String findAnswerForQuestion(Question question, Map<String, String> predefinedAnswers) {
        String questionText = question.getText() == null ? "" : question.getText().toLowerCase(Locale.ROOT);

        return predefinedAnswers.entrySet().stream()
                .filter(entry -> questionText.contains(entry.getKey().toLowerCase(Locale.ROOT)))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No predefined seed answer for question '" + question.getText() + "'."
                ));
    }

    /**
     * Resolves the selected {@link QuestionOption} from the answer text.
     *
     * <p>Exact option text is preferred. Partial matching is kept as a pragmatic
     * fallback for long labels in the configuration files, while still throwing
     * an exception if no option can be identified.</p>
     */
    private QuestionOption findOption(Question q, String preferredText) {
        if (q.getOptions() == null || q.getOptions().isEmpty()) {
            return null;
        }

        String normalizedPreferredText = preferredText == null ? "" : preferredText.trim().toLowerCase(Locale.ROOT);

        return q.getOptions().stream()
                .filter(opt -> opt.getText() != null && opt.getText().trim().equalsIgnoreCase(preferredText))
                .findFirst()
                .or(() -> q.getOptions().stream()
                        .filter(opt -> opt.getText() != null
                                && opt.getText().toLowerCase(Locale.ROOT).contains(normalizedPreferredText))
                        .findFirst())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No option matching '" + preferredText + "' for question '" + q.getText() + "'."
                ));
    }

    /**
     * Creates the El Emam dataset-side assessment for LEOSS.
     *
     * <p>In this model the dataset answers feed the IMPACT classification. The
     * selected answers intentionally avoid critical trigger conditions so the
     * sample can demonstrate how recipient context changes the final
     * anonymization recommendation.</p>
     */
    private DatasetAssessment createElEmamDatasetAssessment(Dataset dataset, Configuration config) {
        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(dataset);
        da.setConfiguration(config);
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

        applyAnswers(da, datasetQuestions, answers);
        applyLeossAttributeAssessment(dataset, da);

        dataset.getDatasetAssessments().add(da);
        return assessmentRepo.save(da);
    }

    /**
     * Creates the SPHN dataset-side assessment for LEOSS.
     *
     * <p>SPHN uses its own data-risk question set, identified in the seed map by
     * question codes such as {@code [D-01]}. Those answers are deliberately
     * matched by code fragment so wording changes around the code do not break
     * the seed logic.</p>
     */
    private DatasetAssessment createSphnDatasetAssessment(Dataset dataset, Configuration config) {
        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(dataset);
        da.setConfiguration(config);
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
                entry("[d-06]", "within +/- 365 days"),
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
        applyAnswers(da, datasetQuestions, answers);

        // Attach the standard LEOSS table and attribute risk metrics so the UI
        // can display the same attribute assessment details for both frameworks.
        applyLeossAttributeAssessment(dataset, da);

        dataset.getDatasetAssessments().add(da);
        return assessmentRepo.save(da);
    }

    /**
     * Creates the three recipient archetypes used by the predefined
     * DataSharingActivity examples.
     *
     * <p>The archetypes are intentionally broad: a trusted academic institute, a
     * commercial partner with business incentives, and a public/open-data portal.
     * Their framework-specific assessments below provide the actual control and
     * likelihood answers.</p>
     */
    private List<Recipient> createBaseRecipients() {
        List<Recipient> recipients = new ArrayList<>();

        // Trusted recipient: strong institutional controls and ethical oversight.
        Recipient trusted = new Recipient();
        trusted.setCreatorUsername("user");
        trusted.setName("Academic Research Institute");
        trusted.setOrganization("University Labs");
        trusted.setDescription("University-based lab with strict privacy controls and ethical oversight.");
        trusted = recipientRepository.save(trusted);
        recipients.add(trusted);

        // Commercial recipient: legitimate collaboration with additional motive
        // and capability considerations.
        Recipient commercial = new Recipient();
        commercial.setCreatorUsername("user");
        commercial.setName("Commercial Partner");
        commercial.setOrganization("HealthTech Solutions Ltd.");
        commercial.setDescription("A commercial partner with standard security controls but potential commercial motives.");
        commercial = recipientRepository.save(commercial);
        recipients.add(commercial);

        // Public release: no specific trusted counterparty and minimal
        // contextual controls.
        Recipient publicRelease = new Recipient();
        publicRelease.setCreatorUsername("user");
        publicRelease.setName("Public Open Data Portal");
        publicRelease.setOrganization("Public Release");
        publicRelease.setDescription("Open data release via a public portal with minimal to no contextual controls.");
        publicRelease = recipientRepository.save(publicRelease);
        recipients.add(publicRelease);

        return recipients;
    }

    private List<RecipientAssessment> createElEmamRecipientAssessments(List<Recipient> recipients, Configuration config) {
        // Initialize the list to return
        List<RecipientAssessment> createdAssessments = new ArrayList<>();

        // Fetch all questions mapped to the RECIPIENT_ASSESSMENT phase
        List<Question> recipientQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        for (Recipient recipient : recipients) {
            RecipientAssessment ra = new RecipientAssessment();
            ra.setRecipient(recipient);
            ra.setConfiguration(config);
            ra.setCreatorUsername("user");
            ra.setName(recipient.getName() + " Assessment (El Emam)");
            ra.setAnswers(new ArrayList<>());
            ra = recipientAssessmentRepository.save(ra);

            Map<String, String> answers;

            if (recipient.getName().contains("Academic")) {
                // Highly trusted academic environment
                answers = Map.ofEntries(
                        entry("Access rights", "yes"),
                        entry("worked/collaborated", "yes"),
                        entry("forbids the recipient", "yes"),
                        entry("enforceable in all jurisdictions", "yes"),
                        entry("surprise audits", "yes"),
                        entry("regular third party privacy", "yes"),
                        entry("strong limits linking", "yes"),
                        entry("written privacy policy", "yes"),
                        entry("person responsible for privacy", "yes"),
                        entry("confidentiality agreement", "yes"),
                        entry("threat and risk assessment", "yes"),
                        entry("Strong security procedures", "yes"),
                        entry("sufficiently trained", "yes"),
                        entry("access and changes", "yes"),
                        entry("User accounts", "yes"),
                        entry("breach notification", "yes"),
                        entry("physically secure", "yes"),
                        entry("no public access", "yes"),
                        entry("destroyed once", "yes"),
                        entry("commercial or criminal value", "no"),
                        entry("non-commercial motive", "no"),
                        entry("technical expertise", "no"),
                        entry("financial resources", "no"),
                        entry("harm or embarrass", "no"),
                        entry("other means apart", "yes")
                );
            } else if (recipient.getName().contains("Commercial")) {
                // Commercial partner: adequate legal controls, but clear motive and capability.
                answers = Map.ofEntries(
                        entry("Access rights", "yes"),
                        entry("worked/collaborated", "no"),
                        entry("forbids the recipient", "yes"),
                        entry("enforceable in all jurisdictions", "yes"),
                        entry("surprise audits", "no"),
                        entry("regular third party privacy", "no"),
                        entry("strong limits linking", "yes"),
                        entry("written privacy policy", "yes"),
                        entry("person responsible for privacy", "yes"),
                        entry("confidentiality agreement", "yes"),
                        entry("threat and risk assessment", "yes"),
                        entry("Strong security procedures", "yes"),
                        entry("sufficiently trained", "yes"),
                        entry("access and changes", "yes"),
                        entry("User accounts", "yes"),
                        entry("breach notification", "yes"),
                        entry("physically secure", "yes"),
                        entry("no public access", "yes"),
                        entry("destroyed once", "yes"),
                        entry("commercial or criminal value", "yes"),
                        entry("non-commercial motive", "no"),
                        entry("technical expertise", "yes"),
                        entry("financial resources", "yes"),
                        entry("harm or embarrass", "no"),
                        entry("other means apart", "yes")
                );
            } else {
                // Public release: intentionally weak contextual controls and broad attack opportunity.
                answers = Map.ofEntries(
                        entry("Access rights", "no"),
                        entry("worked/collaborated", "no"),
                        entry("forbids the recipient", "no"),
                        entry("enforceable in all jurisdictions", "no"),
                        entry("surprise audits", "no"),
                        entry("regular third party privacy", "no"),
                        entry("strong limits linking", "no"),
                        entry("written privacy policy", "no"),
                        entry("person responsible for privacy", "no"),
                        entry("confidentiality agreement", "no"),
                        entry("threat and risk assessment", "no"),
                        entry("Strong security procedures", "no"),
                        entry("sufficiently trained", "no"),
                        entry("access and changes", "no"),
                        entry("User accounts", "no"),
                        entry("breach notification", "no"),
                        entry("physically secure", "no"),
                        entry("no public access", "no"),
                        entry("destroyed once", "no"),
                        entry("commercial or criminal value", "yes"),
                        entry("non-commercial motive", "yes"),
                        entry("technical expertise", "yes"),
                        entry("financial resources", "yes"),
                        entry("harm or embarrass", "no"),
                        entry("other means apart", "no")
                );
            }

            // Use the existing helper to map the strings to the exact Option IDs
            applyAnswers(ra, recipientQuestions, answers);
            recipient.getAssessments().add(ra);

            // Add the fully populated assessment to our return list
            createdAssessments.add(ra);
        }

        return createdAssessments;
    }

    private List<RecipientAssessment> createSphnRecipientAssessments(List<Recipient> recipients, Configuration config) {
        List<RecipientAssessment> createdAssessments = new ArrayList<>();

        // Fetch all questions mapped to the RECIPIENT_ASSESSMENT phase (CONTEXTUAL_RISK and CONTRACTUAL_IT_RISK)
        List<Question> recipientQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        for (Recipient recipient : recipients) {
            RecipientAssessment ra = new RecipientAssessment();
            ra.setRecipient(recipient);
            ra.setConfiguration(config);
            ra.setCreatorUsername("user");
            ra.setName(recipient.getName() + " (SPHN)");
            ra.setAnswers(new ArrayList<>());
            ra = recipientAssessmentRepository.save(ra);

            Map<String, String> answers;

            if (recipient.getName().contains("Academic")) {
                // Highly trusted academic environment: Very strict IT compliance, low contextual exposure
                answers = Map.ofEntries(
                        entry("[c-01]", "switzerland"),
                        entry("[c-02]", "no health-related"),
                        entry("[c-03]", "100 to 1.000 patients"),
                        entry("[c-04]", "25 to 100 datapoints"),
                        entry("[c-05]", "no"),
                        entry("[c-06]", "not affiliated"),
                        entry("[c-07]", "no"),
                        entry("[cit-01]", "yes"),
                        entry("[cit-02]", "yes"),
                        entry("[cit-03]", "yes"),
                        entry("[cit-04]", "yes"),
                        entry("[cit-05]", "yes"),
                        entry("[cit-06]", "yes"),
                        entry("[cit-07]", "yes"),
                        entry("[cit-08]", "biomedit"),
                        entry("[cit-09]", "yes"),
                        entry("[cit-10]", "yes")
                );
            } else if (recipient.getName().contains("Commercial")) {
                // Moderate-risk commercial partner: compliant basics, fewer audit guarantees, and medium likelihood.
                answers = Map.ofEntries(
                        entry("[c-01]", "with adequate safeguards"),
                        entry("[c-02]", "no health-related"),
                        entry("[c-03]", "100 to 1.000"),
                        entry("[c-04]", "25 to 100"),
                        entry("[c-05]", "no"),
                        entry("[c-06]", "not affiliated"),
                        entry("[c-07]", "no"),
                        entry("[cit-01]", "yes"),
                        entry("[cit-02]", "yes"),
                        entry("[cit-03]", "no"),
                        entry("[cit-04]", "no"),
                        entry("[cit-05]", "yes"),
                        entry("[cit-06]", "yes"),
                        entry("[cit-07]", "yes"),
                        entry("[cit-08]", "hospital it"),
                        entry("[cit-09]", "yes"),
                        entry("[cit-10]", "yes")
                );
            } else {
                // Public release: weak/no contractual controls and high contextual exposure.
                answers = Map.ofEntries(
                        entry("[c-01]", "without adequate safeguards"),
                        entry("[c-02]", "less than one in 2.000"),
                        entry("[c-03]", "1.000 to 5.000"),
                        entry("[c-04]", "100 to 1000"),
                        entry("[c-05]", "yes"),
                        entry("[c-06]", "WITH access"),
                        entry("[c-07]", "yes"),
                        entry("[cit-01]", "no"),
                        entry("[cit-02]", "no"),
                        entry("[cit-03]", "no"),
                        entry("[cit-04]", "no"),
                        entry("[cit-05]", "no"),
                        entry("[cit-06]", "no"),
                        entry("[cit-07]", "no"),
                        entry("[cit-08]", "private computer"),
                        entry("[cit-09]", "no"),
                        entry("[cit-10]", "no")
                );
            }

            // Apply answers using the overloaded helper method
            applyAnswers(ra, recipientQuestions, answers);
            recipient.getAssessments().add(ra);

            createdAssessments.add(ra);
        }

        return createdAssessments;
    }

    /**
     * PHASE 6: Ties datasets and recipients together into Data Sharing Activities.
     * Creates comparable Academic (0), Commercial (1), and Public (2) scenarios
     * for both the El Emam and SPHN frameworks.
     */
    private void createDemoDataSharingActivities(
            Configuration elEmamConfig, DatasetAssessment elEmamDA, List<RecipientAssessment> elEmamRAs,
            Configuration sphnConfig, DatasetAssessment sphnDA, List<RecipientAssessment> sphnRAs) {

        // =========================================================================
        // TRUSTED RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 1: Academic evaluated under SPHN
        DataSharingActivity act1 = new DataSharingActivity();
        act1.setCreatorUsername("user");
        act1.setName("LEOSS / Academic Labs (SPHN)");
        act1.setDescription("Sharing COVID-19 tabular data with a trusted university lab. Evaluated under the strict SPHN framework.");
        act1.setDatasetAssessment(sphnDA);
        act1.setRecipientAssessment(sphnRAs.get(0));
        act1.setSharedUsernames(new HashSet<>(Set.of("anna.mueller")));
        dataSharingActivityRepository.save(act1);

        // Scenario 2: Academic evaluated under El Emam
        DataSharingActivity act2 = new DataSharingActivity();
        act2.setCreatorUsername("user");
        act2.setName("LEOSS / Academic Labs (El Emam)");
        act2.setDescription("Direct comparison of the Academic transfer, evaluated under El Emam instead of SPHN.");
        act2.setDatasetAssessment(elEmamDA);
        act2.setRecipientAssessment(elEmamRAs.get(0));
        dataSharingActivityRepository.save(act2);


        // =========================================================================
        // PUBLIC RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 5: Public Release evaluated under El Emam
        DataSharingActivity act5 = new DataSharingActivity();
        act5.setCreatorUsername("user");
        act5.setName("LEOSS / Open Data Portal (El Emam)");
        act5.setDescription("Public data release evaluated using the El Emam Risk Exposure Model. Highlights high context and threat risk.");
        act5.setDatasetAssessment(elEmamDA);
        act5.setRecipientAssessment(elEmamRAs.get(2));
        dataSharingActivityRepository.save(act5);

        // Scenario 6: Public Release evaluated under SPHN
        DataSharingActivity act6 = new DataSharingActivity();
        act6.setCreatorUsername("user");
        act6.setName("LEOSS / Open Data Portal (SPHN)");
        act6.setDescription("Evaluating a totally open data release against the strict clinical IT and contextual standards of the SPHN framework.");
        act6.setDatasetAssessment(sphnDA);
        act6.setRecipientAssessment(sphnRAs.get(2));
        dataSharingActivityRepository.save(act6);


        // =========================================================================
        // COMMERCIAL RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 7: Commercial evaluated under El Emam
        DataSharingActivity act7 = new DataSharingActivity();
        act7.setCreatorUsername("user");
        act7.setName("LEOSS / HealthTech Solutions (El Emam)");
        act7.setDescription("Commercial data sharing agreement. Evaluated using the El Emam Risk Exposure Model for standard re-identification risks.");
        act7.setDatasetAssessment(elEmamDA);
        act7.setRecipientAssessment(elEmamRAs.get(1));
        act7.setSharedUsernames(new HashSet<>(Set.of("max.mustermann", "sophie.becker")));
        dataSharingActivityRepository.save(act7);

        // Scenario 8: Commercial evaluated under SPHN
        DataSharingActivity act8 = new DataSharingActivity();
        act8.setCreatorUsername("user");
        act8.setName("LEOSS / HealthTech Solutions (SPHN)");
        act8.setDescription("Commercial data sharing agreement evaluated under the SPHN framework, with standard organizational safeguards and moderate contextual exposure.");
        act8.setDatasetAssessment(sphnDA);
        act8.setRecipientAssessment(sphnRAs.get(1));
        act8.setSharedUsernames(new HashSet<>(Set.of("max.mustermann", "sophie.becker")));
        dataSharingActivityRepository.save(act8);
    }
}
