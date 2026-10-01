package org.bihealth.mi.risk_assessment_api.utils;

import java.util.Locale;

/**
 * Stable question/option codes used as identity by Knowledge Base mappings.
 *
 * <p>Codes from a configuration are kept (upper-cased). Missing codes are derived from the
 * text with bracketed framework prefixes such as {@code [CIT-03]} removed, so a mapping can
 * reference a question without depending on its display wording or database id. Kept in one
 * place so configuration import and consistency tests generate identical codes.</p>
 */
public final class QuestionnaireCodes {

    private static final int MAX_GENERATED_LENGTH = 120;

    private QuestionnaireCodes() {
    }

    public static String stableCodeOrGenerated(String currentCode, String text, String fallbackPrefix) {
        String normalizedCode = trimToNull(currentCode);
        if (normalizedCode != null) {
            return normalizedCode.toUpperCase(Locale.ROOT);
        }

        String source = trimToNull(text);
        if (source == null) {
            return null;
        }

        String generated = source
                .replaceAll("\\[[^]]*]", " ")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "")
                .toUpperCase(Locale.ROOT);
        if (generated.isEmpty()) {
            return fallbackPrefix;
        }
        return generated.length() <= MAX_GENERATED_LENGTH
                ? generated
                : generated.substring(0, MAX_GENERATED_LENGTH).replaceAll("_+$", "");
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
