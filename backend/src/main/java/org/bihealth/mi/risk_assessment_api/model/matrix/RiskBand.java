package org.bihealth.mi.risk_assessment_api.model.matrix;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a single threshold (e.g. low, moderate, high)
 */
@Getter
@Setter
@Entity
@Table(name = "risk_thresholds")
public class RiskBand {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    // NEW: Distinguishes the type of threshold (OVERALL_ROE, CATEGORY_RISK, TARGET_REID)
    @Column(name = "category", nullable = false)
    @NotNull
    private String category;

    @Column(name = "value", nullable = false)
    @NotNull
    private double value; // Changed to double to support 0.05 for Re-ID

    @Column(name = "label", nullable = false)
    @NotNull
    private String label;

    @Column(name = "description", nullable = false)
    private String description;

    // Fixed column names to be descriptive
    @Column(name = "range_minimum", nullable = false)
    private double rangeMinimum;

    @Column(name = "range_maximum", nullable = false)
    private double rangeMaximum;

    // Optional: Hex color code for UI (e.g., "success", "warning", "error")
    @Column(name = "color_code")
    private String color;

    @Transient
    public double getRangeMidpoint() {
        return (rangeMinimum + rangeMaximum) / 2.0;
    }
}