package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetAssessmentRequestDTO;

import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetAssessmentResponseDTO;
import org.bihealth.mi.risk_assessment_api.service.DatasetAssessmentService;
import org.bihealth.mi.risk_assessment_api.service.DatasetService;

import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;

/**
 * REST controller for managing Datasets and their nested DatasetAssessments.
 */
@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    private final DatasetService datasetService;
    private final DatasetAssessmentService datasetAssessmentService;

    public DatasetController(DatasetService datasetService,
                             DatasetAssessmentService datasetAssessmentService) {
        this.datasetService = datasetService;
        this.datasetAssessmentService = datasetAssessmentService;
    }

    /**
     * Retrieves all datasets visible to the current user (owned or shared).
     *
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of datasets.
     */
    @GetMapping
    public ResponseEntity<List<DatasetResponseDTO>> getAllDatasets(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        List<DatasetResponseDTO> dtos = datasetService.findDatasetsByUsername(username);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Creates a new dataset.
     *
     * @param dto   The request body containing the details of the dataset to create.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing the newly created dataset with a 201 CREATED status.
     */
    @PostMapping
    public ResponseEntity<DatasetResponseDTO> addDataset(
            @Validated @RequestBody DatasetRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        DatasetResponseDTO created = datasetService.addDataset(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing dataset.
     *
     * @param id    The ID of the dataset to update.
     * @param dto   The request body with the updated dataset information.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing the updated dataset.
     */
    @PutMapping("/{id}")
    public ResponseEntity<DatasetResponseDTO> updateDataset(
            @PathVariable Integer id,
            @Validated @RequestBody DatasetRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            DatasetResponseDTO updated = datasetService.updateDataset(id, dto, username);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a dataset by its ID.
     *
     * @param id    The ID of the dataset to delete.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity with a 204 NO CONTENT status on successful deletion.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDataset(
            @PathVariable Integer id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            datasetService.deleteDataset(id, username);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    // ------------------------------------------------------------------------
    // Dataset‐level assessments
    // ------------------------------------------------------------------------

    /**
     * Retrieves all dataset assessments visible to the current user across all their datasets.
     *
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of dataset assessments.
     */
    @GetMapping("/assessments")
    public ResponseEntity<List<DatasetAssessmentResponseDTO>> getAllDatasetAssessments(
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        List<DatasetAssessmentResponseDTO> dtos =
                datasetAssessmentService.findAssessmentsByUsername(username);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Retrieves all assessments for a specific dataset.
     *
     * @param datasetId The ID of the parent dataset.
     * @param token     The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of assessments for the specified dataset.
     */
    @GetMapping("/{datasetId}/assessments")
    public ResponseEntity<List<DatasetAssessmentResponseDTO>> getAssessmentsForDataset(
            @PathVariable Integer datasetId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        List<DatasetAssessmentResponseDTO> dtos =
                datasetAssessmentService.findAssessmentsByUsernameAndDatasetId(
                        username, datasetId);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Adds a new assessment under a specific dataset.
     *
     * @param datasetId The ID of the parent dataset.
     * @param dto       The request body containing the assessment details.
     * @param token     The JWT token of the authenticated user.
     * @return A ResponseEntity containing the newly created dataset assessment with a 201 CREATED status.
     */
    @PostMapping("/{datasetId}/assessments")
    public ResponseEntity<DatasetAssessmentResponseDTO> addDatasetAssessment(
            @PathVariable Integer datasetId,
            @Validated @RequestBody DatasetAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        DatasetAssessmentResponseDTO created =
                datasetAssessmentService.addDatasetAssessment(datasetId, dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing dataset assessment.
     *
     * @param datasetId    The ID of the parent dataset.
     * @param assessmentId The ID of the assessment to update.
     * @param dto          The request body with the updated assessment information.
     * @param token        The JWT token of the authenticated user.
     * @return A ResponseEntity containing the updated assessment.
     */
    @PutMapping("/{datasetId}/assessments/{assessmentId}")
    public ResponseEntity<DatasetAssessmentResponseDTO> updateDatasetAssessment(
            @PathVariable Integer datasetId,
            @PathVariable Integer assessmentId,
            @Validated @RequestBody DatasetAssessmentRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            DatasetAssessmentResponseDTO updated =
                    datasetAssessmentService.updateDatasetAssessment(datasetId, assessmentId, dto, username);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a dataset assessment by its ID.
     *
     * @param datasetId    The ID of the parent dataset.
     * @param assessmentId The ID of the assessment to delete.
     * @param token        The JWT token of the authenticated user.
     * @return A ResponseEntity with a 204 NO CONTENT status on successful deletion.
     */
    @DeleteMapping("/{datasetId}/assessments/{assessmentId}")
    public ResponseEntity<Void> deleteDatasetAssessment(
            @PathVariable Integer datasetId,
            @PathVariable Integer assessmentId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            datasetAssessmentService.deleteDatasetAssessment(datasetId, assessmentId, username);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }
}
