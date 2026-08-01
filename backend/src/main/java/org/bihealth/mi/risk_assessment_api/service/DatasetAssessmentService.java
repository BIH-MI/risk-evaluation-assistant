package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetTableAssessmentAttributeRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetTableAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for dataset-level assessment workflows.
 *
 * <p>Dataset assessments combine framework questionnaire answers with
 * table/attribute metadata. These records provide the data-side inputs for the
 * risk calculation, including categories such as IMPACT or DATA_RISK.</p>
 */
@Service
@Transactional
public class DatasetAssessmentService {

    // Repositories needed to load parent datasets, configurations, questions,
    // and dataset schema references while building assessment aggregates.
    private final DatasetAssessmentRepository assessmentRepo;
    private final DatasetRepository datasetRepo;
    private final RiskConfigurationRepository configRepo;
    private final QuestionRepository questionRepo;
    private final DatasetTableRepository tableRepo;
    private final DatasetTableAttributeRepository attributeRepo;

    /**
     * Creates the service with the repositories required for assessment creation
     * and nested table/attribute conversion.
     */
    @Autowired
    public DatasetAssessmentService(
            DatasetAssessmentRepository assessmentRepo,
            DatasetRepository datasetRepo,
            RiskConfigurationRepository configRepo,
            QuestionRepository questionRepo,
            DatasetTableRepository tableRepo,
            DatasetTableAttributeRepository attributeRepo
    ) {
        this.assessmentRepo = assessmentRepo;
        this.datasetRepo = datasetRepo;
        this.configRepo = configRepo;
        this.questionRepo = questionRepo;
        this.tableRepo = tableRepo;
        this.attributeRepo = attributeRepo;
    }

    /**
     * INTERNAL HELPER: Verifies if the user is an admin, the creator, or in the shared usernames list.
     */
    private void verifyDatasetAccess(Dataset dataset, String username, boolean isAdmin) {
        // Admins bypass dataset ownership and sharing checks.
        if (isAdmin) return;

        if (!dataset.getCreatorUsername().equals(username) &&
                (dataset.getSharedUsernames() == null || !dataset.getSharedUsernames().contains(username))) {
            throw new SecurityException("No access to dataset: " + dataset.getId());
        }
    }

    /**
     * Retrieves all assessments. Admins see all, regular users see owned or shared.
     */
    public List<DatasetAssessmentResponseDTO> findAssessments(String username, boolean isAdmin) {
        if (isAdmin) {
            return assessmentRepo.findAll().stream()
                    .map(DatasetAssessmentResponseDTO::new)
                    .collect(Collectors.toList());
        }

        // Visibility is inherited from the parent dataset. Use a set so datasets
        // that are both owned and shared are not processed twice.
        Set<Dataset> combined = new LinkedHashSet<>(datasetRepo.findByCreatorUsername(username));
        combined.addAll(datasetRepo.findBySharedUsernamesContains(username));

        return combined.stream()
                .flatMap(ds -> ds.getDatasetAssessments().stream())
                .map(DatasetAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all DatasetAssessments for a specific dataset, ensuring access rights.
     */
    public List<DatasetAssessmentResponseDTO> getAssessmentsForDataset(Long datasetId, String username, boolean isAdmin) {
        Dataset ds = datasetRepo.findById(datasetId)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + datasetId));

        verifyDatasetAccess(ds, username, isAdmin);

        List<DatasetAssessment> assessments = assessmentRepo.findByDatasetId(datasetId);
        return assessments.stream()
                .map(DatasetAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a specific DatasetAssessment by ID, ensuring it belongs to the dataset and the user has access.
     */
    public DatasetAssessmentResponseDTO getDatasetAssessment(Long datasetId, Long assessmentId, String username, boolean isAdmin) {
        DatasetAssessment assessment = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        if (!assessment.getDataset().getId().equals(datasetId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " does not belong to dataset " + datasetId);
        }

        verifyDatasetAccess(assessment.getDataset(), username, isAdmin);

        return new DatasetAssessmentResponseDTO(assessment);
    }

    /**
     * Creates a new DatasetAssessment for a given dataset.
     *
     * <p>The selected configuration is marked active once it is used. Answers
     * are validated against their questions so an option from another question
     * cannot be attached accidentally.</p>
     */
    public DatasetAssessmentResponseDTO createDatasetAssessment(Long datasetId, DatasetAssessmentRequestDTO dto, String username, boolean isAdmin) {
        Dataset dataset = datasetRepo.findById(datasetId)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + datasetId));

        // Users can assess datasets they own or that are shared with them.
        verifyDatasetAccess(dataset, username, isAdmin);

        Configuration config = configRepo.findById(dto.getConfigurationId())
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + dto.getConfigurationId()));

        if (!config.isActive()) {
            config.setActive(true);
            configRepo.save(config);
        }

        // Build the assessment aggregate manually because answers and table
        // metadata require validating referenced IDs against existing entities.
        DatasetAssessment assessment = new DatasetAssessment();
        assessment.setDataset(dataset);
        assessment.setConfiguration(config);
        assessment.setName(dto.getName());
        assessment.setDescription(dto.getDescription());
        assessment.setCreatorUsername(username);

        // Create answers and ensure the selected option belongs to the loaded question.
        if (dto.getAnswers() != null) {
            for (AnswerRequestDTO ansDto : dto.getAnswers()) {
                Question q = questionRepo.findById(ansDto.getQuestionId())
                        .orElseThrow(() -> new EntityNotFoundException("Question not found: " + ansDto.getQuestionId()));

                QuestionOption selectedOption = q.getOptions().stream()
                        .filter(opt -> opt.getId().equals(ansDto.getSelectedOptionId()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Invalid option ID: " + ansDto.getSelectedOptionId() + " for question: " + q.getId()));

                Answer ans = new Answer();
                ans.setAssessment(assessment);
                ans.setQuestion(q);
                ans.setSelectedOption(selectedOption);
                assessment.getAnswers().add(ans);
            }
        }

        // Create optional table and attribute risk metadata under the assessment.
        if (dto.getTableAssessments() != null) {
            for (DatasetTableAssessmentRequestDTO tDto : dto.getTableAssessments()) {
                DatasetTable table = tableRepo.findById(tDto.getTableId())
                        .orElseThrow(() -> new EntityNotFoundException("Table not found: " + tDto.getTableId()));

                DatasetTableAssessment ta = new DatasetTableAssessment();
                ta.setDatasetAssessment(assessment);
                ta.setTable(table);

                if (tDto.getAttributes() != null) {
                    for (DatasetTableAssessmentAttributeRequestDTO aDto : tDto.getAttributes()) {
                        ta.getAttributes().add(aDto.toEntity(ta, attributeRepo));
                    }
                }
                assessment.getTableAssessments().add(ta);
            }
        }

        DatasetAssessment saved = assessmentRepo.save(assessment);
        return new DatasetAssessmentResponseDTO(saved);
    }

    /**
     * Updates an existing DatasetAssessment.
     *
     * <p>The update is additive/upsert-oriented for answers and table metadata:
     * existing rows are updated when present, and missing rows are created.</p>
     */
    public DatasetAssessmentResponseDTO updateDatasetAssessment(Long datasetId, Long assessmentId, DatasetAssessmentRequestDTO dto, String username, boolean isAdmin) {
        DatasetAssessment existing = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        if (!existing.getDataset().getId().equals(datasetId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " does not belong to dataset " + datasetId);
        }

        // Dataset access controls assessment edit rights.
        verifyDatasetAccess(existing.getDataset(), username, isAdmin);

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());

        // Update existing answers by question ID or create missing answers.
        if (dto.getAnswers() != null) {
            Map<Long, Answer> answerMap = existing.getAnswers().stream()
                    .collect(Collectors.toMap(a -> a.getQuestion().getId(), Function.identity()));

            for (AnswerRequestDTO aDto : dto.getAnswers()) {
                Answer ans = answerMap.get(aDto.getQuestionId());

                Question q = questionRepo.findById(aDto.getQuestionId())
                        .orElseThrow(() -> new EntityNotFoundException("Question not found: " + aDto.getQuestionId()));

                QuestionOption selectedOption = q.getOptions().stream()
                        .filter(opt -> opt.getId().equals(aDto.getSelectedOptionId()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Invalid option ID: " + aDto.getSelectedOptionId() + " for question: " + q.getId()));

                if (ans == null) {
                    ans = new Answer();
                    ans.setAssessment(existing);
                    ans.setQuestion(q);
                    ans.setSelectedOption(selectedOption);
                    existing.getAnswers().add(ans);
                } else {
                    ans.setSelectedOption(selectedOption);
                }
            }
        }

        // Update table assessments by table ID, then update child attributes by attribute ID.
        if (dto.getTableAssessments() != null) {
            Map<Long, DatasetTableAssessment> taMap = existing.getTableAssessments().stream()
                    .collect(Collectors.toMap(ta -> ta.getTable().getId(), Function.identity()));

            for (DatasetTableAssessmentRequestDTO tDto : dto.getTableAssessments()) {
                DatasetTableAssessment ta = taMap.get(tDto.getTableId());
                if (ta == null) {
                    DatasetTable table = tableRepo.findById(tDto.getTableId())
                            .orElseThrow(() -> new EntityNotFoundException("Table not found: " + tDto.getTableId()));
                    ta = new DatasetTableAssessment();
                    ta.setDatasetAssessment(existing);
                    ta.setTable(table);
                    existing.getTableAssessments().add(ta);
                }

                Map<Long, DatasetTableAssessmentAttribute> attrMap = ta.getAttributes().stream()
                        .collect(Collectors.toMap(a -> a.getAttribute().getId(), Function.identity()));

                if (tDto.getAttributes() != null) {
                    for (DatasetTableAssessmentAttributeRequestDTO aDto : tDto.getAttributes()) {
                        DatasetTableAssessmentAttribute attr = attrMap.get(aDto.getAttributeId());
                        if (attr == null) {
                            ta.getAttributes().add(aDto.toEntity(ta, attributeRepo));
                        } else {
                            attr.setDirectIdentifier(aDto.getIsDirectIdentifier());
                            attr.setSensitivity(aDto.getSensitivity());
                            attr.setReplicability(aDto.getReplicability());
                            attr.setAvailability(aDto.getAvailability());
                            attr.setDistinguishability(aDto.getDistinguishability());
                        }
                    }
                }
            }
        }

        DatasetAssessment updated = assessmentRepo.save(existing);
        return new DatasetAssessmentResponseDTO(updated);
    }

    /**
     * Deletes a DatasetAssessment by its ID.
     */
    public void deleteDatasetAssessment(Long datasetId, Long assessmentId, String username, boolean isAdmin) {
        DatasetAssessment existing = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));
        if (!existing.getDataset().getId().equals(datasetId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " not in dataset " + datasetId);
        }

        // Dataset access controls assessment deletion.
        verifyDatasetAccess(existing.getDataset(), username, isAdmin);

        assessmentRepo.delete(existing);
    }
}
