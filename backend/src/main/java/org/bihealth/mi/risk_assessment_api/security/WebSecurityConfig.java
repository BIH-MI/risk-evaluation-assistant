package org.bihealth.mi.risk_assessment_api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

/**
 * The main web security configuration for the application.
 * Enables Spring Security and configures CORS, JWT handling, and endpoint authorization rules.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    private final JwtAuthenticationTokenConverter jwtAuthenticationTokenConverter;

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Value("${jwt.auth.converter.resource-id}")
    private String audience;

    public WebSecurityConfig(JwtAuthenticationTokenConverter jwtAuthenticationTokenConverter) {
        this.jwtAuthenticationTokenConverter = jwtAuthenticationTokenConverter;
    }
    
    /**
     * Provides the JwtDecoder bean, which is responsible for validating the signature of incoming JWTs
     * against the JSON Web Key (JWK) set provided by the Keycloak issuer.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> audienceValidator = jwt ->
                jwt.getAudience() != null && jwt.getAudience().contains(audience)
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(new OAuth2Error(
                                "invalid_token", "Token is not intended for this API.", null));
        // Supplying a JWK URL does not itself constrain the token's issuer/audience.
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuerUri), audienceValidator));
        return decoder;
    }

    /**
     * Defines the Cross-Origin Resource Sharing (CORS) policy for the application.
     * This is crucial for allowing frontend applications from different origins (e.g., http://localhost:3000)
     * to access the API.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("*"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Configures the main security filter chain that protects all HTTP endpoints.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.cors(c -> c.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authorizeHttpRequests -> authorizeHttpRequests
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // Public model weights loaded by the browser's AI worker, which sends no token.
                        .requestMatchers(HttpMethod.GET, "/api/ai-models/*/files/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth2ResourceServer ->
                        oauth2ResourceServer.jwt(jwt ->
                                jwt.jwtAuthenticationConverter(jwtAuthenticationTokenConverter)))
                .sessionManagement(sessionManagement ->
                        sessionManagement.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .build();
    }
}