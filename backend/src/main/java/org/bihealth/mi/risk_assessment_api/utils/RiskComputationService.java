package org.bihealth.mi.risk_assessment_api.utils;

import org.bihealth.mi.risk_assessment_api.model.configuration.*;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Core risk engine for the REA anonymization recommendation.
 *
 * <p>The engine deliberately separates the calculation into three concepts:</p>
 *
 * <p>1. Dataset impact, represented by the IMPACT category. This decides T, the
 * acceptable re-identification threshold for the dataset.</p>
 *
 * <p>2. Recipient context, represented by the LIKELIHOOD and CONTROLS categories.
 * These decide P_attack through the configured risk matrix.</p>
 *
 * <p>3. Final recommended anonymization threshold:
 * R_anonymization = min(1.0, T / P_attack).</p>
 *
 * <p>The formula is intentionally kept here. Variation in results must come from
 * correct question scoring, category banding, threshold mapping, and risk-matrix
 * configuration rather than hard-coded final values.</p>
 */
@Service
public class RiskComputationService {

    private static final Logger log = LoggerFactory.getLogger(RiskComputationService.class);

    /**
     * Calculates the recommended anonymization threshold for one data-sharing activity.
     *
     * <p>The caller passes the combined dataset and recipient answers, plus the two
     * configurations used to create those assessments. Dataset configuration is used
     * to resolve the IMPACT threshold T. Recipient configuration is used to resolve
     * the context-risk matrix value P_attack.</p>
     *
     * @param answers all answers from the dataset assessment and recipient assessment
     * @param datasetConfig configuration that owns the dataset IMPACT thresholds
     * @param recipientConfig configuration that owns the recipient risk matrix
     * @param manualThreshold optional override for T; if null, T is derived from IMPACT
     * @return complete result object containing final threshold, context risk, bands, and diagnostics
     */
    public GenericCalculationResult calculateTotalRisk(
            List<Answer> answers,
            Configuration datasetConfig,
            Configuration recipientConfig,
            Double manualThreshold
    ) {

        /*
         * STEP 0: Group answers by risk category.
         *
         * Examples:
         * - IMPACT answers describe how sensitive or identifying the dataset is.
         * - LIKELIHOOD answers describe recipient motivation/opportunity.
         * - CONTROLS answers describe contractual, technical, and organizational safeguards.
         *
         * Invalid/incomplete answers without a question/category are ignored because
         * they cannot contribute to a configured category band.
         */
        Map<RiskCategory, List<Answer>> groupedAnswers = answers.stream()
                .filter(a -> a.getQuestion() != null && a.getQuestion().getCategory() != null)
                .collect(Collectors.groupingBy(a -> a.getQuestion().getCategory()));

        Map<String, CategoryResult> categoryBreakdown = new HashMap<>();
        boolean anyHighRiskTriggered = false;

        for (Map.Entry<RiskCategory, List<Answer>> entry : groupedAnswers.entrySet()) {
            RiskCategory category = entry.getKey();
            List<Answer> catAnswers = entry.getValue();

            /*
             * Raw score is the weighted sum of selected option scores:
             * category raw score = sum(question weight * selected option score).
             *
             * The counts are diagnostic metadata for the UI/report. They do not drive
             * the final formula directly, but they explain why a category moved.
             */
            double rawScore = 0.0;
            boolean categoryHighRisk = false;
            int positiveCount = 0;
            int neutralCount = 0;
            int negativeCount = 0;
            int highRiskCount = 0;

            for (Answer a : catAnswers) {
                double weight = a.getQuestion() != null ? a.getQuestion().getWeight() : 1.0;
                double score = a.getSelectedOption() != null ? a.getSelectedOption().getScore() : 0.0;

                rawScore += (weight * score);

                if (a.getSelectedOption() != null) {
                    if (a.getSelectedOption().isHighRiskTrigger()) {
                        /*
                         * A high-risk trigger is an instant category-level override.
                         * It does not directly hard-code the final risk. It only forces
                         * the affected category into its configured trigger band.
                         */
                        categoryHighRisk = true;
                        anyHighRiskTriggered = true;
                        highRiskCount++;
                    } else {
                        // Tally standard impact occurrences ONLY if it's not a trigger
                        String impact = a.getSelectedOption().getImpact();
                        if ("POSITIVE".equalsIgnoreCase(impact)) {
                            positiveCount++;
                        } else if ("NEGATIVE".equalsIgnoreCase(impact)) {
                            negativeCount++;
                        } else if ("NEUTRAL".equalsIgnoreCase(impact)) {
                            neutralCount++;
                        }
                    }
                }
            }

            /*
             * Bands in the JSON configs are defined on a 0-100 scale. Since raw scores
             * depend on the number of questions and their weights, raw scores must be
             * normalized before matching a LOW/MEDIUM/HIGH/etc. band.
             */
            double maxPossibleScore = calculateMaxPossibleScore(catAnswers);
            double normalizedScore = maxPossibleScore > 0.0
                    ? Math.min(100.0, (rawScore / maxPossibleScore) * 100.0)
                    : 0.0;

            RiskBand matchedBand = categoryHighRisk
                    ? selectHighRiskTriggerBand(category)
                    : matchBand(normalizedScore, category.getRiskBands());

            categoryBreakdown.put(normalizeKey(category.getCode()), new CategoryResult(
                    rawScore,
                    normalizedScore,
                    matchedBand,
                    categoryHighRisk,
                    category.getAssessmentPhase(),
                    positiveCount,
                    neutralCount,
                    negativeCount,
                    highRiskCount
            ));
        }

        /*
         * STEP 1: Resolve T, the acceptable re-identification threshold.
         *
         * The IMPACT category is the only category allowed to choose T. For example,
         * IMPACT=LOW may map to T=0.10, while IMPACT=HIGH may map to T=0.05.
         * A manual threshold can override the configured lookup when explicitly passed.
         */
        CategoryResult impactResult = categoryBreakdown.get("IMPACT");

        String impactBandLabel = (impactResult != null && impactResult.getMatchedBand() != null)
                ? impactResult.getMatchedBand().getLabel()
                : "UNKNOWN";

        Double thresholdVar = manualThreshold != null
                ? manualThreshold
                : resolveThreshold(datasetConfig, impactBandLabel);

        /*
         * STEP 2: Resolve P_attack, called contextRisk in the code.
         *
         * The configured risk matrix maps category band combinations to an attack
         * probability. For example:
         *   CONTROLS=HIGH + LIKELIHOOD=LOW -> low P_attack
         *   CONTROLS=LOW  + LIKELIHOOD=HIGH -> high P_attack
         */
        Double contextRisk = 1.0;
        Map<String, String> appliedConditions = null;

        if (recipientConfig != null && recipientConfig.getRiskMatrices() != null) {
            for (RiskMatrix matrix : recipientConfig.getRiskMatrices()) {
                if (matchesMatrix(matrix, categoryBreakdown)) {
                    contextRisk = matrix.getContextRisk();
                    appliedConditions = matrix.getConditions();
                    break;
                }
            }
        }

        /*
         * STEP 3: Apply the R_anonymization formula:
         *
         * R_anonymization = min(1.0, T / P_attack)
         *
         * A smaller context risk means a more trusted/controlled recipient context
         * and can permit a higher anonymization threshold. A larger context risk
         * means stronger anonymization is recommended.
         */
        Double safeContextRisk = (contextRisk == null || contextRisk <= 0) ? 0.0001 : contextRisk;
        Double finalRiskScore = Math.min(1.0, (thresholdVar / safeContextRisk));

        // Final qualitative classification maps directly to the strict Dataset Impact band
        String finalRiskClassification = impactBandLabel;

        return new GenericCalculationResult(
                finalRiskScore,
                finalRiskClassification,
                contextRisk,
                appliedConditions,
                anyHighRiskTriggered,
                categoryBreakdown,
                thresholdVar
        );
    }

    /**
     * Calculates the denominator used for category normalization.
     *
     * <p>Each question can have a different weight and option scale. This method
     * computes the maximum score the answered questions could have produced, so the
     * category raw score can be converted into a comparable 0-100 percentage.</p>
     */
    private double calculateMaxPossibleScore(List<Answer> answers) {
        return answers.stream()
                .filter(answer -> answer.getQuestion() != null && answer.getQuestion().getOptions() != null)
                .mapToDouble(answer -> {
                    double maxOptionScore = answer.getQuestion().getOptions().stream()
                            .mapToDouble(option -> Math.max(0.0, option.getScore()))
                            .max()
                            .orElse(0.0);
                    return answer.getQuestion().getWeight() * maxOptionScore;
                })
                .sum();
    }

    /**
     * Selects the category band to use when any selected option is marked as an
     * instant high-risk trigger.
     *
     * <p>For risk-increasing categories such as IMPACT and LIKELIHOOD, a trigger
     * moves the category to the highest risk band. For risk-decreasing categories
     * such as CONTROLS, a trigger means a critical safeguard failed, so protection
     * drops to the weakest controls band.</p>
     */
    private RiskBand selectHighRiskTriggerBand(RiskCategory category) {
        if (category.getRiskBands() == null || category.getRiskBands().isEmpty()) {
            return unknownBand();
        }

        if ("DECREASES_RISK".equalsIgnoreCase(category.getRiskEffect())) {
            // For protective controls, an instant fail drops protection to the weakest band.
            return category.getRiskBands().stream()
                    .min(Comparator.comparing(RiskBand::getRangeMinimum))
                    .orElseGet(this::unknownBand);
        }

        return category.getRiskBands().stream()
                .max(Comparator.comparing(RiskBand::getRangeMaximum))
                .orElseGet(this::unknownBand);
    }

    /**
     * Resolves T from the dataset configuration's re-identification threshold table.
     *
     * <p>The lookup key is the matched IMPACT band label. If the expected threshold
     * is missing, the method uses the smallest configured threshold as a conservative
     * fallback rather than silently allowing a permissive 100% threshold.</p>
     */
    private Double resolveThreshold(Configuration datasetConfig, String impactBandLabel) {
        if (datasetConfig == null || datasetConfig.getReidThresholds() == null || datasetConfig.getReidThresholds().isEmpty()) {
            log.warn("No re-identification thresholds configured; using conservative threshold 0.0");
            return 0.0;
        }

        String normalizedImpactBand = normalizeKey(impactBandLabel);
        Optional<Double> configuredThreshold = datasetConfig.getReidThresholds().stream()
                .filter(t -> normalizeKey(t.getRiskClassification()).equals(normalizedImpactBand))
                .map(ReidentificationThreshold::getThresholdValue)
                .findFirst();

        if (configuredThreshold.isPresent()) {
            return configuredThreshold.get();
        }

        double fallbackThreshold = datasetConfig.getReidThresholds().stream()
                .mapToDouble(ReidentificationThreshold::getThresholdValue)
                .min()
                .orElse(0.0);
        log.warn("No re-identification threshold configured for impact band '{}'; using conservative fallback {}",
                impactBandLabel, fallbackThreshold);
        return fallbackThreshold;
    }

    /**
     * Checks whether one configured risk-matrix row applies to the current category
     * breakdown.
     *
     * <p>A matrix row applies only when every condition matches the band selected for
     * that category. Category codes and band labels are normalized to avoid failures
     * caused only by case or whitespace differences.</p>
     */
    private boolean matchesMatrix(RiskMatrix matrix, Map<String, CategoryResult> categoryBreakdown) {
        if (matrix.getConditions() == null || matrix.getConditions().isEmpty()) {
            return false;
        }

        for (Map.Entry<String, String> condition : matrix.getConditions().entrySet()) {
            CategoryResult catRes = categoryBreakdown.get(normalizeKey(condition.getKey()));
            String matchedLabel = catRes != null && catRes.getMatchedBand() != null
                    ? normalizeKey(catRes.getMatchedBand().getLabel())
                    : "";
            if (!matchedLabel.equals(normalizeKey(condition.getValue()))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Maps a normalized 0-100 category score to one configured risk band.
     *
     * <p>Band ranges are treated as half-open intervals [minimum, maximum), except
     * for the final band, which includes its maximum. This avoids ambiguous boundary
     * matches when adjacent bands share a boundary, such as LOW ending at 10 and
     * MEDIUM starting at 10.</p>
     */
    private RiskBand matchBand(double score, List<RiskBand> bands) {
        if (bands == null || bands.isEmpty()) {
            return unknownBand();
        }

        List<RiskBand> sortedBands = bands.stream()
                .sorted(Comparator.comparing(RiskBand::getRangeMinimum)
                        .thenComparing(RiskBand::getRangeMaximum))
                .toList();

        for (int i = 0; i < sortedBands.size(); i++) {
            RiskBand band = sortedBands.get(i);
            boolean lastBand = i == sortedBands.size() - 1;
            if (score >= band.getRangeMinimum()
                    && (score < band.getRangeMaximum() || (lastBand && score <= band.getRangeMaximum()))) {
                return band;
            }
        }

        if (score < sortedBands.get(0).getRangeMinimum()) {
            return sortedBands.get(0);
        }
        return sortedBands.get(sortedBands.size() - 1);
    }

    /**
     * Creates a placeholder band for defensive result reporting when a configuration
     * is incomplete. Valid bundled configurations should normally never reach this.
     */
    private RiskBand unknownBand() {
        RiskBand fallback = new RiskBand();
        fallback.setLabel("UNKNOWN");
        return fallback;
    }

    /**
     * Normalizes category codes and band labels before lookup/comparison.
     */
    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Immutable result returned by the computation service.
     *
     * <p>The final risk score is the recommended anonymization threshold. The other
     * fields explain which threshold, matrix rule, context risk, and category bands
     * produced that score.</p>
     */
    public static class GenericCalculationResult {
        private final Double finalRiskScore;
        private final String finalRiskClassification;
        private final Double contextRisk;
        private final Map<String, String> appliedMatrixConditions;
        private final boolean highRiskTriggered;
        private final Map<String, CategoryResult> categoryBreakdown;
        private final Double threshold;

        public GenericCalculationResult(Double finalRiskScore,
                                        String finalRiskClassification,
                                        Double contextRisk,
                                        Map<String, String> appliedMatrixConditions,
                                        boolean highRiskTriggered,
                                        Map<String, CategoryResult> categoryBreakdown,
                                        Double threshold) {
            this.finalRiskScore = finalRiskScore;
            this.finalRiskClassification = finalRiskClassification;
            this.contextRisk = contextRisk;
            this.appliedMatrixConditions = appliedMatrixConditions;
            this.highRiskTriggered = highRiskTriggered;
            this.categoryBreakdown = categoryBreakdown;
            this.threshold = threshold;
        }

        public Double getFinalRiskScore() { return finalRiskScore; }
        public String getFinalRiskClassification() { return finalRiskClassification; }
        public Double getContextRisk() { return contextRisk; }
        public Map<String, String> getAppliedMatrixConditions() { return appliedMatrixConditions; }
        public boolean isHighRiskTriggered() { return highRiskTriggered; }
        public Map<String, CategoryResult> getCategoryBreakdown() { return categoryBreakdown; }
        public Double getThreshold() { return threshold; }
    }

    /**
     * Per-category diagnostic result.
     *
     * <p>This captures both the numeric category scores and the matched category
     * band. Reports and UI views use it to explain why the matrix selected a given
     * context risk or why the dataset mapped to a given threshold.</p>
     */
    public static class CategoryResult {
        private final double rawScore;
        private final double normalizedScore;
        private final RiskBand matchedBand;
        private final boolean highRiskTriggered;
        private final String categoryPhase;

        // Option impact counts
        private final int positiveCount;
        private final int neutralCount;
        private final int negativeCount;
        private final int highRiskCount;

        public CategoryResult(double rawScore,
                              double normalizedScore,
                              RiskBand matchedBand,
                              boolean highRiskTriggered,
                              String categoryPhase,
                              int positiveCount,
                              int neutralCount,
                              int negativeCount,
                              int highRiskCount)
        {
            this.rawScore = rawScore;
            this.normalizedScore = normalizedScore;
            this.matchedBand = matchedBand;
            this.highRiskTriggered = highRiskTriggered;
            this.categoryPhase = categoryPhase;
            this.positiveCount = positiveCount;
            this.neutralCount = neutralCount;
            this.negativeCount = negativeCount;
            this.highRiskCount = highRiskCount;
        }

        public double getRawScore() { return rawScore; }
        public double getNormalizedScore() { return normalizedScore; }
        public RiskBand getMatchedBand() { return matchedBand; }
        public boolean isHighRiskTriggered() { return highRiskTriggered; }
        public String getCategoryPhase() { return categoryPhase; }
        public int getPositiveCount() { return positiveCount; }
        public int getNeutralCount() { return neutralCount; }
        public int getNegativeCount() { return negativeCount; }
        public int getHighRiskCount() { return highRiskCount; }
    }
}
