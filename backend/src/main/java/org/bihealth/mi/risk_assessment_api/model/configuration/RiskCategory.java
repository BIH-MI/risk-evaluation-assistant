package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.util.ArrayList;
import java.util.List;

/**
 * Scoring category within a risk configuration.
 *
 * <p>Questions contribute weighted option scores to their category. The
 * category's {@code riskEffect} determines whether higher raw scores mean more
 * or less risk before the normalized value is matched to a {@link RiskBand}.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "risk_categories")
public class RiskCategory {

    // Database primary key for this category.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning framework configuration.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id", nullable = false)
    @JsonBackReference
    private Configuration configuration;

    // Stable category code used by questions, matrices, and computation logic.
    @Column(nullable = false)
    private String code;

    // User-facing category name.
    @Column(nullable = false)
    private String name;

    // Defines whether the category is answered on the dataset or recipient side.
    @Column(name = "assessment_phase", nullable = false)
    private String assessmentPhase;

    // INCREASES_RISK means higher scores are worse; DECREASES_RISK means
    // higher scores represent stronger controls and should lower risk.
    @Column(name = "risk_effect", nullable = false)
    private String riskEffect;

    // Bands used to classify this category after score normalization.
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<RiskBand> riskBands = new ArrayList<>();

    /**
     * Adds a band while maintaining both sides of the JPA relationship.
     */
    public void addRiskBand(RiskBand band) {
        riskBands.add(band);
        band.setCategory(this);
    }
}
