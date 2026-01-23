package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.recipient.RecipientRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.recipient.RecipientAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.RecipientResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.RecipientAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.RecipientService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;

/**
 * REST controller for managing Recipients and their nested RecipientAssessments.
 */
@RestController
@RequestMapping("/api/recipients")
public class RecipientController {

    private final RecipientService recipientService;

    public RecipientController(RecipientService recipientService) {
        this.recipientService = recipientService;
    }

    /**
     * Retrieves all recipients visible to the authenticated user (owned or shared).
     *
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of recipients.
     */
    @GetMapping
    public ResponseEntity<List<RecipientResponseDTO>> getAllRecipients(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        List<RecipientResponseDTO> dtos = recipientService.findRecipientsByUsername(username);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Creates a new recipient.
     *
     * @param dto   The request body containing the details of the recipient to create.
     * @param token The JWT token of the authenticated user.
     */
    @PostMapping
    public ResponseEntity<RecipientResponseDTO> createRecipient(
            @Validated @RequestBody RecipientRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        RecipientResponseDTO created = recipientService.addRecipient(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing recipient.
     *
     * @param id    The ID of the recipient to update.
     * @param dto   The request body with the updated recipient information.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing the updated recipient.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RecipientResponseDTO> updateRecipient(
            @PathVariable Integer id,
            @Validated @RequestBody RecipientRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            RecipientResponseDTO updated = recipientService.updateRecipient(id, dto, username);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a recipient by its ID.
     *
     * @param id    The ID of the recipient to delete.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity with a 204 NO CONTENT status on successful deletion.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipient(
            @PathVariable Integer id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            recipientService.deleteRecipient(id, username);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    // ------------------------------------------------------------------------
    // Recipient‐level assessments
    // ------------------------------------------------------------------------

    /**
     * Retrieves all recipient assessments visible to the authenticated user.
     *
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of recipient assessments.
     */
    @GetMapping("/assessments")
    public ResponseEntity<List<RecipientAssessmentResponseDTO>> getAllAssessments(
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        List<RecipientAssessmentResponseDTO> dtos = recipientService.findAssessmentsByUsername(username);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Adds a new assessment for a specific recipient.
     *
     * @param recipientId The ID of the parent recipient.
     * @param dto         The request body containing the assessment details.
     * @param token       The JWT token of the authenticated user.
     * @return A ResponseEntity containing the newly created assessment with a 201 CREATED status.
     */
    @PostMapping("/{recipientId}/assessments")
    public ResponseEntity<RecipientAssessmentResponseDTO> createAssessment(
            @PathVariable Integer recipientId,
            @Validated @RequestBody RecipientAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        RecipientAssessmentResponseDTO created = recipientService.addAssessment(recipientId, dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing recipient assessment.
     *
     * @param recipientId  The ID of the parent recipient.
     * @param assessmentId The ID of the assessment to update.
     * @param dto          The request body with the updated assessment information.
     * @param token        The JWT token of the authenticated user.
     * @return A ResponseEntity containing the updated assessment.
     */
    @PutMapping("/{recipientId}/assessments/{assessmentId}")
    public ResponseEntity<RecipientAssessmentResponseDTO> updateAssessment(
            @PathVariable Integer recipientId,
            @PathVariable Integer assessmentId,
            @Validated @RequestBody RecipientAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            RecipientAssessmentResponseDTO updated = recipientService.updateAssessment(
                    recipientId, assessmentId, dto, username);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a recipient assessment by its ID.
     *
     * @param recipientId  The ID of the parent recipient.
     * @param assessmentId The ID of the assessment to delete.
     * @param token        The JWT token of the authenticated user.
     * @return A ResponseEntity with a 204 NO CONTENT status on successful deletion.
     */
    @DeleteMapping("/{recipientId}/assessments/{assessmentId}")
    public ResponseEntity<Void> deleteAssessment(
            @PathVariable Integer recipientId,
            @PathVariable Integer assessmentId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            recipientService.deleteAssessment(recipientId, assessmentId, username);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }
}
