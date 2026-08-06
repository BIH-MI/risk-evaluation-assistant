package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Root entity for one risk framework configuration.
 *
 * <p>A configuration owns the full scoring model used by assessments: risk
 * categories, bands, questionnaire questions/options, matrix rules, and
 * re-identification thresholds. Dataset and recipient assessments reference one
 * configuration so their answers can be interpreted consistently.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "risk_configurations")
public class Configuration extends AuditableEntity {

    // Only active configurations are normally selectable for new assessments.
    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;

    // Marks this framework as the default option in the UI.
    @Column(name = "is_default")
    private boolean isDefault = false;

    // Fallback language code for translated question/option labels.
    @Column(name = "default_language", length = 10, nullable = false)
    private String defaultLanguage = "en";

    @Column(name = "current_version")
    private Integer currentVersion = 1;

    // Usernames that can access this configuration in addition to the creator.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "configuration_shared_users",
            joinColumns = @JoinColumn(name = "configuration_id"))
    @Column(name = "username")
    private Set<String> sharedUsernames = new HashSet<>();

    // Calculated dynamically by services; not stored in risk_configurations.
    @Transient
    private int assessmentCount = 0;

    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonIgnore
    @OrderBy("versionNumber DESC")
    private List<ConfigurationVersion> versions = new ArrayList<>();

    // Transient input/output buffers keep the legacy JSON shape compatible with
    // the frontend and bundled seed files. Persisted content lives in versions.
    @Transient
    @JsonIgnore
    private List<RiskCategory> riskCategories = new ArrayList<>();

    @Transient
    @JsonIgnore
    private List<Question> questions = new ArrayList<>();

    @Transient
    @JsonIgnore
    private List<RiskMatrix> riskMatrices = new ArrayList<>();

    @Transient
    @JsonIgnore
    private List<ReidentificationThreshold> reidThresholds = new ArrayList<>();

    public Optional<ConfigurationVersion> getCurrentVersionEntity() {
        return versions.stream()
                .max(Comparator.comparing(ConfigurationVersion::getVersionNumber));
    }

    public void addVersion(ConfigurationVersion version) {
        version.setConfiguration(this);
        versions.add(version);
        currentVersion = Math.max(getCurrentVersion(), version.getVersionNumber());
    }

    @JsonProperty("version")
    public int getVersion() {
        return getCurrentVersion();
    }

    public int getCurrentVersion() {
        return currentVersion == null ? 1 : currentVersion;
    }

    @JsonProperty("riskCategories")
    public List<RiskCategory> getRiskCategories() {
        return getCurrentVersionEntity()
                .map(ConfigurationVersion::getRiskCategories)
                .orElse(riskCategories);
    }

    @JsonProperty("riskCategories")
    public void setRiskCategories(List<RiskCategory> riskCategories) {
        this.riskCategories = riskCategories == null ? new ArrayList<>() : riskCategories;
    }

    @JsonProperty("questions")
    public List<Question> getQuestions() {
        return getCurrentVersionEntity()
                .map(ConfigurationVersion::getQuestions)
                .orElse(questions);
    }

    @JsonProperty("questions")
    public void setQuestions(List<Question> questions) {
        this.questions = questions == null ? new ArrayList<>() : questions;
    }

    @JsonProperty("riskMatrices")
    public List<RiskMatrix> getRiskMatrices() {
        return getCurrentVersionEntity()
                .map(ConfigurationVersion::getRiskMatrices)
                .orElse(riskMatrices);
    }

    @JsonProperty("riskMatrices")
    public void setRiskMatrices(List<RiskMatrix> riskMatrices) {
        this.riskMatrices = riskMatrices == null ? new ArrayList<>() : riskMatrices;
    }

    @JsonProperty("reidThresholds")
    public List<ReidentificationThreshold> getReidThresholds() {
        return getCurrentVersionEntity()
                .map(ConfigurationVersion::getReidThresholds)
                .orElse(reidThresholds);
    }

    @JsonProperty("reidThresholds")
    public void setReidThresholds(List<ReidentificationThreshold> reidThresholds) {
        this.reidThresholds = reidThresholds == null ? new ArrayList<>() : reidThresholds;
    }
}
