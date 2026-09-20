package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateDuplicateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.projecttemplate.ProjectTemplateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.projecttemplate.ProjectTemplateResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.ProjectTemplateService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/project-templates")
public class ProjectTemplateController {

    private final ProjectTemplateService templateService;

    public ProjectTemplateController(ProjectTemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<List<ProjectTemplateResponseDTO>> getTemplates(
            @RequestParam(defaultValue = "false") boolean activeOnly,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(templateService.listTemplates(activeOnly, isAdmin));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectTemplateResponseDTO> getTemplate(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(templateService.getTemplate(id, isAdmin));
    }

    @PostMapping
    public ResponseEntity<ProjectTemplateResponseDTO> createTemplate(
            @RequestBody ProjectTemplateRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.createTemplate(dto, username, isAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectTemplateResponseDTO> updateTemplate(
            @PathVariable Long id,
            @RequestBody ProjectTemplateRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(templateService.updateTemplate(id, dto, username, isAdmin));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ProjectTemplateResponseDTO> duplicateTemplate(
            @PathVariable Long id,
            @RequestBody(required = false) ProjectTemplateDuplicateRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.duplicateTemplate(id, dto, username, isAdmin));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ProjectTemplateResponseDTO> archiveTemplate(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(templateService.archiveTemplate(id, isAdmin));
    }

    @PostMapping("/{id}/default")
    public ResponseEntity<ProjectTemplateResponseDTO> setDefault(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(templateService.setDefault(id, isAdmin));
    }
}
