package org.bihealth.mi.risk_assessment_api.service;

import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.recipient.*;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.*;
import org.bihealth.mi.risk_assessment_api.enums.AnswerOption;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.recipient.*;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.*;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service class for managing all business logic for Recipient entities and
 * their nested RecipientAssessment children.
 */
@Service
@Transactional
public class RecipientService {
    private final RecipientRepository recipientRepository;
    private final RecipientAssessmentRepository assessmentRepository;
    private final QuestionRepository questionRepository;

    public RecipientService(
            RecipientRepository recipientRepository,
            RecipientAssessmentRepository assessmentRepository,
            QuestionRepository questionRepository // Inject the unified repository
    ) {
        this.recipientRepository = recipientRepository;
        this.assessmentRepository = assessmentRepository;
        this.questionRepository = questionRepository;
    }

    /**
     * Finds all recipients a user can access, either as the creator or through sharing.
     *
     * @param username The username of the user.
     * @return A list of RecipientResponseDTOs.
     */
    @Transactional(readOnly = true)
    public List<RecipientResponseDTO> findRecipientsByUsername(String username) {
        Set<Recipient> combined = new LinkedHashSet<>(recipientRepository.findByCreatorUsername(username));
        combined.addAll(recipientRepository.findBySharedUsernamesContains(username));
        return combined.stream()
                .map(RecipientResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new Recipient from a DTO.
     *
     * @param dto      The DTO containing the recipient details.
     * @param username The username of the creator.
     * @return A DTO representing the newly created recipient.
     */
    public RecipientResponseDTO addRecipient(RecipientRequestDTO dto, String username) {
        Recipient toSave = dto.toEntity(username);
        Recipient saved = recipientRepository.save(toSave);
        return new RecipientResponseDTO(saved);
    }

    /**
     * Updates an existing Recipient's details.
     *
     * @param id       The ID of the recipient to update.
     * @param dto      The DTO with the new data.
     * @param username The username for the authorization check.
     * @return A DTO representing the updated recipient.
     * @throws EntityNotFoundException if the recipient is not found.
     * @throws AccessDeniedException   if the user does not have permission.
     */
    public RecipientResponseDTO updateRecipient(Integer id,
                                                RecipientRequestDTO dto,
                                                String username) {
        Recipient existing = recipientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + id));

        if (!existing.getCreatorUsername().equals(username)
                && !existing.getSharedUsernames().contains(username)) {
            throw new AccessDeniedException("User " + username + " may not modify recipient " + id);
        }

        // Use the correct field names from the refactored DTO and Entity
        existing.setName(dto.getName());
        existing.setOrganization(dto.getName());
        existing.setOrganizationLink(dto.getOrganizationLink());
        existing.setDescription(dto.getDescription());

        if (dto.getSharedUsernames() != null) {
            existing.getSharedUsernames().clear();
            existing.getSharedUsernames().addAll(dto.getSharedUsernames());
        }
        Recipient updated = recipientRepository.save(existing);
        return new RecipientResponseDTO(updated);
    }

    /**
     * Deletes a Recipient by its ID after verifying access rights.
     *
     * @param id       The ID of the recipient to delete.
     * @param username The username for the authorization check.
     */
    public void deleteRecipient(Integer id, String username) {
        Recipient existing = recipientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + id));

        if (!existing.getCreatorUsername().equals(username)
                && !existing.getSharedUsernames().contains(username)) {
            throw new AccessDeniedException("User " + username + " may not delete recipient " + id);
        }
        recipientRepository.delete(existing);
    }

    /**
     * Retrieves all recipient assessments visible to the authenticated user.
     *
     * @param username The username of the user.
     * @return A list of RecipientAssessmentResponseDTOs.
     */
    @Transactional(readOnly = true)
    public List<RecipientAssessmentResponseDTO> findAssessmentsByUsername(String username) {
        return assessmentRepository
                .findAccessibleByUsername(username)
                .stream()
                .map(RecipientAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Adds a new assessment for a specific recipient.
     *
     * @param recipientId The ID of the parent recipient.
     * @param dto         The request body containing the assessment details.
     * @param username    The username of the creator.
     * @return A DTO representing the newly created assessment.
     * @throws EntityNotFoundException if the parent recipient is not found.
     */
    public RecipientAssessmentResponseDTO addAssessment(
            Integer recipientId,
            RecipientAssessmentRequestDTO dto,
            String username) {
        Recipient parent = recipientRepository.findById(recipientId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Cannot create assessment: recipient not found: " + recipientId));

        // Use the unified Question model and repository
        Map<Integer, Question> questionMap = questionRepository.findAll().stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        RecipientAssessment asmt = dto.toEntity(parent, questionMap, username);
        RecipientAssessment saved = assessmentRepository.save(asmt);
        return new RecipientAssessmentResponseDTO(saved);
    }

    /**
     * Updates an existing RecipientAssessment in-place.
     *
     * @param recipientId  The ID of the parent recipient.
     * @param assessmentId The ID of the assessment to update.
     * @param dto          The DTO containing the new data.
     * @param username     The username of the user performing the update.
     * @return A DTO representing the updated assessment.
     * @throws EntityNotFoundException if the assessment is not found.
     * @throws IllegalArgumentException if the assessment does not belong to the specified recipient.
     */
    public RecipientAssessmentResponseDTO updateAssessment(
            Integer recipientId,
            Integer assessmentId,
            RecipientAssessmentRequestDTO dto,
            String username
    ) {

        RecipientAssessment existing = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        if (!existing.getRecipient().getId().equals(recipientId)) {
            throw new IllegalArgumentException(
                    "Assessment " + assessmentId + " is not for recipient " + recipientId
            );
        }

        // Use the correct, refactored field names
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setContactName(dto.getContactName());
        existing.setEmail(dto.getEmail());
        existing.setTelephone(dto.getTelephone());
        existing.setDepartment(dto.getDepartment());

        // Update answers in-place using the unified Answer model
        Map<Integer, Answer> answerMap = existing.getAnswers().stream()
                .collect(Collectors.toMap(Answer::getId, Function.identity()));

        if (dto.getAnswers() != null) {
            // Use the unified AnswerRequestDTO
            for (AnswerRequestDTO ansDto : dto.getAnswers()) {
                // The ansId should be the questionId in a proper update/create scenario
                // but we follow the existing logic of updating by answer id
                // A better approach might be to map by questionId.
                // For now, we fix the types.
                Answer ans = existing.getAnswers().stream()
                        .filter(a -> a.getQuestion().getId().equals(ansDto.getQuestionId()))
                        .findFirst().orElse(null);

                if (ans == null) {
                    throw new IllegalArgumentException("Cannot update answer for non-existent question: questionId=" + ansDto.getQuestionId());
                }
                ans.setAnswer(AnswerOption.valueOf(ansDto.getAnswer()));
            }
        }

        RecipientAssessment saved = assessmentRepository.save(existing);
        return new RecipientAssessmentResponseDTO(saved);
    }

    /**
     * Deletes a recipient assessment by its ID.
     *
     * @param recipientId  The ID of the parent recipient (for context).
     * @param assessmentId The ID of the assessment to delete.
     * @param username     The username of the user (for future authorization checks).
     * @throws EntityNotFoundException if the assessment is not found.
     */
    public void deleteAssessment(Integer recipientId, Integer assessmentId, String username) {
        RecipientAssessment a = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        assessmentRepository.delete(a);
    }
}