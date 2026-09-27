package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.project.ProjectRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.project.ProjectResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Project workspaces.
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponseDTO>> getAllProjects(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(projectService.findProjects(username, isAdmin));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponseDTO> getProject(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(projectService.getProject(id, username, isAdmin));
    }

    @PostMapping
    public ResponseEntity<ProjectResponseDTO> createProject(
            @Validated @RequestBody ProjectRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.createProject(dto, username, isAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponseDTO> updateProject(
            @PathVariable Long id,
            @Validated @RequestBody ProjectRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(projectService.updateProject(id, dto, username, isAdmin));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        projectService.deleteProject(id, username, isAdmin);
        return ResponseEntity.noContent().build();
    }
}
