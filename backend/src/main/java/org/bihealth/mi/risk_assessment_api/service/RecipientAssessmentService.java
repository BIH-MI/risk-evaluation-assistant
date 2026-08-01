package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.questionnaire.AnswerRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.recipient.RecipientAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.RecipientAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for recipient assessment workflows.
 *
 * <p>Recipient assessments capture the context-side questionnaire answers for a
 * recipient under a selected configuration. Those answers later classify
 * controls, likelihood, contractual risk, or equivalent framework categories.</p>
 */
@Service
@Transactional
public class RecipientAssessmentService {

    // Repositories needed to load parent recipient, configuration, questions,
    // and the recipient assessment aggregate itself.
    private final RecipientAssessmentRepository assessmentRepository;
    private final RecipientRepository recipientRepository;
    private final RiskConfigurationRepository riskConfigurationRepository;
    private final QuestionRepository questionRepository;

    /**
     * Creates the service with the repositories required for recipient
     * assessment creation and update.
     */
    public RecipientAssessmentService(
            RecipientAssessmentRepository assessmentRepository,
            RecipientRepository recipientRepository,
            RiskConfigurationRepository riskConfigurationRepository,
            QuestionRepository questionRepository
    ) {
        this.assessmentRepository = assessmentRepository;
        this.recipientRepository = recipientRepository;
        this.riskConfigurationRepository = riskConfigurationRepository;
        this.questionRepository = questionRepository;
    }

    /**
     * Verifies if the user is an admin, the creator, or in the shared usernames list.
     */
    protected void verifyRecipientAccess(Recipient recipient, String username, boolean isAdmin) {
        // Admins bypass recipient ownership and sharing checks.
        if (isAdmin) return;

        if (!recipient.getCreatorUsername().equals(username) &&
                (recipient.getSharedUsernames() == null || !recipient.getSharedUsernames().contains(username))) {
            throw new AccessDeniedException("No access to recipient: " + recipient.getId());
        }
    }

    /**
     * Returns all recipient assessments visible to the user.
     *
     * <p>Admins see every assessment. Regular users see assessments they created
     * or assessments whose parent recipient is shared with them.</p>
     */
    public List<RecipientAssessmentResponseDTO> getAllAssessments(String username, boolean isAdmin) {
        if (isAdmin) {
            return assessmentRepository.findAll().stream()
                    .map(RecipientAssessmentResponseDTO::new)
                    .collect(Collectors.toList());
        }

        return assessmentRepository.findAll().stream()
                .filter(asmt -> asmt.getCreatorUsername().equals(username) ||
                        (asmt.getRecipient().getSharedUsernames() != null && asmt.getRecipient().getSharedUsernames().contains(username)))
                .map(RecipientAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Returns assessments for one recipient after verifying access to the parent recipient.
     */
    public List<RecipientAssessmentResponseDTO> getAssessmentsByRecipientId(Long recipientId, String username, boolean isAdmin) {
        Recipient recipient = recipientRepository.findById(recipientId)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + recipientId));

        verifyRecipientAccess(recipient, username, isAdmin);

        return assessmentRepository.findByRecipient(recipient).stream()
                .map(RecipientAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new recipient assessment under a selected configuration.
     *
     * <p>The configuration is marked active once used. Questions are loaded from
     * that configuration so answer conversion can reject unknown or mismatched IDs.</p>
     */
    public RecipientAssessmentResponseDTO createAssessment(Long recipientId, RecipientAssessmentRequestDTO dto, String username, boolean isAdmin) {
        Recipient recipient = recipientRepository.findById(recipientId)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + recipientId));

        verifyRecipientAccess(recipient, username, isAdmin);

        Configuration config = riskConfigurationRepository.findById(dto.getConfigurationId())
                .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + dto.getConfigurationId()));

        if (!config.isActive()) {
            config.setActive(true);
            riskConfigurationRepository.save(config);
        }

        // Build a configuration-scoped question map for AnswerRequestDTO conversion.
        Map<Long, Question> questionMap = questionRepository.findByConfiguration(config).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        RecipientAssessment asmt = dto.toEntity(recipient, config, questionMap, username);
        RecipientAssessment saved = assessmentRepository.save(asmt);

        return new RecipientAssessmentResponseDTO(saved);
    }

    /**
     * Updates recipient assessment metadata, configuration, and answers.
     *
     * <p>If the configuration changes, old answers are cleared because their
     * question/option IDs belong to the previous framework.</p>
     */
    public RecipientAssessmentResponseDTO updateAssessment(Long recipientId, Long assessmentId, RecipientAssessmentRequestDTO dto, String username, boolean isAdmin) {
        RecipientAssessment existing = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        if (!existing.getRecipient().getId().equals(recipientId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " does not belong to recipient " + recipientId);
        }

        verifyRecipientAccess(existing.getRecipient(), username, isAdmin);

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setContactName(dto.getContactName());
        existing.setEmail(dto.getEmail());
        existing.setTelephone(dto.getTelephone());
        existing.setDepartment(dto.getDepartment());

        if (dto.getConfigurationId() != null && !dto.getConfigurationId().equals(existing.getConfiguration().getId())) {
            // A different configuration means a different question/option set.
            Configuration config = riskConfigurationRepository.findById(dto.getConfigurationId())
                    .orElseThrow(() -> new EntityNotFoundException("Configuration not found: " + dto.getConfigurationId()));
            existing.setConfiguration(config);
            existing.getAnswers().clear();
        }

        // Scope all answer updates to the assessment's current configuration.
        Map<Long, Question> questionMap = questionRepository.findByConfiguration(existing.getConfiguration()).stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        if (dto.getAnswers() != null) {
            for (AnswerRequestDTO ansDto : dto.getAnswers()) {
                Question q = questionMap.get(ansDto.getQuestionId());
                // Ignore answers for questions outside the active configuration.
                if (q == null) continue;

                Answer ans = existing.getAnswers().stream()
                        .filter(a -> a.getQuestion().getId().equals(ansDto.getQuestionId()))
                        .findFirst()
                        .orElse(null);

                QuestionOption selectedOption = q.getOptions().stream()
                        .filter(opt -> opt.getId().equals(ansDto.getSelectedOptionId()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Invalid option ID: " + ansDto.getSelectedOptionId() + " for question: " + q.getId()));

                if (ans == null) {
                    // Add a new answer when this question was not answered before.
                    ans = new Answer();
                    ans.setAssessment(existing);
                    ans.setQuestion(q);
                    ans.setSelectedOption(selectedOption);
                    existing.getAnswers().add(ans);
                } else {
                    // Existing answer: only the selected option changes.
                    ans.setSelectedOption(selectedOption);
                }
            }
        }

        RecipientAssessment saved = assessmentRepository.save(existing);
        return new RecipientAssessmentResponseDTO(saved);
    }

    /**
     * Deletes a recipient assessment after verifying it belongs to the requested recipient.
     */
    public void deleteAssessment(Long recipientId, Long assessmentId, String username, boolean isAdmin) {
        RecipientAssessment existing = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new EntityNotFoundException("Assessment not found: " + assessmentId));

        if (!existing.getRecipient().getId().equals(recipientId)) {
            throw new EntityNotFoundException("Assessment " + assessmentId + " does not belong to recipient " + recipientId);
        }

        verifyRecipientAccess(existing.getRecipient(), username, isAdmin);

        assessmentRepository.delete(existing);
    }
}
