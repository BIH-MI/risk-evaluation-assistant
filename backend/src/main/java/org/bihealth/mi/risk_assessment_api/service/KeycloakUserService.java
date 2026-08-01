package org.bihealth.mi.risk_assessment_api.service;


import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Service for interacting with the Keycloak Admin API to fetch user information.
 *
 * It acts as a wrapper around the official Keycloak Admin Client.
 * The application uses it mainly to resolve usernames for sharing/search UI,
 * not to manage authentication itself.
 */
@Service
public class KeycloakUserService {

    // Admin client configured elsewhere with credentials and server URL.
    private final Keycloak keycloak;

    // Realm whose users are visible to the application.
    @Value("${keycloak.realm}")
    private String realm;

    /**
     * Creates the service with the configured Keycloak Admin client.
     */
    public KeycloakUserService(Keycloak keycloak) {
        this.keycloak = keycloak;
    }

    /**
     * Fetches a paginated list of all users in the configured realm.
     *
     * @param first The starting index of the user list.
     * @param max   The maximum number of users to return.
     * @return A list of Keycloak UserRepresentation objects.
     */
    public List<UserRepresentation> listUsers(int first, int max) {
        // Use Keycloak pagination directly so callers can control result size.
        return keycloak
                .realm(realm)
                .users()
                .list(first, max);
    }

    /**
     * Searches for users in Keycloak by a given search string.
     * The search can match username, first name, last name, or email.
     *
     * @param search The search string.
     * @return A list of matching UserRepresentation objects.
     */
    public List<UserRepresentation> findUsersByName(String search) {
        // The Keycloak search endpoint handles username/name/email matching.
        UsersResource usersResource = keycloak.realm(realm).users();
        return usersResource.search(search, 0, 100);
    }

    /**
     * Fetches exactly one user by their username (exact match).
     *
     * @param username The exact username to search for.
     * @return The matching UserRepresentation, or null if not found.
     */
    public UserRepresentation getUserByUsername(String username) {
        // Limit to one result because callers only need the representation used
        // to display an existing username.
        List<UserRepresentation> matches = keycloak
                .realm(realm)
                .users()
                .search(username, 0, 1);
        return matches.isEmpty() ? null : matches.get(0);
    }

    /**
     * Performs a batch lookup of users from a list of usernames.
     *
     * @param usernames The list of usernames to fetch.
     * @return A list of found UserRepresentation objects. Any usernames not found are omitted.
     */
    public List<UserRepresentation> getUsersByUsernames(List<String> usernames) {
        // Preserve input order for users that are found; missing users are simply omitted.
        return usernames.stream()
                .map(this::getUserByUsername)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}
