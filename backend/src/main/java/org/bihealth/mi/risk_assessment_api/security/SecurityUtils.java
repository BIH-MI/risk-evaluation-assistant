package org.bihealth.mi.risk_assessment_api.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * A final utility class for common, reusable security-related operations.
 * Prevents instantiation with a private constructor.
 */
public final class SecurityUtils {

    // Private constructor to prevent instantiation
    private SecurityUtils() {
    }

    public static boolean isAdminRole(Authentication principal) {
        return hasAuthority(principal, "ROLE_ADMIN");
    }

    public static boolean isUserRole(Authentication principal) {
        return hasAuthority(principal, "ROLE_USER");
    }

    public static String getUsername(Authentication principal) {
        if (principal instanceof JwtAuthenticationToken) {
            return principal.getName();
        }
        return null; // or throw an exception
    }

    private static boolean hasAuthority(Authentication principal, String authority) {
        if (principal instanceof JwtAuthenticationToken) {
            return principal.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(auth -> auth.equals(authority));
        }
        return false;
    }
}