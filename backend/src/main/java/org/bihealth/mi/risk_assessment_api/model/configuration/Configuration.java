package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
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

    // Usernames that can access this configuration in addition to the creator.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "configuration_shared_users",
            joinColumns = @JoinColumn(name = "configuration_id"))
    @Column(name = "username")
    private Set<String> sharedUsernames = new HashSet<>();

    // Calculated dynamically by services; not stored in risk_configurations.
    @Transient
    private int assessmentCount = 0;

    // Categories define scoring groups such as IMPACT, CONTROLS, or LIKELIHOOD.
    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<RiskCategory> riskCategories = new ArrayList<>();

    // Framework questionnaire. Each question belongs to one risk category.
    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Question> questions = new ArrayList<>();

    // Matrix rows that turn category classifications into context-risk values.
    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<RiskMatrix> riskMatrices = new ArrayList<>();

    // Thresholds used after the dataset IMPACT category is classified.
    @OneToMany(mappedBy = "configuration", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ReidentificationThreshold> reidThresholds = new ArrayList<>();
}
