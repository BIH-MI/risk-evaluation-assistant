package org.bihealth.mi.risk_assessment_api.enums;

import java.util.Locale;
import java.util.Optional;

/**
 * Criteria of a Knowledge Base plan-selection policy. A policy applies its enabled criteria
 * lexicographically in the configured order; there is no weighting. Criteria are stored as their
 * names so existing Knowledge Base versions stay readable.
 */
public enum PlanSelectionCriterion {
    // Feasibility filters: INVALID and INCOMPATIBLE plans are never selectable, whether or not a
    // policy lists these criteria. They are kept so a policy documents the filter explicitly.
    REJECT_INVALID,
    REJECT_INCOMPATIBLE,
    COVER_ACTIONABLE_CRITICAL_DRIVERS,
    PREFER_HIGH_DRIVER_COVERAGE,
    PREFER_FEWER_UNRESOLVED_PROJECT_CHECKS,
    PREFER_FEWER_ACTIONS,
    PREFER_LOWER_KNOWN_COST,
    PREFER_SHORTER_KNOWN_SETUP_TIME,
    STABLE_ACTION_CODE_TIE_BREAK;

    public static Optional<PlanSelectionCriterion> parse(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(code.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
