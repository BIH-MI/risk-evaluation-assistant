package org.bihealth.mi.risk_assessment_api.model.scoring;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * One selectable score value for a single scoring dimension in a specific
 * scoring-system version.
 *
 * <p>Options are version-scoped so assessments can keep using the exact scale
 * that was active when they were created, even if administrators later edit the
 * parent scoring system.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "attribute_scoring_options",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_attribute_scoring_option_value",
                        columnNames = {"version_id", "dimension", "score_value"}
                )
        }
)
public class AttributeScoringOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", nullable = false)
    @JsonBackReference
    private AttributeScoringSystemVersion version;

    /**
     * Dimension this option belongs to, such as sensitivity or availability.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "dimension", nullable = false, length = 40)
    private AttributeScoringDimension dimension;

    /**
     * Human-readable label shown to users when they choose this score.
     */
    @Column(name = "display_label", nullable = false)
    private String label;

    /**
     * Numeric value used by assessment calculations and threshold checks.
     */
    @Column(name = "score_value", nullable = false)
    private Double value;

    @Column(name = "description", length = 2000)
    private String description;

    /**
     * Stable display order within the dimension.
     */
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
