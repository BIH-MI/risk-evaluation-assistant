package org.bihealth.mi.risk_assessment_api.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.AiModelInstallationService;
import org.bihealth.mi.risk_assessment_api.service.AiModelInstallationService.Status;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

/**
 * Installation status of the browser-local AI models, installation by administrators, and the
 * model files themselves. Files are served from this origin so that browsers never contact an
 * external service; they contain only public model weights and tokenizers.
 */
@RestController
@RequestMapping("/api/ai-models")
public class AiModelController {

    private final AiModelInstallationService installationService;

    public AiModelController(AiModelInstallationService installationService) {
        this.installationService = installationService;
    }

    @GetMapping
    public List<Status> getModels() {
        return installationService.getStatuses();
    }

    @PostMapping("/{id}/install")
    public ResponseEntity<Status> installModel(@PathVariable String id, JwtAuthenticationToken token) {
        if (!SecurityUtils.isAdminRole(token)) {
            throw new SecurityException("Only administrators can install AI models.");
        }
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(installationService.requestInstall(id));
    }

    /**
     * A file of an installed model. Public (the browser's model loader sends no credentials), but
     * limited to the files the registry lists for the pinned revision. Paths contain the revision,
     * so responses can be cached indefinitely.
     */
    @GetMapping("/{id}/files/{revision}/**")
    public ResponseEntity<Resource> getModelFile(
            @PathVariable String id,
            @PathVariable String revision,
            HttpServletRequest request
    ) {
        String pattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String file = new AntPathMatcher().extractPathWithinPattern(pattern, path);
        return installationService.findInstalledFile(id, revision, file)
                .map(stored -> ResponseEntity.ok()
                        .contentType(contentType(stored))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .<Resource>body(new FileSystemResource(stored)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private static MediaType contentType(Path file) {
        return file.getFileName().toString().endsWith(".json")
                ? MediaType.APPLICATION_JSON
                : MediaType.APPLICATION_OCTET_STREAM;
    }
}
