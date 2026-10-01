package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.model.recipient.*;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
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
import org.bihealth.mi.risk_assessment_api.service.AttributeScoringSystemService;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
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
@Order(3)
@Component
public class DataLoader implements CommandLineRunner {

    private static final String DEMO_CREATOR = "user";
    private static final String LEOSS_DATASET_NAME = DemoDatasetEvidenceSeeder.LEOSS_DATASET_NAME;
    private static final String ACADEMIC_RECIPIENT_NAME = "Academic Research Institute";
    private static final String COMMERCIAL_RECIPIENT_NAME = "Commercial Partner";
    private static final String PUBLIC_RECIPIENT_NAME = "Public Open Data Portal";
    static final String AGREEMENT_PENDING_RECIPIENT_NAME = "Swiss Research Institute";
    static final String AGREEMENT_PENDING_ACTIVITY_NAME = "LEOSS / Swiss Research Institute, DTUA pending (SPHN)";
    static final String SECURE_ENVIRONMENT_ASSESSMENT_NAME = "Academic Research Institute – Secure Environment (SPHN)";
    private static final String EL_EMAM_DATASET_ASSESSMENT_NAME = "LEOSS Assessment (El Emam)";
    private static final String SPHN_DATASET_ASSESSMENT_NAME = "LEOSS Assessment (SPHN)";
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
    private final AttributeScoringSystemService attributeScoringSystemService;

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
            RiskConfigurationRepository configRepo,
            AttributeScoringSystemService attributeScoringSystemService
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
        this.attributeScoringSystemService = attributeScoringSystemService;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (!loadSampleData) return;

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

        // Create or locate one common dataset and assess it independently under
        // each framework. The project seed below must remain independent of
        // whether older developer databases already contain the LEOSS dataset.
        Dataset leossDataset = getOrCreateLeossDataset();

        DatasetAssessment elEmamDatasetAssessment =
                getOrCreateElEmamDatasetAssessment(leossDataset, elEmamConfig);
        DatasetAssessment sphnDatasetAssessment =
                getOrCreateSphnDatasetAssessment(leossDataset, sphnConfig);

        // Create or locate three recipient archetypes that should produce
        // meaningfully different context-risk results: trusted academic,
        // commercial partner, and public/open release.
        List<Recipient> baseRecipients = getOrCreateBaseRecipients();

        // Each recipient is assessed once per framework because El Emam and SPHN
        // ask different contextual-control and likelihood questions.
        List<RecipientAssessment> elEmamRecipientAssessments =
                getOrCreateElEmamRecipientAssessments(baseRecipients, elEmamConfig);
        List<RecipientAssessment> sphnRecipientAssessment =
                getOrCreateSphnRecipientAssessments(baseRecipients, sphnConfig);

        // Finally, pair the dataset assessments with matching recipient
        // assessments to create the examples shown in the UI.
        createDemoDataSharingActivities(
                elEmamConfig, elEmamDatasetAssessment, elEmamRecipientAssessments,
                sphnConfig, sphnDatasetAssessment, sphnRecipientAssessment,
                null
        );

        createAgreementPendingScenario(sphnConfig, sphnDatasetAssessment);
        getOrCreateSecureEnvironmentAssessment(baseRecipients.get(0), sphnConfig);
    }

    /**
     * Dedicated SPHN assessment of the academic recipient for the Secure Analysis Environment
     * activity (created by {@link ProjectTemplateDemoSeeder}); see
     * {@link DemoAssessmentAnswers#SPHN_SECURE_ENVIRONMENT}.
     */
    private RecipientAssessment getOrCreateSecureEnvironmentAssessment(Recipient academic, Configuration sphnConfig) {
        return findRecipientAssessment(academic, SECURE_ENVIRONMENT_ASSESSMENT_NAME).orElseGet(() -> {
            RecipientAssessment created = new RecipientAssessment();
            created.setRecipient(academic);
            applyConfiguration(created, sphnConfig);
            created.setCreatorUsername(DEMO_CREATOR);
            created.setName(SECURE_ENVIRONMENT_ASSESSMENT_NAME);
            created.setAnswers(new ArrayList<>());
            created = recipientAssessmentRepository.save(created);
            applyAnswers(created, recipientQuestions(sphnConfig), DemoAssessmentAnswers.SPHN_SECURE_ENVIRONMENT);
            academic.getAssessments().add(created);
            return created;
        });
    }

    /**
     * SPHN reference scenario in which a proposed context control visibly moves the context-risk
     * matrix: the data-transfer and use agreement is not yet executed, so the CIT-01/CIT-02
     * high-risk triggers force Controls to LOW. It is assessed under SPHN only.
     */
    private void createAgreementPendingScenario(Configuration sphnConfig, DatasetAssessment sphnDatasetAssessment) {
        Recipient institute = findRecipientByNormalizedName(AGREEMENT_PENDING_RECIPIENT_NAME)
                .orElseGet(() -> {
                    Recipient recipient = new Recipient();
                    recipient.setCreatorUsername(DEMO_CREATOR);
                    recipient.setName(AGREEMENT_PENDING_RECIPIENT_NAME);
                    recipient.setOrganization("Swiss Research Institute");
                    recipient.setDescription("Swiss academic research institute with IT security policies, staff confidentiality "
                            + "and BioMedIT-compliant processing; its data-transfer and use agreement is not yet executed.");
                    return recipientRepository.save(recipient);
                });

        String assessmentName = AGREEMENT_PENDING_RECIPIENT_NAME + " (SPHN)";
        RecipientAssessment assessment = findRecipientAssessment(institute, assessmentName).orElseGet(() -> {
            RecipientAssessment created = new RecipientAssessment();
            created.setRecipient(institute);
            applyConfiguration(created, sphnConfig);
            created.setCreatorUsername(DEMO_CREATOR);
            created.setName(assessmentName);
            created.setAnswers(new ArrayList<>());
            created = recipientAssessmentRepository.save(created);
            applyAnswers(created, recipientQuestions(sphnConfig), DemoAssessmentAnswers.SPHN_AGREEMENT_PENDING);
            institute.getAssessments().add(created);
            return created;
        });

        ensureDemoDataSharingActivity(
                AGREEMENT_PENDING_ACTIVITY_NAME,
                "Controlled transfer to a Swiss research institute under SPHN before the DTUA is signed. CIT-01/CIT-02 "
                        + "force Controls to LOW; the planner projects the effect of executing the agreement.",
                sphnDatasetAssessment,
                assessment,
                new HashSet<>(Set.of("anna.mueller")),
                null
        );
    }

    private List<Question> recipientQuestions(Configuration config) {
        return config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();
    }

    /**
     * Creates a small LEOSS-inspired tabular dataset used by every sample
     * scenario.
     *
     * <p>The same persisted dataset is reused for El Emam and SPHN assessments
     * so differences in the final recommendation come from framework scoring
     * and recipient context, not from different source data.</p>
     */
    private Dataset getOrCreateLeossDataset() {
        return findDatasetByNormalizedName(LEOSS_DATASET_NAME)
                .or(() -> findDatasetByNormalizedName(DemoDatasetEvidenceSeeder.LEGACY_LEOSS_DATASET_NAME))
                .orElseGet(this::createLeossDataset);
    }

    private Dataset createLeossDataset() {
        Dataset leoss = new Dataset();
        leoss.setCreatorUsername(DEMO_CREATOR);
        leoss.setName(LEOSS_DATASET_NAME);
        leoss.setDescription("Illustrative dataset inspired by the Lean European Open Survey on SARS-CoV-2-Infected Patients (LEOSS). "
                + "Schema, assessments and statistics are synthetic demo values, not measurements of the real LEOSS Public Use File.");
        leoss.setSharedUsernames(new HashSet<>(Set.of("anna.mueller", "max.mustermann", "sophie.becker")));
        leoss = datasetRepo.save(leoss);

        DatasetTable patients = new DatasetTable();
        patients.setName("Patients");
        patients.setCreatorUsername(DEMO_CREATOR);
        patients.setDataset(leoss);

        // One schema definition shared with DemoDatasetEvidenceSeeder so both seeders agree on
        // attribute names, order and data types.
        Map<String, DataType> attributes = DemoDatasetEvidenceSeeder.leossAttributes();

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
            dtaa.setSensitivity(m[0] == null ? null : ((Number) m[0]).doubleValue());
            dtaa.setReplicability(m[1] == null ? null : ((Number) m[1]).doubleValue());
            dtaa.setAvailability(m[2] == null ? null : ((Number) m[2]).doubleValue());
            dtaa.setDistinguishability(m[3] == null ? null : ((Number) m[3]).doubleValue());
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
            QuestionOption opt = SeedAnswerResolver.optionFor(q, SeedAnswerResolver.answerFor(q, predefinedAnswers));

            Answer ans = new Answer(assessment, q, opt);
            ans = answerRepo.save(ans);
            assessment.getAnswers().add(ans);
        }
    }

    /**
     * Creates the El Emam dataset-side assessment for LEOSS.
     *
     * <p>In this model the dataset answers feed the IMPACT classification. The
     * selected answers intentionally avoid critical trigger conditions so the
     * sample can demonstrate how recipient context changes the final
     * anonymization recommendation.</p>
     */
    private DatasetAssessment getOrCreateElEmamDatasetAssessment(Dataset dataset, Configuration config) {
        return findDatasetAssessment(dataset, EL_EMAM_DATASET_ASSESSMENT_NAME)
                .orElseGet(() -> createElEmamDatasetAssessment(dataset, config));
    }

    private DatasetAssessment createElEmamDatasetAssessment(Dataset dataset, Configuration config) {
        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(dataset);
        applyConfiguration(da, config);
        applyDefaultAttributeScoringSystem(da);
        da.setName(EL_EMAM_DATASET_ASSESSMENT_NAME);
        da.setDescription("Illustrative Invasion-of-Privacy answers for the LEOSS-inspired demo dataset. No IMPACT high-risk trigger is selected.");
        da.setCreatorUsername(DEMO_CREATOR);
        da = assessmentRepo.save(da);

        // Dataset-assessment questions are the only questions that contribute
        // to the dataset-side IMPACT calculation for this assessment.
        List<Question> datasetQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "DATASET_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        Map<String, String> answers = DemoAssessmentAnswers.EL_EMAM_DATASET;

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
    private DatasetAssessment getOrCreateSphnDatasetAssessment(Dataset dataset, Configuration config) {
        return findDatasetAssessment(dataset, SPHN_DATASET_ASSESSMENT_NAME)
                .orElseGet(() -> createSphnDatasetAssessment(dataset, config));
    }

    private DatasetAssessment createSphnDatasetAssessment(Dataset dataset, Configuration config) {
        DatasetAssessment da = new DatasetAssessment();
        da.setDataset(dataset);
        applyConfiguration(da, config);
        applyDefaultAttributeScoringSystem(da);
        da.setName(SPHN_DATASET_ASSESSMENT_NAME);
        da.setDescription("Illustrative SPHN data-risk answers for the LEOSS-inspired demo dataset. The original age is kept "
                + "(D-09, a high-risk trigger) and diagnosis dates are shifted by up to 90 days (D-06).");
        da.setCreatorUsername(DEMO_CREATOR);
        da = assessmentRepo.save(da);

        // Fetch all questions mapped to the DATASET_ASSESSMENT phase. In the
        // SPHN configuration these are the DATA_RISK questions.
        List<Question> datasetQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "DATASET_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        Map<String, String> answers = DemoAssessmentAnswers.SPHN_DATASET;

        // Persist one answer per SPHN data-risk question.
        applyAnswers(da, datasetQuestions, answers);

        // Attach the standard LEOSS table and attribute risk metrics so the UI
        // can display the same attribute assessment details for both frameworks.
        applyLeossAttributeAssessment(dataset, da);

        dataset.getDatasetAssessments().add(da);
        return assessmentRepo.save(da);
    }

    /** Seed answers are chosen by the recipient's exact demo name, never by a name fragment. */
    private Map<String, String> answersForRecipient(
            Recipient recipient,
            Map<String, String> academic,
            Map<String, String> commercial,
            Map<String, String> publicRelease
    ) {
        return switch (recipient.getName()) {
            case ACADEMIC_RECIPIENT_NAME -> academic;
            case COMMERCIAL_RECIPIENT_NAME -> commercial;
            case PUBLIC_RECIPIENT_NAME -> publicRelease;
            default -> throw new IllegalStateException("No demo answers for recipient '" + recipient.getName() + "'.");
        };
    }

    private void applyDefaultAttributeScoringSystem(DatasetAssessment assessment) {
        AttributeScoringSystemVersion scoringVersion = attributeScoringSystemService.getDefaultActiveVersion();
        assessment.setAttributeScoringSystem(scoringVersion.getScoringSystem());
        assessment.setAttributeScoringSystemVersion(scoringVersion);
        assessment.setAttributeIdentifiabilityThreshold(scoringVersion.getDefaultIdentifiabilityThreshold());
        assessment.setAttributeSensitivityThreshold(scoringVersion.getDefaultSensitivityThreshold());
    }

    private void applyConfiguration(BaseAssessment assessment, Configuration config) {
        ConfigurationVersion version = config.getCurrentVersionEntity()
                .orElseThrow(() -> new IllegalStateException("Configuration has no versions: " + config.getName()));
        assessment.setConfiguration(config);
        assessment.setConfigurationVersion(version);
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
    private List<Recipient> getOrCreateBaseRecipients() {
        List<Recipient> recipients = new ArrayList<>();

        // Trusted recipient: strong institutional controls and ethical oversight.
        Recipient trusted = findRecipientByNormalizedName(ACADEMIC_RECIPIENT_NAME)
                .orElseGet(() -> {
                    Recipient recipient = new Recipient();
                    recipient.setCreatorUsername(DEMO_CREATOR);
                    recipient.setName(ACADEMIC_RECIPIENT_NAME);
                    recipient.setOrganization("University Labs");
                    recipient.setDescription("University-based lab with strict privacy controls and ethical oversight.");
                    return recipientRepository.save(recipient);
                });
        recipients.add(trusted);

        // Commercial recipient: legitimate collaboration with additional motive
        // and capability considerations.
        Recipient commercial = findRecipientByNormalizedName(COMMERCIAL_RECIPIENT_NAME)
                .orElseGet(() -> {
                    Recipient recipient = new Recipient();
                    recipient.setCreatorUsername(DEMO_CREATOR);
                    recipient.setName(COMMERCIAL_RECIPIENT_NAME);
                    recipient.setOrganization("HealthTech Solutions Ltd.");
                    recipient.setDescription("Commercial health-technology partner processing the data outside Switzerland under "
                            + "contractual safeguards; its project team includes hospital-affiliated staff with EHR access, "
                            + "and it has commercial motives.");
                    return recipientRepository.save(recipient);
                });
        recipients.add(commercial);

        // Public release: no specific trusted counterparty and minimal
        // contextual controls.
        Recipient publicRelease = findRecipientByNormalizedName(PUBLIC_RECIPIENT_NAME)
                .orElseGet(() -> {
                    Recipient recipient = new Recipient();
                    recipient.setCreatorUsername(DEMO_CREATOR);
                    recipient.setName(PUBLIC_RECIPIENT_NAME);
                    recipient.setOrganization("Public Release");
                    recipient.setDescription("Open data release via a public portal with minimal to no contextual controls.");
                    return recipientRepository.save(recipient);
                });
        recipients.add(publicRelease);

        return recipients;
    }

    private List<RecipientAssessment> getOrCreateElEmamRecipientAssessments(List<Recipient> recipients, Configuration config) {
        // Initialize the list to return
        List<RecipientAssessment> createdAssessments = new ArrayList<>();

        // Fetch all questions mapped to the RECIPIENT_ASSESSMENT phase
        List<Question> recipientQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        for (Recipient recipient : recipients) {
            String assessmentName = recipient.getName() + " Assessment (El Emam)";
            Optional<RecipientAssessment> existingAssessment = findRecipientAssessment(recipient, assessmentName);
            if (existingAssessment.isPresent()) {
                createdAssessments.add(existingAssessment.get());
                continue;
            }

            RecipientAssessment ra = new RecipientAssessment();
            ra.setRecipient(recipient);
            applyConfiguration(ra, config);
            ra.setCreatorUsername(DEMO_CREATOR);
            ra.setName(assessmentName);
            ra.setAnswers(new ArrayList<>());
            ra = recipientAssessmentRepository.save(ra);

            Map<String, String> answers = answersForRecipient(recipient,
                    DemoAssessmentAnswers.EL_EMAM_ACADEMIC,
                    DemoAssessmentAnswers.EL_EMAM_COMMERCIAL,
                    DemoAssessmentAnswers.EL_EMAM_PUBLIC);

            applyAnswers(ra, recipientQuestions, answers);
            recipient.getAssessments().add(ra);

            // Add the fully populated assessment to our return list
            createdAssessments.add(ra);
        }

        return createdAssessments;
    }

    private List<RecipientAssessment> getOrCreateSphnRecipientAssessments(List<Recipient> recipients, Configuration config) {
        List<RecipientAssessment> createdAssessments = new ArrayList<>();

        // Fetch all questions mapped to the RECIPIENT_ASSESSMENT phase (CONTEXTUAL_RISK and CONTRACTUAL_IT_RISK)
        List<Question> recipientQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        for (Recipient recipient : recipients) {
            String assessmentName = recipient.getName() + " (SPHN)";
            Optional<RecipientAssessment> existingAssessment = findRecipientAssessment(recipient, assessmentName);
            if (existingAssessment.isPresent()) {
                createdAssessments.add(existingAssessment.get());
                continue;
            }

            RecipientAssessment ra = new RecipientAssessment();
            ra.setRecipient(recipient);
            applyConfiguration(ra, config);
            ra.setCreatorUsername(DEMO_CREATOR);
            ra.setName(assessmentName);
            ra.setAnswers(new ArrayList<>());
            ra = recipientAssessmentRepository.save(ra);

            Map<String, String> answers = answersForRecipient(recipient,
                    DemoAssessmentAnswers.SPHN_ACADEMIC,
                    DemoAssessmentAnswers.SPHN_COMMERCIAL,
                    DemoAssessmentAnswers.SPHN_PUBLIC);

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
            Configuration sphnConfig, DatasetAssessment sphnDA, List<RecipientAssessment> sphnRAs,
            Project project) {

        // =========================================================================
        // TRUSTED RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 1: Academic evaluated under SPHN
        ensureDemoDataSharingActivity(
                "LEOSS / Academic Labs (SPHN)",
                "Sharing the demo COVID-19 table with a trusted university lab under the SPHN framework. All contractual and IT "
                        + "controls are in place, yet Likelihood is HIGH because SPHN treats a cohort of more than 5,000 patients "
                        + "(C-03) as a high-risk trigger.",
                sphnDA,
                sphnRAs.get(0),
                new HashSet<>(Set.of("anna.mueller")),
                project
        );

        // Scenario 2: Academic evaluated under El Emam
        ensureDemoDataSharingActivity(
                "LEOSS / Academic Labs (El Emam)",
                "Direct comparison of the Academic transfer, evaluated under El Emam instead of SPHN.",
                elEmamDA,
                elEmamRAs.get(0),
                Collections.emptySet(),
                project
        );


        // =========================================================================
        // PUBLIC RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 5: Public Release evaluated under El Emam
        ensureDemoDataSharingActivity(
                "LEOSS / Open Data Portal (El Emam)",
                "Public data release evaluated using the El Emam Risk Exposure Model. No recipient-side control can be established "
                        + "for an open download, so only data transformations remain as mitigation options.",
                elEmamDA,
                elEmamRAs.get(2),
                Collections.emptySet(),
                project
        );

        // Scenario 6: Public Release evaluated under SPHN
        ensureDemoDataSharingActivity(
                "LEOSS / Open Data Portal (SPHN)",
                "Open data release evaluated under the SPHN framework. Recipient-oriented control questions are answered \"No\" "
                        + "because no identified recipient exists; only data transformations remain as mitigation options.",
                sphnDA,
                sphnRAs.get(2),
                Collections.emptySet(),
                project
        );


        // =========================================================================
        // COMMERCIAL RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 7: Commercial evaluated under El Emam
        ensureDemoDataSharingActivity(
                "LEOSS / HealthTech Solutions (El Emam)",
                "Commercial data sharing agreement. Evaluated using the El Emam Risk Exposure Model for standard re-identification risks.",
                elEmamDA,
                elEmamRAs.get(1),
                new HashSet<>(Set.of("max.mustermann", "sophie.becker")),
                project
        );

        // Scenario 8: Commercial evaluated under SPHN
        ensureDemoDataSharingActivity(
                "LEOSS / HealthTech Solutions (SPHN)",
                "Commercial transfer under SPHN. Controls are already HIGH and Likelihood is held HIGH by C-03 (cohort size) "
                        + "and C-06 (staff with EHR access), which have no configured mitigation, so adding audit rights does "
                        + "not change P_attack.",
                sphnDA,
                sphnRAs.get(1),
                new HashSet<>(Set.of("max.mustermann", "sophie.becker")),
                project
        );
    }

    private DataSharingActivity ensureDemoDataSharingActivity(
            String name,
            String description,
            DatasetAssessment datasetAssessment,
            RecipientAssessment recipientAssessment,
            Set<String> sharedUsernames,
            Project project
    ) {
        DataSharingActivity activity = findActivityByNormalizedName(name)
                .orElseGet(() -> {
                    DataSharingActivity created = new DataSharingActivity();
                    created.setCreatorUsername(DEMO_CREATOR);
                    created.setName(name);
                    created.setDescription(description);
                    created.setDatasetAssessment(datasetAssessment);
                    created.setRecipientAssessment(recipientAssessment);
                    created.setSharedUsernames(sharedUsernames);
                    return created;
        });

        activity.setProject(project);
        if (project != null) {
            addActivityIfMissing(project, activity);
        }
        return dataSharingActivityRepository.save(activity);
    }

    private void addActivityIfMissing(Project project, DataSharingActivity activity) {
        boolean exists = project.getDataSharingActivities().stream()
                .anyMatch(existing -> existing == activity
                        || (existing.getId() != null && Objects.equals(existing.getId(), activity.getId())));
        if (!exists) {
            project.getDataSharingActivities().add(activity);
        }
    }

    private Optional<Dataset> findDatasetByNormalizedName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return datasetRepo.findAll().stream()
                .filter(dataset -> normalizedName.equals(dataset.getNormalizedName())
                        || normalizedName.equals(EntityNameNormalizer.normalizeForComparison(dataset.getName())))
                .findFirst();
    }

    private Optional<Recipient> findRecipientByNormalizedName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return recipientRepository.findAll().stream()
                .filter(recipient -> normalizedName.equals(recipient.getNormalizedName())
                        || normalizedName.equals(EntityNameNormalizer.normalizeForComparison(recipient.getName())))
                .findFirst();
    }

    private Optional<DataSharingActivity> findActivityByNormalizedName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return dataSharingActivityRepository.findAll().stream()
                .filter(activity -> normalizedName.equals(activity.getNormalizedName())
                        || normalizedName.equals(EntityNameNormalizer.normalizeForComparison(activity.getName())))
                .findFirst();
    }

    private Optional<DatasetAssessment> findDatasetAssessment(Dataset dataset, String name) {
        return assessmentRepo.findAll().stream()
                .filter(assessment -> Objects.equals(assessment.getName(), name))
                .filter(assessment -> assessment.getDataset() != null
                        && Objects.equals(assessment.getDataset().getId(), dataset.getId()))
                .findFirst();
    }

    private Optional<RecipientAssessment> findRecipientAssessment(Recipient recipient, String name) {
        return recipientAssessmentRepository.findAll().stream()
                .filter(assessment -> Objects.equals(assessment.getName(), name))
                .filter(assessment -> assessment.getRecipient() != null
                        && Objects.equals(assessment.getRecipient().getId(), recipient.getId()))
                .findFirst();
    }

}
