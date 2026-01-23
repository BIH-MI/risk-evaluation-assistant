package org.bihealth.mi.risk_assessment_api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * A custom Spring Security converter that processes an incoming JWT from Keycloak.
 * Its main purposes are to extract realm-level roles from the token and to set the
 * user's preferred username as the principal in the SecurityContext.
 */
@Component
public class JwtAuthenticationTokenConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private static final JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

    @Value("${jwt.auth.converter.resource-id}")
    private String resourceId;

    @Value("${jwt.auth.converter.principal-attribute}")
    private String principalAttribute;

    /**
     * Converts a raw JWT into a JwtAuthenticationToken, including custom authorities.
     *
     * @param jwt The raw JWT decoded by Spring Security.
     * @return An AbstractAuthenticationToken containing the user's principal and authorities.
     */
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities =
                Stream.concat(jwtGrantedAuthoritiesConverter.convert(jwt).stream(), extractRealmRoles(jwt).stream())
                        .collect(Collectors.toSet());
        String claimName = principalAttribute == null ? JwtClaimNames.SUB : principalAttribute;
        return new JwtAuthenticationToken(jwt, authorities, jwt.getClaim(claimName));
    }

    /**
     * A helper method to extract roles from the 'realm_access' claim within the JWT.
     *
     * @param jwt The raw JWT.
     * @return A collection of GrantedAuthority objects representing the user's roles.
     */
    private Collection<? extends GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        Collection<String> roles;
        if (realmAccess == null || (roles = (Collection<String>) realmAccess.get("roles")) == null) {
            return Collections.emptySet();
        }
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toSet());
    }
}