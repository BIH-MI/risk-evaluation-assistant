package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequirementResponseRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.project.ProjectResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType;
import org.bihealth.mi.risk_assessment_api.exception.EntityNameAlreadyExistsException;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.locks.EntityLockRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for Project workspaces: datasets, recipients, and the answers a
 * researcher gives to the admin-defined requirements of their selected,
 * pinned {@link ProjectTemplateVersion}.
 *
 * <p>A project constrains which datasets and recipients can be combined by
 * project-scoped data-sharing activities. It does not own dataset or recipient
 * lifecycles, and it never defines its own requirements: those come exclusively
 * from the Project Template an administrator has published.</p>
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectService {

    private static final Set<String> DURATION_UNITS = Set.of("DAYS", "WEEKS", "MONTHS", "YEARS");

    private final ProjectRepository projectRepository;
    private final DatasetRepository datasetRepository;
    private final RecipientRepository recipientRepository;
    private final EntityLockRepository lockRepository;
    private final ProjectTemplateService projectTemplateService;

    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> findProjects(String username, boolean isAdmin) {
        if (isAdmin) {
            return projectRepository.findAll().stream()
                    .map(ProjectResponseDTO::new)
                    .collect(Collectors.toList());
        }

        Set<Project> combined = new LinkedHashSet<>(projectRepository.findByCreatorUsername(username));
        combined.addAll(projectRepository.findBySharedUsernamesContains(username));
        return combined.stream()
                .map(ProjectResponseDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponseDTO getProject(Long id, String username, boolean isAdmin) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));
        verifyProjectAccess(project, username, isAdmin);
        return new ProjectResponseDTO(project);
    }

    public ProjectResponseDTO createProject(ProjectRequestDTO dto, String username, boolean isAdmin) {
        String name = requiredProjectName(dto.getName());
        ensureProjectNameAvailable(name, null);

        ProjectTemplateVersion templateVersion =
                projectTemplateService.getSelectedActiveVersion(dto.getTemplateVersionId());

        Project project = new Project();
        project.setCreatorUsername(username);
        project.setName(name);
        project.setTemplateVersion(templateVersion);
        applyProjectFields(project, dto);

        Set<Dataset> datasets = resolveDatasets(dto.getDatasetIds(), username, isAdmin);
        Set<Recipient> recipients = resolveRecipients(dto.getRecipientIds(), username, isAdmin);
        project.getDatasets().addAll(datasets);
        project.getRecipients().addAll(recipients);

        project.getRequirementResponses().addAll(
                buildRequirementResponses(project, templateVersion, dto.getRequirementResponses())
        );

        Project saved = saveProjectHandlingDuplicateName(project, name);
        return new ProjectResponseDTO(saved);
    }

    public ProjectResponseDTO updateProject(Long id, ProjectRequestDTO dto, String username, boolean isAdmin) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));

        verifyProjectAccess(project, username, isAdmin);

        String name = requiredProjectName(dto.getName());
        ensureProjectNameAvailable(name, id);

        Set<Dataset> nextDatasets = resolveDatasets(dto.getDatasetIds(), username, isAdmin);
        Set<Recipient> nextRecipients = resolveRecipients(dto.getRecipientIds(), username, isAdmin);

        validateMembershipRemoval(project, nextDatasets, nextRecipients);

        project.setName(name);
        applyProjectFields(project, dto);

        project.getDatasets().clear();
        project.getDatasets().addAll(nextDatasets);

        project.getRecipients().clear();
        project.getRecipients().addAll(nextRecipients);

        // The pinned Project Template version never changes on update: a Project
        // is never silently migrated to a newer template version, so any
        // templateVersionId on the request is ignored here.
        ProjectTemplateVersion pinnedVersion = project.getTemplateVersion();
        if (pinnedVersion != null) {
            project.getRequirementResponses().clear();
            project.getRequirementResponses().addAll(
                    buildRequirementResponses(project, pinnedVersion, dto.getRequirementResponses())
            );
        } else if (dto.getRequirementResponses() != null && !dto.getRequirementResponses().isEmpty()) {
            throw new IllegalArgumentException(
                    "This legacy Project has no Project Template and cannot accept requirement responses."
            );
        }

        // Legacy attribute requirements are read-only: ordinary edits never touch them.

        Project saved = saveProjectHandlingDuplicateName(project, name);
        return new ProjectResponseDTO(saved);
    }

    public void deleteProject(Long id, String username, boolean isAdmin) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));

        verifyProjectAccess(project, username, isAdmin);

        if (!project.getDataSharingActivities().isEmpty()) {
            throw new IllegalStateException(
                    "Project cannot be deleted because it contains Data Sharing Activities."
            );
        }

        lockRepository.findByEntityTypeAndEntityId("PROJECT", String.valueOf(id))
                .ifPresent(lockRepository::delete);

        projectRepository.delete(project);
    }

    /**
     * Loads a project for activity creation/update and verifies access.
     */
    @Transactional(readOnly = true)
    public Project getAccessibleProjectEntity(Long id, String username, boolean isAdmin) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Project not found: " + id));
        verifyProjectAccess(project, username, isAdmin);
        return project;
    }

    /**
     * Validates that an activity's selected assessment versions are allowed by
     * the project container and that the current user has explicit access to
     * the underlying dataset and recipient.
     */
    public void validateActivityMembership(
            Project project,
            DatasetAssessment datasetAssessment,
            RecipientAssessment recipientAssessment,
            String username,
            boolean isAdmin
    ) {
        if (project == null) {
            return;
        }

        if (datasetAssessment == null || datasetAssessment.getDataset() == null) {
            throw new IllegalArgumentException("A project activity requires a dataset assessment with a dataset.");
        }
        if (recipientAssessment == null || recipientAssessment.getRecipient() == null) {
            throw new IllegalArgumentException("A project activity requires a recipient assessment with a recipient.");
        }

        Dataset dataset = datasetAssessment.getDataset();
        Recipient recipient = recipientAssessment.getRecipient();

        verifyDatasetAccess(dataset, username, isAdmin);
        verifyRecipientAccess(recipient, username, isAdmin);

        boolean datasetInProject = project.getDatasets().stream()
                .anyMatch(member -> Objects.equals(member.getId(), dataset.getId()));
        if (!datasetInProject) {
            throw new IllegalArgumentException(
                    "Dataset " + dataset.getId() + " is not a member of project " + project.getId() + "."
            );
        }

        boolean recipientInProject = project.getRecipients().stream()
                .anyMatch(member -> Objects.equals(member.getId(), recipient.getId()));
        if (!recipientInProject) {
            throw new IllegalArgumentException(
                    "Recipient " + recipient.getId() + " is not a member of project " + project.getId() + "."
            );
        }
    }

    private void applyProjectFields(Project project, ProjectRequestDTO dto) {
        project.setDescription(dto.getDescription());
        project.setNotes(dto.getNotes());

        project.getSharedUsernames().clear();
        if (dto.getSharedUsernames() != null) {
            project.getSharedUsernames().addAll(dto.getSharedUsernames());
        }
    }

    private Set<Dataset> resolveDatasets(List<Long> datasetIds, String username, boolean isAdmin) {
        Set<Dataset> datasets = new LinkedHashSet<>();
        for (Long datasetId : safeIds(datasetIds)) {
            Dataset dataset = datasetRepository.findById(datasetId)
                    .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + datasetId));
            verifyDatasetAccess(dataset, username, isAdmin);
            datasets.add(dataset);
        }
        return datasets;
    }

    private Set<Recipient> resolveRecipients(List<Long> recipientIds, String username, boolean isAdmin) {
        Set<Recipient> recipients = new LinkedHashSet<>();
        for (Long recipientId : safeIds(recipientIds)) {
            Recipient recipient = recipientRepository.findById(recipientId)
                    .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + recipientId));
            verifyRecipientAccess(recipient, username, isAdmin);
            recipients.add(recipient);
        }
        return recipients;
    }

    // -------------------------------------------------------------------
    // Requirement responses
    // -------------------------------------------------------------------

    private List<ProjectRequirementResponse> buildRequirementResponses(
            Project project,
            ProjectTemplateVersion templateVersion,
            List<ProjectRequirementResponseRequestDTO> dtos
    ) {
        Map<Long, ProjectTemplateRequirement> requirementsById = templateVersion.getSections().stream()
                .flatMap(section -> section.getRequirements().stream())
                .collect(Collectors.toMap(ProjectTemplateRequirement::getId, requirement -> requirement));

        Map<Long, ProjectRequirementResponseRequestDTO> submittedByRequirementId = new LinkedHashMap<>();
        for (ProjectRequirementResponseRequestDTO responseDto : safeResponses(dtos)) {
            if (responseDto.getRequirementId() == null || !requirementsById.containsKey(responseDto.getRequirementId())) {
                throw new IllegalArgumentException(
                        "Requirement " + responseDto.getRequirementId()
                                + " is not part of the selected Project Template version."
                );
            }
            submittedByRequirementId.put(responseDto.getRequirementId(), responseDto);
        }

        Set<Long> visibleSectionIds = computeVisibleSectionIds(templateVersion, requirementsById, submittedByRequirementId);

        List<ProjectRequirementResponse> responses = new ArrayList<>();
        for (ProjectTemplateRequirement requirement : requirementsById.values()) {
            if (requirement.getSection() != null && !visibleSectionIds.contains(requirement.getSection().getId())) {
                // A requirement in a currently-hidden conditional section neither
                // requires nor accepts a response, regardless of what was submitted.
                continue;
            }

            ProjectRequirementResponse response = buildResponseForRequirement(
                    project, templateVersion, requirement, submittedByRequirementId.get(requirement.getId())
            );
            if (response != null) {
                responses.add(response);
            }
        }
        return responses;
    }

    /**
     * Evaluates each section's display condition against the values the
     * client submitted (mirroring the frontend's own evaluation), so a
     * section's requirements are only enforced/persisted when it is actually
     * visible for this submission.
     */
    private Set<Long> computeVisibleSectionIds(
            ProjectTemplateVersion templateVersion,
            Map<Long, ProjectTemplateRequirement> requirementsById,
            Map<Long, ProjectRequirementResponseRequestDTO> submittedByRequirementId
    ) {
        Map<String, ProjectTemplateRequirement> requirementsByStableKey = requirementsById.values().stream()
                .collect(Collectors.toMap(
                        requirement -> requirement.getStableKey().toLowerCase(Locale.ROOT),
                        requirement -> requirement,
                        (first, second) -> first
                ));

        Set<Long> visible = new HashSet<>();
        for (ProjectTemplateSection section : templateVersion.getSections()) {
            String dependsOnKey = section.getDependsOnRequirementKey();
            if (dependsOnKey == null) {
                visible.add(section.getId());
                continue;
            }

            ProjectTemplateRequirement dependency = requirementsByStableKey.get(dependsOnKey.toLowerCase(Locale.ROOT));
            if (dependency == null) {
                // Malformed template data: fail open rather than silently drop
                // requirements/answers that would otherwise be untestable.
                visible.add(section.getId());
                continue;
            }

            ProjectRequirementResponseRequestDTO dependencyResponse =
                    resolveConditionDependencyResponse(dependency, submittedByRequirementId.get(dependency.getId()));
            Set<String> currentValues = extractSubmittedValues(dependency.getValueType(), dependencyResponse);
            if (!Collections.disjoint(currentValues, section.getVisibleWhenValues())) {
                visible.add(section.getId());
            }
        }
        return visible;
    }

    private ProjectRequirementResponseRequestDTO resolveConditionDependencyResponse(
            ProjectTemplateRequirement dependency,
            ProjectRequirementResponseRequestDTO submitted
    ) {
        if (!isBlankResponse(dependency.getValueType(), submitted)) {
            return submitted;
        }
        if (dependency.getFixedValue() != null) {
            return parseConfiguredValue(dependency, dependency.getFixedValue());
        }
        if (dependency.getDefaultValue() != null) {
            return parseConfiguredValue(dependency, dependency.getDefaultValue());
        }
        return submitted;
    }

    private Set<String> extractSubmittedValues(
            ProjectTemplateRequirementValueType valueType,
            ProjectRequirementResponseRequestDTO dto
    ) {
        if (dto == null) {
            return Set.of();
        }
        return switch (valueType) {
            case SINGLE_SELECT, MULTI_SELECT -> new HashSet<>(safeList(dto.getSelectedValues()));
            case YES_NO -> dto.getBooleanValue() == null ? Set.of() : Set.of(dto.getBooleanValue() ? "YES" : "NO");
            case YES_NO_UNKNOWN -> {
                String value = trimToNull(dto.getTextValue());
                yield value == null ? Set.of() : Set.of(value.toUpperCase(Locale.ROOT));
            }
            default -> Set.of();
        };
    }

    private ProjectRequirementResponse buildResponseForRequirement(
            Project project,
            ProjectTemplateVersion templateVersion,
            ProjectTemplateRequirement requirement,
            ProjectRequirementResponseRequestDTO submitted
    ) {
        ProjectRequirementResponseRequestDTO source = submitted;

        // An admin-fixed value is never user-editable: the stored value always
        // wins over whatever the client submitted.
        if (requirement.getFixedValue() != null) {
            source = parseConfiguredValue(requirement, requirement.getFixedValue());
        } else if (isBlankResponse(requirement.getValueType(), source) && requirement.getDefaultValue() != null) {
            source = parseConfiguredValue(requirement, requirement.getDefaultValue());
        }

        if (isBlankResponse(requirement.getValueType(), source)) {
            if (requirement.isRequired()) {
                throw new IllegalArgumentException(requiredResponseMessage(requirement));
            }
            return null;
        }

        ProjectRequirementResponse response = new ProjectRequirementResponse();
        response.setProject(project);
        response.setTemplateVersion(templateVersion);
        response.setRequirement(requirement);
        response.setRequirementKey(requirement.getStableKey());
        applyTypedValue(response, requirement, source);
        return response;
    }

    private String requiredResponseMessage(ProjectTemplateRequirement requirement) {
        return switch (requirement.getStableKey()) {
            case "scientificObjective" -> "Enter the scientific objective.";
            case "analysisDataNeeded" -> "Select at least one form of data needed for analysis.";
            case "requiredExternalDeliverables" -> "Select at least one required external deliverable.";
            default -> "A response is required for \"" + requirement.getLabel() + "\".";
        };
    }

    private boolean isBlankResponse(ProjectTemplateRequirementValueType valueType, ProjectRequirementResponseRequestDTO dto) {
        if (dto == null) {
            return true;
        }
        return switch (valueType) {
            case TEXT, LONG_TEXT, YES_NO_UNKNOWN -> trimToNull(dto.getTextValue()) == null;
            case INTEGER, DURATION -> dto.getIntegerValue() == null;
            case DECIMAL, MONEY -> dto.getDecimalValue() == null;
            case DATE -> dto.getDateValue() == null;
            case YES_NO -> dto.getBooleanValue() == null;
            case SINGLE_SELECT, MULTI_SELECT -> safeList(dto.getSelectedValues()).isEmpty();
        };
    }

    private void applyTypedValue(
            ProjectRequirementResponse response,
            ProjectTemplateRequirement requirement,
            ProjectRequirementResponseRequestDTO dto
    ) {
        String label = requirement.getLabel();

        switch (requirement.getValueType()) {
            case TEXT, LONG_TEXT -> response.setTextValue(trimToNull(dto.getTextValue()));
            case INTEGER -> {
                Long value = dto.getIntegerValue();
                ProjectTemplateRequirementValidation.validateNumber(
                        label, BigDecimal.valueOf(value), requirement.getMinValue(), requirement.getMaxValue(), true
                );
                response.setIntegerValue(value);
            }
            case DECIMAL, MONEY -> {
                BigDecimal value = dto.getDecimalValue();
                ProjectTemplateRequirementValidation.validateNumber(
                        label, value, requirement.getMinValue(), requirement.getMaxValue(), false
                );
                response.setDecimalValue(value);
                response.setUnit(trimToNull(firstNonNull(dto.getUnit(), requirement.getUnit())));
            }
            case DATE -> response.setDateValue(dto.getDateValue());
            case YES_NO -> response.setBooleanValue(dto.getBooleanValue());
            case YES_NO_UNKNOWN -> {
                String upper = trimToNull(dto.getTextValue());
                upper = upper == null ? null : upper.toUpperCase(Locale.ROOT);
                if (upper == null || !Set.of("YES", "NO", "UNKNOWN").contains(upper)) {
                    throw new IllegalArgumentException(label + " must be YES, NO, or UNKNOWN.");
                }
                response.setTextValue(upper);
            }
            case SINGLE_SELECT -> {
                List<String> selected = safeList(dto.getSelectedValues());
                if (selected.size() != 1) {
                    throw new IllegalArgumentException(label + " requires exactly one selected value.");
                }
                validateAllowedValues(label, selected, requirement.getAllowedValues());
                response.getSelectedValues().addAll(selected);
            }
            case MULTI_SELECT -> {
                List<String> selected = safeList(dto.getSelectedValues());
                validateAllowedValues(label, selected, requirement.getAllowedValues());
                response.getSelectedValues().addAll(selected);
            }
            case DURATION -> {
                Long value = dto.getIntegerValue();
                if (value < 0) {
                    throw new IllegalArgumentException(label + " must not be negative.");
                }
                String unit = trimToNull(firstNonNull(dto.getUnit(), requirement.getUnit()));
                if (unit == null || !DURATION_UNITS.contains(unit)) {
                    throw new IllegalArgumentException(label + " duration unit must be one of " + DURATION_UNITS + ".");
                }
                response.setIntegerValue(value);
                response.setUnit(unit);
            }
        }

        response.setProvenance(trimToNull(dto.getProvenance()));
    }

    private void validateAllowedValues(String label, List<String> selected, List<String> allowedValues) {
        Set<String> allowed = new HashSet<>(allowedValues == null ? List.of() : allowedValues);
        for (String value : selected) {
            if (!allowed.contains(value)) {
                throw new IllegalArgumentException(label + " contains a value that is not allowed: " + value);
            }
        }
    }

    /**
     * Parses an admin-configured {@code defaultValue}/{@code fixedValue} string
     * (as stored on {@link ProjectTemplateRequirement}) into the same typed
     * shape a submitted response uses, so both can flow through
     * {@link #applyTypedValue}.
     */
    private ProjectRequirementResponseRequestDTO parseConfiguredValue(ProjectTemplateRequirement requirement, String raw) {
        ProjectRequirementResponseRequestDTO dto = new ProjectRequirementResponseRequestDTO();
        String trimmed = raw.trim();
        try {
            switch (requirement.getValueType()) {
                case TEXT, LONG_TEXT -> dto.setTextValue(trimmed);
                case INTEGER -> dto.setIntegerValue(Long.valueOf(trimmed));
                case DECIMAL, MONEY -> dto.setDecimalValue(new BigDecimal(trimmed));
                case DATE -> dto.setDateValue(LocalDate.parse(trimmed));
                case YES_NO -> dto.setBooleanValue(parseYesNo(trimmed));
                case YES_NO_UNKNOWN -> dto.setTextValue(trimmed.toUpperCase(Locale.ROOT));
                case SINGLE_SELECT, MULTI_SELECT -> dto.setSelectedValues(splitConfiguredValues(trimmed));
                case DURATION -> applyDurationString(dto, trimmed, requirement.getUnit());
            }
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException(
                    "The configured value for \"" + requirement.getLabel() + "\" is invalid: " + raw
            );
        }
        return dto;
    }

    private boolean parseYesNo(String value) {
        String upper = value.toUpperCase(Locale.ROOT);
        if (Set.of("YES", "TRUE").contains(upper)) {
            return true;
        }
        if (Set.of("NO", "FALSE").contains(upper)) {
            return false;
        }
        throw new IllegalArgumentException("must be YES or NO");
    }

    private void applyDurationString(ProjectRequirementResponseRequestDTO dto, String value, String fallbackUnit) {
        String[] parts = value.split("\\s+", 2);
        dto.setIntegerValue(Long.valueOf(parts[0]));
        dto.setUnit(parts.length > 1 ? parts[1] : fallbackUnit);
    }

    private List<String> splitConfiguredValues(String value) {
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.toList());
    }

    private List<ProjectRequirementResponseRequestDTO> safeResponses(List<ProjectRequirementResponseRequestDTO> dtos) {
        return dtos == null ? List.of() : dtos;
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }

    private String firstNonNull(String a, String b) {
        return a != null ? a : b;
    }

    // -------------------------------------------------------------------
    // Membership / access
    // -------------------------------------------------------------------

    private void validateMembershipRemoval(
            Project project,
            Set<Dataset> nextDatasets,
            Set<Recipient> nextRecipients
    ) {
        Set<Long> nextDatasetIds = nextDatasets.stream()
                .map(Dataset::getId)
                .collect(Collectors.toSet());
        Set<Long> nextRecipientIds = nextRecipients.stream()
                .map(Recipient::getId)
                .collect(Collectors.toSet());

        Set<Long> removedDatasetIds = project.getDatasets().stream()
                .map(Dataset::getId)
                .filter(datasetId -> !nextDatasetIds.contains(datasetId))
                .collect(Collectors.toSet());
        Set<Long> removedRecipientIds = project.getRecipients().stream()
                .map(Recipient::getId)
                .filter(recipientId -> !nextRecipientIds.contains(recipientId))
                .collect(Collectors.toSet());

        if (removedDatasetIds.isEmpty() && removedRecipientIds.isEmpty()) {
            return;
        }

        for (DataSharingActivity activity : project.getDataSharingActivities()) {
            Long activityDatasetId = activity.getDatasetAssessment() != null
                    && activity.getDatasetAssessment().getDataset() != null
                    ? activity.getDatasetAssessment().getDataset().getId()
                    : null;
            if (activityDatasetId != null && removedDatasetIds.contains(activityDatasetId)) {
                throw new IllegalArgumentException(
                        "Cannot remove dataset " + activityDatasetId
                                + " because data sharing activity " + activity.getId() + " uses it."
                );
            }

            Long activityRecipientId = activity.getRecipientAssessment() != null
                    && activity.getRecipientAssessment().getRecipient() != null
                    ? activity.getRecipientAssessment().getRecipient().getId()
                    : null;
            if (activityRecipientId != null && removedRecipientIds.contains(activityRecipientId)) {
                throw new IllegalArgumentException(
                        "Cannot remove recipient " + activityRecipientId
                                + " because data sharing activity " + activity.getId() + " uses it."
                );
            }
        }
    }

    private void verifyProjectAccess(Project project, String username, boolean isAdmin) {
        if (isAdmin) {
            return;
        }

        if (!Objects.equals(project.getCreatorUsername(), username)
                && (project.getSharedUsernames() == null || !project.getSharedUsernames().contains(username))) {
            throw new SecurityException("No access to project: " + project.getId());
        }
    }

    private void verifyDatasetAccess(Dataset dataset, String username, boolean isAdmin) {
        if (isAdmin) {
            return;
        }

        if (!Objects.equals(dataset.getCreatorUsername(), username)
                && (dataset.getSharedUsernames() == null || !dataset.getSharedUsernames().contains(username))) {
            throw new SecurityException("No access to dataset: " + dataset.getId());
        }
    }

    private void verifyRecipientAccess(Recipient recipient, String username, boolean isAdmin) {
        if (isAdmin) {
            return;
        }

        if (!Objects.equals(recipient.getCreatorUsername(), username)
                && (recipient.getSharedUsernames() == null || !recipient.getSharedUsernames().contains(username))) {
            throw new SecurityException("No access to recipient: " + recipient.getId());
        }
    }

    private String requiredProjectName(String value) {
        String name = EntityNameNormalizer.normalizeForStorage(value);
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Project name is required.");
        }
        return name;
    }

    private void ensureProjectNameAvailable(String name, Long excludeId) {
        String normalizedName = EntityNameNormalizer.normalizeForComparison(name);
        boolean exists = excludeId == null
                ? projectRepository.existsByNormalizedName(normalizedName)
                : projectRepository.existsByNormalizedNameAndIdNot(normalizedName, excludeId);

        if (exists) {
            throw new EntityNameAlreadyExistsException("project", name);
        }
    }

    private Project saveProjectHandlingDuplicateName(Project project, String name) {
        try {
            return projectRepository.saveAndFlush(project);
        } catch (DataIntegrityViolationException ex) {
            if (isProjectNameUniqueConstraintViolation(ex)) {
                throw new EntityNameAlreadyExistsException("project", name);
            }
            throw ex;
        }
    }

    private boolean isProjectNameUniqueConstraintViolation(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = NestedExceptionUtils.getMostSpecificCause(ex);
        String message = mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage();
        return message != null && message.contains(NamedResourceConstraints.PROJECTS_NORMALIZED_NAME);
    }

    private List<Long> safeIds(List<Long> ids) {
        if (ids == null) {
            return Collections.emptyList();
        }
        return ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
