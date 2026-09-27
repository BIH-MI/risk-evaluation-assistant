package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.request.MitigationActionRequestDTO;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.response.MitigationActionDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseActionService;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
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
@RequestMapping("/api/mitigation-knowledge-bases/{knowledgeBaseId}/actions")
public class MitigationKnowledgeBaseActionController {

    private final MitigationKnowledgeBaseActionService actionService;

    public MitigationKnowledgeBaseActionController(MitigationKnowledgeBaseActionService actionService) {
        this.actionService = actionService;
    }

    @GetMapping
    public ResponseEntity<List<MitigationActionDTO>> getActions(
            @PathVariable Long knowledgeBaseId,
            @RequestParam(required = false) MitigationActionType actionType,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) MitigationSharingArrangement sharingArrangement,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(actionService.listActions(
                knowledgeBaseId, actionType, active, sharingArrangement, isAdmin));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MitigationActionDTO> getAction(
            @PathVariable Long knowledgeBaseId,
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(actionService.getAction(knowledgeBaseId, id, isAdmin));
    }

    @PostMapping
    public ResponseEntity<MitigationActionDTO> createAction(
            @PathVariable Long knowledgeBaseId,
            @RequestBody MitigationActionRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(actionService.createAction(knowledgeBaseId, dto, username, isAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MitigationActionDTO> updateAction(
            @PathVariable Long knowledgeBaseId,
            @PathVariable Long id,
            @RequestBody MitigationActionRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(actionService.updateAction(knowledgeBaseId, id, dto, username, isAdmin));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAction(
            @PathVariable Long knowledgeBaseId,
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        actionService.deleteAction(knowledgeBaseId, id, username, isAdmin);
        return ResponseEntity.noContent().build();
    }
}
