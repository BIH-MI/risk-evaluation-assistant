package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.activity.DataSharingActivityRequestDTO;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataSharingActivityServiceTest {

    @Mock
    private DataSharingActivityRepository repository;

    @Mock
    private DatasetAssessmentRepository datasetAssessmentRepo;

    @Mock
    private DatasetTableAssessmentRepository datasetTableAssessmentRepo;

    @Mock
    private DatasetTableAssessmentAttributeRepository datasetTableAssessmentAttributeRepo;

    @Mock
    private RecipientAssessmentRepository recipientAssessmentRepo;

    @Mock
    private AttributeScoringSystemService attributeScoringSystemService;

    @Mock
    private ProjectService projectService;

    private DataSharingActivityService service;

    @BeforeEach
    void setUp() {
        service = new DataSharingActivityService(
                repository,
                datasetAssessmentRepo,
                datasetTableAssessmentRepo,
                datasetTableAssessmentAttributeRepo,
                recipientAssessmentRepo,
                attributeScoringSystemService,
                projectService
        );
    }

    @Test
    void createRejectsMissingProject() {
        DataSharingActivityRequestDTO request = new DataSharingActivityRequestDTO();
        request.setName("Activity");
        request.setDatasetAssessmentId(1L);
        request.setRecipientAssessmentId(2L);

        when(repository.existsByNormalizedName(anyString())).thenReturn(false);
        when(datasetAssessmentRepo.findById(1L)).thenReturn(Optional.of(new DatasetAssessment()));
        when(recipientAssessmentRepo.findById(2L)).thenReturn(Optional.of(new RecipientAssessment()));

        assertThatThrownBy(() -> service.create(request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Project is required");

        verify(projectService, never()).validateActivityMembership(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq("alice"),
                eq(false)
        );
    }

    @Test
    void updateRejectsMissingProjectForLegacyActivity() {
        DataSharingActivity existing = new DataSharingActivity();
        existing.setId(5L);
        existing.setCreatorUsername("alice");
        existing.setName("Legacy Activity");
        existing.setDatasetAssessment(new DatasetAssessment());
        existing.setRecipientAssessment(new RecipientAssessment());

        DataSharingActivityRequestDTO request = new DataSharingActivityRequestDTO();
        request.setName("Legacy Activity");

        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.existsByNormalizedNameAndIdNot(anyString(), eq(5L))).thenReturn(false);

        assertThatThrownBy(() -> service.update(5L, request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Project is required");
    }
}
