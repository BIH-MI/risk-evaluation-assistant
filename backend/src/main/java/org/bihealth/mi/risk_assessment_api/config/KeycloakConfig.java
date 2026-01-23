package org.bihealth.mi.risk_assessment_api.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class for setting up the Keycloak Admin Client.
 * This client is used by the application to interact with the Keycloak API,
 * for tasks like fetching user information.
 */
@Configuration
public class KeycloakConfig {

    @Value("${keycloak.auth-server-url}")
    private String serverUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.username}")
    private String username;

    @Value("${keycloak.admin.password}")
    private String password;

    /**
     * Creates and configures the singleton Keycloak admin client bean.
     * This bean can then be injected into services that need to communicate
     * with Keycloak.
     *
     * @return A configured Keycloak client instance.
     */
    @Bean
    public Keycloak keycloakAdminClient() {
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm("master")            // authenticate against master for admin-cli
                .clientId(clientId)
                .username(username)
                .password(password)
                .build();
    }
}

