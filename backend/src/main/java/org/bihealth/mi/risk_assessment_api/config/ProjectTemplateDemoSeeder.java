package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequirementResponseRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateRequirementRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateSectionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.project.ProjectResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate.ProjectTemplateRequirementResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate.ProjectTemplateResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate.ProjectTemplateSectionResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplate;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectTemplateRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.bihealth.mi.risk_assessment_api.service.ProjectService;
import org.bihealth.mi.risk_assessment_api.service.ProjectTemplateService;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType.HARD_CONSTRAINT;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType.INFORMATIONAL;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType.PREFERENCE;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.DATE;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.DURATION;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.INTEGER;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.LONG_TEXT;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.MONEY;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.MULTI_SELECT;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.SINGLE_SELECT;
import static org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType.TEXT;

/**
 * Seeds three example, immediately-usable Project Templates and three demo
 * Projects built from them, reusing the LEOSS dataset/recipients
 * {@link DataLoader} already seeds.
 *
 * <p>The seeded templates intentionally collect only project requirements
 * that can plausibly constrain future mitigation planning: required outputs,
 * acceptable sharing arrangements, utility limits, and operational resources.
 * They do not duplicate REA's existing risk-assessment questionnaires
 * (Invasion of Privacy, Mitigating Controls, Motives and Capacity, dataset
 * R/A/D/S): they describe what the project needs, never how risky the
 * current dataset/recipient is.</p>
 *
 * <p>Runs after {@link DataLoader}, so the LEOSS dataset, recipients, and
 * framework assessments already exist. Every demo object is resolved
 * independently by normalized name and created only if absent: an
 * administrator's edits to a template, or a user's edits to a demo Project,
 * are never overwritten by a later restart.</p>
 */
@Order(4)
@Component
public class ProjectTemplateDemoSeeder implements CommandLineRunner {

    private static final String DEMO_ADMIN = "admin";
    private static final String DEMO_CREATOR = "user";
    private static final String LEOSS_DATASET_NAME = "LEOSS Public Use File";
    private static final String LEGACY_LEOSS_PROJECT_NAME = "LEOSS Mitigation Planning Demo";
    private static final String ACADEMIC_RECIPIENT_NAME = "Academic Research Institute";
    private static final String COMMERCIAL_RECIPIENT_NAME = "Commercial Partner";
    private static final String PUBLIC_RECIPIENT_NAME = "Public Open Data Portal";
    private static final String SPHN_DATASET_ASSESSMENT_NAME = "LEOSS Assessment (SPHN)";
    private static final String ACADEMIC_SPHN_RECIPIENT_ASSESSMENT_NAME = "Academic Research Institute (SPHN)";

    private static final String PUBLIC_RELEASE_TEMPLATE_NAME = "Public Data Release";
    private static final String CONTROLLED_TEMPLATE_NAME = "Controlled Data Transfer";
    private static final String SECURE_ANALYSIS_TEMPLATE_NAME = "Secure Analysis Environment";

    private static final String PUBLIC_RELEASE_PROJECT_NAME = "LEOSS Public Data Release Study";
    private static final String CONTROLLED_PROJECT_NAME = "LEOSS Controlled Transfer Study";
    private static final String SECURE_ANALYSIS_PROJECT_NAME = "LEOSS Secure Environment Study";
    private static final String SECURE_ANALYSIS_ACTIVITY_NAME = "LEOSS / Secure Analysis Environment (SPHN)";

    private static final String PUBLIC_RELEASE_SOURCE =
            "LEOSS Public Use File; Jakob et al., Scientific Data 2020; Koll et al., Scientific Data 2022";
    private static final String PUBLIC_RELEASE_RATIONALE =
            "These studies demonstrate publication of anonymized patient-level Public Use Files and evaluation of the associated privacy-utility trade-off.";
    private static final String CONTROLLED_TRANSFER_SOURCE =
            "Vivli data access documentation; scientific-use-file controlled access models";
    private static final String CONTROLLED_TRANSFER_RATIONALE =
            "Controlled access/download models can transfer an anonymized or de-identified dataset to an approved recipient without encoding recipient controls as Project requirements.";
    private static final String SECURE_ENVIRONMENT_SOURCE =
            "ONS Secure Research Service; Vivli Secure Research Environment";
    private static final String SECURE_ENVIRONMENT_RATIONALE =
            "Participant-level data may be analysed inside the controlled environment, while underlying IPD is not normally exported and released outputs are subject to disclosure review.";

    @Value("${app.setup.load-sample-data:true}")
    private boolean loadSampleData;

    private final ProjectTemplateRepository templateRepository;
    private final ProjectRepository projectRepository;
    private final DatasetRepository datasetRepository;
    private final RecipientRepository recipientRepository;
    private final DatasetAssessmentRepository datasetAssessmentRepository;
    private final RecipientAssessmentRepository recipientAssessmentRepository;
    private final DataSharingActivityRepository dataSharingActivityRepository;
    private final ProjectTemplateService templateService;
    private final ProjectService projectService;

    public ProjectTemplateDemoSeeder(
            ProjectTemplateRepository templateRepository,
            ProjectRepository projectRepository,
            DatasetRepository datasetRepository,
            RecipientRepository recipientRepository,
            DatasetAssessmentRepository datasetAssessmentRepository,
            RecipientAssessmentRepository recipientAssessmentRepository,
            DataSharingActivityRepository dataSharingActivityRepository,
            ProjectTemplateService templateService,
            ProjectService projectService
    ) {
        this.templateRepository = templateRepository;
        this.projectRepository = projectRepository;
        this.datasetRepository = datasetRepository;
        this.recipientRepository = recipientRepository;
        this.datasetAssessmentRepository = datasetAssessmentRepository;
        this.recipientAssessmentRepository = recipientAssessmentRepository;
        this.dataSharingActivityRepository = dataSharingActivityRepository;
        this.templateService = templateService;
        this.projectService = projectService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        ProjectTemplateResponseDTO publicReleaseTemplate = ensurePublicDataReleaseTemplate();
        ProjectTemplateResponseDTO controlledTemplate = ensureControlledDataTransferTemplate();
        ProjectTemplateResponseDTO secureAnalysisTemplate = ensureSecureAnalysisEnvironmentTemplate();
        ensureSecureAnalysisEnvironmentIsDefault();

        if (!loadSampleData) {
            return;
        }

        Dataset leossDataset = findDatasetByNormalizedName(LEOSS_DATASET_NAME).orElse(null);
        Recipient academic = findRecipientByNormalizedName(ACADEMIC_RECIPIENT_NAME).orElse(null);
        Recipient commercial = findRecipientByNormalizedName(COMMERCIAL_RECIPIENT_NAME).orElse(null);
        Recipient publicPortal = findRecipientByNormalizedName(PUBLIC_RECIPIENT_NAME).orElse(null);

        Project controlledProject =
                ensureControlledResearchProject(controlledTemplate, leossDataset, academic, commercial);
        Project publicReleaseProject =
                ensurePublicReleaseProject(publicReleaseTemplate, leossDataset, publicPortal);
        Project secureAnalysisProject =
                ensureSecureAnalysisProject(secureAnalysisTemplate, leossDataset, academic);

        linkDemoDataSharingActivities(controlledProject, publicReleaseProject, secureAnalysisProject);
    }

    // -------------------------------------------------------------------
    // Templates
    // -------------------------------------------------------------------

    private ProjectTemplateResponseDTO ensurePublicDataReleaseTemplate() {
        ProjectTemplateRequestDTO request = templateRequest(
                ProjectTemplateService.BUILT_IN_PUBLIC_DATA_RELEASE,
                PUBLIC_RELEASE_TEMPLATE_NAME,
                "Template for projects where the released patient-level dataset is anonymized before it is made openly downloadable. "
                        + "Selecting this template does not by itself establish that public release is feasible.",
                false,
                projectOverviewSection(),
                dataSharingGoalSection(
                        List.of("INDIVIDUAL_LEVEL_DATA", "AGGREGATE_DATA", "SYNTHETIC_DATA"),
                        List.of("ANONYMIZED_DOWNLOADABLE_DATASET", "AGGREGATE_RESULTS"),
                        "PUBLIC_RELEASE",
                        List.of("ONE_TIME", "RECURRING"),
                        PUBLIC_RELEASE_SOURCE,
                        PUBLIC_RELEASE_RATIONALE
                ),
                utilityRequirementsSection(),
                analysisEnvironmentSection(),
                timelineResourcesSection()
        );
        validateBuiltIn(request);

        Optional<ProjectTemplate> existing = findBuiltInTemplate(ProjectTemplateService.BUILT_IN_PUBLIC_DATA_RELEASE, PUBLIC_RELEASE_TEMPLATE_NAME);
        if (existing.isPresent()) {
            return templateService.getTemplate(existing.get().getId(), true);
        }

        return templateService.createTemplate(request, DEMO_ADMIN, true);
    }

    private ProjectTemplateResponseDTO ensureControlledDataTransferTemplate() {
        ProjectTemplateRequestDTO request = templateRequest(
                ProjectTemplateService.BUILT_IN_CONTROLLED_DATA_TRANSFER,
                CONTROLLED_TEMPLATE_NAME,
                "Template for projects where an approved recipient receives an anonymized or de-identified dataset "
                        + "for analysis outside the data custodian's own environment.",
                false,
                projectOverviewSection(),
                dataSharingGoalSection(
                        List.of("INDIVIDUAL_LEVEL_DATA", "SYNTHETIC_DATA", "AGGREGATE_DATA"),
                        List.of("ANONYMIZED_DOWNLOADABLE_DATASET", "AGGREGATE_RESULTS", "TABLES_FIGURES"),
                        "CONTROLLED_DATA_TRANSFER",
                        List.of("ONE_TIME", "RECURRING"),
                        CONTROLLED_TRANSFER_SOURCE,
                        CONTROLLED_TRANSFER_RATIONALE
                ),
                utilityRequirementsSection(),
                analysisEnvironmentSection(),
                timelineResourcesSection()
        );
        validateBuiltIn(request);

        Optional<ProjectTemplate> existing = findBuiltInTemplate(ProjectTemplateService.BUILT_IN_CONTROLLED_DATA_TRANSFER, CONTROLLED_TEMPLATE_NAME);
        if (existing.isPresent()) {
            return templateService.getTemplate(existing.get().getId(), true);
        }

        return templateService.createTemplate(request, DEMO_ADMIN, true);
    }

    private ProjectTemplateResponseDTO ensureSecureAnalysisEnvironmentTemplate() {
        ProjectTemplateRequestDTO request = templateRequest(
                ProjectTemplateService.BUILT_IN_SECURE_ANALYSIS_ENVIRONMENT,
                SECURE_ANALYSIS_TEMPLATE_NAME,
                "Template for projects where researchers may analyse detailed data inside a controlled "
                        + "environment without receiving an unrestricted local copy.",
                true,
                projectOverviewSection(),
                dataSharingGoalSection(
                        List.of("INDIVIDUAL_LEVEL_DATA", "AGGREGATE_DATA", "SYNTHETIC_DATA"),
                        List.of("AGGREGATE_RESULTS", "TABLES_FIGURES", "REPORT", "CODE"),
                        "SECURE_REMOTE_ANALYSIS",
                        List.of("ONE_TIME", "RECURRING"),
                        SECURE_ENVIRONMENT_SOURCE,
                        SECURE_ENVIRONMENT_RATIONALE
                ),
                utilityRequirementsSection(),
                analysisEnvironmentSection(),
                timelineResourcesSection()
        );
        validateBuiltIn(request);

        Optional<ProjectTemplate> existing = findBuiltInTemplate(
                ProjectTemplateService.BUILT_IN_SECURE_ANALYSIS_ENVIRONMENT,
                SECURE_ANALYSIS_TEMPLATE_NAME
        );
        if (existing.isPresent()) {
            return templateService.getTemplate(existing.get().getId(), true);
        }

        return templateService.createTemplate(request, DEMO_ADMIN, true);
    }

    // -------------------------------------------------------------------
    // Shared core sections
    // -------------------------------------------------------------------

    private ProjectTemplateSectionRequestDTO projectOverviewSection() {
        return section(
                "Project Overview",
                "High-level metadata describing the research project and its scientific purpose. "
                        + "This information provides project context and provenance; it does not affect the privacy-risk score.",
                withHelpText(
                        req("projectLead", "Project Lead / Principal Investigator", TEXT, false, INFORMATIONAL),
                        "The person responsible for the scientific direction of the project. Optional, but useful for project ownership, reporting and later review."
                ),
                withHelpText(
                        req("studyProtocolReference", "Study / Protocol Reference", TEXT, false, INFORMATIONAL),
                        "Reference to the study protocol, analysis plan, registration or other project documentation. Use this when an authoritative project document exists."
                ),
                withHelpText(
                        req("scientificObjective", "Scientific Objective", LONG_TEXT, true, INFORMATIONAL),
                        "Briefly describe the research question or intended use of the data. This gives context to later mitigation decisions but is not used as a privacy-risk score."
                ),
                withHelpText(
                        durationReq("projectDuration", "Expected Project Duration", "MONTHS", false, INFORMATIONAL),
                        "Expected period during which the project will actively use the data. This may later help compare one-time and recurring access arrangements."
                )
        );
    }

    private ProjectTemplateSectionRequestDTO dataSharingGoalSection(
            List<String> analysisDataAllowed,
            List<String> externalDeliverablesAllowed,
            String fixedSharingModel,
            List<String> accessPatternAllowed,
            String source,
            String rationale
    ) {
        ProjectTemplateRequirementRequestDTO sharingModel =
                selectReq("sharingModel", "Sharing Model", SINGLE_SELECT, true, HARD_CONSTRAINT,
                        List.of("PUBLIC_RELEASE", "CONTROLLED_DATA_TRANSFER", "SECURE_REMOTE_ANALYSIS", "MANAGED_QUERY"));
        sharingModel.setFixedValue(fixedSharingModel);
        sharingModel.setHelpText(
                "The sharing model defines how access to the data is provided. It is determined by the selected Project Template and will later be used when evaluating mitigation options."
        );

        return section(
                "Data Sharing Goal",
                "Define what form of data is needed for the analysis, what must ultimately be deliverable outside the access environment, and how access to the data will be provided.",
                withSourceRationale(
                        withHelpText(
                                selectReq("analysisDataNeeded", "Data Needed for Analysis", MULTI_SELECT, true, HARD_CONSTRAINT,
                                        analysisDataAllowed),
                                "Select the least processed form of data needed to perform the planned analysis. Choose Individual-level Data when record-level analysis is necessary, Aggregate Data when summaries are sufficient, or Synthetic Data when an appropriate synthetic representation can support the analysis."
                        ),
                        source,
                        rationale
                ),
                withSourceRationale(
                        withHelpText(
                                selectReq("requiredExternalDeliverables", "Required External Deliverable", MULTI_SELECT, true, HARD_CONSTRAINT,
                                        externalDeliverablesAllowed),
                                "Select what must ultimately be available outside the access environment. In secure environments, individual-level data may be analysed inside the environment while only aggregate results, tables, reports or code are exported."
                        ),
                        source,
                        rationale
                ),
                withSourceRationale(sharingModel, source, rationale),
                withHelpText(
                        selectReq("accessPattern", "Access Pattern", SINGLE_SELECT, false, HARD_CONSTRAINT,
                                accessPatternAllowed),
                        "How often will access or refreshed data be needed? One Time means a single delivery or bounded access period. Recurring means data/access is periodically renewed or refreshed. Continuous means ongoing access or continuously updated data. This can later affect operational effort, repeated anonymization and re-evaluation."
                )
        );
    }

    private ProjectTemplateSectionRequestDTO utilityRequirementsSection() {
        return section(
                "Utility Requirements",
                "Optional scientific constraints describing the minimum usefulness that a mitigation strategy should preserve. Complete only the requirements that matter for the planned analysis.",
                withHelpText(
                        selectReq("requiredTemporalResolution", "Required Temporal Resolution", SINGLE_SELECT, false, PREFERENCE,
                                List.of("DAY", "MONTH", "QUARTER", "YEAR", "NOT_REQUIRED")),
                        "Minimum temporal detail that must remain usable after mitigation. For example, Month means exact dates may be generalized to month, but reducing them to Year would not satisfy this Project requirement. Leave blank if temporal precision is not important."
                ),
                withHelpText(
                        percentReq("minimumCohortRetentionPercent", "Minimum Cohort Retention", false, PREFERENCE),
                        "Minimum percentage of participants that must remain after suppression or participant-level exclusion. For example, 95% means a mitigation strategy may remove at most 5% of participants. Leave blank when no retention target is defined."
                ),
                withHelpText(
                        req("criticalUtilityRequirement", "Critical Utility Requirement", LONG_TEXT, false, PREFERENCE),
                        "Optional scientific requirement not represented by the structured fields above, for example: 'Age and outcome variables must remain suitable for the primary regression analysis.' This is currently used for assessor review and should not be automatically converted into a numerical utility score."
                )
        );
    }

    private ProjectTemplateSectionRequestDTO timelineResourcesSection() {
        return section(
                "Timeline & Resources",
                "Optional operational constraints that may affect which mitigation strategy can be implemented. These values can later be used to compare setup time and implementation cost between feasible plans.",
                withHelpText(
                        req("dataAccessDeadline", "Required Data Access Date", DATE, false, HARD_CONSTRAINT),
                        "Date by which usable access to the data or analysis environment is required. This is the access-readiness deadline, not the deadline for publishing final research results."
                ),
                withHelpText(
                        daysReq("maximumSetupTimeDays", "Maximum Acceptable Setup Time", false, HARD_CONSTRAINT),
                        "Maximum amount of time the Project can tolerate for establishing the selected data-sharing arrangement. Leave blank if there is no known setup-time limit."
                ),
                withHelpText(
                        req("availableBudget", "Available Implementation Budget", MONEY, false, HARD_CONSTRAINT),
                        "Budget available for implementing the data-sharing or mitigation strategy. This refers to Project resources, not the recipient's financial capacity."
                ),
                withHelpText(
                        selectReq("budgetScope", "Budget Scope", SINGLE_SELECT, false, INFORMATIONAL,
                                List.of("SETUP_ONLY", "SINGLE_SHARING_ACTIVITY", "WHOLE_PROJECT", "ANNUAL_OPERATION")),
                        "Defines what the budget covers, for example initial setup, one sharing activity, the entire Project, or one year of operation."
                )
        );
    }

    // -------------------------------------------------------------------
    // Specialized template sections
    // -------------------------------------------------------------------

    private ProjectTemplateSectionRequestDTO analysisEnvironmentSection() {
        return conditionalSection(
                "Analysis Environment",
                "Technical capabilities required to perform the analysis inside a secure or managed environment. These fields describe what the research workflow needs; they do not assess the security of the environment.",
                "sharingModel",
                List.of("SECURE_REMOTE_ANALYSIS", "MANAGED_QUERY"),
                withSourceRationale(
                        withHelpText(
                                req("requiredAnalysisSoftware", "Required Analysis Software", TEXT, false, HARD_CONSTRAINT),
                                "Software or statistical tools that must be available in the analysis environment, for example R, Python or specific approved applications."
                        ),
                        SECURE_ENVIRONMENT_SOURCE,
                        SECURE_ENVIRONMENT_RATIONALE
                ),
                withSourceRationale(
                        withHelpText(
                                selectReq("requiredComputeCapability", "Required Compute Capability", SINGLE_SELECT, false, HARD_CONSTRAINT,
                                        List.of("STANDARD_CPU", "HIGH_MEMORY", "GPU", "OTHER")),
                                "Minimum compute capability needed for the analysis, such as standard CPU, high-memory processing or GPU support."
                        ),
                        SECURE_ENVIRONMENT_SOURCE,
                        SECURE_ENVIRONMENT_RATIONALE
                )
        );
    }

    // -------------------------------------------------------------------
    // Projects
    // -------------------------------------------------------------------

    private Project ensureControlledResearchProject(
            ProjectTemplateResponseDTO template, Dataset dataset, Recipient academic, Recipient commercial
    ) {
        Optional<Project> existing = findProjectByNormalizedName(CONTROLLED_PROJECT_NAME);
        if (existing.isPresent()) {
            return existing.get();
        }
        if (template == null || dataset == null || academic == null || commercial == null) {
            return null;
        }

        Map<String, Long> ids = requirementIdsByKey(template);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName(CONTROLLED_PROJECT_NAME);
        request.setDescription(
                "Research project evaluating epidemiological outcomes using controlled access to a "
                        + "LEOSS-like clinical dataset."
        );
        request.setTemplateVersionId(template.getVersionId());
        request.setDatasetIds(List.of(dataset.getId()));
        request.setRecipientIds(List.of(academic.getId(), commercial.getId()));
        request.setRequirementResponses(List.of(
                textResponse(ids, "projectLead", "Demo Investigator"),
                textResponse(ids, "studyProtocolReference", "LEOSS-DEMO-001"),
                textResponse(ids, "scientificObjective",
                        "Evaluate demographic and clinical predictors of disease severity."),
                durationResponse(ids, "projectDuration", 3L, "MONTHS"),
                selectResponse(ids, "analysisDataNeeded", List.of("INDIVIDUAL_LEVEL_DATA")),
                selectResponse(ids, "requiredExternalDeliverables", List.of("ANONYMIZED_DOWNLOADABLE_DATASET", "AGGREGATE_RESULTS", "TABLES_FIGURES")),
                selectResponse(ids, "accessPattern", List.of("ONE_TIME")),
                selectResponse(ids, "requiredTemporalResolution", List.of("MONTH")),
                decimalResponse(ids, "minimumCohortRetentionPercent", BigDecimal.valueOf(95), "PERCENT"),
                textResponse(ids, "criticalUtilityRequirement",
                        "Age and outcome information must remain suitable for regression analysis."),
                integerResponse(ids, "maximumSetupTimeDays", 30L, "DAYS"),
                decimalResponse(ids, "availableBudget", BigDecimal.valueOf(5000), "EUR"),
                selectResponse(ids, "budgetScope", List.of("WHOLE_PROJECT"))
        ));

        ProjectResponseDTO created = projectService.createProject(request, DEMO_CREATOR, false);
        return projectRepository.findById(created.getId()).orElse(null);
    }

    private Project ensurePublicReleaseProject(ProjectTemplateResponseDTO template, Dataset dataset, Recipient publicPortal) {
        Optional<Project> existing = findProjectByNormalizedName(PUBLIC_RELEASE_PROJECT_NAME);
        if (existing.isPresent()) {
            return existing.get();
        }
        if (template == null || dataset == null || publicPortal == null) {
            return null;
        }

        Map<String, Long> ids = requirementIdsByKey(template);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName(PUBLIC_RELEASE_PROJECT_NAME);
        request.setDescription(
                "Example project assessing whether a LEOSS-like dataset can be prepared for a publicly "
                        + "accessible research release."
        );
        request.setTemplateVersionId(template.getVersionId());
        request.setDatasetIds(List.of(dataset.getId()));
        request.setRecipientIds(List.of(publicPortal.getId()));
        request.setRequirementResponses(List.of(
                textResponse(ids, "projectLead", "Demo Investigator"),
                textResponse(ids, "scientificObjective",
                        "Provide a reusable public research data product while retaining enough information "
                                + "for descriptive epidemiological analyses."),
                selectResponse(ids, "analysisDataNeeded", List.of("INDIVIDUAL_LEVEL_DATA")),
                selectResponse(ids, "requiredExternalDeliverables", List.of("ANONYMIZED_DOWNLOADABLE_DATASET", "AGGREGATE_RESULTS")),
                selectResponse(ids, "accessPattern", List.of("ONE_TIME")),
                selectResponse(ids, "requiredTemporalResolution", List.of("MONTH")),
                decimalResponse(ids, "minimumCohortRetentionPercent", BigDecimal.valueOf(90), "PERCENT"),
                textResponse(ids, "criticalUtilityRequirement",
                        "Monthly age bands and outcome summaries must remain usable for external replication."),
                integerResponse(ids, "maximumSetupTimeDays", 45L, "DAYS")
        ));

        ProjectResponseDTO created = projectService.createProject(request, DEMO_CREATOR, false);
        return projectRepository.findById(created.getId()).orElse(null);
    }

    private Project ensureSecureAnalysisProject(ProjectTemplateResponseDTO template, Dataset dataset, Recipient academic) {
        Optional<Project> existing = findProjectByNormalizedName(SECURE_ANALYSIS_PROJECT_NAME);
        if (existing.isPresent()) {
            return existing.get();
        }
        if (template == null || dataset == null || academic == null) {
            return null;
        }

        Map<String, Long> ids = requirementIdsByKey(template);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName(SECURE_ANALYSIS_PROJECT_NAME);
        request.setDescription(
                "Example project in which researchers analyse detailed clinical data inside a controlled "
                        + "processing environment."
        );
        request.setTemplateVersionId(template.getVersionId());
        request.setDatasetIds(List.of(dataset.getId()));
        request.setRecipientIds(List.of(academic.getId()));
        request.setRequirementResponses(List.of(
                textResponse(ids, "projectLead", "Demo Investigator"),
                textResponse(ids, "scientificObjective",
                        "Preserve detailed clinical information for statistical analysis while avoiding "
                                + "unrestricted distribution of individual-level records."),
                durationResponse(ids, "projectDuration", 3L, "MONTHS"),
                selectResponse(ids, "analysisDataNeeded", List.of("INDIVIDUAL_LEVEL_DATA")),
                selectResponse(ids, "requiredExternalDeliverables", List.of("AGGREGATE_RESULTS", "TABLES_FIGURES")),
                selectResponse(ids, "accessPattern", List.of("ONE_TIME")),
                selectResponse(ids, "requiredTemporalResolution", List.of("MONTH")),
                decimalResponse(ids, "minimumCohortRetentionPercent", BigDecimal.valueOf(98), "PERCENT"),
                textResponse(ids, "criticalUtilityRequirement",
                        "Detailed clinical covariates must remain available for reproducible aggregate analysis."),
                textResponse(ids, "requiredAnalysisSoftware", "R"),
                selectResponse(ids, "requiredComputeCapability", List.of("STANDARD_CPU")),
                decimalResponse(ids, "availableBudget", BigDecimal.valueOf(3000), "EUR"),
                selectResponse(ids, "budgetScope", List.of("SINGLE_SHARING_ACTIVITY"))
        ));

        ProjectResponseDTO created = projectService.createProject(request, DEMO_CREATOR, false);
        return projectRepository.findById(created.getId()).orElse(null);
    }

    // -------------------------------------------------------------------
    // Data Sharing Activity linkage
    // -------------------------------------------------------------------

    /**
     * Points the unambiguous existing LEOSS demo activities at the more
     * specific demo Project whose dataset/recipient membership matches them.
     * Activities whose recipient fits more than one demo Project (the two
     * "Academic Labs" activities fit both the Controlled Research and Secure
     * Analysis projects) are left on the legacy project rather than guessed.
     */
    private void linkDemoDataSharingActivities(
            Project controlledProject,
            Project publicReleaseProject,
            Project secureAnalysisProject
    ) {
        Project legacyProject = findProjectByNormalizedName(LEGACY_LEOSS_PROJECT_NAME).orElse(null);

        if (controlledProject != null) {
            linkActivityIfSafe("LEOSS / HealthTech Solutions (El Emam)", controlledProject, legacyProject);
            linkActivityIfSafe("LEOSS / HealthTech Solutions (SPHN)", controlledProject, legacyProject);
        }
        if (publicReleaseProject != null) {
            linkActivityIfSafe("LEOSS / Open Data Portal (El Emam)", publicReleaseProject, legacyProject);
            linkActivityIfSafe("LEOSS / Open Data Portal (SPHN)", publicReleaseProject, legacyProject);
        }
        if (secureAnalysisProject != null) {
            ensureSecureAnalysisActivity(secureAnalysisProject, legacyProject);
        }
    }

    private void ensureSecureAnalysisActivity(Project secureAnalysisProject, Project legacyProject) {
        Optional<DataSharingActivity> existing = findActivityByNormalizedName(SECURE_ANALYSIS_ACTIVITY_NAME);
        if (existing.isPresent()) {
            linkActivityIfSafe(SECURE_ANALYSIS_ACTIVITY_NAME, secureAnalysisProject, legacyProject);
            return;
        }

        DatasetAssessment datasetAssessment = findDatasetAssessmentByName(SPHN_DATASET_ASSESSMENT_NAME).orElse(null);
        RecipientAssessment recipientAssessment =
                findRecipientAssessmentByName(ACADEMIC_SPHN_RECIPIENT_ASSESSMENT_NAME).orElse(null);
        if (datasetAssessment == null || recipientAssessment == null) {
            return;
        }

        DataSharingActivity activity = new DataSharingActivity();
        activity.setCreatorUsername(DEMO_CREATOR);
        activity.setName(SECURE_ANALYSIS_ACTIVITY_NAME);
        activity.setDescription(
                "Dedicated secure-analysis scenario using the LEOSS-like dataset and a trusted academic recipient under the SPHN framework."
        );
        activity.setDatasetAssessment(datasetAssessment);
        activity.setRecipientAssessment(recipientAssessment);
        activity.setProject(secureAnalysisProject);
        dataSharingActivityRepository.save(activity);
    }

    private void linkActivityIfSafe(String activityName, Project targetProject, Project legacyProject) {
        findActivityByNormalizedName(activityName).ifPresent(activity -> {
            Project current = activity.getProject();
            boolean unassigned = current == null;
            boolean stillOnLegacyProject = legacyProject != null
                    && current != null
                    && Objects.equals(current.getId(), legacyProject.getId());

            if ((unassigned || stillOnLegacyProject) && !Objects.equals(targetProject.getId(),
                    current == null ? null : current.getId())) {
                activity.setProject(targetProject);
                dataSharingActivityRepository.save(activity);
            }
        });
    }

    // -------------------------------------------------------------------
    // Requirement definition builders
    // -------------------------------------------------------------------

    private ProjectTemplateRequestDTO templateRequest(
            String systemKey,
            String name,
            String description,
            boolean defaultTemplate,
            ProjectTemplateSectionRequestDTO... sections
    ) {
        ProjectTemplateRequestDTO dto = new ProjectTemplateRequestDTO();
        dto.setSystemKey(systemKey);
        dto.setName(name);
        dto.setDescription(description);
        dto.setActive(true);
        dto.setDefaultTemplate(defaultTemplate);
        dto.setSections(List.of(sections));
        return dto;
    }

    private void validateBuiltIn(ProjectTemplateRequestDTO request) {
        templateService.validateBuiltInTemplateDefinition(request.getSystemKey(), request);
    }

    private void ensureSecureAnalysisEnvironmentIsDefault() {
        Optional<ProjectTemplate> secureTemplate =
                templateRepository.findBySystemKey(ProjectTemplateService.BUILT_IN_SECURE_ANALYSIS_ENVIRONMENT);
        if (secureTemplate.isEmpty() || secureTemplate.get().isDefaultTemplate()) {
            return;
        }

        Set<String> builtInKeys = Set.of(
                ProjectTemplateService.BUILT_IN_PUBLIC_DATA_RELEASE,
                ProjectTemplateService.BUILT_IN_CONTROLLED_DATA_TRANSFER,
                ProjectTemplateService.BUILT_IN_SECURE_ANALYSIS_ENVIRONMENT
        );
        Optional<ProjectTemplate> currentDefault =
                templateRepository.findFirstByDefaultTemplateTrueAndActiveTrueOrderByIdAsc();
        boolean shouldMigrateBuiltInDefault = currentDefault.isEmpty()
                || builtInKeys.contains(currentDefault.get().getSystemKey());
        if (!shouldMigrateBuiltInDefault) {
            return;
        }

        templateService.setDefault(secureTemplate.get().getId(), true);
    }

    private ProjectTemplateSectionRequestDTO section(String title, ProjectTemplateRequirementRequestDTO... requirements) {
        return section(title, null, requirements);
    }

    private ProjectTemplateSectionRequestDTO section(
            String title,
            String helpText,
            ProjectTemplateRequirementRequestDTO... requirements
    ) {
        return new ProjectTemplateSectionRequestDTO(null, title, helpText, null, null, null, List.of(requirements));
    }

    private ProjectTemplateSectionRequestDTO conditionalSection(
            String title,
            String helpText,
            String dependsOnRequirementKey,
            List<String> visibleWhenValues,
            ProjectTemplateRequirementRequestDTO... requirements
    ) {
        return new ProjectTemplateSectionRequestDTO(
                null,
                title,
                helpText,
                null,
                dependsOnRequirementKey,
                visibleWhenValues,
                List.of(requirements)
        );
    }

    private ProjectTemplateRequirementRequestDTO req(
            String stableKey,
            String label,
            ProjectTemplateRequirementValueType valueType,
            boolean required,
            ProjectTemplateRequirementConstraintType constraintType
    ) {
        ProjectTemplateRequirementRequestDTO dto = new ProjectTemplateRequirementRequestDTO();
        dto.setStableKey(stableKey);
        dto.setLabel(label);
        dto.setValueType(valueType.name());
        dto.setRequired(required);
        dto.setConstraintType(constraintType.name());
        return dto;
    }

    private ProjectTemplateRequirementRequestDTO selectReq(
            String stableKey,
            String label,
            ProjectTemplateRequirementValueType valueType,
            boolean required,
            ProjectTemplateRequirementConstraintType constraintType,
            List<String> allowedValues
    ) {
        ProjectTemplateRequirementRequestDTO dto = req(stableKey, label, valueType, required, constraintType);
        dto.setAllowedValues(allowedValues);
        return dto;
    }

    private ProjectTemplateRequirementRequestDTO percentReq(
            String stableKey,
            String label,
            boolean required,
            ProjectTemplateRequirementConstraintType constraintType
    ) {
        ProjectTemplateRequirementRequestDTO dto = req(stableKey, label, ProjectTemplateRequirementValueType.DECIMAL, required, constraintType);
        dto.setUnit("PERCENT");
        dto.setMinValue(BigDecimal.ZERO);
        dto.setMaxValue(BigDecimal.valueOf(100));
        return dto;
    }

    private ProjectTemplateRequirementRequestDTO durationReq(
            String stableKey,
            String label,
            String unit,
            boolean required,
            ProjectTemplateRequirementConstraintType constraintType
    ) {
        ProjectTemplateRequirementRequestDTO dto = req(stableKey, label, DURATION, required, constraintType);
        dto.setUnit(unit);
        return dto;
    }

    private ProjectTemplateRequirementRequestDTO daysReq(
            String stableKey,
            String label,
            boolean required,
            ProjectTemplateRequirementConstraintType constraintType
    ) {
        ProjectTemplateRequirementRequestDTO dto = req(stableKey, label, INTEGER, required, constraintType);
        dto.setUnit("DAYS");
        dto.setMinValue(BigDecimal.ZERO);
        return dto;
    }

    private ProjectTemplateRequirementRequestDTO withHelpText(ProjectTemplateRequirementRequestDTO dto, String helpText) {
        dto.setHelpText(helpText);
        return dto;
    }

    private ProjectTemplateRequirementRequestDTO withSourceRationale(
            ProjectTemplateRequirementRequestDTO dto,
            String source,
            String rationale
    ) {
        dto.setSource(source);
        dto.setRationale(rationale);
        return dto;
    }

    // -------------------------------------------------------------------
    // Requirement response builders
    // -------------------------------------------------------------------

    private Map<String, Long> requirementIdsByKey(ProjectTemplateResponseDTO template) {
        Map<String, Long> ids = new HashMap<>();
        for (ProjectTemplateSectionResponseDTO section : template.getSections()) {
            for (ProjectTemplateRequirementResponseDTO requirement : section.getRequirements()) {
                ids.put(requirement.getStableKey(), requirement.getId());
            }
        }
        return ids;
    }

    private ProjectRequirementResponseRequestDTO textResponse(Map<String, Long> ids, String key, String value) {
        return response(ids, key, dto -> dto.setTextValue(value));
    }

    private ProjectRequirementResponseRequestDTO decimalResponse(Map<String, Long> ids, String key, BigDecimal value, String unit) {
        return response(ids, key, dto -> {
            dto.setDecimalValue(value);
            dto.setUnit(unit);
        });
    }

    private ProjectRequirementResponseRequestDTO durationResponse(Map<String, Long> ids, String key, long amount, String unit) {
        return response(ids, key, dto -> {
            dto.setIntegerValue(amount);
            dto.setUnit(unit);
        });
    }

    private ProjectRequirementResponseRequestDTO integerResponse(Map<String, Long> ids, String key, long amount, String unit) {
        return durationResponse(ids, key, amount, unit);
    }

    private ProjectRequirementResponseRequestDTO selectResponse(Map<String, Long> ids, String key, List<String> values) {
        return response(ids, key, dto -> dto.setSelectedValues(values));
    }

    private ProjectRequirementResponseRequestDTO response(
            Map<String, Long> ids, String key, Consumer<ProjectRequirementResponseRequestDTO> customizer
    ) {
        Long requirementId = ids.get(key);
        if (requirementId == null) {
            throw new IllegalStateException("Seed data references unknown Project Template requirement key: " + key);
        }
        ProjectRequirementResponseRequestDTO dto = new ProjectRequirementResponseRequestDTO();
        dto.setRequirementId(requirementId);
        dto.setRequirementKey(key);
        customizer.accept(dto);
        return dto;
    }

    // -------------------------------------------------------------------
    // Lookups
    // -------------------------------------------------------------------

    private Optional<ProjectTemplate> findTemplateByNormalizedName(String name) {
        return templateRepository.findByNormalizedName(EntityNameNormalizer.normalizeForComparison(name));
    }

    private Optional<ProjectTemplate> findBuiltInTemplate(String systemKey, String name) {
        Optional<ProjectTemplate> bySystemKey = templateRepository.findBySystemKey(systemKey);
        if (bySystemKey.isPresent()) {
            return bySystemKey;
        }
        Optional<ProjectTemplate> byName = findTemplateByNormalizedName(name);
        byName
                .filter(template -> template.getSystemKey() == null)
                .ifPresent(template -> {
                    template.setSystemKey(systemKey);
                    templateRepository.save(template);
                });
        return byName;
    }

    private Optional<Project> findProjectByNormalizedName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return projectRepository.findAll().stream()
                .filter(project -> normalizedName.equals(project.getNormalizedName())
                        || normalizedName.equals(EntityNameNormalizer.normalizeForComparison(project.getName())))
                .findFirst();
    }

    private Optional<Dataset> findDatasetByNormalizedName(String name) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        return datasetRepository.findAll().stream()
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

    private Optional<DatasetAssessment> findDatasetAssessmentByName(String name) {
        return datasetAssessmentRepository.findAll().stream()
                .filter(assessment -> Objects.equals(assessment.getName(), name))
                .findFirst();
    }

    private Optional<RecipientAssessment> findRecipientAssessmentByName(String name) {
        return recipientAssessmentRepository.findAll().stream()
                .filter(assessment -> Objects.equals(assessment.getName(), name))
                .findFirst();
    }
}
