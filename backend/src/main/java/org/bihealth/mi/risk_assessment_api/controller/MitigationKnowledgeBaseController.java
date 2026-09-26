package org.bihealth.mi.risk_assessment_api.controller;

import lombok.Data;
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

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/mitigation-knowledge-bases")
public class MitigationKnowledgeBaseController {

    private final MitigationKnowledgeBaseService knowledgeBaseService;

    public MitigationKnowledgeBaseController(MitigationKnowledgeBaseService knowledgeBaseService) {
        this.knowledgeBaseService = knowledgeBaseService;
    }

    @GetMapping
    public ResponseEntity<List<MitigationKnowledgeBaseDTO>> list(
            @RequestParam(defaultValue = "false") boolean activeOnly,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(knowledgeBaseService.listKnowledgeBases(activeOnly, isAdmin).stream()
                .map(MitigationKnowledgeBaseDTO::new)
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MitigationKnowledgeBaseDTO> get(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(new MitigationKnowledgeBaseDTO(knowledgeBaseService.getKnowledgeBase(id, isAdmin)));
    }

    @PostMapping
    public ResponseEntity<MitigationKnowledgeBaseDTO> create(
            @RequestBody MitigationKnowledgeBaseRequest request,
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
        return ResponseEntity.status(HttpStatus.CREATED).body(new MitigationKnowledgeBaseDTO(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MitigationKnowledgeBaseDTO> update(
            @PathVariable Long id,
            @RequestBody MitigationKnowledgeBaseRequest request,
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
        return ResponseEntity.ok(new MitigationKnowledgeBaseDTO(updated));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<MitigationKnowledgeBaseDTO> archive(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(new MitigationKnowledgeBaseDTO(
                knowledgeBaseService.archiveKnowledgeBase(id, isAdmin)));
    }

    @PostMapping("/{id}/default")
    public ResponseEntity<MitigationKnowledgeBaseDTO> setDefault(
            @PathVariable Long id,
            JwtAuthenticationToken token
    ) {
        boolean isAdmin = SecurityUtils.isAdminRole(token);
        return ResponseEntity.ok(new MitigationKnowledgeBaseDTO(
                knowledgeBaseService.setDefaultKnowledgeBase(id, isAdmin)));
    }

    @PostMapping("/{id}/fork")
    public ResponseEntity<MitigationKnowledgeBaseDTO> fork(
            @PathVariable Long id,
            @RequestBody MitigationKnowledgeBaseForkRequest request,
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
        return ResponseEntity.status(HttpStatus.CREATED).body(new MitigationKnowledgeBaseDTO(fork));
    }

    @Data
    public static class MitigationKnowledgeBaseRequest {
        private String name;
        private String description;
        private Boolean active;
        private Boolean defaultKnowledgeBase;
    }

    @Data
    public static class MitigationKnowledgeBaseForkRequest {
        private String name;
        private String description;
    }

    @Data
    public static class MitigationKnowledgeBaseDTO {
        private Long id;
        private String name;
        private String description;
        private boolean active;
        private boolean defaultKnowledgeBase;
        private int currentVersion;
        private int versionCount;
        private String creatorUsername;
        private LocalDateTime creationDate;
        private LocalDateTime lastModifiedDate;

        public MitigationKnowledgeBaseDTO(MitigationKnowledgeBase knowledgeBase) {
            this.id = knowledgeBase.getId();
            this.name = knowledgeBase.getName();
            this.description = knowledgeBase.getDescription();
            this.active = knowledgeBase.isActive();
            this.defaultKnowledgeBase = knowledgeBase.isDefaultKnowledgeBase();
            this.currentVersion = knowledgeBase.getCurrentVersion();
            this.versionCount = knowledgeBase.getVersions() == null ? 0 : knowledgeBase.getVersions().size();
            this.creatorUsername = knowledgeBase.getCreatorUsername();
            this.creationDate = knowledgeBase.getCreationDate();
            this.lastModifiedDate = knowledgeBase.getLastModifiedDate();
        }
    }
}
