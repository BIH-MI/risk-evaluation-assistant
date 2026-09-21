package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.mitigation.MitigationActionRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigation.MitigationActionDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.MitigationCatalogueService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/mitigation-actions")
public class MitigationCatalogueController {

    private final MitigationCatalogueService catalogueService;

    public MitigationCatalogueController(MitigationCatalogueService catalogueService) {
        this.catalogueService = catalogueService;
    }

    @GetMapping
    public ResponseEntity<List<MitigationActionDTO>> getActions(
            @RequestParam(required = false) MitigationActionType actionType,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) MitigationSharingArrangement sharingArrangement
    ) {
        return ResponseEntity.ok(catalogueService.listActions(actionType, active, sharingArrangement));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MitigationActionDTO> getAction(@PathVariable Long id) {
        return ResponseEntity.ok(catalogueService.getAction(id));
    }

    @PostMapping
    public ResponseEntity<MitigationActionDTO> createAction(
            @RequestBody MitigationActionRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogueService.createAction(dto, username, isAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MitigationActionDTO> updateAction(
            @PathVariable Long id,
            @RequestBody MitigationActionRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(catalogueService.updateAction(id, dto, isAdmin));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAction(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        catalogueService.deleteAction(id, isAdmin);
        return ResponseEntity.noContent().build();
    }
}
