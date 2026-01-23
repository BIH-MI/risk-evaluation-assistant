package org.bihealth.mi.risk_assessment_api.controller;

import jakarta.transaction.Transactional;
import org.bihealth.mi.risk_assessment_api.dto.response.questionnaire.QuestionResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for retrieving questionnaire questions.
 */
@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    /**
     * Retrieves all questions, with an option to filter by question type.
     * Examples:
     * - `GET /api/questions` (returns all questions)
     * - `GET /api/questions?type=IP` (returns only Invasion of Privacy questions)
     *
     * @param type An optional request parameter to filter questions by their type (e.g., "IP", "MITC", "MOTC").
     * @return A ResponseEntity containing a list of questions.
     */
    @GetMapping
    public ResponseEntity<List<QuestionResponseDTO>> getAllQuestions(
            @RequestParam(required = false) String type) {

        List<Question> entities;
        if (type != null && !type.isEmpty()) {
            // If a type is provided, find by that type
            entities = questionRepository.findByType(type);
        } else {
            // Otherwise, find all questions
            entities = questionRepository.findAll();
        }

        List<QuestionResponseDTO> dtos = entities.stream()
                .map(QuestionResponseDTO::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<List<QuestionResponseDTO>> updateAllQuestions(@RequestBody List<Question> questions) {
        // saveAll performs a bulk update/insert
        List<Question> savedQuestions = questionRepository.saveAll(questions);

        // Convert to DTOs for the response
        List<QuestionResponseDTO> dtos = savedQuestions.stream()
                .map(QuestionResponseDTO::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * Updates an existing question.
     * RESTRICTED: Only accessible by ADMIN.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuestionResponseDTO> updateQuestion(@PathVariable Integer id,
                                                              @RequestBody Question questionDetails) {
        return questionRepository.findById(id)
                .map(existingQuestion -> {
                    existingQuestion.setText(questionDetails.getText());
                    existingQuestion.setType(questionDetails.getType());
                    existingQuestion.setWeightYes(questionDetails.getWeightYes());
                    existingQuestion.setWeightNo(questionDetails.getWeightNo());
                    existingQuestion.setWeightNa(questionDetails.getWeightNa());
                    existingQuestion.setRiskWeight(questionDetails.getRiskWeight());
                    Question updatedQuestion = questionRepository.save(existingQuestion);
                    return ResponseEntity.ok(new QuestionResponseDTO(updatedQuestion));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Deletes a question.
     * RESTRICTED: Only accessible by ADMIN.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Integer id) {
        if (questionRepository.existsById(id)) {
            questionRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}