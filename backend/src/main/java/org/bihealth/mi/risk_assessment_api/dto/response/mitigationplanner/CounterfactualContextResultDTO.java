package org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner;

import java.util.ArrayList;
import java.util.List;

import org.bihealth.mi.risk_assessment_api.enums.RiskThresholdSource;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Baseline versus hypothetical context-risk result of selected context controls.
 *
 * <p>Projected values come from the existing REA risk engine evaluated on in-memory answers;
 * they are not effectiveness predictions.</p>
 */
@Data
@NoArgsConstructor
public class CounterfactualContextResultDTO {

    public enum Status { VALID, INVALID }

    private Status status = Status.VALID;
    private String invalidReason;

    // Context-only what-if: Impact and T stay fixed, so one value applies to both states.
    private Double targetThreshold;
    private RiskThresholdSource thresholdSource;

    // Dataset Impact band; unchanged by context-only what-ifs.
    private String impactBand;

    private ContextRiskState baseline;
    private ContextRiskState projected;

    private boolean actionsApplied;
    private boolean riskChanged;

    private List<AppliedAction> appliedActions = new ArrayList<>();
    private List<AppliedQuestionChange> appliedQuestionChanges = new ArrayList<>();
    private List<ConflictingQuestionMapping> conflictingQuestionMappings = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();

    // Explanatory diagnostics of the projected (in-memory) answer set. They never feed back into
    // the risk computation.
    private List<RemainingHighRiskTrigger> remainingHighRiskTriggers = new ArrayList<>();
    private List<CategoryOutcome> categoryOutcomes = new ArrayList<>();

    private ContextRiskMatrix matrix;

    /** Why a context category has (or has not) moved in the counterfactual result. */
    public enum CategoryOutcomeReason {
        // The recalculated band differs from the baseline band.
        BAND_CHANGED,
        // A projected answer is still a high-risk trigger, so the engine keeps the override band.
        HIGH_RISK_TRIGGERS_REMAIN,
        // Answers changed and no trigger remains, but the normalized score stays in the same band.
        SAME_SCORE_BAND,
        // None of the selected controls changes an answer in this category.
        NOT_ADDRESSED
    }

    /** A high-risk-trigger answer that is still selected after all projected changes. */
    @Data
    @NoArgsConstructor
    public static class RemainingHighRiskTrigger {
        private String categoryCode;
        private String questionCode;
        private String questionText;
        private String selectedOptionText;
    }

    @Data
    @NoArgsConstructor
    public static class CategoryOutcome {
        private String categoryCode;
        private String categoryLabel;
        private String baselineBand;
        private String projectedBand;
        private int changedAnswerCount;
        private int remainingHighRiskTriggerCount;
        private CategoryOutcomeReason reason;
    }

    @Data
    @NoArgsConstructor
    public static class ContextRiskState {
        private String controlsBand;
        private String likelihoodBand;
        private Double attackProbability;
        private Double recommendedAnonymizationThreshold;
    }

    @Data
    @NoArgsConstructor
    public static class AppliedAction {
        private Long actionId;
        private String actionName;
    }

    @Data
    @NoArgsConstructor
    public static class AppliedQuestionChange {
        // Every selected action that projects this same change.
        private List<String> actionNames = new ArrayList<>();
        private String frameworkName;
        private String questionCode;
        private String questionText;
        private String currentOptionText;
        private String currentOptionImpact;
        private boolean currentOptionHighRiskTrigger;
        private String projectedOptionText;
        private String projectedOptionImpact;
        private boolean projectedOptionHighRiskTrigger;
        // The in-memory answer no longer selects a high-risk trigger option.
        private boolean highRiskTriggerRemoved;
        // A non-trigger NEGATIVE answer is replaced by a non-negative projected answer.
        private boolean negativeFindingAddressed;
    }

    @Data
    @NoArgsConstructor
    public static class ConflictingQuestionMapping {
        private String frameworkName;
        private String questionText;
        private String currentOptionText;
        private List<ConflictingProjection> projections = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class ConflictingProjection {
        private List<String> actionNames = new ArrayList<>();
        private String projectedOptionText;
    }

    /** The configured Controls x Likelihood matrix of the Recipient Assessment's framework. */
    @Data
    @NoArgsConstructor
    public static class ContextRiskMatrix {
        // Band labels ordered from lowest to highest configured range.
        private List<String> controlsBands = new ArrayList<>();
        private List<String> likelihoodBands = new ArrayList<>();
        private List<MatrixCell> cells = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class MatrixCell {
        private String controlsBand;
        private String likelihoodBand;
        private Double attackProbability;
    }
}
