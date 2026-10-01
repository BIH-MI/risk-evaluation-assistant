package org.bihealth.mi.risk_assessment_api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BiConsumer;

import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableRepository;
import org.bihealth.mi.risk_assessment_api.repository.qid.QidDiscoveryConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.bihealth.mi.risk_assessment_api.service.AttributeScoringSystemService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Runs the real demo seeders ({@link DataLoader}, {@link DemoDatasetEvidenceSeeder}) against
 * in-memory repositories: save assigns an id once and stores the entity, findAll lists them. No
 * database is involved.
 */
public class InMemoryDemoSeed {

    private final AtomicLong ids = new AtomicLong(100);
    public final List<Dataset> datasets = new ArrayList<>();
    public final List<DatasetTable> tables = new ArrayList<>();
    public final List<DatasetAssessment> datasetAssessments = new ArrayList<>();
    public final List<DatasetTableAssessmentAttribute> attributeAssessments = new ArrayList<>();
    public final List<Recipient> recipients = new ArrayList<>();
    public final List<RecipientAssessment> recipientAssessments = new ArrayList<>();
    public final List<DataSharingActivity> activities = new ArrayList<>();
    public final List<Answer> answers = new ArrayList<>();
    public final DatasetTableRepository tableRepository = mock(DatasetTableRepository.class);
    private final DataLoader dataLoader;
    private final DemoDatasetEvidenceSeeder evidenceSeeder;

    public InMemoryDemoSeed(List<Configuration> frameworks) {
        RiskConfigurationRepository configurations = mock(RiskConfigurationRepository.class);
        when(configurations.findAll()).thenReturn(frameworks);
        AttributeScoringSystemService scoring = mock(AttributeScoringSystemService.class);
        AttributeScoringSystemVersion scoringVersion = new AttributeScoringSystemVersion();
        scoringVersion.setScoringSystem(new AttributeScoringSystem());
        scoringVersion.setDefaultIdentifiabilityThreshold(5.0);
        scoringVersion.setDefaultSensitivityThreshold(2.0);
        when(scoring.getDefaultActiveVersion()).thenReturn(scoringVersion);

        DatasetRepository datasetRepository = store(mock(DatasetRepository.class), datasets, Dataset::setId);
        dataLoader = new DataLoader(
                mock(QuestionRepository.class),
                store(mock(AnswerRepository.class), answers, Answer::setId),
                datasetRepository,
                store(tableRepository, tables, DatasetTable::setId),
                store(mock(DatasetAssessmentRepository.class), datasetAssessments, DatasetAssessment::setId),
                store(mock(DatasetTableAssessmentRepository.class), new ArrayList<DatasetTableAssessment>(),
                        DatasetTableAssessment::setId),
                store(mock(DatasetTableAssessmentAttributeRepository.class), attributeAssessments,
                        DatasetTableAssessmentAttribute::setId),
                store(mock(RecipientRepository.class), recipients, Recipient::setId),
                store(mock(RecipientAssessmentRepository.class), recipientAssessments, RecipientAssessment::setId),
                store(mock(DataSharingActivityRepository.class), activities, DataSharingActivity::setId),
                configurations,
                scoring);
        ReflectionTestUtils.setField(dataLoader, "loadSampleData", true);
        evidenceSeeder = new DemoDatasetEvidenceSeeder(datasetRepository, mock(QidDiscoveryConfigurationRepository.class));
        ReflectionTestUtils.setField(evidenceSeeder, "loadSampleData", true);
        when(tableRepository.findRetainedQidCombinations(any())).thenAnswer(invocation -> tables.stream()
                .flatMap(table -> table.getQidCombinations().stream())
                .toList());
    }

    public void run() throws Exception {
        dataLoader.run();
        evidenceSeeder.run();
    }

    public DataSharingActivity activity(String name) {
        return activities.stream().filter(activity -> activity.getName().equals(name)).findFirst().orElseThrow();
    }

    public List<Answer> answersOf(Long assessmentId) {
        return answers.stream()
                .filter(answer -> answer.getAssessment() != null && assessmentId.equals(answer.getAssessment().getId()))
                .toList();
    }

    public List<DatasetTableAssessmentAttribute> attributeAssessmentsOf(Long datasetAssessmentId) {
        return attributeAssessments.stream()
                .filter(attribute -> datasetAssessmentId.equals(attribute.getAssessment().getDatasetAssessment().getId()))
                .toList();
    }

    private <T, R extends JpaRepository<T, Long>> R store(R repository, List<T> entities, BiConsumer<T, Long> setId) {
        when(repository.save(any())).thenAnswer(invocation -> {
            T entity = invocation.getArgument(0);
            if (entities.stream().noneMatch(existing -> existing == entity)) {
                setId.accept(entity, ids.getAndIncrement());
                entities.add(entity);
            }
            return entity;
        });
        when(repository.findAll()).thenAnswer(invocation -> new ArrayList<>(entities));
        return repository;
    }
}
