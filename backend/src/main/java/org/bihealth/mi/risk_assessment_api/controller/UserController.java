package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.service.KeycloakUserService;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST controller for fetching user information from the Keycloak identity provider.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final KeycloakUserService keycloakUserService;

    public UserController(KeycloakUserService keycloakUserService) {
        this.keycloakUserService = keycloakUserService;
    }

    /**
     * Retrieves a list of users from Keycloak, optionally filtered by a search string.
     *
     * @param search An optional string to filter users by username, first name, or last name.
     * @return A ResponseEntity containing a list of users with a limited set of fields.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getUsers(
            @RequestParam(value = "search", required = false, defaultValue = "") String search
    ) {
        List<UserRepresentation> users;

        if (search.isEmpty()) {
            users = keycloakUserService.findUsersByName("");
        } else {
            users = keycloakUserService.findUsersByName(search);
        }

        // Map users to only required fields
        List<Map<String, Object>> filteredUsers = users.stream().map(user -> {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("firstName", user.getFirstName());
            userMap.put("lastName", user.getLastName());
            // userMap.put("email", user.getEmail());
            userMap.put("username", user.getUsername());
            // userMap.put("attributes", user.getAttributes());
            return userMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(filteredUsers);
    }

    /**
     * Retrieves user details for a given list of usernames in a single batch request.
     *
     * @param usernames A list of usernames to fetch from Keycloak.
     * @return A ResponseEntity containing a list of user details.
     */
    @PostMapping(
            path = "/batch",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<Map<String, Object>>> getUsersByUsernames(
            @RequestBody List<String> usernames
    ) {
        List<UserRepresentation> users = keycloakUserService.getUsersByUsernames(usernames);

        // Map each UserRepresentation to only the fields you want
        List<Map<String, Object>> result = users.stream().map(user -> {
            Map<String, Object> m = new HashMap<>();
            m.put("username", user.getUsername());
            m.put("firstName", user.getFirstName());
            m.put("lastName", user.getLastName());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}