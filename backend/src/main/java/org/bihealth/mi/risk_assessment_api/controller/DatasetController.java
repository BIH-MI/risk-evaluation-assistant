package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetAssessmentRequestDTO;

import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.service.DatasetAssessmentService;
import org.bihealth.mi.risk_assessment_api.service.DatasetService;

import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;

/**
 * REST controller for dataset resources and dataset-level assessments.
 *
 * <p>The controller is intentionally thin: it extracts the authenticated user
 * and admin flag from the JWT, delegates ownership/access checks to the service
 * layer, and converts common service exceptions into HTTP responses.</p>
 */
@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    private final DatasetService datasetService;
    private final DatasetAssessmentService datasetAssessmentService;

    /**
     * Creates the controller with separate services for dataset metadata and
     * dataset assessment workflows.
     */
    public DatasetController(DatasetService datasetService, DatasetAssessmentService datasetAssessmentService) {
        this.datasetService = datasetService;
        this.datasetAssessmentService = datasetAssessmentService;
    }

    /**
     * Returns all datasets visible to the current user.
     *
     * <p>Admins can see all datasets; regular users are limited by ownership or
     * sharing rules enforced in {@link DatasetService}.</p>
     */
    @GetMapping
    public ResponseEntity<List<DatasetResponseDTO>> getAllDatasets(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(datasetService.findDatasets(username, isAdmin));
    }

    /**
     * Creates a new dataset owned by the authenticated user.
     */
    @PostMapping
    public ResponseEntity<DatasetResponseDTO> addDataset(
            @Validated @RequestBody DatasetRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        return ResponseEntity.status(HttpStatus.CREATED).body(datasetService.addDataset(dto, username));
    }

    /**
     * Updates dataset metadata and table definitions for a dataset the user can
     * edit.
     */
    @PutMapping("/{id}")
    public ResponseEntity<DatasetResponseDTO> updateDataset(
            @PathVariable Long id,
            @Validated @RequestBody DatasetRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            return ResponseEntity.ok(datasetService.updateDataset(id, dto, username, isAdmin));
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a dataset when it is not referenced by assessments or
     * data-sharing activities.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDataset(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        try {
            datasetService.deleteDataset(id, username, isAdmin);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        } catch (DataIntegrityViolationException ex) {
            // Database constraints protect assessments and activities that still
            // point at this dataset; expose that as a clear client-facing 409.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete dataset. It has existing assessments or is linked to a Data Sharing Activity.");
        }
    }

    // ------------------------------------------------------------------------
    // Dataset-level assessments
    // ------------------------------------------------------------------------

    /**
     * Returns all dataset assessments visible to the authenticated user,
     * regardless of parent dataset.
     */
    @GetMapping("/assessments")
    public ResponseEntity<List<DatasetAssessmentResponseDTO>> getAllDatasetAssessments(
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        List<DatasetAssessmentResponseDTO> dtos =
                datasetAssessmentService.findAssessments(username, isAdmin);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Returns the assessments attached to a specific dataset.
     */
    @GetMapping("/{datasetId}/assessments")
    public ResponseEntity<List<DatasetAssessmentResponseDTO>> getAssessmentsForDataset(
            @PathVariable Long datasetId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        List<DatasetAssessmentResponseDTO> dtos =
                datasetAssessmentService.getAssessmentsForDataset(datasetId, username, isAdmin);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Creates a framework-specific assessment for the selected dataset.
     */
    @PostMapping("/{datasetId}/assessments")
    public ResponseEntity<DatasetAssessmentResponseDTO> addDatasetAssessment(
            @PathVariable Long datasetId,
            @Validated @RequestBody DatasetAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        DatasetAssessmentResponseDTO created =
                datasetAssessmentService.createDatasetAssessment(datasetId, dto, username, isAdmin);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Replaces the answers and metadata for an existing dataset assessment.
     */
    @PutMapping("/{datasetId}/assessments/{assessmentId}")
    public ResponseEntity<DatasetAssessmentResponseDTO> updateDatasetAssessment(
            @PathVariable Long datasetId,
            @PathVariable Long assessmentId,
            @Validated @RequestBody DatasetAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        try {
            DatasetAssessmentResponseDTO updated =
                    datasetAssessmentService.updateDatasetAssessment(datasetId, assessmentId, dto, username, isAdmin);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes one dataset assessment from a dataset.
     */
    @DeleteMapping("/{datasetId}/assessments/{assessmentId}")
    public ResponseEntity<Void> deleteDatasetAssessment(
            @PathVariable Long datasetId,
            @PathVariable Long assessmentId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        try {
            datasetAssessmentService.deleteDatasetAssessment(datasetId, assessmentId, username, isAdmin);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }
}
