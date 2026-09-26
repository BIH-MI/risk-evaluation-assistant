package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequirementResponseRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.project.ProjectResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.ProjectTemplateRequirementValueType;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplate;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.locks.EntityLockRepository;
import org.bihealth.mi.risk_assessment_api.repository.project.ProjectRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private DatasetRepository datasetRepository;

    @Mock
    private RecipientRepository recipientRepository;

    @Mock
    private EntityLockRepository lockRepository;

    @Mock
    private ProjectTemplateService projectTemplateService;

    private ProjectService service;

    @BeforeEach
    void setUp() {
        service = new ProjectService(
                projectRepository,
                datasetRepository,
                recipientRepository,
                lockRepository,
                projectTemplateService
        );
    }

    @Test
    void createProjectRejectsMissingRequiredResponse() {
        ProjectTemplateRequirement requirement = requirement(
                1L, "scientificObjective", "Scientific Objective",
                ProjectTemplateRequirementValueType.LONG_TEXT, true, null, null, null, null
        );
        ProjectTemplateVersion version = templateVersion(requirement);

        when(projectRepository.existsByNormalizedName(anyString())).thenReturn(false);
        when(projectTemplateService.getSelectedActiveVersion(10L)).thenReturn(version);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName("Cancer Study");
        request.setTemplateVersionId(10L);
        request.setRequirementResponses(List.of());

        assertThatThrownBy(() -> service.createProject(request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Enter the scientific objective.");
    }

    @Test
    void createProjectRejectsOutOfRangeNumericResponse() {
        ProjectTemplateRequirement requirement = requirement(
                1L, "maximumParticipantLossPercent", "Maximum Participant Loss",
                ProjectTemplateRequirementValueType.DECIMAL, true,
                BigDecimal.ZERO, BigDecimal.valueOf(100), null, null
        );
        ProjectTemplateVersion version = templateVersion(requirement);

        when(projectRepository.existsByNormalizedName(anyString())).thenReturn(false);
        when(projectTemplateService.getSelectedActiveVersion(10L)).thenReturn(version);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName("Cancer Study");
        request.setTemplateVersionId(10L);
        request.setRequirementResponses(List.of(response(1L, r -> r.setDecimalValue(BigDecimal.valueOf(150)))));

        assertThatThrownBy(() -> service.createProject(request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("less than or equal to");
    }

    @Test
    void createProjectRejectsResponseForRequirementOutsideTemplate() {
        ProjectTemplateRequirement requirement = requirement(
                1L, "scientificObjective", "Scientific Objective",
                ProjectTemplateRequirementValueType.LONG_TEXT, false, null, null, null, null
        );
        ProjectTemplateVersion version = templateVersion(requirement);

        when(projectRepository.existsByNormalizedName(anyString())).thenReturn(false);
        when(projectTemplateService.getSelectedActiveVersion(10L)).thenReturn(version);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName("Cancer Study");
        request.setTemplateVersionId(10L);
        request.setRequirementResponses(List.of(response(999L, r -> r.setTextValue("forged"))));

        assertThatThrownBy(() -> service.createProject(request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not part of the selected Project Template version");
    }

    @Test
    void createProjectForcesFixedValueRegardlessOfSubmission() {
        ProjectTemplateRequirement requirement = requirement(
                1L, "acceptableSharingArrangements", "Acceptable Sharing Arrangements",
                ProjectTemplateRequirementValueType.YES_NO_UNKNOWN, true, null, null, null, "YES"
        );
        ProjectTemplateVersion version = templateVersion(requirement);

        when(projectRepository.existsByNormalizedName(anyString())).thenReturn(false);
        when(projectTemplateService.getSelectedActiveVersion(10L)).thenReturn(version);
        when(projectRepository.saveAndFlush(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName("Cancer Study");
        request.setTemplateVersionId(10L);
        request.setRequirementResponses(List.of(response(1L, r -> r.setTextValue("NO"))));

        ProjectResponseDTO result = service.createProject(request, "alice", false);

        assertThat(result.getRequirementResponses()).hasSize(1);
        assertThat(result.getRequirementResponses().get(0).getTextValue()).isEqualTo("YES");
    }

    @Test
    void updateProjectRejectsRemovingDatasetUsedByExistingActivity() {
        Dataset dataset = dataset(1L, "alice");
        Recipient recipient = recipient(2L, "alice");
        Project project = project(5L, "alice");
        project.getDatasets().add(dataset);
        project.getRecipients().add(recipient);

        DatasetAssessment datasetAssessment = new DatasetAssessment();
        datasetAssessment.setDataset(dataset);
        RecipientAssessment recipientAssessment = new RecipientAssessment();
        recipientAssessment.setRecipient(recipient);

        DataSharingActivity activity = new DataSharingActivity();
        activity.setId(99L);
        activity.setProject(project);
        activity.setDatasetAssessment(datasetAssessment);
        activity.setRecipientAssessment(recipientAssessment);
        project.getDataSharingActivities().add(activity);

        when(projectRepository.findById(5L)).thenReturn(Optional.of(project));
        when(projectRepository.existsByNormalizedNameAndIdNot(anyString(), eq(5L))).thenReturn(false);
        when(recipientRepository.findById(2L)).thenReturn(Optional.of(recipient));

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName("Cancer Study");
        request.setDatasetIds(List.of());
        request.setRecipientIds(List.of(2L));

        assertThatThrownBy(() -> service.updateProject(5L, request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("data sharing activity 99 uses it");
    }

    @Test
    void updateProjectRejectsResponsesForLegacyProjectWithoutTemplate() {
        Project project = project(5L, "alice");

        when(projectRepository.findById(5L)).thenReturn(Optional.of(project));
        when(projectRepository.existsByNormalizedNameAndIdNot(anyString(), eq(5L))).thenReturn(false);

        ProjectRequestDTO request = new ProjectRequestDTO();
        request.setName("Cancer Study");
        request.setDatasetIds(List.of());
        request.setRecipientIds(List.of());
        request.setRequirementResponses(List.of(response(1L, r -> r.setTextValue("value"))));

        assertThatThrownBy(() -> service.updateProject(5L, request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("legacy Project has no Project Template");
    }

    @Test
    void deleteProjectRejectsProjectWithExistingActivities() {
        Project project = project(5L, "alice");
        DataSharingActivity activity = new DataSharingActivity();
        activity.setId(99L);
        activity.setProject(project);
        project.getDataSharingActivities().add(activity);

        when(projectRepository.findById(5L)).thenReturn(Optional.of(project));

        assertThatThrownBy(() -> service.deleteProject(5L, "alice", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("contains Data Sharing Activities");

        verify(projectRepository, never()).delete(any(Project.class));
    }

    @Test
    void validateActivityMembershipRejectsDatasetOutsideProject() {
        Dataset dataset = dataset(1L, "alice");
        Recipient recipient = recipient(2L, "alice");
        Project project = project(5L, "alice");
        project.getRecipients().add(recipient);

        DatasetAssessment datasetAssessment = new DatasetAssessment();
        datasetAssessment.setDataset(dataset);
        RecipientAssessment recipientAssessment = new RecipientAssessment();
        recipientAssessment.setRecipient(recipient);

        assertThatThrownBy(() -> service.validateActivityMembership(
                project,
                datasetAssessment,
                recipientAssessment,
                "alice",
                false
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("is not a member of project");
    }

    private ProjectRequirementResponseRequestDTO response(
            Long requirementId,
            java.util.function.Consumer<ProjectRequirementResponseRequestDTO> customizer
    ) {
        ProjectRequirementResponseRequestDTO dto = new ProjectRequirementResponseRequestDTO();
        dto.setRequirementId(requirementId);
        customizer.accept(dto);
        return dto;
    }

    private ProjectTemplateVersion templateVersion(ProjectTemplateRequirement... requirements) {
        ProjectTemplate template = new ProjectTemplate();
        template.setId(100L);
        template.setName("Controlled Clinical Research");
        template.setActive(true);

        ProjectTemplateVersion version = new ProjectTemplateVersion();
        version.setId(10L);
        version.setName("Controlled Clinical Research");

        ProjectTemplateSection section = new ProjectTemplateSection();
        section.setId(1L);
        section.setTitle("Research Purpose");
        section.setDisplayOrder(1);
        for (ProjectTemplateRequirement requirement : requirements) {
            section.addRequirement(requirement);
        }

        version.addSection(section);
        template.addVersion(version);
        return version;
    }

    private ProjectTemplateRequirement requirement(
            Long id,
            String stableKey,
            String label,
            ProjectTemplateRequirementValueType valueType,
            boolean required,
            BigDecimal minValue,
            BigDecimal maxValue,
            List<String> allowedValues,
            String fixedValue
    ) {
        ProjectTemplateRequirement requirement = new ProjectTemplateRequirement();
        requirement.setId(id);
        requirement.setStableKey(stableKey);
        requirement.setLabel(label);
        requirement.setDisplayOrder(1);
        requirement.setValueType(valueType);
        requirement.setRequired(required);
        requirement.setConstraintType(ProjectTemplateRequirementConstraintType.HARD_CONSTRAINT);
        requirement.setMinValue(minValue);
        requirement.setMaxValue(maxValue);
        if (allowedValues != null) {
            requirement.getAllowedValues().addAll(allowedValues);
        }
        requirement.setFixedValue(fixedValue);
        return requirement;
    }

    private Project project(Long id, String creatorUsername) {
        Project project = new Project();
        project.setId(id);
        project.setName("Cancer Study");
        project.setCreatorUsername(creatorUsername);
        return project;
    }

    private Dataset dataset(Long id, String creatorUsername) {
        Dataset dataset = new Dataset();
        dataset.setId(id);
        dataset.setName("Clinical Dataset");
        dataset.setCreatorUsername(creatorUsername);
        return dataset;
    }

    private Recipient recipient(Long id, String creatorUsername) {
        Recipient recipient = new Recipient();
        recipient.setId(id);
        recipient.setName("Research Lab");
        recipient.setOrganization("Research Lab");
        recipient.setCreatorUsername(creatorUsername);
        return recipient;
    }

}
