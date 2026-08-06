package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringSystemDuplicateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.scoring.AttributeScoringSystemRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.scoring.AttributeScoringSystemResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.AttributeScoringSystemService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for administrator-managed attribute scoring systems.
 *
 * <p>Read operations are available to authenticated users, with inactive
 * systems hidden from non-admin users by the service. Mutating operations
 * delegate admin enforcement to the service layer.</p>
 */
@RestController
@RequestMapping("/api/attribute-scoring-systems")
public class AttributeScoringSystemController {

    private final AttributeScoringSystemService scoringSystemService;

    public AttributeScoringSystemController(AttributeScoringSystemService scoringSystemService) {
        this.scoringSystemService = scoringSystemService;
    }

    @GetMapping
    public ResponseEntity<List<AttributeScoringSystemResponseDTO>> getSystems(
            @RequestParam(defaultValue = "false") boolean activeOnly,
            JwtAuthenticationToken token
    ) {
        // Admins may request archived systems; regular users always receive active systems only.
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(scoringSystemService.listSystems(activeOnly, isAdmin));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AttributeScoringSystemResponseDTO> getSystem(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(scoringSystemService.getSystem(id, isAdmin));
    }

    @PostMapping
    public ResponseEntity<AttributeScoringSystemResponseDTO> createSystem(
            @RequestBody AttributeScoringSystemRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scoringSystemService.createSystem(dto, username, isAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AttributeScoringSystemResponseDTO> updateSystem(
            @PathVariable Long id,
            @RequestBody AttributeScoringSystemRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(scoringSystemService.updateSystem(id, dto, username, isAdmin));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<AttributeScoringSystemResponseDTO> duplicateSystem(
            @PathVariable Long id,
            @RequestBody(required = false) AttributeScoringSystemDuplicateRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        // The request body is optional; the service derives a unique copy name when no name is supplied.
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        String name = dto == null ? null : dto.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(scoringSystemService.duplicateSystem(id, name, username, isAdmin));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<AttributeScoringSystemResponseDTO> archiveSystem(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(scoringSystemService.archiveSystem(id, isAdmin));
    }

    @PostMapping("/{id}/default")
    public ResponseEntity<AttributeScoringSystemResponseDTO> setDefault(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(scoringSystemService.setDefault(id, isAdmin));
    }
}
