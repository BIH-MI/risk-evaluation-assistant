package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryConfigurationDuplicateRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.qid.QidDiscoveryConfigurationRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.qid.QidDiscoveryConfigurationResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.QidDiscoveryConfigurationService;
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

/**
 * REST controller for administrator-managed QID discovery configurations.
 *
 * <p>Authenticated users may read active configurations for profiling
 * selection. Mutating operations are restricted to administrators by the
 * service layer.</p>
 */
@RestController
@RequestMapping("/api/qid-discovery-configurations")
public class QidDiscoveryConfigurationController {

    private final QidDiscoveryConfigurationService configurationService;

    public QidDiscoveryConfigurationController(QidDiscoveryConfigurationService configurationService) {
        this.configurationService = configurationService;
    }

    @GetMapping
    public ResponseEntity<List<QidDiscoveryConfigurationResponseDTO>> getConfigurations(
            @RequestParam(defaultValue = "false") boolean activeOnly,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(configurationService.listConfigurations(activeOnly, isAdmin));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QidDiscoveryConfigurationResponseDTO> getConfiguration(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(configurationService.getConfiguration(id, isAdmin));
    }

    @PostMapping
    public ResponseEntity<QidDiscoveryConfigurationResponseDTO> createConfiguration(
            @RequestBody QidDiscoveryConfigurationRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(configurationService.createConfiguration(dto, username, isAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QidDiscoveryConfigurationResponseDTO> updateConfiguration(
            @PathVariable Long id,
            @RequestBody QidDiscoveryConfigurationRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(configurationService.updateConfiguration(id, dto, username, isAdmin));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<QidDiscoveryConfigurationResponseDTO> duplicateConfiguration(
            @PathVariable Long id,
            @RequestBody(required = false) QidDiscoveryConfigurationDuplicateRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        String name = dto == null ? null : dto.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(configurationService.duplicateConfiguration(id, name, username, isAdmin));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<QidDiscoveryConfigurationResponseDTO> archiveConfiguration(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(configurationService.archiveConfiguration(id, isAdmin));
    }

    @PostMapping("/{id}/default")
    public ResponseEntity<QidDiscoveryConfigurationResponseDTO> setDefault(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(configurationService.setDefault(id, isAdmin));
    }
}
