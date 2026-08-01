package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.configuration.RiskConfigurationUpdateRequest;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.ConfigurationService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for risk framework configurations.
 *
 * <p>Configurations define the questionnaire, categories, risk bands, matrices,
 * and thresholds used by the calculation engine. The controller delegates
 * ownership, sharing, and admin checks to {@link ConfigurationService}.</p>
 */
@RestController
@RequestMapping("/api/configurations")
public class ConfigurationController {

    private final ConfigurationService configService;

    /**
     * Creates the controller with the service that owns configuration lifecycle
     * rules.
     */
    public ConfigurationController(ConfigurationService configService) {
        this.configService = configService;
    }

    /**
     * Returns all configurations visible to the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<Configuration>> getAllConfigurations(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        return ResponseEntity.ok(configService.getAllConfigurations(username, isAdmin));
    }

    /**
     * Returns one configuration by ID, including its questionnaire and scoring
     * structure.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Configuration> getConfiguration(@PathVariable Long id, JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        return ResponseEntity.ok(configService.getConfigurationById(id, username, isAdmin));
    }

    /**
     * Creates a new configuration owned by the authenticated user.
     *
     * <p>The request body is a full configuration aggregate rather than a small
     * DTO because configuration editing works on the framework structure itself.</p>
     */
    @PostMapping
    public ResponseEntity<Configuration> createConfiguration(
            @RequestBody Configuration config,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        Configuration created = configService.createConfiguration(config, username);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    /**
     * Copies an existing configuration into a new user-owned configuration.
     *
     * <p>Forking lets users customize a bundled or shared framework without
     * modifying the original version used by other assessments.</p>
     */
    @PostMapping("/{id}/fork")
    public ResponseEntity<Configuration> forkConfiguration(
            @PathVariable Long id,
            @RequestParam String newConfigName,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        Configuration newConfig = configService.forkConfiguration(id, newConfigName, username, isAdmin);
        return ResponseEntity.ok(newConfig);
    }

    /**
     * Applies an edit request to an existing configuration.
     *
     * <p>The service validates whether the caller can modify the target
     * configuration and whether the updated framework remains consistent.</p>
     */
    @PutMapping("/{id}")
    public ResponseEntity<Void> updateConfiguration(
            @PathVariable Long id,
            @RequestBody RiskConfigurationUpdateRequest request,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        configService.updateConfiguration(id, request, username, isAdmin);
        return ResponseEntity.ok().build();
    }

    /**
     * Deletes a configuration if it is editable by the caller and not protected
     * by service-level rules.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConfiguration(@PathVariable Long id, JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        boolean isAdmin = SecurityUtils.isAdminRole(token);

        configService.deleteConfiguration(id, username, isAdmin);
        return ResponseEntity.noContent().build();
    }

    // Controller-local exception handlers convert configuration validation and
    // database uniqueness failures into conflict responses with a predictable
    // JSON shape for the frontend.

    /**
     * Reports invalid configuration operations, such as duplicate names or
     * inconsistent framework structures.
     */
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleBadRequestExceptions(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
    }

    /**
     * Reports database uniqueness conflicts using a stable message.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolationException(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "A configuration with this name already exists."));
    }
}
