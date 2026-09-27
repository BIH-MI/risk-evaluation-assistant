package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.request.MitigationKnowledgeBaseForkRequestDTO;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.request.MitigationKnowledgeBaseRequestDTO;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.response.MitigationKnowledgeBaseResponseDTO;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseService;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
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
@RequestMapping("/api/mitigation-knowledge-bases")
public class MitigationKnowledgeBaseController {

    private final MitigationKnowledgeBaseService knowledgeBaseService;

    public MitigationKnowledgeBaseController(MitigationKnowledgeBaseService knowledgeBaseService) {
        this.knowledgeBaseService = knowledgeBaseService;
    }

    @GetMapping
    public ResponseEntity<List<MitigationKnowledgeBaseResponseDTO>> list(
            @RequestParam(defaultValue = "false") boolean activeOnly,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(knowledgeBaseService.listKnowledgeBases(activeOnly, isAdmin).stream()
                .map(MitigationKnowledgeBaseResponseDTO::new)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MitigationKnowledgeBaseResponseDTO> get(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(new MitigationKnowledgeBaseResponseDTO(
                knowledgeBaseService.getKnowledgeBase(id, isAdmin)));
    }

    @PostMapping
    public ResponseEntity<MitigationKnowledgeBaseResponseDTO> create(
            @RequestBody MitigationKnowledgeBaseRequestDTO request,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        MitigationKnowledgeBase created = knowledgeBaseService.createKnowledgeBase(
                request.getName(),
                request.getDescription(),
                request.getActive(),
                request.getDefaultKnowledgeBase(),
                username,
                isAdmin);
        return ResponseEntity.status(HttpStatus.CREATED).body(new MitigationKnowledgeBaseResponseDTO(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MitigationKnowledgeBaseResponseDTO> update(
            @PathVariable Long id,
            @RequestBody MitigationKnowledgeBaseRequestDTO request,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        MitigationKnowledgeBase updated = knowledgeBaseService.updateKnowledgeBase(
                id,
                request.getName(),
                request.getDescription(),
                request.getActive(),
                request.getDefaultKnowledgeBase(),
                isAdmin);
        return ResponseEntity.ok(new MitigationKnowledgeBaseResponseDTO(updated));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<MitigationKnowledgeBaseResponseDTO> archive(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(new MitigationKnowledgeBaseResponseDTO(
                knowledgeBaseService.archiveKnowledgeBase(id, isAdmin)));
    }

    @PostMapping("/{id}/default")
    public ResponseEntity<MitigationKnowledgeBaseResponseDTO> setDefault(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(new MitigationKnowledgeBaseResponseDTO(
                knowledgeBaseService.setDefaultKnowledgeBase(id, isAdmin)));
    }

    @PostMapping("/{id}/fork")
    public ResponseEntity<MitigationKnowledgeBaseResponseDTO> fork(
            @PathVariable Long id,
            @RequestBody MitigationKnowledgeBaseForkRequestDTO request,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        MitigationKnowledgeBase fork = knowledgeBaseService.forkKnowledgeBase(
                id,
                request.getName(),
                request.getDescription(),
                username,
                isAdmin);
        return ResponseEntity.status(HttpStatus.CREATED).body(new MitigationKnowledgeBaseResponseDTO(fork));
    }
}
