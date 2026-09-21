package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationActionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationAttributeMappingRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationParameterDefinitionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationQuestionMappingRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigation.MitigationActionDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.mitigation.MitigationActionRepository;
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

    public MitigationCatalogueService(
            MitigationActionRepository actionRepository,
            RiskConfigurationRepository configurationRepository
    ) {
        this.actionRepository = actionRepository;
        this.configurationRepository = configurationRepository;
    }

    @Transactional(readOnly = true)
    public List<MitigationActionDTO> listActions(
            MitigationActionType actionType,
            Boolean active,
            MitigationSharingArrangement sharingArrangement
    ) {
        MitigationSharingArrangement canonicalSharingArrangement = canonicalSharingArrangement(sharingArrangement);
        return actionRepository.findAll().stream()
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
        return new MitigationActionDTO(requireAction(id));
    }

    public MitigationActionDTO createAction(MitigationActionRequestDTO dto, String username, boolean isAdmin) {
        requireAdmin(isAdmin);
        String code = resolveCreateCode(dto);
        validateCreateRequest(dto, code);

        MitigationAction action = new MitigationAction();
        action.setCreatorUsername(username);
        action.setCode(code);
        applyEditableFields(action, dto);

        MitigationAction saved = actionRepository.saveAndFlush(action);
        return new MitigationActionDTO(saved);
    }

    public MitigationActionDTO updateAction(Long id, MitigationActionRequestDTO dto, boolean isAdmin) {
        requireAdmin(isAdmin);
        if (dto == null) {
            throw new IllegalArgumentException("Mitigation action request is required.");
        }
        MitigationAction action = requireAction(id);

        if (dto.getCode() != null && !normalizeCode(dto.getCode()).equals(action.getCode())) {
            throw new IllegalArgumentException("Mitigation action code cannot be changed after creation.");
        }
        if (dto.getActionType() != null && dto.getActionType() != action.getActionType()) {
            throw new IllegalArgumentException("Mitigation action type cannot be changed after creation.");
        }

        applyEditableFields(action, dto);
        MitigationAction saved = actionRepository.saveAndFlush(action);
        return new MitigationActionDTO(saved);
    }

    public void deleteAction(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);
        if (!actionRepository.existsById(id)) {
            throw new EntityNotFoundException("Mitigation action not found: " + id);
        }
        actionRepository.deleteById(id);
    }

    private MitigationAction requireAction(Long id) {
        return actionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation action not found: " + id));
    }

    private void applyEditableFields(MitigationAction action, MitigationActionRequestDTO dto) {
        if (dto.getActionType() == null) {
            throw new IllegalArgumentException("Mitigation action type is required.");
        }
        if (isBlank(dto.getName())) {
            throw new IllegalArgumentException("Mitigation action name is required.");
        }

        validateMappingsForType(dto);
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
        action.setApplicableSharingArrangements(dto.getApplicableSharingArrangements() == null
                ? new LinkedHashSet<>()
                : dto.getApplicableSharingArrangements().stream()
                .map(this::canonicalSharingArrangement)
                .collect(Collectors.toCollection(LinkedHashSet::new)));
        action.setEstimatedCostMin(dto.getEstimatedCostMin());
        action.setEstimatedCostMax(dto.getEstimatedCostMax());
        action.setCurrency(normalizeCurrency(dto.getCurrency()));
        action.setEstimatedSetupDaysMin(dto.getEstimatedSetupDaysMin());
        action.setEstimatedSetupDaysMax(dto.getEstimatedSetupDaysMax());
        action.setEstimateScope(dto.getEstimateScope());
        action.setEstimateSource(trimToNull(dto.getEstimateSource()));
        action.setEstimateAssumptions(trimToNull(dto.getEstimateAssumptions()));

        action.getQuestionMappings().clear();
        if (dto.getActionType() == MitigationActionType.CONTEXT_CONTROL) {
            for (MitigationQuestionMappingRequestDTO mappingDto : nullToEmpty(dto.getQuestionMappings())) {
                action.addQuestionMapping(questionMappingFromDto(mappingDto));
            }
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

    private String resolveCreateCode(MitigationActionRequestDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Mitigation action request is required.");
        }
        if (isBlank(dto.getCode())) {
            return normalizeCode(dto.getName());
        }
        return normalizeCode(dto.getCode());
    }

    private void validateCreateRequest(MitigationActionRequestDTO dto, String code) {
        if (dto == null) {
            throw new IllegalArgumentException("Mitigation action request is required.");
        }
        if (isBlank(dto.getName())) {
            throw new IllegalArgumentException("Mitigation action name is required.");
        }
        if (!STABLE_CODE_PATTERN.matcher(code).matches()) {
            throw new IllegalArgumentException("Mitigation action code must be uppercase snake case.");
        }
        if (actionRepository.existsByCode(code)) {
            throw new IllegalArgumentException(
                    "A mitigation action with system identifier '" + code + "' already exists."
            );
        }
    }

    private void validateMappingsForType(MitigationActionRequestDTO dto) {
        boolean hasQuestionMappings = dto.getQuestionMappings() != null && !dto.getQuestionMappings().isEmpty();
        boolean hasAttributeMappings = dto.getAttributeMappings() != null && !dto.getAttributeMappings().isEmpty();
        boolean hasParameterDefinitions = dto.getParameterDefinitions() != null && !dto.getParameterDefinitions().isEmpty();

        if (dto.getActionType() == MitigationActionType.CONTEXT_CONTROL && hasAttributeMappings) {
            throw new IllegalArgumentException("Context-control actions cannot define attribute mappings.");
        }
        if (dto.getActionType() == MitigationActionType.DATA_TRANSFORMATION && hasQuestionMappings) {
            throw new IllegalArgumentException("Data-transformation actions cannot define questionnaire mappings.");
        }
        if (dto.getActionType() == MitigationActionType.CONTEXT_CONTROL && hasParameterDefinitions) {
            throw new IllegalArgumentException("Context-control actions cannot define data-transformation plan parameters.");
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

    private MitigationQuestionMapping questionMappingFromDto(MitigationQuestionMappingRequestDTO dto) {
        if (dto.getConfigurationId() == null) {
            throw new IllegalArgumentException("Question mapping requires configurationId.");
        }
        if (isBlank(dto.getQuestionCode())) {
            throw new IllegalArgumentException("Question mapping requires questionCode.");
        }
        if (isBlank(dto.getTriggerOptionCode())) {
            throw new IllegalArgumentException("Question mapping requires triggerOptionCode.");
        }
        if (isBlank(dto.getProjectedOptionCode())) {
            throw new IllegalArgumentException("Question mapping requires projectedOptionCode.");
        }
        String questionCode = normalizeCode(dto.getQuestionCode());
        String triggerOptionCode = normalizeCode(dto.getTriggerOptionCode());
        String projectedOptionCode = normalizeCode(dto.getProjectedOptionCode());
        if (triggerOptionCode.equals(projectedOptionCode)) {
            throw new IllegalArgumentException("Question mapping trigger and projected answers must be different.");
        }

        MitigationQuestionMapping mapping = new MitigationQuestionMapping();
        Configuration configuration = configurationRepository.findById(dto.getConfigurationId())
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + dto.getConfigurationId()));
        validateControlsQuestionMapping(configuration, questionCode, triggerOptionCode, projectedOptionCode);

        mapping.setConfiguration(configuration);
        mapping.setQuestionCode(questionCode);
        mapping.setTriggerOptionCode(triggerOptionCode);
        mapping.setProjectedOptionCode(projectedOptionCode);
        mapping.setNotes(trimToNull(dto.getNotes()));
        return mapping;
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

    private void validateControlsQuestionMapping(
            Configuration configuration,
            String questionCode,
            String triggerOptionCode,
            String projectedOptionCode
    ) {
        Question question = configuration.getQuestions().stream()
                .filter(candidate -> questionCode.equals(normalizeCode(candidate.getCode())))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question mapping references an unknown question code."));

        String categoryCode = normalizeCode(question.getCategoryCode());
        String assessmentPhase = question.getCategory() == null ? null : question.getCategory().getAssessmentPhase();
        if (!"RECIPIENT_ASSESSMENT".equals(assessmentPhase) || !"CONTROLS".equals(categoryCode)) {
            throw new IllegalArgumentException("Context-control questionnaire mappings must reference recipient controls questions.");
        }

        boolean hasTrigger = question.getOptions().stream()
                .anyMatch(option -> triggerOptionCode.equals(normalizeCode(option.getCode())));
        boolean hasProjected = question.getOptions().stream()
                .anyMatch(option -> projectedOptionCode.equals(normalizeCode(option.getCode())));
        if (!hasTrigger || !hasProjected) {
            throw new IllegalArgumentException("Question mapping references an unknown answer option code.");
        }
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
