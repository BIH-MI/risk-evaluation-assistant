package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.activity.ActivityRequirementsDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.activity.DataSharingActivityRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.activity.DataSharingActivityResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.AnalysisDataForm;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseVersionRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
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

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
    private MitigationKnowledgeBaseService knowledgeBaseService;
    @Mock
    private MitigationKnowledgeBaseVersionService knowledgeBaseVersionService;
    @Mock
    private MitigationKnowledgeBaseVersionRepository knowledgeBaseVersionRepository;

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
                knowledgeBaseService,
                knowledgeBaseVersionService,
                knowledgeBaseVersionRepository
        );
    }

    @Test
    void createRejectsAssessmentsWithoutSourceResources() {
        DataSharingActivityRequestDTO request = request("Activity");
        request.setDatasetAssessmentId(1L);
        request.setRecipientAssessmentId(2L);

        when(repository.existsByNormalizedName(anyString())).thenReturn(false);
        when(datasetAssessmentRepo.findById(1L)).thenReturn(Optional.of(new DatasetAssessment()));
        when(recipientAssessmentRepo.findById(2L)).thenReturn(Optional.of(new RecipientAssessment()));

        assertThatThrownBy(() -> service.create(request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Dataset and Recipient Assessments are required");
    }

    @Test
    void createRequiresAccessToTheUnderlyingDataset() {
        DataSharingActivityRequestDTO request = request("Activity");
        request.setDatasetAssessmentId(1L);
        request.setRecipientAssessmentId(2L);

        when(repository.existsByNormalizedName(anyString())).thenReturn(false);
        when(datasetAssessmentRepo.findById(1L)).thenReturn(Optional.of(datasetAssessment("bob")));
        when(recipientAssessmentRepo.findById(2L)).thenReturn(Optional.of(recipientAssessment("alice")));

        assertThatThrownBy(() -> service.create(request, "alice", false))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("No access to dataset");
    }

    @Test
    void createStoresRequirementsAndPinsTheDefaultKnowledgeBaseVersion() {
        DataSharingActivityRequestDTO request = request("Activity");
        request.setDatasetAssessmentId(1L);
        request.setRecipientAssessmentId(2L);
        request.setSharingPurpose("Regression analysis of disease severity");
        ActivityRequirementsDTO requirements = new ActivityRequirementsDTO();
        requirements.setAvailableBudget(new BigDecimal("5000"));
        requirements.setBudgetCurrency("EUR");
        requirements.setAnalysisDataNeeded(Set.of(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA));
        requirements.setSharingArrangement(MitigationSharingArrangement.CONTROLLED_TRANSFER);
        request.setRequirements(requirements);

        MitigationKnowledgeBase defaultKnowledgeBase = knowledgeBase(3L);
        MitigationKnowledgeBaseVersion current = version(9L, defaultKnowledgeBase);
        when(repository.existsByNormalizedName(anyString())).thenReturn(false);
        when(datasetAssessmentRepo.findById(1L)).thenReturn(Optional.of(datasetAssessment("alice")));
        when(recipientAssessmentRepo.findById(2L)).thenReturn(Optional.of(recipientAssessment("alice")));
        when(knowledgeBaseService.resolveDefaultActiveKnowledgeBase()).thenReturn(defaultKnowledgeBase);
        when(knowledgeBaseVersionService.getCurrentVersion(defaultKnowledgeBase)).thenReturn(current);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DataSharingActivityResponseDTO created = service.create(request, "alice", false);

        assertThat(created.getSharingPurpose()).isEqualTo("Regression analysis of disease severity");
        assertThat(created.getMitigationKnowledgeBaseVersionId()).isEqualTo(9L);
        assertThat(created.getRequirements().getAvailableBudget()).isEqualByComparingTo("5000");
        assertThat(created.getRequirements().getAnalysisDataNeeded()).containsExactly(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA);
        // The deprecated code is stored as its current equivalent.
        assertThat(created.getRequirements().getSharingArrangement())
                .isEqualTo(MitigationSharingArrangement.CONTROLLED_DATA_TRANSFER);
    }

    @Test
    void updateRejectsAssessmentsWithoutSourceResources() {
        DataSharingActivity existing = existingActivity();
        existing.setDatasetAssessment(new DatasetAssessment());
        existing.setRecipientAssessment(new RecipientAssessment());

        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.existsByNormalizedNameAndIdNot(anyString(), eq(5L))).thenReturn(false);

        assertThatThrownBy(() -> service.update(5L, request("Legacy Activity"), "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Dataset and Recipient Assessments are required");
    }

    @Test
    void updateKeepsTheKnowledgeBasePinAndUpdatesRequirementsInPlace() {
        DataSharingActivity existing = existingActivity();
        MitigationKnowledgeBaseVersion historical = version(7L, knowledgeBase(3L));
        existing.setMitigationKnowledgeBaseVersion(historical);
        existing.getRequirements().getAnalysisDataNeeded().add(AnalysisDataForm.AGGREGATE_DATA);
        Set<AnalysisDataForm> persistedSet = existing.getRequirements().getAnalysisDataNeeded();

        DataSharingActivityRequestDTO request = request("Legacy Activity");
        ActivityRequirementsDTO requirements = new ActivityRequirementsDTO();
        requirements.setAnalysisDataNeeded(Set.of(AnalysisDataForm.SYNTHETIC_DATA));
        request.setRequirements(requirements);

        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.existsByNormalizedNameAndIdNot(anyString(), eq(5L))).thenReturn(false);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.update(5L, request, "alice", false);

        assertThat(existing.getMitigationKnowledgeBaseVersion()).isSameAs(historical);
        assertThat(existing.getRequirements().getAnalysisDataNeeded())
                .isSameAs(persistedSet)
                .containsExactly(AnalysisDataForm.SYNTHETIC_DATA);
    }

    @Test
    void updateRejectsAKnowledgeBaseVersionThatIsNotCurrent() {
        DataSharingActivity existing = existingActivity();
        existing.setMitigationKnowledgeBaseVersion(version(7L, knowledgeBase(3L)));
        MitigationKnowledgeBase knowledgeBase = knowledgeBase(4L);
        MitigationKnowledgeBaseVersion outdated = version(8L, knowledgeBase);

        DataSharingActivityRequestDTO request = request("Legacy Activity");
        request.setMitigationKnowledgeBaseVersionId(8L);

        when(repository.findById(5L)).thenReturn(Optional.of(existing));
        when(repository.existsByNormalizedNameAndIdNot(anyString(), eq(5L))).thenReturn(false);
        when(knowledgeBaseVersionRepository.findById(8L)).thenReturn(Optional.of(outdated));
        when(knowledgeBaseService.resolveKnowledgeBaseForPlanning(4L)).thenReturn(knowledgeBase);
        when(knowledgeBaseVersionService.getCurrentVersion(knowledgeBase)).thenReturn(version(9L, knowledgeBase));

        assertThatThrownBy(() -> service.update(5L, request, "alice", false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only the current version");
    }

    @Test
    void sharedUsersCannotUpdateAnActivity() {
        DataSharingActivity existing = existingActivity();
        existing.getSharedUsernames().add("bob");
        when(repository.findById(5L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.update(5L, request("Legacy Activity"), "bob", false))
                .isInstanceOf(SecurityException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    private DataSharingActivityRequestDTO request(String name) {
        DataSharingActivityRequestDTO request = new DataSharingActivityRequestDTO();
        request.setName(name);
        return request;
    }

    private DataSharingActivity existingActivity() {
        DataSharingActivity existing = new DataSharingActivity();
        existing.setId(5L);
        existing.setCreatorUsername("alice");
        existing.setName("Legacy Activity");
        existing.setDatasetAssessment(datasetAssessment("alice"));
        existing.setRecipientAssessment(recipientAssessment("alice"));
        return existing;
    }

    private DatasetAssessment datasetAssessment(String datasetOwner) {
        Dataset dataset = new Dataset();
        dataset.setId(10L);
        dataset.setCreatorUsername(datasetOwner);
        DatasetAssessment assessment = new DatasetAssessment();
        assessment.setId(1L);
        assessment.setDataset(dataset);
        assessment.setAttributeScoringSystemVersion(new AttributeScoringSystemVersion());
        return assessment;
    }

    private RecipientAssessment recipientAssessment(String recipientOwner) {
        Recipient recipient = new Recipient();
        recipient.setId(20L);
        recipient.setCreatorUsername(recipientOwner);
        RecipientAssessment assessment = new RecipientAssessment();
        assessment.setId(2L);
        assessment.setRecipient(recipient);
        return assessment;
    }

    private MitigationKnowledgeBase knowledgeBase(Long id) {
        MitigationKnowledgeBase knowledgeBase = new MitigationKnowledgeBase();
        knowledgeBase.setId(id);
        knowledgeBase.setName("Knowledge Base " + id);
        return knowledgeBase;
    }

    private MitigationKnowledgeBaseVersion version(Long id, MitigationKnowledgeBase knowledgeBase) {
        MitigationKnowledgeBaseVersion version = new MitigationKnowledgeBaseVersion();
        version.setId(id);
        version.setKnowledgeBase(knowledgeBase);
        return version;
    }
}
