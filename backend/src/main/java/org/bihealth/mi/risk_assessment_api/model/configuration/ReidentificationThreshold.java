package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Threshold value selected from the dataset IMPACT classification.
 *
 * <p>During calculation, the matching threshold supplies {@code T} in
 * {@code R_anonymization = min(1, T / P_attack)}.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "reidentification_thresholds")
@NoArgsConstructor
public class ReidentificationThreshold {

    // Database primary key for this threshold row.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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

    // Risk/IMPACT band label that selects this threshold.
    @Column(name = "risk_classification", nullable = false)
    private String riskClassification;

    // Numeric threshold value used as T in the final formula.
    @Column(nullable = false)
    private double thresholdValue;

    @JsonIgnore
    public Configuration getConfiguration() {
        return configurationVersion == null ? null : configurationVersion.getConfiguration();
    }

    @JsonIgnore
    public void setConfiguration(Configuration configuration) {
        // Compatibility no-op. Persisted ownership is version-based.
    }
}
