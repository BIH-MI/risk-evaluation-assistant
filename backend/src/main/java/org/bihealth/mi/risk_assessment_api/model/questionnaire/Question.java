package org.bihealth.mi.risk_assessment_api.model.questionnaire;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Questionnaire question owned by a risk configuration.
 *
 * <p>Questions are attached to risk categories. When an assessment is evaluated,
 * the selected option score is multiplied by {@code weight} and added to the
 * owning category's raw score.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "questions")
public class Question {

    // Database primary key for this question.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    // Owning immutable framework version.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_version_id")
    @JsonBackReference
    private ConfigurationVersion configurationVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id", insertable = false, updatable = false)
    @JsonIgnore
    private Configuration legacyConfiguration;

    // Category that receives this question's weighted score.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnore
    private RiskCategory category;

    // Temporary JSON/input field used before ConfigLoader resolves categoryCode
    // to the actual RiskCategory entity.
    @Transient
    private String categoryCode;

    // Default display text.
    @Column(name = "text", length = 1024, nullable = false)
    @NotNull
    private String text;

    // Optional stable machine identifier used by mitigation mappings.
    // Legacy/custom configurations may temporarily leave this null.
    @Column(name = "code", length = 160)
    private String code;

    // Optional translated display text keyed by language code.
    @ElementCollection
    @CollectionTable(name = "question_text_translations", joinColumns = @JoinColumn(name = "question_id"))
    @MapKeyColumn(name = "language_code", length = 10)
    @Column(name = "translated_text", length = 1024)
    private Map<String, String> textTranslations = new HashMap<>();

    // Marks whether assessment forms should require an answer.
    @Column(name = "is_required", nullable = false)
    private boolean isRequired = true;

    // Optional controlling option code for conditional display.
    @Column(name = "depends_on_option_code")
    private String dependsOnOptionCode;

    // Multiplier applied to the selected option score.
    @Column(name = "weight", nullable = false)
    private double weight;

    // Selectable answer options owned by this question.
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<QuestionOption> options = new ArrayList<>();

    /**
     * Adds an option while maintaining both sides of the JPA relationship.
     */
    public void addOption(QuestionOption option) {
        options.add(option);
        option.setQuestion(this);
    }

    /**
     * Returns the persisted category code when the category has been resolved,
     * otherwise falls back to the transient code loaded from JSON/input.
     */
    public String getCategoryCode() {
        if (this.category != null) {
            return this.category.getCode();
        }
        return this.categoryCode;
    }

    @JsonIgnore
    public Configuration getConfiguration() {
        return configurationVersion == null ? null : configurationVersion.getConfiguration();
    }

    @JsonIgnore
    public void setConfiguration(Configuration configuration) {
        // Compatibility no-op. Persisted ownership is version-based.
    }
}
