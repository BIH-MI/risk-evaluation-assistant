package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

import java.util.ArrayList;
import java.util.List;

/**
 * Immutable content version of a risk-assessment configuration.
 *
 * <p>The root {@link Configuration} carries identity, sharing, default status,
 * and the current-version pointer. This entity owns the versioned framework
 * content used by assessments: categories, bands, questions/options, matrix
 * rules, and re-identification thresholds.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "risk_configuration_versions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_risk_configuration_version_number",
                        columnNames = {"configuration_id", "version_number"}
                )
        }
)
public class ConfigurationVersion extends AuditableEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id", nullable = false)
    @JsonIgnore
    private Configuration configuration;

    @Column(name = "version_number", nullable = false)
    private int versionNumber = 1;

    @Column(name = "default_language", length = 10, nullable = false)
    private String defaultLanguage = "en";

    @OneToMany(mappedBy = "configurationVersion", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    private List<RiskCategory> riskCategories = new ArrayList<>();

    @OneToMany(mappedBy = "configurationVersion", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    private List<Question> questions = new ArrayList<>();

    @OneToMany(mappedBy = "configurationVersion", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    private List<RiskMatrix> riskMatrices = new ArrayList<>();

    @OneToMany(mappedBy = "configurationVersion", cascade = CascadeType.ALL, orphanRemoval = false)
    @JsonManagedReference
    private List<ReidentificationThreshold> reidThresholds = new ArrayList<>();

    public void addRiskCategory(RiskCategory category) {
        riskCategories.add(category);
        category.setConfigurationVersion(this);
    }

    public void addQuestion(Question question) {
        questions.add(question);
        question.setConfigurationVersion(this);
    }

    public void addRiskMatrix(RiskMatrix matrix) {
        riskMatrices.add(matrix);
        matrix.setConfigurationVersion(this);
    }

    public void addReidThreshold(ReidentificationThreshold threshold) {
        reidThresholds.add(threshold);
        threshold.setConfigurationVersion(this);
    }
}
