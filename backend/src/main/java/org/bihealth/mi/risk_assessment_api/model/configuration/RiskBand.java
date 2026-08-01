package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a single threshold band (e.g., LOW, MEDIUM, HIGH)
 * that belongs to a specific Risk Category.
 *
 * <p>The computation service maps each normalized category score into one of
 * these bands. Matrix conditions and re-identification thresholds then refer to
 * the matched band labels.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "risk_bands")
public class RiskBand {

    // Database primary key for this band.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    // Owning category; bands are interpreted only within that category.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonBackReference
    private RiskCategory category;

    // Optional representative numeric value for the band.
    @Column(name = "value")
    private Double value = 0.0;

    // Label used in UI output, matrix conditions, and threshold matching.
    @Column(name = "label", nullable = false)
    @NotNull
    private String label;

    // Optional explanation of what this band means.
    @Column(name = "description")
    private String description;

    // Inclusive lower bound of the normalized score range.
    @Column(name = "range_minimum", nullable = false)
    private double rangeMinimum;

    // Upper bound of the normalized score range.
    @Column(name = "range_maximum", nullable = false)
    private double rangeMaximum;

    // UI color token or hex code for displaying this band.
    @Column(name = "color_code")
    private String color;

    /**
     * Convenience value for charts or reports that need a single point for the band.
     */
    @Transient
    public double getRangeMidpoint() {
        return (rangeMinimum + rangeMaximum) / 2.0;
    }
}
