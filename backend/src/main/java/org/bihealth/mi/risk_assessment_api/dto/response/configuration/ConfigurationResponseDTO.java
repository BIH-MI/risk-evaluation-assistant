package org.bihealth.mi.risk_assessment_api.dto.response.configuration;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.configuration.ReidentificationThreshold;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskBand;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskMatrix;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Frontend-facing configuration snapshot.
 *
 * <p>The shape intentionally mirrors the legacy Configuration JSON, while the
 * contents come from one immutable {@link ConfigurationVersion}. Nested values
 * are copied into plain DTOs so assessment responses never serialize Hibernate
 * proxies from lazy entity relationships.</p>
 */
@Data
@NoArgsConstructor
public class ConfigurationResponseDTO {
    private Long id;
    private Long versionId;
    private Integer version;
    private Integer currentVersion;
    private String name;
    private String description;
    private String defaultLanguage;
    private boolean active;

    @JsonProperty("default")
    private boolean defaultConfiguration;

    private String creatorUsername;
    private Set<String> sharedUsernames = new HashSet<>();
    private Integer assessmentCount;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;

    private List<RiskCategoryDTO> riskCategories;
    private List<QuestionDTO> questions;
    private List<RiskMatrixDTO> riskMatrices;
    private List<ReidentificationThresholdDTO> reidThresholds;

    public ConfigurationResponseDTO(Configuration config, ConfigurationVersion version, long assessmentCount) {
        this.id = config.getId();
        this.versionId = version.getId();
        this.version = version.getVersionNumber();
        this.currentVersion = config.getCurrentVersion();
        this.name = version.getName();
        this.description = version.getDescription();
        this.defaultLanguage = version.getDefaultLanguage();
        this.active = config.isActive();
        this.defaultConfiguration = config.isDefault();
        this.creatorUsername = config.getCreatorUsername();
        this.sharedUsernames = config.getSharedUsernames() == null
                ? new HashSet<>()
                : new HashSet<>(config.getSharedUsernames());
        this.assessmentCount = (int) assessmentCount;
        this.creationDate = config.getCreationDate();
        this.lastModifiedDate = config.getLastModifiedDate();
        this.riskCategories = toRiskCategories(version.getRiskCategories());
        this.questions = toQuestions(version.getQuestions());
        this.riskMatrices = toRiskMatrices(version.getRiskMatrices());
        this.reidThresholds = toReidThresholds(version.getReidThresholds());
    }

    @JsonProperty("isDefault")
    public boolean isDefault() {
        return defaultConfiguration;
    }

    @JsonProperty("isActive")
    public boolean isActive() {
        return active;
    }

    public List<RiskCategoryDTO> getCategories() {
        return riskCategories;
    }

    public List<RiskMatrixDTO> getRiskMatrix() {
        return riskMatrices;
    }

    public List<ReidentificationThresholdDTO> getThresholds() {
        return reidThresholds;
    }

    private List<RiskCategoryDTO> toRiskCategories(List<RiskCategory> categories) {
        return categories == null
                ? List.of()
                : categories.stream().map(RiskCategoryDTO::new).collect(Collectors.toList());
    }

    private List<QuestionDTO> toQuestions(List<Question> questions) {
        return questions == null
                ? List.of()
                : questions.stream().map(QuestionDTO::new).collect(Collectors.toList());
    }

    private List<RiskMatrixDTO> toRiskMatrices(List<RiskMatrix> matrices) {
        return matrices == null
                ? List.of()
                : matrices.stream().map(RiskMatrixDTO::new).collect(Collectors.toList());
    }

    private List<ReidentificationThresholdDTO> toReidThresholds(List<ReidentificationThreshold> thresholds) {
        return thresholds == null
                ? List.of()
                : thresholds.stream().map(ReidentificationThresholdDTO::new).collect(Collectors.toList());
    }

    @Data
    @NoArgsConstructor
    public static class RiskCategoryDTO {
        private Long id;
        private String code;
        private String name;
        private String assessmentPhase;
        private String riskEffect;
        private List<RiskBandDTO> riskBands;

        public RiskCategoryDTO(RiskCategory category) {
            this.id = category.getId();
            this.code = category.getCode();
            this.name = category.getName();
            this.assessmentPhase = category.getAssessmentPhase();
            this.riskEffect = category.getRiskEffect();
            this.riskBands = category.getRiskBands() == null
                    ? List.of()
                    : category.getRiskBands().stream()
                    .map(RiskBandDTO::new)
                    .collect(Collectors.toList());
        }
    }

    @Data
    @NoArgsConstructor
    public static class RiskBandDTO {
        private Long id;
        private Double value;
        private String label;
        private String description;
        private double rangeMinimum;
        private double rangeMaximum;
        private String color;
        private double rangeMidpoint;

        public RiskBandDTO(RiskBand band) {
            this.id = band.getId();
            this.value = band.getValue();
            this.label = band.getLabel();
            this.description = band.getDescription();
            this.rangeMinimum = band.getRangeMinimum();
            this.rangeMaximum = band.getRangeMaximum();
            this.color = band.getColor();
            this.rangeMidpoint = band.getRangeMidpoint();
        }
    }

    @Data
    @NoArgsConstructor
    public static class QuestionDTO {
        private Long id;
        private String categoryCode;
        private String code;
        private String text;
        private Map<String, String> textTranslations;
        private boolean required;
        @JsonProperty("isRequired")
        private boolean isRequired;
        private String dependsOnOptionCode;
        private double weight;
        private List<QuestionOptionDTO> options;

        public QuestionDTO(Question question) {
            this.id = question.getId();
            this.categoryCode = question.getCategoryCode();
            this.code = question.getCode();
            this.text = question.getText();
            this.textTranslations = question.getTextTranslations() == null
                    ? new HashMap<>()
                    : new HashMap<>(question.getTextTranslations());
            this.required = question.isRequired();
            this.isRequired = question.isRequired();
            this.dependsOnOptionCode = question.getDependsOnOptionCode();
            this.weight = question.getWeight();
            this.options = question.getOptions() == null
                    ? List.of()
                    : question.getOptions().stream()
                    .map(QuestionOptionDTO::new)
                    .collect(Collectors.toList());
        }
    }

    @Data
    @NoArgsConstructor
    public static class QuestionOptionDTO {
        private Long id;
        private String code;
        private String text;
        private Map<String, String> textTranslations;
        private double score;
        private boolean highRiskTrigger;
        @JsonProperty("isHighRiskTrigger")
        private boolean isHighRiskTrigger;
        private String impact;

        public QuestionOptionDTO(QuestionOption option) {
            this.id = option.getId();
            this.code = option.getCode();
            this.text = option.getText();
            this.textTranslations = option.getTextTranslations() == null
                    ? new HashMap<>()
                    : new HashMap<>(option.getTextTranslations());
            this.score = option.getScore();
            this.highRiskTrigger = option.isHighRiskTrigger();
            this.isHighRiskTrigger = option.isHighRiskTrigger();
            this.impact = option.getImpact();
        }
    }

    @Data
    @NoArgsConstructor
    public static class RiskMatrixDTO {
        private Long id;
        private Map<String, String> conditions;
        private Double contextRisk;

        public RiskMatrixDTO(RiskMatrix matrix) {
            this.id = matrix.getId();
            this.conditions = matrix.getConditions() == null
                    ? new HashMap<>()
                    : new HashMap<>(matrix.getConditions());
            this.contextRisk = matrix.getContextRisk();
        }
    }

    @Data
    @NoArgsConstructor
    public static class ReidentificationThresholdDTO {
        private Long id;
        private String riskClassification;
        private double thresholdValue;

        public ReidentificationThresholdDTO(ReidentificationThreshold threshold) {
            this.id = threshold.getId();
            this.riskClassification = threshold.getRiskClassification();
            this.thresholdValue = threshold.getThresholdValue();
        }
    }
}
