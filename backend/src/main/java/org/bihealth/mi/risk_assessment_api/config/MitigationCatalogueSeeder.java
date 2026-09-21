package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.mitigation.MitigationActionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

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
    private static final String SEED_SOURCE = "REA built-in mitigation catalogue";
    private static final String EL_EMAM_NAME = "El Emam Risk Exposure Model";
    private static final String SPHN_NAME = "SPHN Risk Assessment Framework (v2.1.2)";

    private final MitigationActionRepository actionRepository;
    private final RiskConfigurationRepository configurationRepository;

    public MitigationCatalogueSeeder(
            MitigationActionRepository actionRepository,
            RiskConfigurationRepository configurationRepository
    ) {
        this.actionRepository = actionRepository;
        this.configurationRepository = configurationRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedDataActions();
        seedContextActions();
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
        ensureAttributeMapping(removeDirectIdentifier, MitigationAttributeRole.DIRECT_IDENTIFIER, null);

        MitigationAction coarsenDate = ensureAction(
                "COARSEN_DATE",
                "Coarsen temporal information",
                "Reduce the precision of candidate quasi-identifier date or datetime fields.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Transform targeted temporal fields to a configured output resolution such as month, quarter, or year.",
                "Verify that targeted date fields contain no temporal detail finer than the configured output resolution.",
                "Temporal quasi-identifiers can support linkage when represented with excessive precision."
        );
        ensureAttributeMapping(coarsenDate, MitigationAttributeRole.CANDIDATE_QID, DataType.DATE);
        ensureAttributeMapping(coarsenDate, MitigationAttributeRole.CANDIDATE_QID, DataType.DATETIME);
        ensureParameter(coarsenDate, MitigationParameterCode.TARGET_RESOLUTION,
                "Output resolution to select later for a concrete plan.", List.of("MONTH", "QUARTER", "YEAR"));

        MitigationAction generalizeNumeric = ensureAction(
                "GENERALIZE_NUMERIC_QI",
                "Generalize numeric quasi-identifier",
                "Generalize candidate quasi-identifier numeric fields using an approved hierarchy or binning rule.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Define numeric generalization bins or a hierarchy for selected candidate QID attributes.",
                "Verify that targeted numeric QID fields follow the selected generalization hierarchy in the released dataset.",
                "Numeric quasi-identifiers can support linkage when released at full precision."
        );
        ensureAttributeMapping(generalizeNumeric, MitigationAttributeRole.CANDIDATE_QID, DataType.INTEGER);
        ensureAttributeMapping(generalizeNumeric, MitigationAttributeRole.CANDIDATE_QID, DataType.DECIMAL);
        ensureParameter(generalizeNumeric, MitigationParameterCode.GENERALIZATION_HIERARCHY,
                "Concrete hierarchy or binning rule to specify later for a plan.", List.of());

        MitigationAction generalizeCategorical = ensureAction(
                "GENERALIZE_CATEGORICAL_QI",
                "Generalize categorical quasi-identifier",
                "Generalize candidate quasi-identifier categorical or string-like fields using an approved hierarchy.",
                MitigationActionType.DATA_TRANSFORMATION,
                "Define categorical roll-ups for selected candidate QID attributes.",
                "Verify that targeted categorical QID fields contain only values allowed by the selected hierarchy.",
                "Categorical quasi-identifiers can support linkage when represented too specifically."
        );
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
        Optional<MitigationAction> existing = actionRepository.findByCode(code);
        if (existing.isPresent()) {
            return existing.get();
        }

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
        return actionRepository.save(action);
    }

    private void ensureQuestionMapping(
            MitigationAction action,
            String configurationName,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        if (hasQuestionMapping(action, configurationName, questionCode, triggerOptionCode, projectedOptionCode)) {
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
        mapping.setQuestionCode(questionCode);
        mapping.setTriggerOptionCode(triggerOptionCode);
        mapping.setProjectedOptionCode(projectedOptionCode);
        action.addQuestionMapping(mapping);
        actionRepository.save(action);
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
        actionRepository.save(action);
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
        actionRepository.save(action);
    }

    private boolean hasQuestionMapping(
            MitigationAction action,
            String configurationName,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        return action.getQuestionMappings().stream()
                .anyMatch(mapping -> mapping.getConfiguration() != null
                        && configurationName.equals(mapping.getConfiguration().getName())
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
