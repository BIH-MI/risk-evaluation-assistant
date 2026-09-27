package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateDuplicateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateRequirementRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateSectionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate.ProjectTemplateResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType;
import org.bihealth.mi.risk_assessment_api.exception.EntityNameAlreadyExistsException;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplate;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectTemplateRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectTemplateVersionRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lifecycle and validation logic for Project Templates
 * every save creates a new immutable version and makes it current,
 * {@code active}/{@code default} drive selectability, and there is no
 * separate draft/publish step.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectTemplateService {

    public static final String BUILT_IN_PUBLIC_DATA_RELEASE = "PUBLIC_DATA_RELEASE";
    public static final String BUILT_IN_CONTROLLED_DATA_TRANSFER = "CONTROLLED_DATA_TRANSFER";
    public static final String BUILT_IN_SECURE_ANALYSIS_ENVIRONMENT = "SECURE_ANALYSIS_ENVIRONMENT";

    private static final Set<String> ALLOWED_EVALUATOR_KEYS = Set.of();
    private static final Set<ProjectTemplateRequirementValueType> CONDITION_SUPPORTED_VALUE_TYPES = Set.of(
            ProjectTemplateRequirementValueType.SINGLE_SELECT,
            ProjectTemplateRequirementValueType.MULTI_SELECT,
            ProjectTemplateRequirementValueType.YES_NO,
            ProjectTemplateRequirementValueType.YES_NO_UNKNOWN
    );
    private static final Set<String> DURATION_UNITS = Set.of("DAYS", "WEEKS", "MONTHS", "YEARS");
    private static final Set<String> CORE_SECTION_TITLES = Set.of(
            "project overview",
            "data sharing goal",
            "utility requirements",
            "timeline & resources"
    );
    private static final Set<String> CORE_REQUIREMENT_KEYS = Set.of(
            "scientificObjective",
            "analysisDataNeeded",
            "requiredExternalDeliverables",
            "sharingModel"
    );
    private static final String ANONYMIZED_DOWNLOADABLE_DATASET = "ANONYMIZED_DOWNLOADABLE_DATASET";
    private static final String LEGACY_DOWNLOADABLE_DATASET = "DOWNLOADABLE_DATASET";

    private final ProjectTemplateRepository templateRepository;
    private final ProjectTemplateVersionRepository versionRepository;
    private final ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public List<ProjectTemplateResponseDTO> listTemplates(boolean activeOnly, boolean isAdmin) {
        List<ProjectTemplate> templates = activeOnly || !isAdmin
                ? templateRepository.findByActiveTrue()
                : templateRepository.findAllByOrderByLastModifiedDateDesc();

        return templates.stream()
                .map(this::toResponseForList)
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing(ProjectTemplateResponseDTO::getDefaultTemplate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(ProjectTemplateResponseDTO::getActive, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(response -> response.getLastModifiedDate() == null
                                ? response.getCreationDate()
                                : response.getLastModifiedDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectTemplateResponseDTO getTemplate(Long id, boolean isAdmin) {
        ProjectTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project template not found: " + id));

        if (!isAdmin && !template.isActive()) {
            throw new EntityNotFoundException("Project template not found: " + id);
        }

        return toResponse(template, getCurrentVersion(template));
    }

    /**
     * A Project may only select the current version of an active Project
     * Template — never an older version (existing Projects stay pinned to
     * whatever version they were created with; that pin is never re-validated
     * here) and never an archived template's version.
     */
    @Transactional(readOnly = true)
    public ProjectTemplateVersion getSelectedActiveVersion(Long versionId) {
        if (versionId == null) {
            throw new IllegalArgumentException("Project Template is required.");
        }

        ProjectTemplateVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new EntityNotFoundException("Project template version not found: " + versionId));

        ProjectTemplate template = version.getTemplate();
        if (!template.isActive()) {
            throw new IllegalArgumentException("Archived Project Templates cannot be selected for new Projects.");
        }

        ProjectTemplateVersion currentVersion = getCurrentVersion(template);
        if (!Objects.equals(currentVersion.getId(), version.getId())) {
            throw new IllegalArgumentException("Only the current version of a Project Template can be selected for a new Project.");
        }

        return version;
    }

    public ProjectTemplateResponseDTO createTemplate(ProjectTemplateRequestDTO dto, String username, boolean isAdmin) {
        requireAdmin(isAdmin);
        validateUniqueName(dto.getName(), null);

        ProjectTemplate template = new ProjectTemplate();
        template.setCreatorUsername(username);
        template.setSystemKey(normalizeSystemKey(dto.getSystemKey()));
        template.setName(requiredName(dto.getName()));
        template.setDescription(trimToNull(dto.getDescription()));
        template.setActive(dto.getActive() == null || dto.getActive());
        template.setDefaultTemplate(Boolean.TRUE.equals(dto.getDefaultTemplate()));

        if (template.isDefaultTemplate() && !template.isActive()) {
            throw new IllegalArgumentException("The default Project Template must be active.");
        }

        ProjectTemplateVersion version = buildVersion(dto, username, 1, Map.of());
        template.addVersion(version);

        if (template.isDefaultTemplate()) {
            clearOtherDefaults(null);
        }

        ProjectTemplate saved = saveTemplateHandlingDuplicateName(template, template.getName());
        return toResponse(saved, getCurrentVersion(saved));
    }

    public ProjectTemplateResponseDTO updateTemplate(
            Long id,
            ProjectTemplateRequestDTO dto,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);

        ProjectTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project template not found: " + id));

        validateUniqueName(dto.getName(), id);

        boolean nextActive = dto.getActive() == null || dto.getActive();
        boolean nextDefault = Boolean.TRUE.equals(dto.getDefaultTemplate());
        if (nextDefault && !nextActive) {
            throw new IllegalArgumentException("The default Project Template must be active.");
        }

        template.setName(requiredName(dto.getName()));
        template.setDescription(trimToNull(dto.getDescription()));
        if (dto.getSystemKey() != null) {
            template.setSystemKey(normalizeSystemKey(dto.getSystemKey()));
        }
        template.setActive(nextActive);
        template.setDefaultTemplate(nextActive && nextDefault);

        ProjectTemplateVersion currentVersion = getCurrentVersion(template);

        // Every update creates a brand-new immutable version; existing Projects
        // remain pinned to whichever version they were created against.
        ProjectTemplateVersion nextVersion = buildVersion(
                dto,
                username,
                template.getCurrentVersion() + 1,
                stableKeysByRequirementId(currentVersion)
        );
        template.addVersion(nextVersion);

        if (template.isDefaultTemplate()) {
            clearOtherDefaults(template.getId());
        }

        ProjectTemplate saved = saveTemplateHandlingDuplicateName(template, template.getName());
        return toResponse(saved, nextVersion);
    }

    public ProjectTemplateResponseDTO duplicateTemplate(
            Long id,
            ProjectTemplateDuplicateRequestDTO dto,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);

        ProjectTemplate source = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project template not found: " + id));
        ProjectTemplateVersion sourceVersion = getCurrentVersion(source);
        String duplicateName = uniqueDuplicateName(
                dto == null || dto.getName() == null || dto.getName().trim().isEmpty()
                        ? source.getName() + " Copy"
                        : dto.getName()
        );

        ProjectTemplateRequestDTO request = toRequest(sourceVersion);
        request.setName(duplicateName);
        request.setSystemKey(null);
        request.setDescription(sourceVersion.getDescription());
        request.setActive(true);
        request.setDefaultTemplate(false);

        return createTemplate(request, username, true);
    }

    public ProjectTemplateResponseDTO archiveTemplate(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        ProjectTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project template not found: " + id));

        template.setActive(false);
        template.setDefaultTemplate(false);

        ProjectTemplate saved = templateRepository.save(template);
        return toResponse(saved, getCurrentVersion(saved));
    }

    public ProjectTemplateResponseDTO setDefault(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);

        ProjectTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project template not found: " + id));

        if (!template.isActive()) {
            throw new IllegalArgumentException("Archived Project Templates cannot be set as default.");
        }

        clearOtherDefaults(template.getId());
        template.setDefaultTemplate(true);

        ProjectTemplate saved = templateRepository.save(template);
        return toResponse(saved, getCurrentVersion(saved));
    }

    public ProjectTemplateResponseDTO toSnapshotResponse(ProjectTemplateVersion version) {
        return new ProjectTemplateResponseDTO(version);
    }

    public void validateBuiltInTemplateDefinition(String systemKey, ProjectTemplateRequestDTO dto) {
        String normalizedSystemKey = normalizeSystemKey(systemKey);
        try {
            requiredName(dto == null ? null : dto.getName());
            if (dto != null && Boolean.TRUE.equals(dto.getDefaultTemplate())
                    && Boolean.FALSE.equals(dto.getActive())) {
                throw new IllegalArgumentException("The default Project Template must be active.");
            }
            buildVersion(dto, "built-in-template-validation", 1, Map.of());
            validateBuiltInSemantics(normalizedSystemKey, dto);
        } catch (RuntimeException ex) {
            String name = dto == null ? normalizedSystemKey : Objects.toString(dto.getName(), normalizedSystemKey);
            throw new IllegalStateException(
                    "Invalid built-in Project Template '" + name + "': " + ex.getMessage(),
                    ex
            );
        }
    }

    private ProjectTemplateResponseDTO toResponseForList(ProjectTemplate template) {
        try {
            return toResponse(template, getCurrentVersion(template));
        } catch (IllegalStateException ex) {
            return null;
        }
    }

    private ProjectTemplateResponseDTO toResponse(ProjectTemplate template, ProjectTemplateVersion version) {
        return new ProjectTemplateResponseDTO(
                template,
                version,
                projectRepository.countByTemplateVersionTemplateId(template.getId())
        );
    }

    private ProjectTemplateVersion getCurrentVersion(ProjectTemplate template) {
        return template.getCurrentVersionEntity()
                .or(() -> versionRepository.findTopByTemplateIdOrderByVersionNumberDesc(template.getId()))
                .orElseThrow(() -> new IllegalStateException("Project Template has no versions: " + template.getId()));
    }

    private Map<Long, String> stableKeysByRequirementId(ProjectTemplateVersion version) {
        return version.getSections().stream()
                .flatMap(section -> section.getRequirements().stream())
                .filter(requirement -> requirement.getId() != null)
                .collect(Collectors.toMap(ProjectTemplateRequirement::getId, ProjectTemplateRequirement::getStableKey));
    }

    private ProjectTemplateVersion buildVersion(
            ProjectTemplateRequestDTO dto,
            String username,
            int versionNumber,
            Map<Long, String> existingStableKeysById
    ) {
        ProjectTemplateVersion version = new ProjectTemplateVersion();
        version.setCreatorUsername(username);
        version.setName(requiredName(dto.getName()));
        version.setDescription(trimToNull(dto.getDescription()));
        version.setVersionNumber(versionNumber);

        List<ProjectTemplateSectionRequestDTO> sections = dto.getSections() == null
                ? List.of()
                : dto.getSections();
        if (sections.isEmpty()) {
            throw new IllegalArgumentException("At least one Project Template section is required.");
        }

        Set<Integer> sectionOrders = new HashSet<>();
        Set<String> requirementKeys = new HashSet<>();
        Set<String> generatedLabelKeys = new HashSet<>();
        Map<String, ProjectTemplateRequirement> earlierRequirementsByKey = new HashMap<>();

        for (int index = 0; index < sections.size(); index++) {
            ProjectTemplateSectionRequestDTO sectionDto = sections.get(index);
            ProjectTemplateSection section = buildSection(
                    sectionDto,
                    index + 1,
                    sectionOrders,
                    requirementKeys,
                    generatedLabelKeys,
                    existingStableKeysById,
                    earlierRequirementsByKey
            );
            version.addSection(section);

            for (ProjectTemplateRequirement requirement : section.getRequirements()) {
                earlierRequirementsByKey.put(requirement.getStableKey().toLowerCase(Locale.ROOT), requirement);
            }
        }

        validateCoreTemplateDefinition(version);
        return version;
    }

    private ProjectTemplateSection buildSection(
            ProjectTemplateSectionRequestDTO dto,
            int fallbackOrder,
            Set<Integer> sectionOrders,
            Set<String> requirementKeys,
            Set<String> generatedLabelKeys,
            Map<Long, String> existingStableKeysById,
            Map<String, ProjectTemplateRequirement> earlierRequirementsByKey
    ) {
        if (dto == null) {
            throw new IllegalArgumentException("Project Template section cannot be empty.");
        }

        String title = requiredText(dto.getTitle(), "Section title is required.");
        Integer displayOrder = dto.getDisplayOrder() == null ? fallbackOrder : dto.getDisplayOrder();
        if (displayOrder < 1 || !sectionOrders.add(displayOrder)) {
            throw new IllegalArgumentException("Project Template section display orders must be unique positive integers.");
        }

        ProjectTemplateSection section = new ProjectTemplateSection();
        section.setTitle(title);
        section.setHelpText(trimToNull(dto.getHelpText()));
        section.setDisplayOrder(displayOrder);
        applySectionCondition(section, dto, earlierRequirementsByKey);

        List<ProjectTemplateRequirementRequestDTO> requirements = dto.getRequirements() == null
                ? List.of()
                : dto.getRequirements();
        if (requirements.isEmpty()) {
            throw new IllegalArgumentException("Each Project Template section must contain at least one requirement.");
        }

        Set<Integer> requirementOrders = new HashSet<>();
        for (int index = 0; index < requirements.size(); index++) {
            ProjectTemplateRequirement requirement = buildRequirement(
                    requirements.get(index),
                    index + 1,
                    requirementOrders,
                    requirementKeys,
                    generatedLabelKeys,
                    existingStableKeysById
            );
            section.addRequirement(requirement);
        }

        return section;
    }

    /**
     * A section may only depend on a requirement defined in a strictly
     * earlier section (which structurally forbids circular dependencies),
     * and only on the requirement value types whose answers can be evaluated
     * as a simple value match.
     */
    private void applySectionCondition(
            ProjectTemplateSection section,
            ProjectTemplateSectionRequestDTO dto,
            Map<String, ProjectTemplateRequirement> earlierRequirementsByKey
    ) {
        String dependsOnKey = trimToNull(dto.getDependsOnRequirementKey());
        if (dependsOnKey == null) {
            return;
        }

        ProjectTemplateRequirement dependency = earlierRequirementsByKey.get(dependsOnKey.toLowerCase(Locale.ROOT));
        if (dependency == null) {
            throw new IllegalArgumentException(
                    "Section \"" + section.getTitle() + "\" depends on requirement \"" + dependsOnKey
                            + "\", which must be defined in an earlier section."
            );
        }

        if (!CONDITION_SUPPORTED_VALUE_TYPES.contains(dependency.getValueType())) {
            throw new IllegalArgumentException(
                    "Section \"" + section.getTitle() + "\" cannot depend on requirement \"" + dependsOnKey
                            + "\": display conditions only support SINGLE_SELECT, MULTI_SELECT, YES_NO, or YES_NO_UNKNOWN requirements."
            );
        }

        List<String> visibleWhenValues = normalizeAllowedValues(dto.getVisibleWhenValues());
        if (visibleWhenValues.isEmpty()) {
            throw new IllegalArgumentException(
                    "Section \"" + section.getTitle() + "\" must specify at least one value for its display condition."
            );
        }

        Set<String> allowedConditionValues = allowedConditionValues(dependency);
        for (String value : visibleWhenValues) {
            if (!allowedConditionValues.contains(value)) {
                throw new IllegalArgumentException(
                        "Section \"" + section.getTitle() + "\" display condition value \"" + value
                                + "\" is not a valid answer for requirement \"" + dependsOnKey + "\"."
                );
            }
        }

        section.setDependsOnRequirementKey(dependency.getStableKey());
        section.getVisibleWhenValues().addAll(visibleWhenValues);
    }

    private Set<String> allowedConditionValues(ProjectTemplateRequirement dependency) {
        return switch (dependency.getValueType()) {
            case SINGLE_SELECT, MULTI_SELECT -> new HashSet<>(dependency.getAllowedValues());
            case YES_NO -> Set.of("YES", "NO");
            case YES_NO_UNKNOWN -> Set.of("YES", "NO", "UNKNOWN");
            default -> Set.of();
        };
    }

    private ProjectTemplateRequirement buildRequirement(
            ProjectTemplateRequirementRequestDTO dto,
            int fallbackOrder,
            Set<Integer> requirementOrders,
            Set<String> requirementKeys,
            Set<String> generatedLabelKeys,
            Map<Long, String> existingStableKeysById
    ) {
        if (dto == null) {
            throw new IllegalArgumentException("Project Template requirement cannot be empty.");
        }

        String label = requiredRequirementLabel(dto.getLabel());
        String generatedLabelKey = generateStableKeyFromLabel(label);
        String generatedLabelKeyKey = generatedLabelKey.toLowerCase(Locale.ROOT);
        if (!generatedLabelKeys.add(generatedLabelKeyKey)) {
            throw new IllegalArgumentException("Another requirement generates the same key '" + generatedLabelKey + "'.");
        }

        String stableKey = resolveStableKey(dto, generatedLabelKey, existingStableKeysById);
        String stableKeyKey = stableKey.toLowerCase(Locale.ROOT);
        if (!requirementKeys.add(stableKeyKey)) {
            throw new IllegalArgumentException("Another requirement generates the same key '" + stableKey + "'.");
        }

        Integer displayOrder = dto.getDisplayOrder() == null ? fallbackOrder : dto.getDisplayOrder();
        if (displayOrder < 1 || !requirementOrders.add(displayOrder)) {
            throw new IllegalArgumentException("Requirement display orders must be unique positive integers within a section.");
        }

        ProjectTemplateRequirementValueType valueType = parseValueType(dto.getValueType());
        ProjectTemplateRequirementConstraintType constraintType = parseConstraintType(dto.getConstraintType());
        List<String> allowedValues = normalizeAllowedValues(dto.getAllowedValues());
        validateRequirementDefinition(dto, valueType, allowedValues);

        ProjectTemplateRequirement requirement = new ProjectTemplateRequirement();
        requirement.setStableKey(stableKey);
        requirement.setLabel(label);
        requirement.setHelpText(trimToNull(dto.getHelpText()));
        requirement.setDisplayOrder(displayOrder);
        requirement.setValueType(valueType);
        requirement.setRequired(Boolean.TRUE.equals(dto.getRequired()));
        requirement.setConstraintType(constraintType);
        requirement.setDefaultValue(trimToNull(dto.getDefaultValue()));
        requirement.setFixedValue(trimToNull(dto.getFixedValue()));
        requirement.setUnit(trimToNull(dto.getUnit()));
        requirement.setMinValue(dto.getMinValue());
        requirement.setMaxValue(dto.getMaxValue());
        requirement.getAllowedValues().addAll(allowedValues);
        requirement.setEvaluatorKey(trimToNull(dto.getEvaluatorKey()));
        requirement.setSource(trimToNull(dto.getSource()));
        requirement.setRationale(trimToNull(dto.getRationale()));
        return requirement;
    }

    private String resolveStableKey(
            ProjectTemplateRequirementRequestDTO dto,
            String generatedLabelKey,
            Map<Long, String> existingStableKeysById
    ) {
        if (dto.getId() != null) {
            String existingStableKey = existingStableKeysById.get(dto.getId());
            if (existingStableKey == null) {
                throw new IllegalArgumentException("Unknown Project Template requirement id: " + dto.getId() + ".");
            }
            return requiredStableKey(existingStableKey);
        }

        String providedStableKey = trimToNull(dto.getStableKey());
        return providedStableKey == null ? generatedLabelKey : requiredStableKey(providedStableKey);
    }

    private String generateStableKeyFromLabel(String label) {
        String normalized = Normalizer.normalize(label.trim(), Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "");
        String[] words = normalized.split("[^A-Za-z0-9]+");
        StringBuilder stableKey = new StringBuilder();

        for (String word : words) {
            if (word == null || word.isBlank()) {
                continue;
            }

            String lower = word.toLowerCase(Locale.ROOT);
            if (stableKey.length() == 0) {
                stableKey.append(lower);
            } else {
                stableKey.append(Character.toUpperCase(lower.charAt(0)));
                if (lower.length() > 1) {
                    stableKey.append(lower.substring(1));
                }
            }
        }

        if (stableKey.length() == 0) {
            throw new IllegalArgumentException("Requirement label must contain at least one letter or number.");
        }

        String generated = stableKey.toString();
        if (!generated.matches("[A-Za-z][A-Za-z0-9_\\-]*")) {
            throw new IllegalArgumentException("Requirement label must generate a stable key that starts with a letter.");
        }
        return generated;
    }

    private void validateRequirementDefinition(
            ProjectTemplateRequirementRequestDTO dto,
            ProjectTemplateRequirementValueType valueType,
            List<String> allowedValues
    ) {
        if (dto.getMinValue() != null && dto.getMaxValue() != null
                && dto.getMinValue().compareTo(dto.getMaxValue()) > 0) {
            throw new IllegalArgumentException("Requirement minValue cannot be greater than maxValue.");
        }

        if (dto.getEvaluatorKey() != null && !dto.getEvaluatorKey().trim().isEmpty()
                && !ALLOWED_EVALUATOR_KEYS.contains(dto.getEvaluatorKey().trim())) {
            throw new IllegalArgumentException("Unsupported evaluatorKey: " + dto.getEvaluatorKey());
        }

        boolean selectable = valueType == ProjectTemplateRequirementValueType.SINGLE_SELECT
                || valueType == ProjectTemplateRequirementValueType.MULTI_SELECT;
        if (selectable && allowedValues.isEmpty()) {
            throw new IllegalArgumentException(valueType.name() + " requirements must define allowedValues.");
        }
        if (!selectable && !allowedValues.isEmpty()) {
            throw new IllegalArgumentException("allowedValues are only supported for SINGLE_SELECT and MULTI_SELECT requirements.");
        }

        if (dto.getFixedValue() != null && !dto.getFixedValue().trim().isEmpty()) {
            validateConfiguredValue("fixedValue", dto.getFixedValue().trim(), valueType, allowedValues, dto.getMinValue(), dto.getMaxValue());
        }
        if (dto.getDefaultValue() != null && !dto.getDefaultValue().trim().isEmpty()) {
            validateConfiguredValue("defaultValue", dto.getDefaultValue().trim(), valueType, allowedValues, dto.getMinValue(), dto.getMaxValue());
        }
    }

    private void validateCoreTemplateDefinition(ProjectTemplateVersion version) {
        Set<String> sectionTitles = version.getSections().stream()
                .map(section -> trimToNull(section.getTitle()))
                .filter(Objects::nonNull)
                .map(title -> title.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
        for (String requiredTitle : CORE_SECTION_TITLES) {
            if (!sectionTitles.contains(requiredTitle)) {
                throw new IllegalArgumentException("Missing required Project Template section: " + requiredTitle + ".");
            }
        }

        Set<String> requirementKeys = version.getSections().stream()
                .flatMap(section -> section.getRequirements().stream())
                .map(ProjectTemplateRequirement::getStableKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        for (String requiredKey : CORE_REQUIREMENT_KEYS) {
            if (!requirementKeys.contains(requiredKey)) {
                throw new IllegalArgumentException("Missing required Project Template requirement: " + requiredKey + ".");
            }
        }
    }

    private void validateBuiltInSemantics(String systemKey, ProjectTemplateRequestDTO dto) {
        if (BUILT_IN_PUBLIC_DATA_RELEASE.equals(systemKey)) {
            requireFixedSharingModel(dto, "PUBLIC_RELEASE");
            requireAllowedValue(dto, "requiredExternalDeliverables", ANONYMIZED_DOWNLOADABLE_DATASET);
            requireDisallowedValue(dto, "requiredExternalDeliverables", LEGACY_DOWNLOADABLE_DATASET);
            return;
        }

        if (BUILT_IN_CONTROLLED_DATA_TRANSFER.equals(systemKey)) {
            requireFixedSharingModel(dto, "CONTROLLED_DATA_TRANSFER");
            requireAllowedValue(dto, "requiredExternalDeliverables", ANONYMIZED_DOWNLOADABLE_DATASET);
            requireDisallowedValue(dto, "requiredExternalDeliverables", LEGACY_DOWNLOADABLE_DATASET);
            if (configuredValues(requireRequirement(dto, "sharingModel")).contains("PUBLIC_RELEASE")) {
                throw new IllegalArgumentException("CONTROLLED_DATA_TRANSFER built-in template must not require PUBLIC_RELEASE.");
            }
            return;
        }

        if (BUILT_IN_SECURE_ANALYSIS_ENVIRONMENT.equals(systemKey)) {
            requireFixedSharingModel(dto, "SECURE_REMOTE_ANALYSIS");
            requireAllowedValue(dto, "analysisDataNeeded", "INDIVIDUAL_LEVEL_DATA");

            ProjectTemplateRequirementRequestDTO deliverables = requireRequirement(dto, "requiredExternalDeliverables");
            Set<String> allowedDeliverables = new HashSet<>(normalizeAllowedValues(deliverables.getAllowedValues()));
            if (allowedDeliverables.contains(ANONYMIZED_DOWNLOADABLE_DATASET)
                    || allowedDeliverables.contains(LEGACY_DOWNLOADABLE_DATASET)) {
                throw new IllegalArgumentException(
                        "Downloadable datasets are not permitted as external deliverables for the built-in secure-environment profile."
                );
            }
            if (Boolean.TRUE.equals(deliverables.getRequired())
                    && normalizeAllowedValues(deliverables.getAllowedValues()).isEmpty()) {
                throw new IllegalArgumentException(
                        "Secure Analysis Environment must define at least one external deliverable option."
                );
            }
        }
    }

    private void requireFixedSharingModel(ProjectTemplateRequestDTO dto, String requiredValue) {
        ProjectTemplateRequirementRequestDTO requirement = requireRequirement(dto, "sharingModel");
        if (!ProjectTemplateRequirementValueType.SINGLE_SELECT.name()
                .equals(Objects.toString(requirement.getValueType(), "").toUpperCase(Locale.ROOT))) {
            throw new IllegalArgumentException("sharingModel must be a SINGLE_SELECT requirement.");
        }
        if (!normalizeAllowedValues(requirement.getAllowedValues()).contains(requiredValue)) {
            throw new IllegalArgumentException("sharingModel must allow " + requiredValue + ".");
        }
        if (!configuredValues(requirement).equals(Set.of(requiredValue))) {
            throw new IllegalArgumentException("sharingModel must be fixed to " + requiredValue + ".");
        }
    }

    private void requireAllowedValue(ProjectTemplateRequestDTO dto, String requirementKey, String requiredValue) {
        ProjectTemplateRequirementRequestDTO requirement = requireRequirement(dto, requirementKey);
        if (!normalizeAllowedValues(requirement.getAllowedValues()).contains(requiredValue)) {
            throw new IllegalArgumentException(requirementKey + " must allow " + requiredValue + ".");
        }
    }

    private void requireDisallowedValue(ProjectTemplateRequestDTO dto, String requirementKey, String disallowedValue) {
        ProjectTemplateRequirementRequestDTO requirement = requireRequirement(dto, requirementKey);
        if (normalizeAllowedValues(requirement.getAllowedValues()).contains(disallowedValue)) {
            throw new IllegalArgumentException(requirementKey + " must not allow " + disallowedValue + ".");
        }
    }

    private ProjectTemplateRequirementRequestDTO requireRequirement(ProjectTemplateRequestDTO dto, String requirementKey) {
        return findRequirement(dto, requirementKey)
                .orElseThrow(() -> new IllegalArgumentException("Missing required built-in requirement: " + requirementKey + "."));
    }

    private Optional<ProjectTemplateRequirementRequestDTO> findRequirement(ProjectTemplateRequestDTO dto, String requirementKey) {
        if (dto == null || dto.getSections() == null) {
            return Optional.empty();
        }

        return dto.getSections().stream()
                .filter(Objects::nonNull)
                .flatMap(section -> section.getRequirements() == null
                        ? List.<ProjectTemplateRequirementRequestDTO>of().stream()
                        : section.getRequirements().stream())
                .filter(Objects::nonNull)
                .filter(requirement -> requirementKey.equals(requirement.getStableKey()))
                .findFirst();
    }

    private Set<String> configuredValues(ProjectTemplateRequirementRequestDTO requirement) {
        String fixedValue = trimToNull(requirement.getFixedValue());
        if (fixedValue == null) {
            return Set.of();
        }
        return new HashSet<>(splitConfiguredValues(fixedValue));
    }

    private void validateConfiguredValue(
            String field,
            String value,
            ProjectTemplateRequirementValueType valueType,
            List<String> allowedValues,
            BigDecimal minValue,
            BigDecimal maxValue
    ) {
        switch (valueType) {
            case INTEGER -> ProjectTemplateRequirementValidation.validateNumber(field, new BigDecimal(value), minValue, maxValue, true);
            case DECIMAL, MONEY -> ProjectTemplateRequirementValidation.validateNumber(field, new BigDecimal(value), minValue, maxValue, false);
            case YES_NO -> {
                String normalized = value.toUpperCase(Locale.ROOT);
                if (!Set.of("YES", "NO", "TRUE", "FALSE").contains(normalized)) {
                    throw new IllegalArgumentException(field + " must be YES or NO.");
                }
            }
            case YES_NO_UNKNOWN -> {
                String normalized = value.toUpperCase(Locale.ROOT);
                if (!Set.of("YES", "NO", "UNKNOWN").contains(normalized)) {
                    throw new IllegalArgumentException(field + " must be YES, NO, or UNKNOWN.");
                }
            }
            case SINGLE_SELECT, MULTI_SELECT -> {
                Set<String> allowed = new HashSet<>(allowedValues);
                List<String> configuredValues = splitConfiguredValues(value);
                if (valueType == ProjectTemplateRequirementValueType.SINGLE_SELECT && configuredValues.size() != 1) {
                    throw new IllegalArgumentException(field + " requires exactly one selected value.");
                }
                for (String configured : configuredValues) {
                    if (!allowed.contains(configured)) {
                        throw new IllegalArgumentException(field + " contains a value not present in allowedValues: " + configured);
                    }
                }
            }
            case DATE -> LocalDate.parse(value);
            case DURATION -> validateConfiguredDuration(field, value);
            default -> {
                // Text values have no additional structural constraints.
            }
        }
    }

    private void validateConfiguredDuration(String field, String value) {
        String[] parts = value.trim().split("\\s+", 2);
        BigDecimal amount = new BigDecimal(parts[0]);
        ProjectTemplateRequirementValidation.validateNumber(field, amount, BigDecimal.ZERO, null, true);
        if (parts.length > 1 && !DURATION_UNITS.contains(parts[1])) {
            throw new IllegalArgumentException(field + " duration unit must be one of " + DURATION_UNITS + ".");
        }
    }

    private List<String> splitConfiguredValues(String value) {
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return List.of();
        }
        return List.of(normalized.split(",")).stream()
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.toList());
    }

    private ProjectTemplateRequestDTO toRequest(ProjectTemplateVersion version) {
        List<ProjectTemplateSectionRequestDTO> sections = version.getSections().stream()
                .sorted(Comparator.comparing(ProjectTemplateSection::getDisplayOrder))
                .map(section -> new ProjectTemplateSectionRequestDTO(
                        null,
                        section.getTitle(),
                        section.getHelpText(),
                        section.getDisplayOrder(),
                        section.getDependsOnRequirementKey(),
                        new ArrayList<>(section.getVisibleWhenValues()),
                        section.getRequirements().stream()
                                .sorted(Comparator.comparing(ProjectTemplateRequirement::getDisplayOrder))
                                .map(requirement -> new ProjectTemplateRequirementRequestDTO(
                                        null,
                                        requirement.getStableKey(),
                                        requirement.getLabel(),
                                        requirement.getHelpText(),
                                        requirement.getDisplayOrder(),
                                        requirement.getValueType().name(),
                                        requirement.isRequired(),
                                        requirement.getConstraintType().name(),
                                        requirement.getDefaultValue(),
                                        requirement.getFixedValue(),
                                        requirement.getUnit(),
                                        requirement.getMinValue(),
                                        requirement.getMaxValue(),
                                        new ArrayList<>(requirement.getAllowedValues()),
                                        requirement.getEvaluatorKey(),
                                        requirement.getSource(),
                                        requirement.getRationale()
                                ))
                                .collect(Collectors.toList())
                ))
                .collect(Collectors.toList());

        return new ProjectTemplateRequestDTO(
                null,
                version.getName(),
                version.getDescription(),
                true,
                false,
                sections
        );
    }

    private ProjectTemplateRequirementValueType parseValueType(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Requirement valueType is required.");
        }
        try {
            return ProjectTemplateRequirementValueType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported requirement valueType: " + value);
        }
    }

    private ProjectTemplateRequirementConstraintType parseConstraintType(String value) {
        if (value == null || value.trim().isEmpty()) {
            return ProjectTemplateRequirementConstraintType.INFORMATIONAL;
        }
        try {
            return ProjectTemplateRequirementConstraintType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported requirement constraintType: " + value);
        }
    }

    private List<String> normalizeAllowedValues(List<String> values) {
        if (values == null) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String value : values) {
            String trimmed = trimToNull(value);
            if (trimmed != null) {
                normalized.add(trimmed);
            }
        }
        return new ArrayList<>(normalized);
    }

    private void validateUniqueName(String rawName, Long excludeId) {
        String name = requiredName(rawName);
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        boolean exists = excludeId == null
                ? templateRepository.existsByNormalizedName(normalizedName)
                : templateRepository.existsByNormalizedNameAndIdNot(normalizedName, excludeId);
        if (exists) {
            throw new EntityNameAlreadyExistsException("project template", name);
        }
    }

    private String uniqueDuplicateName(String baseName) {
        String cleanedBase = requiredName(baseName);
        if (!templateRepository.existsByNormalizedName(EntityNameNormalizer.normalizeForComparison(cleanedBase))) {
            return cleanedBase;
        }

        int copyNumber = 2;
        while (true) {
            String candidate = cleanedBase + " " + copyNumber;
            if (!templateRepository.existsByNormalizedName(EntityNameNormalizer.normalizeForComparison(candidate))) {
                return candidate;
            }
            copyNumber++;
        }
    }

    private void clearOtherDefaults(Long excludeId) {
        templateRepository.findAll().stream()
                .filter(template -> excludeId == null || !Objects.equals(template.getId(), excludeId))
                .filter(ProjectTemplate::isDefaultTemplate)
                .forEach(template -> {
                    template.setDefaultTemplate(false);
                    templateRepository.save(template);
                });
    }

    private void requireAdmin(boolean isAdmin) {
        if (!isAdmin) {
            throw new SecurityException("Only administrators can modify Project Templates.");
        }
    }

    private String requiredName(String value) {
        String name = EntityNameNormalizer.normalizeForStorage(value);
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Name is required.");
        }
        return name;
    }

    private String requiredText(String value, String message) {
        String text = trimToNull(value);
        if (text == null) {
            throw new IllegalArgumentException(message);
        }
        return text;
    }

    private String requiredRequirementLabel(String value) {
        String label = requiredText(value, "Requirement label is required.");
        if (label.chars().noneMatch(Character::isLetterOrDigit)) {
            throw new IllegalArgumentException("Requirement label must contain at least one letter or number.");
        }
        return label;
    }

    private String requiredStableKey(String value) {
        String stableKey = trimToNull(value);
        if (stableKey == null) {
            throw new IllegalArgumentException("Requirement stable key is required.");
        }
        if (!stableKey.matches("[A-Za-z][A-Za-z0-9_\\-]*")) {
            throw new IllegalArgumentException("Requirement stable key must start with a letter and contain only letters, numbers, underscores, or hyphens.");
        }
        return stableKey;
    }

    private String normalizeSystemKey(String value) {
        String systemKey = trimToNull(value);
        if (systemKey == null) {
            return null;
        }
        String normalized = systemKey.toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z][A-Z0-9_]*")) {
            throw new IllegalArgumentException("Project Template systemKey must contain uppercase letters, numbers, and underscores.");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private ProjectTemplate saveTemplateHandlingDuplicateName(ProjectTemplate template, String name) {
        try {
            return templateRepository.saveAndFlush(template);
        } catch (DataIntegrityViolationException ex) {
            if (isTemplateNameUniqueConstraintViolation(ex)) {
                throw new EntityNameAlreadyExistsException("project template", name);
            }
            throw ex;
        }
    }

    private boolean isTemplateNameUniqueConstraintViolation(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = NestedExceptionUtils.getMostSpecificCause(ex);
        String message = mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage();
        return message != null
                && (message.contains(NamedResourceConstraints.PROJECT_TEMPLATES_NORMALIZED_NAME)
                || message.contains(NamedResourceConstraints.PROJECT_TEMPLATES_SYSTEM_KEY));
    }
}
