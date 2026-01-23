package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.EntityLockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * REST controller for managing entity locks.
 * This provides a simple optimistic locking mechanism to prevent two users from
 * editing the same entity simultaneously in the UI.
 */
@RestController
@RequestMapping("/api/locks")
public class EntityLockController {
    @Autowired
    private EntityLockService lockService;

    /**
     * Acquires a lock on a specific entity for the current user.
     * The lock's duration is automatically set to the expiry time of the user's JWT.
     *
     * @param type  The type of the entity to lock (e.g., "dataset", "recipient").
     * @param id    The ID of the entity to lock.
     * @param token The user's authentication token, used to get the username.
     * @return An empty ResponseEntity with a 200 OK status.
     */
    @PostMapping("/{type}/{id}")
    public ResponseEntity<Void> lockEntity(
            @PathVariable String type,
            @PathVariable String id,
            JwtAuthenticationToken token
    ) {
        // We no longer need the JWT expiration time.
        // As long as the user is authenticated, they can take/refresh the lock.
        String username = SecurityUtils.getUsername(token);

        lockService.acquireLock(type, id, username);
        return ResponseEntity.ok().build();
    }

    /**
     * Releases a lock on a specific entity held by the current user.
     *
     * @param entityType The type of the entity (e.g., "dataset").
     * @param entityId   The ID of the entity.
     * @param token      The user's authentication token.
     * @return An empty ResponseEntity with a 200 OK status.
     */
    @DeleteMapping("/{type}/{id}")
    public ResponseEntity<Void> unlock(
            @PathVariable("type") String entityType,
            @PathVariable("id")   String entityId,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        lockService.releaseLock(entityType.toUpperCase(), entityId, username);
        return ResponseEntity.ok().build();
    }

    /**
     * Checks who currently holds the lock for a specific entity.
     *
     * @param entityType The type of the entity.
     * @param entityId   The ID of the entity.
     * @return A ResponseEntity containing the username of the lock holder, or 204 NO CONTENT if not locked.
     */
    @GetMapping("/{type}/{id}")
    public ResponseEntity<Map<String,String>> who(
            @PathVariable("type") String entityType,
            @PathVariable("id")   String entityId
    ) {
        return lockService.whoHasLock(entityType.toUpperCase(), entityId)
                .map(user -> ResponseEntity.ok(Map.of("lockedBy", user)))
                .orElse(ResponseEntity.noContent().build());
    }

    /**
     * Retrieves lock information for a given list of entity IDs of the same type.
     *
     * @param entityType The type of the entities.
     * @param ids        A list of entity IDs to check for locks.
     * @return A list of lock information objects for the requested IDs.
     */
    @PostMapping("/{type}")
    public List<Map<String,Object>> getLocks(
            @PathVariable("type") String entityType,
            @RequestBody List<String> ids
    ) {
        return lockService.findAllLocks().stream()
                .filter(lock -> lock.getEntityType().equalsIgnoreCase(entityType)
                        && ids.contains(lock.getEntityId()))
                .map(lock -> Map.<String,Object>of(
                        "entityType", lock.getEntityType(),
                        "entityId", lock.getEntityId(),
                        "lockedBy", lock.getUsername(),
                            "lockedAt", lock.getLockedAt(),
                        "expiresAt", lock.getExpiresAt()
                ))
                .collect(Collectors.toList());
    }
}