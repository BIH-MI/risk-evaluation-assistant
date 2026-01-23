package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.activity.DataSharingActivityRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.activity.DataSharingActivityResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.DataSharingActivityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;

/**
 * REST controller for managing the central DataSharingActivity resource.
 * A DataSharingActivity links dataset assessments with recipient assessments
 * to produce an overall risk report.
 */
@RestController
@RequestMapping("/api/data-sharing-activities")
public class DataSharingActivityController {

    private final DataSharingActivityService sharingService;

    public DataSharingActivityController(DataSharingActivityService sharingService) {
        this.sharingService = sharingService;
    }

    /**
     * Retrieves all sharing activities visible to the authenticated user.
     *
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of data sharing activities.
     */
    @GetMapping
    public ResponseEntity<List<DataSharingActivityResponseDTO>> getAllActivities(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        List<DataSharingActivityResponseDTO> dtos = sharingService.findActivitiesByUsername(username);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Retrieves a single sharing activity by its ID.
     *
     * @param id    The ID of the activity to retrieve.
     * @param token The JWT token of the authenticated user for authorization.
     * @return A ResponseEntity containing the requested data sharing activity.
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataSharingActivityResponseDTO> getActivity(
            @PathVariable Integer id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            DataSharingActivityResponseDTO dto = sharingService.getById(id, username);
            return ResponseEntity.ok(dto);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Creates a new data sharing activity.
     *
     * @param dto   The request body containing the details of the activity to create.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing the newly created activity with a 201 CREATED status.
     */
    @PostMapping
    public ResponseEntity<DataSharingActivityResponseDTO> createActivity(
            @Validated @RequestBody DataSharingActivityRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        DataSharingActivityResponseDTO created = sharingService.create(dto, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing data sharing activity.
     *
     * @param id    The ID of the activity to update.
     * @param dto   The request body containing the updated details.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing the updated activity.
     */
    @PutMapping("/{id}")
    public ResponseEntity<DataSharingActivityResponseDTO> updateActivity(
            @PathVariable Integer id,
            @Validated @RequestBody DataSharingActivityRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            DataSharingActivityResponseDTO updated = sharingService.update(id, dto, username);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    /**
     * Deletes a data sharing activity.
     *
     * @param id    The ID of the activity to delete.
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity with a 204 NO CONTENT status on successful deletion.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(
            @PathVariable Integer id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        try {
            sharingService.delete(id, username);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }
}