package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.recipient.RecipientRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.recipient.RecipientAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.RecipientResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.RecipientAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.RecipientService;
import org.bihealth.mi.risk_assessment_api.service.RecipientAssessmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;

/**
 * REST controller for recipient resources and recipient-level assessments.
 *
 * <p>Recipients describe the party receiving data. Their assessments capture
 * contextual controls, contractual controls, and likelihood factors that later
 * contribute to the context-risk part of the REA calculation.</p>
 */
@RestController
@RequestMapping("/api/recipients")
public class RecipientController {

    private final RecipientService recipientService;
    private final RecipientAssessmentService recipientAssessmentService;

    /**
     * Creates the controller with separate services for recipient metadata and
     * recipient assessment workflows.
     */
    public RecipientController(RecipientService recipientService, RecipientAssessmentService recipientAssessmentService) {
        this.recipientService = recipientService;
        this.recipientAssessmentService = recipientAssessmentService;
    }

    /**
     * Returns all recipients visible to the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<RecipientResponseDTO>> getAllRecipients(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(recipientService.getAllRecipients(username, isAdmin));
    }

    /**
     * Returns one recipient by ID after service-layer access checks.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RecipientResponseDTO> getRecipientById(@PathVariable Long id, JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            return ResponseEntity.ok(recipientService.getRecipientById(id, username, isAdmin));
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Creates a new recipient profile for the authenticated user.
     */
    @PostMapping
    public ResponseEntity<RecipientResponseDTO> createRecipient(
            @Validated @RequestBody RecipientRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return new ResponseEntity<>(recipientService.createRecipient(dto, username, isAdmin), HttpStatus.CREATED);
    }

    /**
     * Updates recipient profile metadata for a recipient the user can edit.
     */
    @PutMapping("/{id}")
    public ResponseEntity<RecipientResponseDTO> updateRecipient(
            @PathVariable Long id,
            @Validated @RequestBody RecipientRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            return ResponseEntity.ok(recipientService.updateRecipient(id, dto, username, isAdmin));
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a recipient when permitted by the service layer.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecipient(@PathVariable Long id, JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            recipientService.deleteRecipient(id, username, isAdmin);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    // --- RECIPIENT ASSESSMENT ENDPOINTS ---

    /**
     * Returns all recipient assessments visible to the authenticated user,
     * regardless of parent recipient.
     *
     * <p>This route is declared before {@code /{recipientId}/assessments} so
     * the literal {@code assessments} path segment is not treated as a recipient
     * ID.</p>
     */
    @GetMapping("/assessments")
    public ResponseEntity<List<RecipientAssessmentResponseDTO>> getAllAssessments(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(recipientAssessmentService.getAllAssessments(username, isAdmin));
    }

    /**
     * Returns all assessments attached to a specific recipient.
     */
    @GetMapping("/{recipientId}/assessments")
    public ResponseEntity<List<RecipientAssessmentResponseDTO>> getAssessmentsByRecipientId(
            @PathVariable Long recipientId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            return ResponseEntity.ok(recipientAssessmentService.getAssessmentsByRecipientId(recipientId, username, isAdmin));
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Creates a framework-specific assessment for a recipient.
     */
    @PostMapping("/{recipientId}/assessments")
    public ResponseEntity<RecipientAssessmentResponseDTO> createAssessment(
            @PathVariable Long recipientId,
            @Validated @RequestBody RecipientAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            return new ResponseEntity<>(recipientAssessmentService.createAssessment(recipientId, dto, username, isAdmin), HttpStatus.CREATED);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Replaces the answers and metadata for an existing recipient assessment.
     */
    @PutMapping("/{recipientId}/assessments/{assessmentId}")
    public ResponseEntity<RecipientAssessmentResponseDTO> updateAssessment(
            @PathVariable Long recipientId,
            @PathVariable Long assessmentId,
            @Validated @RequestBody RecipientAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            return ResponseEntity.ok(recipientAssessmentService.updateAssessment(recipientId, assessmentId, dto, username, isAdmin));
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes one assessment from a recipient.
     */
    @DeleteMapping("/{recipientId}/assessments/{assessmentId}")
    public ResponseEntity<Void> deleteAssessment(
            @PathVariable Long recipientId,
            @PathVariable Long assessmentId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            recipientAssessmentService.deleteAssessment(recipientId, assessmentId, username, isAdmin);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }
}
