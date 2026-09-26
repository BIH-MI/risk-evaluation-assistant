package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationActionConflictRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationActionDependencyRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationActionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationAttributeMappingRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationParameterDefinitionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationQuestionMappingRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigation.MitigationActionDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationActionRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshotService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.KnowledgeBaseValidationIssue;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.KnowledgeBaseValidationResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.MitigationKnowledgeBaseValidator;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * CRUD and validation service for the mitigation catalogue knowledge base.
 *
 * <p>This service only records possible actions and applicability mappings.
 * It does not generate candidate plans, recalculate risk, execute
 * anonymization, or choose feasibility decisions.</p>
 */
@Service
@Transactional
public class MitigationCatalogueService {

    private static final Pattern STABLE_CODE_PATTERN = Pattern.compile("^[A-Z][A-Z0-9_]*$");
    private static final Pattern CURRENCY_PATTERN = Pattern.compile("^[A-Z]{3}$");
    private static final Set<String> TARGET_RESOLUTIONS = Set.of("MONTH", "QUARTER", "YEAR");

    private final MitigationActionRepository actionRepository;
    private final RiskConfigurationRepository configurationRepository;
    private final MitigationKnowledgeBaseService knowledgeBaseService;
    private final MitigationKnowledgeBaseVersionService versionService;
    private final MitigationKnowledgeBaseSnapshotService snapshotService;
    private final MitigationKnowledgeBaseValidator validator;

    public MitigationCatalogueService(
            MitigationActionRepository actionRepository,
            RiskConfigurationRepository configurationRepository,
            MitigationKnowledgeBaseService knowledgeBaseService,
            MitigationKnowledgeBaseVersionService versionService,
            MitigationKnowledgeBaseSnapshotService snapshotService,
            MitigationKnowledgeBaseValidator validator
    ) {
        this.actionRepository = actionRepository;
        this.configurationRepository = configurationRepository;
        this.knowledgeBaseService = knowledgeBaseService;
        this.versionService = versionService;
        this.snapshotService = snapshotService;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public List<MitigationActionDTO> listActions(
            MitigationActionType actionType,
            Boolean active,
            MitigationSharingArrangement sharingArrangement
    ) {
        MitigationKnowledgeBaseSnapshot snapshot = snapshotService.createSnapshotForPlanning(null);
        MitigationSharingArrangement canonicalSharingArrangement = canonicalSharingArrangement(sharingArrangement);
        return snapshot.actions().stream()
                .filter(action -> actionType == null || action.getActionType() == actionType)
                .filter(action -> active == null || action.isActive() == active)
                .filter(action -> canonicalSharingArrangement == null
                        || action.getApplicableSharingArrangements() == null
                        || action.getApplicableSharingArrangements().isEmpty()
                        || action.getApplicableSharingArrangements().stream()
                        .map(MitigationSharingArrangement::canonical)
                        .anyMatch(canonicalSharingArrangement::equals))
                .sorted(Comparator.comparing(MitigationAction::getActionType)
                        .thenComparing(MitigationAction::getCode))
                .map(MitigationActionDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MitigationActionDTO getAction(Long id) {
        MitigationKnowledgeBaseVersion current = currentDefaultVersion();
        MitigationAction action = requireCurrentAction(id, current);
        return new MitigationActionDTO(action);
    }

    public MitigationActionDTO createAction(MitigationActionRequestDTO dto, String username, boolean isAdmin) {
        requireAdmin(isAdmin);
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseService.resolveDefaultActiveKnowledgeBase();
        MitigationKnowledgeBaseVersion current = versionService.getCurrentVersion(knowledgeBase);
        String code = resolveCreateCode(dto);
        validateCreateRequest(dto, code, current.getId());

        MitigationKnowledgeBaseVersion next = versionService.copyCurrentVersionForNext(knowledgeBase, username);
        MitigationAction action = new MitigationAction();
        action.setCreatorUsername(username);
        action.setCode(code);
        applyEditableFields(action, dto);
        next.addAction(action);
        applyRelationships(next, action, dto, true);
        appendValidatedVersion(knowledgeBase, next);

        return new MitigationActionDTO(action);
    }

    public MitigationActionDTO updateAction(Long id, MitigationActionRequestDTO dto, String username, boolean isAdmin) {
        requireAdmin(isAdmin);
        if (dto == null) {
            throw new IllegalArgumentException("Mitigation action request is required.");
        }
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseService.resolveDefaultActiveKnowledgeBase();
        MitigationKnowledgeBaseVersion current = versionService.getCurrentVersion(knowledgeBase);
        MitigationAction currentAction = requireCurrentAction(id, current);

        if (dto.getCode() != null && !normalizeCode(dto.getCode()).equals(currentAction.getCode())) {
            throw new IllegalArgumentException("Mitigation action code cannot be changed after creation.");
        }
        if (dto.getActionType() != null && dto.getActionType() != currentAction.getActionType()) {
            throw new IllegalArgumentException("Mitigation action type cannot be changed after creation.");
        }

        MitigationKnowledgeBaseVersion next = versionService.copyCurrentVersionForNext(knowledgeBase, username);
        MitigationAction action = findByCode(next, currentAction.getCode());
        applyEditableFields(action, dto);
        applyRelationships(next, action, dto, false);
        appendValidatedVersion(knowledgeBase, next);
        return new MitigationActionDTO(action);
    }

    public void deleteAction(Long id, String username, boolean isAdmin) {
        requireAdmin(isAdmin);
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseService.resolveDefaultActiveKnowledgeBase();
        MitigationKnowledgeBaseVersion current = versionService.getCurrentVersion(knowledgeBase);
        MitigationAction action = requireCurrentAction(id, current);
        MitigationKnowledgeBaseVersion next = versionService.copyVersionExcludingAction(
                current, username, knowledgeBase.getCurrentVersion() + 1, action.getCode());
        appendValidatedVersion(knowledgeBase, next);
    }

    private MitigationAction requireCurrentAction(Long id, MitigationKnowledgeBaseVersion current) {
        MitigationAction action = actionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation action not found: " + id));
        if (action.getKnowledgeBaseVersion() == null
                || !action.getKnowledgeBaseVersion().getId().equals(current.getId())) {
            throw new EntityNotFoundException("Mitigation action not found in current Knowledge Base version: " + id);
        }
        return action;
    }

    private MitigationKnowledgeBaseVersion currentDefaultVersion() {
        return versionService.getCurrentVersion(knowledgeBaseService.resolveDefaultActiveKnowledgeBase());
    }

    private MitigationAction findByCode(MitigationKnowledgeBaseVersion version, String code) {
        return version.getActions().stream()
                .filter(action -> action.getCode().equals(code))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Mitigation action not found in copied version: " + code));
    }

    private void appendValidatedVersion(MitigationKnowledgeBase knowledgeBase, MitigationKnowledgeBaseVersion version) {
        version.setName(knowledgeBase.getName());
        version.setDescription(knowledgeBase.getDescription());
        versionService.rebuildVersionIndexes(version);
        KnowledgeBaseValidationResult result = validator.validate(version);
        if (!result.isValid()) {
            KnowledgeBaseValidationIssue first = result.getIssues().stream()
                    .filter(issue -> issue.getSeverity() == KnowledgeBaseValidationIssue.Severity.ERROR)
                    .findFirst()
                    .orElse(null);
            throw new IllegalArgumentException(first == null
                    ? "Mitigation Knowledge Base version is invalid."
                    : first.getMessage());
        }
        versionService.appendVersion(knowledgeBase, version);
    }

    private void applyEditableFields(MitigationAction action, MitigationActionRequestDTO dto) {
        if (dto.getActionType() == null) {
            throw new IllegalArgumentException("Mitigation action type is required.");
        }
        if (isBlank(dto.getName())) {
            throw new IllegalArgumentException("Mitigation action name is required.");
        }

        validateMappingsForType(dto);
        validateDataTransformationMetadata(dto);
        validateOperationalEstimates(dto);
        validateParameterDefinitions(dto);

        action.setName(trim(dto.getName()));
        action.setDescription(trimToNull(dto.getDescription()));
        action.setActionType(dto.getActionType());
        action.setActive(dto.isActive());
        action.setImplementationDescription(trimToNull(dto.getImplementationDescription()));
        action.setVerificationDescription(trimToNull(dto.getVerificationDescription()));
        action.setSource(trimToNull(dto.getSource()));
        action.setRationale(trimToNull(dto.getRationale()));
        action.setResultingDataForm(dto.getActionType() == MitigationActionType.DATA_TRANSFORMATION
                ? dto.getResultingDataForm()
                : null);
        action.setRecordRetentionEffect(dto.getActionType() == MitigationActionType.DATA_TRANSFORMATION
                ? dto.getRecordRetentionEffect()
                : null);
        action.setApplicableSharingArrangements(dto.getApplicableSharingArrangements() == null
                ? new LinkedHashSet<>()
                : dto.getApplicableSharingArrangements().stream()
                .map(this::canonicalSharingArrangement)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        if (hasAnyEstimateMetadata(dto)) {
            action.setEstimatedCostMin(dto.getEstimatedCostMin());
            action.setEstimatedCostMax(dto.getEstimatedCostMax());
            action.setCurrency(normalizeCurrency(dto.getCurrency()));
            action.setEstimatedSetupDaysMin(dto.getEstimatedSetupDaysMin());
            action.setEstimatedSetupDaysMax(dto.getEstimatedSetupDaysMax());
            action.setEstimateScope(dto.getEstimateScope());
            action.setEstimateSource(trimToNull(dto.getEstimateSource()));
            action.setEstimateAssumptions(trimToNull(dto.getEstimateAssumptions()));
        } else {
            action.setEstimate(null);
        }

        action.getQuestionMappings().clear();
        for (MitigationQuestionMappingRequestDTO mappingDto : nullToEmpty(dto.getQuestionMappings())) {
            action.addQuestionMapping(questionMappingFromDto(mappingDto, dto.getActionType()));
        }

        action.getAttributeMappings().clear();
        if (dto.getActionType() == MitigationActionType.DATA_TRANSFORMATION) {
            for (MitigationAttributeMappingRequestDTO mappingDto : nullToEmpty(dto.getAttributeMappings())) {
                action.addAttributeMapping(attributeMappingFromDto(mappingDto));
            }
        }

        action.getParameterDefinitions().clear();
        if (dto.getActionType() == MitigationActionType.DATA_TRANSFORMATION) {
            for (MitigationParameterDefinitionRequestDTO parameterDto : nullToEmpty(dto.getParameterDefinitions())) {
                action.addParameterDefinition(parameterDefinitionFromDto(parameterDto));
            }
        }
    }

    private void applyRelationships(
            MitigationKnowledgeBaseVersion version,
            MitigationAction action,
            MitigationActionRequestDTO dto,
            boolean creatingAction
    ) {
        if (dto.getDependencies() != null || creatingAction) {
            String actionCode = normalizeCode(action.getCode());
            version.getDependencies().removeIf(dependency ->
                    dependency.getAction() != null && actionCode.equals(normalizeCode(dependency.getAction().getCode())));
            for (MitigationActionDependencyRequestDTO dependencyDto : nullToEmpty(dto.getDependencies())) {
                String requiredCode = normalizeCode(dependencyDto.getRequiredActionCode());
                if (requiredCode.isEmpty()) {
                    throw new IllegalArgumentException("Dependency requires requiredActionCode.");
                }
                MitigationAction required = findByCode(version, requiredCode);
                MitigationActionDependency dependency = new MitigationActionDependency();
                dependency.setAction(action);
                dependency.setRequiredAction(required);
                dependency.setRationale(trimToNull(dependencyDto.getRationale()));
                dependency.setSource(trimToNull(dependencyDto.getSource()));
                version.addDependency(dependency);
            }
        }

        if (dto.getConflicts() != null || creatingAction) {
            String actionCode = normalizeCode(action.getCode());
            version.getConflicts().removeIf(conflict ->
                    (conflict.getActionA() != null && actionCode.equals(normalizeCode(conflict.getActionA().getCode())))
                            || (conflict.getActionB() != null && actionCode.equals(normalizeCode(conflict.getActionB().getCode()))));
            for (MitigationActionConflictRequestDTO conflictDto : nullToEmpty(dto.getConflicts())) {
                String conflictingCode = normalizeCode(conflictDto.getConflictingActionCode());
                if (conflictingCode.isEmpty()) {
                    throw new IllegalArgumentException("Conflict requires conflictingActionCode.");
                }
                MitigationAction conflicting = findByCode(version, conflictingCode);
                MitigationActionConflict conflict = new MitigationActionConflict();
                if (action.getCode().compareTo(conflicting.getCode()) <= 0) {
                    conflict.setActionA(action);
                    conflict.setActionB(conflicting);
                } else {
                    conflict.setActionA(conflicting);
                    conflict.setActionB(action);
                }
                conflict.setRationale(trimToNull(conflictDto.getRationale()));
                conflict.setSource(trimToNull(conflictDto.getSource()));
                version.addConflict(conflict);
            }
        }
    }

    private String resolveCreateCode(MitigationActionRequestDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Mitigation action request is required.");
        }
        if (isBlank(dto.getCode())) {
            return normalizeCode(dto.getName());
        }
        return normalizeCode(dto.getCode());
    }

    private void validateCreateRequest(MitigationActionRequestDTO dto, String code, Long versionId) {
        if (dto == null) {
            throw new IllegalArgumentException("Mitigation action request is required.");
        }
        if (isBlank(dto.getName())) {
            throw new IllegalArgumentException("Mitigation action name is required.");
        }
        if (!STABLE_CODE_PATTERN.matcher(code).matches()) {
            throw new IllegalArgumentException("Mitigation action code must be uppercase snake case.");
        }
        if (actionRepository.existsByKnowledgeBaseVersionIdAndCode(versionId, code)) {
            throw new IllegalArgumentException(
                    "A mitigation action with system identifier '" + code + "' already exists."
            );
        }
    }

    private void validateMappingsForType(MitigationActionRequestDTO dto) {
        boolean hasAttributeMappings = dto.getAttributeMappings() != null && !dto.getAttributeMappings().isEmpty();
        boolean hasParameterDefinitions = dto.getParameterDefinitions() != null && !dto.getParameterDefinitions().isEmpty();

        if (dto.getActionType() == MitigationActionType.CONTEXT_CONTROL && hasAttributeMappings) {
            throw new IllegalArgumentException("Context-control actions cannot define attribute mappings.");
        }
        if (dto.getActionType() == MitigationActionType.CONTEXT_CONTROL && hasParameterDefinitions) {
            throw new IllegalArgumentException("Context-control actions cannot define data-transformation plan parameters.");
        }
    }

    private void validateDataTransformationMetadata(MitigationActionRequestDTO dto) {
        if (dto.getActionType() == MitigationActionType.CONTEXT_CONTROL
                && (dto.getResultingDataForm() != null || dto.getRecordRetentionEffect() != null)) {
            throw new IllegalArgumentException("Context-control actions cannot define data-transformation effect metadata.");
        }
        if (dto.getActionType() == MitigationActionType.DATA_TRANSFORMATION
                && (dto.getResultingDataForm() == null || dto.getRecordRetentionEffect() == null)) {
            throw new IllegalArgumentException("Data-transformation actions require resulting data form and record-retention metadata.");
        }
    }

    private void validateOperationalEstimates(MitigationActionRequestDTO dto) {
        if (dto.getEstimatedCostMin() != null && dto.getEstimatedCostMin().signum() < 0) {
            throw new IllegalArgumentException("Estimated minimum cost must be greater than or equal to 0.");
        }
        if (dto.getEstimatedCostMax() != null && dto.getEstimatedCostMax().signum() < 0) {
            throw new IllegalArgumentException("Estimated maximum cost must be greater than or equal to 0.");
        }
        if (dto.getEstimatedCostMin() != null
                && dto.getEstimatedCostMax() != null
                && dto.getEstimatedCostMin().compareTo(dto.getEstimatedCostMax()) > 0) {
            throw new IllegalArgumentException("Estimated minimum cost cannot exceed estimated maximum cost.");
        }

        if (dto.getEstimatedSetupDaysMin() != null && dto.getEstimatedSetupDaysMin() < 0) {
            throw new IllegalArgumentException("Estimated minimum setup time must be greater than or equal to 0 days.");
        }
        if (dto.getEstimatedSetupDaysMax() != null && dto.getEstimatedSetupDaysMax() < 0) {
            throw new IllegalArgumentException("Estimated maximum setup time must be greater than or equal to 0 days.");
        }
        if (dto.getEstimatedSetupDaysMin() != null
                && dto.getEstimatedSetupDaysMax() != null
                && dto.getEstimatedSetupDaysMin() > dto.getEstimatedSetupDaysMax()) {
            throw new IllegalArgumentException("Estimated minimum setup time cannot exceed estimated maximum setup time.");
        }

        boolean hasCostEstimate = dto.getEstimatedCostMin() != null || dto.getEstimatedCostMax() != null;
        boolean hasTimeEstimate = dto.getEstimatedSetupDaysMin() != null || dto.getEstimatedSetupDaysMax() != null;
        String currency = normalizeCurrency(dto.getCurrency());
        if (hasCostEstimate && currency == null) {
            throw new IllegalArgumentException("Currency is required when a cost estimate is provided.");
        }
        if (currency != null && !CURRENCY_PATTERN.matcher(currency).matches()) {
            throw new IllegalArgumentException("Currency must be a three-letter uppercase ISO-style code.");
        }
        if ((hasCostEstimate || hasTimeEstimate) && dto.getEstimateScope() == null) {
            throw new IllegalArgumentException("Estimate scope is required when cost or setup-time estimates are provided.");
        }
    }

    private boolean hasAnyEstimateMetadata(MitigationActionRequestDTO dto) {
        return dto.getEstimatedCostMin() != null
                || dto.getEstimatedCostMax() != null
                || normalizeCurrency(dto.getCurrency()) != null
                || dto.getEstimatedSetupDaysMin() != null
                || dto.getEstimatedSetupDaysMax() != null
                || dto.getEstimateScope() != null
                || trimToNull(dto.getEstimateSource()) != null
                || trimToNull(dto.getEstimateAssumptions()) != null;
    }

    private void validateParameterDefinitions(MitigationActionRequestDTO dto) {
        if (dto.getActionType() != MitigationActionType.DATA_TRANSFORMATION) {
            return;
        }

        Set<String> seenCodes = new LinkedHashSet<>();
        for (MitigationParameterDefinitionRequestDTO parameterDto : nullToEmpty(dto.getParameterDefinitions())) {
            if (parameterDto.getParameterCode() == null) {
                throw new IllegalArgumentException("Parameter definition requires parameterCode.");
            }
            String parameterCode = parameterDto.getParameterCode().name();
            if (!seenCodes.add(parameterCode)) {
                throw new IllegalArgumentException("Mitigation action plan parameter types must be unique.");
            }
            if (parameterDto.getParameterCode() == org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode.TARGET_RESOLUTION) {
                List<String> allowedValues = normalizedAllowedValues(parameterDto.getAllowedValues());
                if (allowedValues.isEmpty()) {
                    throw new IllegalArgumentException("Target Resolution requires at least one allowed resolution.");
                }
                for (String value : allowedValues) {
                    if (!TARGET_RESOLUTIONS.contains(value)) {
                        throw new IllegalArgumentException("Target Resolution supports only MONTH, QUARTER, and YEAR.");
                    }
                }
            }
        }
    }

    private MitigationQuestionMapping questionMappingFromDto(
            MitigationQuestionMappingRequestDTO dto,
            MitigationActionType actionType
    ) {
        if (dto.getConfigurationId() == null) {
            throw new IllegalArgumentException("Question mapping requires configurationId.");
        }
        if (isBlank(dto.getQuestionCode())) {
            throw new IllegalArgumentException("Question mapping requires questionCode.");
        }
        if (isBlank(dto.getTriggerOptionCode())) {
            throw new IllegalArgumentException("Question mapping requires triggerOptionCode.");
        }
        MitigationAssessmentScope scope = dto.getAssessmentScope() == null
                ? defaultScope(actionType)
                : dto.getAssessmentScope();
        if (actionType == MitigationActionType.DATA_TRANSFORMATION && scope != MitigationAssessmentScope.DATASET) {
            throw new IllegalArgumentException("Data-transformation questionnaire mappings must use DATASET scope.");
        }
        if (actionType == MitigationActionType.CONTEXT_CONTROL && scope != MitigationAssessmentScope.RECIPIENT) {
            throw new IllegalArgumentException("Context-control questionnaire mappings must use RECIPIENT scope.");
        }
        if (scope == MitigationAssessmentScope.RECIPIENT && isBlank(dto.getProjectedOptionCode())) {
            throw new IllegalArgumentException("Recipient question mappings require projectedOptionCode.");
        }
        String questionCode = normalizeCode(dto.getQuestionCode());
        String categoryCode = normalizeCode(dto.getCategoryCode());
        String triggerOptionCode = normalizeCode(dto.getTriggerOptionCode());
        String projectedOptionCode = isBlank(dto.getProjectedOptionCode()) ? null : normalizeCode(dto.getProjectedOptionCode());
        if (projectedOptionCode != null && triggerOptionCode.equals(projectedOptionCode)) {
            throw new IllegalArgumentException("Question mapping trigger and projected answers must be different.");
        }

        MitigationQuestionMapping mapping = new MitigationQuestionMapping();
        Configuration configuration = configurationRepository.findById(dto.getConfigurationId())
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + dto.getConfigurationId()));
        Question question = validateQuestionMapping(configuration, scope, categoryCode, questionCode, triggerOptionCode, projectedOptionCode);

        mapping.setConfiguration(configuration);
        mapping.setAssessmentScope(scope);
        mapping.setCategoryCode(categoryCode.isEmpty() ? normalizeCode(question.getCategoryCode()) : categoryCode);
        mapping.setQuestionCode(questionCode);
        mapping.setTriggerOptionCode(triggerOptionCode);
        mapping.setProjectedOptionCode(projectedOptionCode);
        mapping.setNotes(trimToNull(dto.getNotes()));
        return mapping;
    }

    private MitigationAssessmentScope defaultScope(MitigationActionType actionType) {
        return actionType == MitigationActionType.DATA_TRANSFORMATION
                ? MitigationAssessmentScope.DATASET
                : MitigationAssessmentScope.RECIPIENT;
    }

    private MitigationAttributeMapping attributeMappingFromDto(MitigationAttributeMappingRequestDTO dto) {
        if (dto.getAttributeRole() == null) {
            throw new IllegalArgumentException("Attribute mapping requires attributeRole.");
        }

        MitigationAttributeMapping mapping = new MitigationAttributeMapping();
        mapping.setAttributeRole(dto.getAttributeRole());
        mapping.setDataType(dto.getAttributeRole() == MitigationAttributeRole.CANDIDATE_QID_COMBINATION
                ? null
                : dto.getDataType());
        applyDeterministicAttributeFlags(mapping, dto.getAttributeRole());
        mapping.setNotes(trimToNull(dto.getNotes()));
        return mapping;
    }

    private MitigationParameterDefinition parameterDefinitionFromDto(MitigationParameterDefinitionRequestDTO dto) {
        if (dto.getParameterCode() == null) {
            throw new IllegalArgumentException("Parameter definition requires parameterCode.");
        }

        MitigationParameterDefinition definition = new MitigationParameterDefinition();
        definition.setParameterCode(dto.getParameterCode());
        definition.setDescription(null);
        definition.setAllowedValues(dto.getParameterCode() == org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode.TARGET_RESOLUTION
                ? normalizedAllowedValues(dto.getAllowedValues())
                : List.of());
        return definition;
    }

    private Question validateQuestionMapping(
            Configuration configuration,
            MitigationAssessmentScope scope,
            String categoryCode,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        Question question = configuration.getQuestions().stream()
                .filter(candidate -> questionCode.equals(normalizeCode(candidate.getCode())))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question mapping references an unknown question code."));

        String questionCategoryCode = normalizeCode(question.getCategoryCode());
        if (!categoryCode.isEmpty() && !categoryCode.equals(questionCategoryCode)) {
            throw new IllegalArgumentException("Question mapping categoryCode does not match the referenced question.");
        }
        String assessmentPhase = question.getCategory() == null ? null : question.getCategory().getAssessmentPhase();
        if (scope == MitigationAssessmentScope.DATASET && !"DATASET_ASSESSMENT".equals(assessmentPhase)) {
            throw new IllegalArgumentException("Dataset question mappings must reference Dataset Assessment questions.");
        }
        if (scope == MitigationAssessmentScope.RECIPIENT && !"RECIPIENT_ASSESSMENT".equals(assessmentPhase)) {
            throw new IllegalArgumentException("Recipient question mappings must reference Recipient Assessment questions.");
        }

        boolean hasTrigger = question.getOptions().stream()
                .anyMatch(option -> triggerOptionCode.equals(normalizeCode(option.getCode())));
        boolean hasProjected = projectedOptionCode == null || question.getOptions().stream()
                .anyMatch(option -> projectedOptionCode.equals(normalizeCode(option.getCode())));
        if (!hasTrigger || !hasProjected) {
            throw new IllegalArgumentException("Question mapping references an unknown answer option code.");
        }
        return question;
    }

    private void applyDeterministicAttributeFlags(
            MitigationAttributeMapping mapping,
            MitigationAttributeRole attributeRole
    ) {
        mapping.setRequiresCandidateQid(attributeRole == MitigationAttributeRole.CANDIDATE_QID);
        mapping.setRequiresDirectIdentifier(attributeRole == MitigationAttributeRole.DIRECT_IDENTIFIER);
        mapping.setRequiresSensitiveAttribute(attributeRole == MitigationAttributeRole.SENSITIVE_ATTRIBUTE);
    }

    private List<String> normalizedAllowedValues(List<String> allowedValues) {
        return allowedValues == null
                ? List.of()
                : allowedValues.stream()
                .map(this::normalizeCode)
                .filter(value -> !value.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    private void requireAdmin(boolean isAdmin) {
        if (!isAdmin) {
            throw new SecurityException("Only administrators can modify the mitigation catalogue.");
        }
    }

    private String normalizeCode(String value) {
        if (value == null) return "";
        return value.trim()
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
    }

    private String normalizeCurrency(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private MitigationSharingArrangement canonicalSharingArrangement(MitigationSharingArrangement arrangement) {
        return arrangement == null ? null : arrangement.canonical();
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToNull(String value) {
        String trimmed = trim(value);
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBlank(String value) {
        return trim(value).isEmpty();
    }

    private <T> List<T> nullToEmpty(List<T> items) {
        return items == null ? List.of() : items;
    }
}
