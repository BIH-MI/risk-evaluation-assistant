package org.bihealth.mi.risk_assessment_api.utils;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.bihealth.mi.risk_assessment_api.enums.QuestionType;
import org.bihealth.mi.risk_assessment_api.enums.RiskClassification;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.matrix.RiskBand;
import org.bihealth.mi.risk_assessment_api.model.matrix.RiskMatrix;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.*;
import org.bihealth.mi.risk_assessment_api.repository.matrix.RiskBandRepository;
import org.bihealth.mi.risk_assessment_api.repository.matrix.RiskMatrixRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RiskComputationService {

    private static final Logger log = LoggerFactory.getLogger(RiskComputationService.class);

    private final RiskMatrixRepository riskMatrixRepository;
    private final RiskBandRepository riskBandRepository;
    private final QuestionRepository questionRepository;

    private List<RiskMatrix> riskMatrixCache;
    private List<RiskBand> riskBandCache;
    private Map<Integer, Question> questionCache;

    public RiskComputationService(RiskMatrixRepository riskMatrixRepository,
                                  RiskBandRepository riskBandRepository,
                                  QuestionRepository questionRepository) {
        this.riskMatrixRepository = riskMatrixRepository;
        this.riskBandRepository = riskBandRepository;
        this.questionRepository = questionRepository;
    }

    @PostConstruct
    public void initCache() {
        log.info("Initializing Risk Computation Cache...");
        this.riskMatrixCache = riskMatrixRepository.findAll();

        this.riskBandCache = riskBandRepository.findAll();
        // Use comparingDouble for robustness with float/double ranges
        this.riskBandCache.sort(Comparator.comparingDouble(RiskBand::getRangeMinimum));

        this.questionCache = questionRepository.findAll().stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        log.info("Cache initialized: {} matrix entries, {} bands.", riskMatrixCache.size(), riskBandCache.size());
    }

    public void refreshCache() {
        initCache();
    }

    @Transactional(readOnly = true)
    public RiskCalculationResult computeNormalizedRisk(
            DataSharingActivity activity,
            Double manualRiskThreshold
    ) {
        // Handle race conditions where cache loaded before DB population
        if (riskMatrixCache == null || riskMatrixCache.isEmpty()) {
            initCache();
        }

        Map<String, Double[]> scores = computeNormalizedQuestionnaireScores(
                activity.getDatasetAssessment(),
                activity.getRecipientAssessment()
        );

        // --- MOTIVES & CAPACITY (MOTC) ---
        Double[] motcData = scores.get("MOTC");
        double scoreMOTC = motcData[0];
        double rawMOTC = motcData[1];
        RiskClassification classMOTC = getCategory(scoreMOTC * 100.0, "MOTC");
        CategoryResult resMOTC = new CategoryResult(scoreMOTC, rawMOTC, classMOTC);

        // --- MITIGATING CONTROLS (MITC) ---
        Double[] mitcData = scores.get("MITC");
        double scoreMITC = mitcData[0];
        double rawMITC = mitcData[1];
        RiskClassification classMITC = getCategory(scoreMITC * 100.0, "MITC");
        CategoryResult resMITC = new CategoryResult(scoreMITC, rawMITC, classMITC);

        // --- INVASION OF PRIVACY (IP) ---
        Double[] ipData = scores.get("IP");
        double scoreIP = ipData[0];
        double rawIP = ipData[1];
        RiskClassification classIP = getCategory(scoreIP * 100.0, "IP");
        CategoryResult resIP = new CategoryResult(scoreIP, rawIP, classIP);

        // Lookup Matrix
        RiskMatrix matrixRow = getMatrixEntry(classMITC, classMOTC);
        double contextRisk = matrixRow.getContextRisk();

        // Determine Threshold
        double ipThreshold = selectIpThreshold(classIP);

        // Max Data Risk
        double maximumDataRisk = calculateMaxDataRisk(ipThreshold, manualRiskThreshold, contextRisk);

        return new RiskCalculationResult(
                contextRisk,
                ipThreshold,
                manualRiskThreshold,
                maximumDataRisk,
                resMOTC,
                resMITC,
                resIP
        );
    }

    private RiskClassification getCategory(double percentScore, String categoryType) {
        if (riskBandCache == null || riskBandCache.isEmpty()) initCache();

        RiskBand match = riskBandCache.stream()
                .filter(t -> percentScore >= t.getRangeMinimum() && percentScore <= t.getRangeMaximum())
                .findFirst()
                .orElse(null);

        RiskClassification dbMapping = RiskClassification.HIGH;
        if (match != null) {
            String label = match.getLabel().toUpperCase();
            if (label.contains("NONE")) dbMapping = RiskClassification.NONE;
            else if (label.contains("LOW")) dbMapping = RiskClassification.LOW;
            else if (label.contains("MEDIUM")) dbMapping = RiskClassification.MEDIUM;
            else if (label.contains("HIGH")) dbMapping = RiskClassification.HIGH;
            else if (label.contains("MAX")) dbMapping = RiskClassification.MAX;
        }

        if ("MITC".equalsIgnoreCase(categoryType)) {
            // INVERTED LOGIC for Protection:
            // Low Score = NONE Protection
            // High Score = HIGH Protection
            return switch (dbMapping) {
                case LOW -> RiskClassification.NONE;
                case MEDIUM -> RiskClassification.LOW;
                case HIGH -> RiskClassification.MEDIUM;
                case MAX -> RiskClassification.HIGH;
                default -> RiskClassification.NONE;
            };
        }
        return dbMapping;
    }

    private RiskMatrix getMatrixEntry(RiskClassification mitcClass, RiskClassification motcClass) {
        String controlsyKey = mapEnumToControlsKey(mitcClass);
        String motivesKey = mapEnumToMotivesKey(motcClass);

        return riskMatrixCache.stream()
                .filter(m -> m.getMitigatingControls().equalsIgnoreCase(controlsyKey) &&
                        m.getMotivesCapacity().equalsIgnoreCase(motivesKey))
                .findFirst()
                .orElseThrow(() -> {
                    // Log available keys to help debugging
                    String available = riskMatrixCache.stream()
                            .map(m -> "[" + m.getMitigatingControls() + "|" + m.getMotivesCapacity() + "]")
                            .distinct()
                            .limit(10)
                            .collect(Collectors.joining(", "));
                    log.error("Matrix lookup failed. Searching for [{}|{}]. Available samples: {}", controlsyKey, motivesKey, available);

                    return new IllegalArgumentException(
                            "No Matrix found for Privacy=" + controlsyKey + " & Motives=" + motivesKey);
                });
    }

    private double selectIpThreshold(RiskClassification ipClass) {
        if (ipClass == null) return 0.05; // Default safety

        return switch (ipClass) {
            case LOW -> 0.1;
            case MEDIUM -> 0.075;
            case HIGH, MAX -> 0.05;
            default -> 0.05;
        };
    }

    private double calculateMaxDataRisk(Double ipThreshold,
                                        Double manualThreshold,
                                        double contextRisk) {

        double effectiveThreshold = (manualThreshold != null) ? manualThreshold : ipThreshold;

        // 2. Prevent division by zero or negligible risk
        // This now protects both calculation paths
        if (contextRisk <= 0.0001) {
            return 1.0;
        }

        // 3. Calculate max risk
        return Math.min(1.0, effectiveThreshold / contextRisk);
    }

    private Map<String, Double[]> computeNormalizedQuestionnaireScores(
            BaseAssessment datasetAssessment,
            BaseAssessment recipientAssessment
    ) {
        List<Answer> allAnswers = new ArrayList<>();
        if (datasetAssessment != null && datasetAssessment.getAnswers() != null) {
            allAnswers.addAll(datasetAssessment.getAnswers());
        }
        if (recipientAssessment != null && recipientAssessment.getAnswers() != null) {
            allAnswers.addAll(recipientAssessment.getAnswers());
        }

        Map<String, Double[]> results = new HashMap<>();
        results.put("IP", calculateScore(allAnswers, QuestionType.IP));
        results.put("MITC", calculateScore(allAnswers, QuestionType.MITC));
        results.put("MOTC", calculateScore(allAnswers, QuestionType.MOTC));
        return results;
    }

    private Double[] calculateScore(List<Answer> answers, QuestionType type) {
        double totalAchieved = 0.0;
        double totalPossible = 0.0;

        for (Answer ans : answers) {
            Question q = questionCache.get(ans.getQuestion().getId());
            if (q == null || q.getType() != type) continue;

            double maxQ = q.getWeightYes();
            double achieved = 0.0;

            if (ans.getAnswer() != null) {
                switch (ans.getAnswer()) {
                    case YES -> achieved = q.getWeightYes();
                    case NO -> achieved = q.getWeightNo();
                    case UNKNOWN -> achieved = q.getWeightNa();
                }
            }

            totalAchieved += achieved;
            totalPossible += maxQ;
        }

        double normalized = (totalPossible > 0) ? (totalAchieved / totalPossible) : 0.0;
        return new Double[]{normalized, totalAchieved};
    }

    private String mapEnumToControlsKey(RiskClassification cls) {
        return switch (cls) {
            case NONE -> "None";
            case LOW -> "Low";
            case MEDIUM -> "Medium";
            case HIGH, MAX -> "High";
        };
    }

    private String mapEnumToMotivesKey(RiskClassification cls) {
        return switch (cls) {
            case NONE, LOW -> "Low";
            case MEDIUM -> "Medium";
            case HIGH -> "High";
            case MAX -> "Max";
        };
    }

    public static class RiskCalculationResult {
        private double contextRisk;
        private double ipThreshold;
        private Double manualRiskThreshold;
        private double maximumDataRisk;
        private CategoryResult resMOTC;
        private CategoryResult resMITC;
        private CategoryResult resIP;

        public RiskCalculationResult(double contextRisk, double ipThreshold, Double manualRiskThreshold,
                                     double maximumDataRisk, CategoryResult resMOTC,
                                     CategoryResult resMITC, CategoryResult resIP) {
            this.contextRisk = contextRisk;
            this.ipThreshold = ipThreshold;
            this.manualRiskThreshold = manualRiskThreshold;
            this.maximumDataRisk = maximumDataRisk;
            this.resMOTC = resMOTC;
            this.resMITC = resMITC;
            this.resIP = resIP;
        }

        public double getContextRisk() { return contextRisk; }
        public double getIpThreshold() { return ipThreshold; }
        public Double getManualRiskThreshold() { return manualRiskThreshold; }
        public double getMaximumDataRisk() { return maximumDataRisk; }
        public CategoryResult getResMOTC() { return resMOTC; }
        public CategoryResult getResMITC() { return resMITC; }
        public CategoryResult getResIP() { return resIP; }
    }

    public static class CategoryResult {
        private double normalizedScore;
        private double rawScore;
        private RiskClassification classification;

        public CategoryResult(double normalizedScore, double rawScore, RiskClassification classification) {
            this.normalizedScore = normalizedScore;
            this.rawScore = rawScore;
            this.classification = classification;
        }

        public double getNormalizedScore() { return normalizedScore; }
        public double getRawScore() { return rawScore; }
        public RiskClassification getClassification() { return classification; }
    }
}