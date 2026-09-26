package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.seed;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.KnowledgeBaseValidationIssue;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.KnowledgeBaseValidationResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.MitigationKnowledgeBaseValidator;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

/**
 * Seeds the first mitigation catalogue knowledge base.
 *
 * <p>These records describe actions and applicability. They intentionally do
 * not assign risk-reduction percentages.
 */
@Order(5)
@Component
public class MitigationCatalogueSeeder implements CommandLineRunner {

    private static final String SEED_CREATOR = "admin";
    private static final String DEFAULT_KB_NAME = "REA Default Mitigation Knowledge Base";
    private static final String SEED_SOURCE = "REA built-in mitigation catalogue";
    private static final String ILLUSTRATIVE_ESTIMATE_SOURCE = "REA illustrative operational estimate";
    private static final String EL_EMAM_NAME = "El Emam Risk Exposure Model";
    private static final String SPHN_NAME = "SPHN Risk Assessment Framework (v2.1.2)";

    private final MitigationKnowledgeBaseRepository knowledgeBaseRepository;
    private final MitigationKnowledgeBaseVersionService versionService;
    private final MitigationKnowledgeBaseValidator validator;
    private final RiskConfigurationRepository configurationRepository;
    private MitigationKnowledgeBaseVersion seedVersion;

    public MitigationCatalogueSeeder(
            MitigationKnowledgeBaseRepository knowledgeBaseRepository,
            MitigationKnowledgeBaseVersionService versionService,
            MitigationKnowledgeBaseValidator validator,
            RiskConfigurationRepository configurationRepository
    ) {
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.versionService = versionService;
        this.validator = validator;
        this.configurationRepository = configurationRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (knowledgeBaseRepository.findFirstByDefaultKnowledgeBaseTrueAndActiveTrueOrderByIdAsc().isPresent()) {
            return;
        }
        String normalizedDefaultName = EntityNameNormalizer.normalizeForComparison(DEFAULT_KB_NAME);
        if (knowledgeBaseRepository.findByNormalizedName(normalizedDefaultName).isPresent()) {
            return;
        }

        MitigationKnowledgeBase knowledgeBase = new MitigationKnowledgeBase();
        knowledgeBase.setCreatorUsername(SEED_CREATOR);
        knowledgeBase.setName(DEFAULT_KB_NAME);
        knowledgeBase.setDescription("Built-in REA mitigation expert knowledge seeded for administrator configuration.");
        knowledgeBase.setActive(true);
        knowledgeBase.setDefaultKnowledgeBase(true);

        seedVersion = new MitigationKnowledgeBaseVersion();
        seedVersion.setCreatorUsername(SEED_CREATOR);
        seedVersion.setName(knowledgeBase.getName());
        seedVersion.setDescription(knowledgeBase.getDescription());
        seedVersion.setVersionNumber(1);
        seedVersion.setSelectionPolicy(versionService.defaultPolicyDefinition());

        seedDataActions();
        seedContextActions();
        versionService.rebuildVersionIndexes(seedVersion);
        KnowledgeBaseValidationResult result = validator.validate(seedVersion);
        if (!result.isValid()) {
            KnowledgeBaseValidationIssue first = result.getIssues().stream()
                    .filter(issue -> issue.getSeverity() == KnowledgeBaseValidationIssue.Severity.ERROR)
                    .findFirst()
                    .orElse(null);
            throw new IllegalStateException(first == null
                    ? "Seeded mitigation Knowledge Base is invalid."
                    : first.getMessage());
        }

        knowledgeBase.addVersion(seedVersion);
        knowledgeBaseRepository.saveAndFlush(knowledgeBase);
        seedVersion = null;
    }

    private void seedDataActions() {
        MitigationAction removeDirectIdentifier = ensureAction(
                "REMOVE_DIRECT_IDENTIFIER",
                "Remove direct identifier",
                "Remove selected direct-identifier attributes from the released dataset or replace them according to an approved procedure.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Select direct identifier attributes and remove or replace them before release.",
                "Verify that selected direct-identifier attributes are absent from the released dataset or have been replaced according to the approved procedure.",
                "Direct identifiers are data representation risks and must be handled as data transformations."
        );
        ensureDataEffect(removeDirectIdentifier,
                MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL,
                MitigationRecordRetentionEffect.PRESERVES_RECORDS);
        ensureAttributeMapping(removeDirectIdentifier, MitigationAttributeRole.DIRECT_IDENTIFIER, null);
        ensureQuestionMapping(removeDirectIdentifier, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DIRECT_IDENTIFIERS_E_G_NAME_PHONE_NUMBER_SOCIAL_SECURITY_NUMBER_EMAIL_ADDRESS_MEDICAL_RECORD_NUMBER_LICENSE_NUMBER",
                "ORIGINAL_VALUES_OF_ONE_OR_MORE_DIRECT_IDENTIFIERS_ARE_KEPT", null);

        MitigationAction coarsenDate = ensureAction(
                "COARSEN_DATE",
                "Coarsen temporal information",
                "Reduce the precision of candidate quasi-identifier date or datetime fields.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Transform targeted temporal fields to a configured output resolution such as month, quarter, or year.",
                "Verify that targeted date fields contain no temporal detail finer than the configured output resolution.",
                "Temporal quasi-identifiers can support linkage when represented with excessive precision."
        );
        ensureDataEffect(coarsenDate,
                MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL,
                MitigationRecordRetentionEffect.PRESERVES_RECORDS);
        ensureAttributeMapping(coarsenDate, MitigationAttributeRole.CANDIDATE_QID, DataType.DATE);
        ensureAttributeMapping(coarsenDate, MitigationAttributeRole.CANDIDATE_QID, DataType.DATETIME);
        ensureParameter(coarsenDate, MitigationParameterCode.TARGET_RESOLUTION,
                "Output resolution to select later for a concrete plan.", List.of("MONTH", "QUARTER", "YEAR"));
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATES_IN_THE_PATIENT_RECORD_DATES_OF_BIRTH_AND_DEATH_EXCLUDED",
                "DATES_ARE_SHIFTED_BY_A_RANDOM_NUMBER_OF_DAYS_WITHIN_90_DAYS", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATES_IN_THE_PATIENT_RECORD_DATES_OF_BIRTH_AND_DEATH_EXCLUDED",
                "DATES_ARE_SHIFTED_BY_A_RANDOM_NUMBER_OF_DAYS_WITHIN_30_DAYS", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATES_IN_THE_PATIENT_RECORD_DATES_OF_BIRTH_AND_DEATH_EXCLUDED",
                "DATES_ARE_SHIFTED_BY_A_RANDOM_NUMBER_OF_DAYS_WITHIN_7_DAYS", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATES_IN_THE_PATIENT_RECORD_DATES_OF_BIRTH_AND_DEATH_EXCLUDED",
                "ORIGINAL_DATES_ARE_KEPT", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATE_OF_BIRTH",
                "ONLY_THE_YEAR_AND_MONTH_OF_THE_ORIGINAL_DATE_OF_BIRTH_ARE_KEPT", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATE_OF_BIRTH",
                "FULL_ORIGINAL_DATE_OF_BIRTH_IS_KEPT_DD_MM_YYYY", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATE_OF_DEATH",
                "ONLY_THE_YEAR_AND_MONTH_OF_THE_ORIGINAL_DATE_OF_DEATH_ARE_KEPT", null);
        ensureQuestionMapping(coarsenDate, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "DATE_OF_DEATH",
                "FULL_ORIGINAL_DATE_OF_DEATH_IS_KEPT_DD_MM_YYYY", null);

        MitigationAction generalizeNumeric = ensureAction(
                "GENERALIZE_NUMERIC_QI",
                "Generalize numeric quasi-identifier",
                "Generalize candidate quasi-identifier numeric fields using an approved hierarchy or binning rule.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Define numeric generalization bins or a hierarchy for selected candidate QID attributes.",
                "Verify that targeted numeric QID fields follow the selected generalization hierarchy in the released dataset.",
                "Numeric quasi-identifiers can support linkage when released at full precision."
        );
        ensureDataEffect(generalizeNumeric,
                MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL,
                MitigationRecordRetentionEffect.PRESERVES_RECORDS);
        ensureAttributeMapping(generalizeNumeric, MitigationAttributeRole.CANDIDATE_QID, DataType.INTEGER);
        ensureAttributeMapping(generalizeNumeric, MitigationAttributeRole.CANDIDATE_QID, DataType.DECIMAL);
        ensureParameter(generalizeNumeric, MitigationParameterCode.GENERALIZATION_HIERARCHY,
                "Concrete hierarchy or binning rule to specify later for a plan.", List.of());
        ensureQuestionMapping(generalizeNumeric, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "AGE",
                "ORIGINAL_AGE_IS_KEPT_EXCEPT_FOR_PEOPLE_WITH_MORE_THAN_89Y_OLD_WHO_ARE_PUT_IN_THE_AGE_CLASS_90Y", null);
        ensureQuestionMapping(generalizeNumeric, SPHN_NAME, MitigationAssessmentScope.DATASET, "IMPACT",
                "AGE",
                "ORIGINAL_AGE_IS_KEPT", null);

        MitigationAction generalizeCategorical = ensureAction(
                "GENERALIZE_CATEGORICAL_QI",
                "Generalize categorical quasi-identifier",
                "Generalize candidate quasi-identifier categorical or string-like fields using an approved hierarchy.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Define categorical roll-ups for selected candidate QID attributes.",
                "Verify that targeted categorical QID fields contain only values allowed by the selected hierarchy.",
                "Categorical quasi-identifiers can support linkage when represented too specifically."
        );
        ensureDataEffect(generalizeCategorical,
                MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL,
                MitigationRecordRetentionEffect.PRESERVES_RECORDS);
        ensureAttributeMapping(generalizeCategorical, MitigationAttributeRole.CANDIDATE_QID, DataType.STRING);
        ensureParameter(generalizeCategorical, MitigationParameterCode.GENERALIZATION_HIERARCHY,
                "Concrete hierarchy to specify later for a plan.", List.of());

        MitigationAction suppressRare = ensureAction(
                "SUPPRESS_RARE_QI_COMBINATIONS",
                "Suppress rare QID combinations",
                "Suppress records or values contributing to rare candidate quasi-identifier combinations.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Identify rare candidate QID combinations and apply an approved suppression rule.",
                "Verify that the transformed release no longer contains targeted rare candidate QID combinations under the selected suppression limit.",
                "Rare combinations can make individuals more distinguishable within the released data representation."
        );
        ensureDataEffect(suppressRare,
                MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL,
                MitigationRecordRetentionEffect.MAY_REMOVE_RECORDS);
        ensureAttributeMapping(suppressRare, MitigationAttributeRole.CANDIDATE_QID_COMBINATION, null);
        ensureParameter(suppressRare, MitigationParameterCode.SUPPRESSION_LIMIT,
                "Suppression limit to specify later for a concrete plan.", List.of());
    }

    private void seedContextActions() {
        MitigationAction restrictAccess = ensureAction(
                "RESTRICT_ACCESS_TO_AUTHORIZED_USERS",
                "Restrict access to authorized users",
                "Limit access to the approved research team or other explicitly authorized users.",
                MitigationActionType.CONTEXT_CONTROL,
                "Configure access so only approved users can access the data.",
                "Evidence that access controls restrict the data to the approved research team.",
                "Access restriction changes recipient-side controls and may change questionnaire control answers."
        );
        ensureQuestionMapping(restrictAccess, EL_EMAM_NAME, "CONTROLS_NEED_TO_KNOW_ACCESS", "NO", "YES");
        ensureEstimate(restrictAccess, 500, 2000, 1, 3,
                "Illustrative estimate for configuring or documenting project-specific authorized-user access in an existing environment. Replace with institution-specific costing.");

        MitigationAction introduceAgreement = ensureAction(
                "INTRODUCE_DATA_SHARING_AGREEMENT",
                "Introduce a data-sharing agreement",
                "Create or amend a legal agreement that regulates the conditions under which data are disclosed.",
                MitigationActionType.CONTEXT_CONTROL,
                "Put a legally reviewed data-sharing or processing agreement in place for the sharing activity.",
                "Evidence of an executed agreement that covers permitted uses, responsibilities, and disclosure conditions.",
                "Contractual safeguards affect context controls and must be evaluated through questionnaire answers."
        );
        ensureQuestionMapping(introduceAgreement, EL_EMAM_NAME, "CONTROLS_DATA_SHARING_AGREEMENT_ENFORCEABLE", "NO", "YES");
        ensureQuestionMapping(introduceAgreement, SPHN_NAME, "SPHN_CIT_01_LEGAL_AGREEMENT", "NO", "YES");
        ensureQuestionMapping(introduceAgreement, SPHN_NAME, "SPHN_CIT_10_PROCESSING_AGREEMENT", "NO", "YES");
        ensureEstimate(introduceAgreement, 1000, 5000, 2, 10,
                "Illustrative estimate for preparing and reviewing one data-sharing or processing agreement based on existing institutional templates. Replace with local legal and administrative costing.");

        MitigationAction prohibitOnwardDisclosure = ensureAction(
                "PROHIBIT_ONWARD_DISCLOSURE",
                "Prohibit onward disclosure",
                "Add enforceable terms forbidding onward disclosure to third parties.",
                MitigationActionType.CONTEXT_CONTROL,
                "Define contractual clauses that prohibit onward transfer or disclosure except where explicitly approved.",
                "Evidence that the executed agreement forbids third-party disclosure of the shared data.",
                "Onward-disclosure restrictions are contractual context controls, not data transformations."
        );
        ensureQuestionMapping(prohibitOnwardDisclosure, EL_EMAM_NAME, "CONTROLS_NO_ONWARD_DISCLOSURE", "NO", "YES");
        ensureQuestionMapping(prohibitOnwardDisclosure, SPHN_NAME, "SPHN_CIT_02_NO_THIRD_PARTY_DISCLOSURE", "NO", "YES");
        ensureEstimate(prohibitOnwardDisclosure, 500, 2000, 1, 3,
                "Illustrative estimate for adding onward-disclosure clauses to an existing agreement template. Replace with institution-specific legal costing.");

        MitigationAction restrictRecordLinkage = ensureAction(
                "RESTRICT_RECORD_LINKAGE",
                "Restrict record linkage",
                "Add contractual limits on linking the shared data with other administrative, clinical, or external sources.",
                MitigationActionType.CONTEXT_CONTROL,
                "Define terms that prohibit or tightly limit record linkage unless explicitly authorized.",
                "Evidence that the agreement imposes strong limits on linking the data with other sources.",
                "Linkage restrictions affect recipient behavior and contractual controls."
        );
        ensureQuestionMapping(restrictRecordLinkage, EL_EMAM_NAME, "CONTROLS_LINKAGE_RESTRICTION", "NO", "YES");
        ensureEstimate(restrictRecordLinkage, 500, 2000, 1, 3,
                "Illustrative estimate for adding record-linkage restrictions to an existing agreement or project policy. Replace with local legal and governance costing.");

        MitigationAction auditLogging = ensureAction(
                "ENABLE_AUDIT_LOGGING",
                "Enable audit logging",
                "Ensure access and modification events are logged and attributable to authenticated users.",
                MitigationActionType.CONTEXT_CONTROL,
                "Configure systems to record access and change events with authenticated user and timestamp.",
                "Evidence that access and modification events are logged and attributable to authenticated users.",
                "Audit logging is a technical context control."
        );
        ensureQuestionMapping(auditLogging, EL_EMAM_NAME, "CONTROLS_AUDIT_LOGGING", "NO", "YES");
        ensureEstimate(auditLogging, 1000, 5000, 1, 5,
                "Illustrative estimate for enabling and validating audit logging in an existing managed system. Replace with local infrastructure costing.");

        MitigationAction externalAuditRights = ensureAction(
                "ENABLE_EXTERNAL_AUDIT_RIGHTS",
                "Enable external audit rights",
                "Add enforceable rights for external review of data management, privacy, and security practices.",
                MitigationActionType.CONTEXT_CONTROL,
                "Amend the agreement or governance terms so external audits of data management and privacy/security practices may be performed.",
                "Executed agreement, governance approval, or audit clause showing that external audits are permitted and operationally supported.",
                "External audit rights are contractual context controls recorded by the recipient-control questionnaire."
        );
        ensureQuestionMapping(externalAuditRights, SPHN_NAME,
                "DOES_THE_LEGAL_AGREEMENT_STIPULATE_THAT_EXTERNAL_AUDITS_OF_THE_DATA_MANAGEMENT_PRACTICES_MAY_BE_PERFORMED",
                "NO", "YES");
        ensureQuestionMapping(externalAuditRights, SPHN_NAME,
                "DOES_THE_LEGAL_AGREEMENT_STIPULATE_THAT_REGULAR_EXTERNAL_AUDITS_OF_PRIVACY_AND_SECURITY_PRACTICES_MAY_BE_PERFORMED",
                "NO", "YES");
        ensureEstimate(externalAuditRights, 1000, 4000, 2, 5,
                "Illustrative estimate for adding external-audit clauses to an existing agreement and confirming audit logistics. Replace with local legal and governance costing.");

        MitigationAction accessRights = ensureAction(
                "IMPLEMENT_ACCESS_RIGHT_MANAGEMENT",
                "Implement access-right management",
                "Control user accounts, access rights, and security authorizations through a system or record-management process.",
                MitigationActionType.CONTEXT_CONTROL,
                "Introduce an access-right management process for account provisioning, authorization, review, and revocation.",
                "Evidence that user accounts, access rights, and security authorizations are fully controlled by an accountable process.",
                "Access-right management is a technical and organizational context control."
        );
        ensureQuestionMapping(accessRights, EL_EMAM_NAME, "CONTROLS_ACCESS_RIGHT_MANAGEMENT", "NO", "YES");
        ensureEstimate(accessRights, 1500, 6000, 2, 5,
                "Illustrative estimate for defining account provisioning, review, and revocation procedures in an existing access-management environment. Replace with local operational costing.");

        MitigationAction documentProcedures = ensureAction(
                "DOCUMENT_SECURITY_PROCEDURES",
                "Document security procedures",
                "Document procedures for collection, transmission, storage, processing, and disposal of the shared data.",
                MitigationActionType.CONTEXT_CONTROL,
                "Create approved procedures and make them available to the responsible recipient personnel.",
                "Evidence that relevant security and privacy procedures are documented and in effect.",
                "Documented procedures are organizational context controls."
        );
        ensureQuestionMapping(documentProcedures, EL_EMAM_NAME, "CONTROLS_DOCUMENTED_SECURITY_PROCEDURES", "NO", "YES");
        ensureQuestionMapping(documentProcedures, SPHN_NAME, "SPHN_CIT_07_SECURITY_PRIVACY_POLICIES", "NO", "YES");
        ensureEstimate(documentProcedures, 500, 2000, 1, 3,
                "Illustrative estimate for drafting or tailoring security procedures from existing institutional material. Replace with local governance costing.");

        MitigationAction staffTraining = ensureAction(
                "TRAIN_IT_DATABASE_STAFF",
                "Train IT/database staff in data-protection requirements",
                "Train IT and database staff in role-appropriate requirements for protecting personal information.",
                MitigationActionType.CONTEXT_CONTROL,
                "Provide role-appropriate privacy/security training covering handling, access, storage, disclosure, and incident responsibilities for personal data.",
                "Training record/certificate/attendance plus approved training material.",
                "Staff training is an organizational context control and is evaluated through the configured recipient-control questionnaire."
        );
        ensureQuestionMapping(staffTraining, EL_EMAM_NAME,
                "IT_DATABASE_STAFF_ARE_SUFFICIENTLY_TRAINED_IN_THE_REQUIREMENTS_FOR_PROTECTING_PERSONAL_INFORMATION",
                "NO", "YES");
        ensureEstimate(staffTraining, 500, 1500, 1, 2,
                "Illustrative estimate for preparation/delivery of one privacy and data-protection training session for a small IT/database team. Replace with institution-specific costing.");

        MitigationAction confidentiality = ensureAction(
                "ESTABLISH_CONFIDENTIALITY_OBLIGATIONS",
                "Establish confidentiality obligations",
                "Bind recipient staff to appropriate confidentiality obligations.",
                MitigationActionType.CONTEXT_CONTROL,
                "Put staff confidentiality obligations in place through agreements, policy acknowledgements, or equivalent controls.",
                "Evidence that recipient staff members with access to the data are bound by confidentiality obligations.",
                "Confidentiality obligations are contractual or organizational context controls."
        );
        ensureQuestionMapping(confidentiality, EL_EMAM_NAME, "CONTROLS_CONFIDENTIALITY_AGREEMENTS", "NO", "YES");
        ensureQuestionMapping(confidentiality, SPHN_NAME, "SPHN_CIT_06_CONFIDENTIALITY_OBLIGATIONS", "NO", "YES");
        ensureEstimate(confidentiality, 500, 2000, 1, 3,
                "Illustrative estimate for preparing staff confidentiality obligations from an existing institutional template. Replace with local legal and HR costing.");

        // The next three safeguards map El Emam CONTROLS questions whose "No" answer is a
        // high-risk trigger and whose "Yes" answer is exactly the verified outcome of the action.
        // No operational estimate is configured: unknown cost/time stays N/A rather than invented.
        MitigationAction threatRiskAssessment = ensureAction(
                "CONDUCT_RECIPIENT_THREAT_RISK_ASSESSMENT",
                "Conduct a threat and risk assessment of the recipient",
                "Complete and document a threat and risk assessment of the recipient environment before data are disclosed.",
                MitigationActionType.CONTEXT_CONTROL,
                "Assess threats, vulnerabilities and existing safeguards of the recipient's processing environment using an accepted method, document the findings and agree remediation of identified gaps.",
                "Signed threat and risk assessment report covering the recipient environment, with identified gaps remediated or formally accepted.",
                "A completed recipient threat and risk assessment is a verifiable organizational control that the questionnaire records directly."
        );
        ensureQuestionMapping(threatRiskAssessment, EL_EMAM_NAME, "CONTROLS_RECIPIENT_RISK_ASSESSMENT", "NO", "YES");

        MitigationAction physicalAccess = ensureAction(
                "RESTRICT_PHYSICAL_ACCESS_TO_PROCESSING_AREAS",
                "Restrict physical access to data-processing areas",
                "Ensure there is no public access to areas where computers holding the data are located.",
                MitigationActionType.CONTEXT_CONTROL,
                "Locate systems holding the data in access-controlled rooms (badge or key access for authorized staff only) or move processing to such a facility.",
                "Evidence of physical access control for the areas housing the systems, e.g. access-control configuration, facility policy or site inspection record.",
                "Physical access restriction is a technical/organizational context control recorded by the questionnaire."
        );
        ensureQuestionMapping(physicalAccess, EL_EMAM_NAME,
                "THERE_IS_NO_PUBLIC_ACCESS_TO_AREAS_WHERE_COMPUTERS_HOLDING_THE_DATA_WILL_BE", "NO", "YES");

        MitigationAction dataDestruction = ensureAction(
                "ENFORCE_DATA_DESTRUCTION_AFTER_PURPOSE",
                "Define and enforce data retention and destruction",
                "Require that the shared data are destroyed once the approved purpose has been accomplished.",
                MitigationActionType.CONTEXT_CONTROL,
                "Specify a retention period and secure destruction procedure in the agreement or project policy, and assign responsibility for executing it.",
                "Agreement or policy clause defining retention and destruction, plus the procedure that will produce a destruction certificate at the end of the purpose.",
                "Guaranteed destruction limits the period during which the data can be misused and is recorded by the questionnaire."
        );
        ensureQuestionMapping(dataDestruction, EL_EMAM_NAME,
                "THE_DATA_WILL_BE_DESTROYED_ONCE_ITS_PURPOSE_HAS_BEEN_ACCOMPLISHED", "NO", "YES");

        MitigationAction approvedInfrastructure = ensureAction(
                "USE_APPROVED_SECURE_INFRASTRUCTURE",
                "Use approved secure infrastructure",
                "Store and process the data on infrastructure approved for the sharing activity.",
                MitigationActionType.CONTEXT_CONTROL,
                "Move processing to an approved hospital-controlled or compliant secure infrastructure.",
                "Evidence that project data are stored and processed on approved infrastructure.",
                "Infrastructure choice affects context controls; it does not directly alter data-level re-identification metrics."
        );
        ensureQuestionMapping(approvedInfrastructure, SPHN_NAME, "SPHN_CIT_08_APPROVED_INFRASTRUCTURE",
                "EXTERNAL_NONCOMPLIANT_INFRASTRUCTURE", "EXTERNAL_BIOMEDIT_COMPLIANT_INFRASTRUCTURE");
        ensureQuestionMapping(approvedInfrastructure, SPHN_NAME, "SPHN_CIT_08_APPROVED_INFRASTRUCTURE",
                "PRIVATE_COMPUTER", "EXTERNAL_BIOMEDIT_COMPLIANT_INFRASTRUCTURE");
    }

    private MitigationAction ensureAction(
            String code,
            String name,
            String description,
            MitigationActionType actionType,
            String implementationDescription,
            String verificationDescription,
            String rationale
    ) {
        MitigationAction existing = seedVersion.getActions().stream()
                .filter(action -> code.equals(action.getCode()))
                .findFirst()
                .orElse(null);
        if (existing != null) return existing;

        MitigationAction action = new MitigationAction();
        action.setCreatorUsername(SEED_CREATOR);
        action.setCode(code);
        action.setName(name);
        action.setDescription(description);
        action.setActionType(actionType);
        action.setActive(true);
        action.setImplementationDescription(implementationDescription);
        action.setVerificationDescription(verificationDescription);
        action.setSource(SEED_SOURCE);
        action.setRationale(rationale);
        seedVersion.addAction(action);
        return action;
    }

    private void ensureDataEffect(
            MitigationAction action,
            MitigationResultingDataForm resultingDataForm,
            MitigationRecordRetentionEffect recordRetentionEffect
    ) {
        if (action.getResultingDataForm() == null) {
            action.setResultingDataForm(resultingDataForm);
        }
        if (action.getRecordRetentionEffect() == null) {
            action.setRecordRetentionEffect(recordRetentionEffect);
        }
    }

    private void ensureEstimate(
            MitigationAction action,
            int costMin,
            int costMax,
            int setupDaysMin,
            int setupDaysMax,
            String assumptions
    ) {
        boolean hasEstimate = action.getEstimatedCostMin() != null
                || action.getEstimatedCostMax() != null
                || action.getCurrency() != null
                || action.getEstimatedSetupDaysMin() != null
                || action.getEstimatedSetupDaysMax() != null
                || action.getEstimateScope() != null
                || action.getEstimateSource() != null
                || action.getEstimateAssumptions() != null;
        if (hasEstimate) {
            return;
        }
        action.setEstimatedCostMin(BigDecimal.valueOf(costMin));
        action.setEstimatedCostMax(BigDecimal.valueOf(costMax));
        action.setCurrency("EUR");
        action.setEstimatedSetupDaysMin(setupDaysMin);
        action.setEstimatedSetupDaysMax(setupDaysMax);
        action.setEstimateScope(MitigationEstimateScope.SETUP_ONLY);
        action.setEstimateSource(ILLUSTRATIVE_ESTIMATE_SOURCE);
        action.setEstimateAssumptions(assumptions);
    }

    private void ensureQuestionMapping(
            MitigationAction action,
            String configurationName,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        ensureQuestionMapping(action, configurationName, MitigationAssessmentScope.RECIPIENT,
                null, questionCode, triggerOptionCode, projectedOptionCode);
    }

    private void ensureQuestionMapping(
            MitigationAction action,
            String configurationName,
            MitigationAssessmentScope assessmentScope,
            String categoryCode,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        if (hasQuestionMapping(action, configurationName, assessmentScope, categoryCode, questionCode, triggerOptionCode, projectedOptionCode)) {
            return;
        }

        Configuration configuration = configurationRepository.findAll().stream()
                .filter(candidate -> configurationName.equals(candidate.getName()))
                .findFirst()
                .orElse(null);
        if (configuration == null) {
            return;
        }

        MitigationQuestionMapping mapping = new MitigationQuestionMapping();
        mapping.setConfiguration(configuration);
        mapping.setAssessmentScope(assessmentScope);
        mapping.setCategoryCode(categoryCode);
        mapping.setQuestionCode(questionCode);
        mapping.setTriggerOptionCode(triggerOptionCode);
        mapping.setProjectedOptionCode(projectedOptionCode);
        action.addQuestionMapping(mapping);
    }

    private void ensureAttributeMapping(
            MitigationAction action,
            MitigationAttributeRole attributeRole,
            DataType dataType
    ) {
        boolean exists = action.getAttributeMappings().stream()
                .anyMatch(mapping -> mapping.getAttributeRole() == attributeRole
                        && mapping.getDataType() == dataType);
        if (exists) {
            return;
        }

        MitigationAttributeMapping mapping = new MitigationAttributeMapping();
        mapping.setAttributeRole(attributeRole);
        mapping.setDataType(dataType);
        mapping.setRequiresCandidateQid(attributeRole == MitigationAttributeRole.CANDIDATE_QID);
        mapping.setRequiresDirectIdentifier(attributeRole == MitigationAttributeRole.DIRECT_IDENTIFIER);
        mapping.setRequiresSensitiveAttribute(attributeRole == MitigationAttributeRole.SENSITIVE_ATTRIBUTE);
        action.addAttributeMapping(mapping);
    }

    private void ensureParameter(
            MitigationAction action,
            MitigationParameterCode parameterCode,
            String description,
            List<String> allowedValues
    ) {
        boolean exists = action.getParameterDefinitions().stream()
                .anyMatch(parameter -> parameter.getParameterCode() == parameterCode);
        if (exists) {
            return;
        }

        MitigationParameterDefinition parameter = new MitigationParameterDefinition();
        parameter.setParameterCode(parameterCode);
        parameter.setDescription(description);
        parameter.setAllowedValues(allowedValues);
        action.addParameterDefinition(parameter);
    }

    private boolean hasQuestionMapping(
            MitigationAction action,
            String configurationName,
            MitigationAssessmentScope assessmentScope,
            String categoryCode,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        return action.getQuestionMappings().stream()
                .anyMatch(mapping -> mapping.getConfiguration() != null
                        && configurationName.equals(mapping.getConfiguration().getName())
                        && (mapping.getAssessmentScope() == null
                                ? MitigationAssessmentScope.RECIPIENT : mapping.getAssessmentScope()) == assessmentScope
                        && sameCode(categoryCode, mapping.getCategoryCode())
                        && sameCode(questionCode, mapping.getQuestionCode())
                        && sameCode(triggerOptionCode, mapping.getTriggerOptionCode())
                        && sameCode(projectedOptionCode, mapping.getProjectedOptionCode()));
    }

    private boolean sameCode(String left, String right) {
        if (left == null || right == null) {
            return left == right;
        }
        return left.trim().toUpperCase(Locale.ROOT).equals(right.trim().toUpperCase(Locale.ROOT));
    }
}
