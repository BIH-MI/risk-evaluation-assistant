package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetTableAssessmentAttributeRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetTableAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.AnswerOption;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.*;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service class for managing all business logic for DatasetAssessment entities.
 * This includes creating, retrieving, updating, and deleting assessments,
 * as well as handling their nested questionnaire answers and table assessments.
 */
@Service
@Transactional
public class DatasetAssessmentService {

    private final QuestionRepository questionRepo;
    private final DatasetTableRepository tableRepo;

    private final DatasetRepository datasetRepository;
    private final DatasetAssessmentRepository assessmentRepo;
    private final DatasetTableAttributeRepository attributeRepo;

    public DatasetAssessmentService(
            QuestionRepository questionRepo,
            DatasetTableRepository tableRepo,
            DatasetRepository datasetRepository,
            DatasetAssessmentRepository assessmentRepo,
            DatasetTableAttributeRepository attributeRepo
    ) {
        this.questionRepo = questionRepo;
        this.tableRepo = tableRepo;
        this.datasetRepository = datasetRepository;
        this.assessmentRepo = assessmentRepo;
        this.attributeRepo = attributeRepo;
    }

    /**
     * Finds all dataset assessments for all datasets a user can access.
     *
     * @param username The username of the user.
     * @return A list of DatasetAssessmentResponseDTOs.
     */
    @Transactional(readOnly = true)
    public List<DatasetAssessmentResponseDTO> findAssessmentsByUsername(String username) {
        Set<Dataset> combined = new LinkedHashSet<>(datasetRepository.findByCreatorUsername(username));
        combined.addAll(datasetRepository.findBySharedUsernamesContains(username));
        return combined.stream()
                .flatMap(ds -> ds.getDatasetAssessments().stream())
                .map(DatasetAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Finds all assessments for a single, specific dataset.
     *
     * @param username  The username for the authorization check.
     * @param datasetId The ID of the dataset to query.
     * @return A list of DatasetAssessmentResponseDTOs for the specified dataset.
     */
    @Transactional(readOnly = true)
    public List<DatasetAssessmentResponseDTO> findAssessmentsByUsernameAndDatasetId(String username, Integer datasetId) {
        Dataset ds = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + datasetId));
        if (!ds.getCreatorUsername().equals(username) && !ds.getSharedUsernames().contains(username)) {
            throw new SecurityException("No access to dataset: " + datasetId);
        }
        return ds.getDatasetAssessments().stream()
                .map(DatasetAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new DatasetAssessment for a given dataset.
     *
     * @param datasetId The ID of the parent dataset.
     * @param dto       The DTO containing the assessment data.
     * @param username  The username of the creator.
     * @return A DTO representing the newly created assessment.
     */
    public DatasetAssessmentResponseDTO addDatasetAssessment(
            Integer datasetId,
            DatasetAssessmentRequestDTO dto,
            String username
    ) {
        Dataset dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new EntityNotFoundException("Dataset not found: " + datasetId));

        // Fetch all questions and tables directly from their repositories
        // and convert them into lookup maps.
        Map<Integer, Question> qMap = questionRepo.findAll().stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));
        Map<Integer, DatasetTable> tMap = tableRepo.findAll().stream()
                .collect(Collectors.toMap(DatasetTable::getId, Function.identity()));

        DatasetAssessment assessment = dto.toEntity(dataset, username, qMap, tMap, attributeRepo);
        DatasetAssessment saved = assessmentRepo.save(assessment);
        return new DatasetAssessmentResponseDTO(saved);
    }

    /**
     * Updates an existing DatasetAssessment in-place.
     *
     * @param datasetId    The ID of the parent dataset.
     * @param assessmentId The ID of the assessment to update.
     * @param dto          The DTO containing the new data.
     * @param username     The username (currently unused but good for future authorization).
     * @return A DTO representing the updated assessment.
     */
    public DatasetAssessmentResponseDTO updateDatasetAssessment(
            Integer datasetId,
            Integer assessmentId,
            DatasetAssessmentRequestDTO dto,
            String username
    ) {
        DatasetAssessment existing = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));
        if (!existing.getDataset().getId().equals(datasetId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " not in dataset " + datasetId);
        }

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());

        Map<Integer, Answer> answerMap = existing.getAnswers().stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), Function.identity()));

        for (AnswerRequestDTO ansDto : dto.getAnswers()) {
            Answer ans = answerMap.get(ansDto.getQuestionId());
            if (ans == null) {
                // If the question wasn't part of the original assessment, you might want to create it
                // or throw an error. Keeping consistent with original logic:
                throw new IllegalArgumentException("Cannot add new answer during update: questionId=" + ansDto.getQuestionId());
            }
            ans.setAnswer(AnswerOption.valueOf(ansDto.getAnswer()));
        }

        Map<Integer, DatasetTableAssessment> tableAssessMap = existing.getTableAssessments().stream()
                .collect(Collectors.toMap(ta -> ta.getTable().getId(), Function.identity()));

        for (DatasetTableAssessmentRequestDTO tabDto : dto.getTableAssessments()) {
            DatasetTableAssessment ta = tableAssessMap.get(tabDto.getTableId());
            if (ta == null) {
                throw new IllegalArgumentException("Cannot add new table assessment during update: tableId=" + tabDto.getTableId());
            }

            // FIX: Key by Attribute ID so we can look it up by aDto.getAttributeId()
            Map<Integer, DatasetTableAssessmentAttribute> attrMap = ta.getAttributes().stream()
                    .collect(Collectors.toMap(dtaa -> dtaa.getAttribute().getId(), Function.identity()));

            for (DatasetTableAssessmentAttributeRequestDTO aDto : tabDto.getAttributes()) {
                DatasetTableAssessmentAttribute attr = attrMap.get(aDto.getAttributeId());
                if (attr == null) {
                    // If the attribute wasn't assessed before (e.g. new column added to dataset), create it
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

        DatasetAssessment updated = assessmentRepo.save(existing);
        return new DatasetAssessmentResponseDTO(updated);
    }

    /**
     * Deletes a DatasetAssessment by its ID.
     *
     * @param datasetId    The ID of the parent dataset.
     * @param assessmentId The ID of the assessment to delete.
     * @param username     The username (currently unused but good for future authorization).
     */
    public void deleteDatasetAssessment(Integer datasetId, Integer assessmentId, String username) {
        DatasetAssessment existing = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));
        if (!existing.getDataset().getId().equals(datasetId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " not in dataset " + datasetId);
        }
        assessmentRepo.delete(existing);
    }
}