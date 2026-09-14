package org.bihealth.mi.risk_assessment_api.utils;

import java.util.Locale;

/**
 * Shared normalization rules for top-level user-facing resource names.
 */
public final class EntityNameNormalizer {

    private EntityNameNormalizer() {
    }

    public static String normalizeForStorage(String name) {
        return name == null ? null : name.trim();
    }

    public static String normalizeForComparison(String name) {
        String normalized = normalizeForStorage(name);
        return normalized == null ? null : normalized.toLowerCase(Locale.ROOT);
    }
}
