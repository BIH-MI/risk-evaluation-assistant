package org.bihealth.mi.risk_assessment_api.model.configuration;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * Matrix row that maps category band classifications to a context-risk value.
 *
 * <p>For a calculation, the service compares the current category labels with
 * {@code conditions}. The matching row supplies {@code contextRisk}, which is
 * used as {@code P_attack} in the final anonymization formula.</p>
 */
@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "risk_matrix")
public class RiskMatrix {

    // Database primary key for this matrix row.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning framework configuration.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id", nullable = false)
    @JsonBackReference
    private Configuration configuration;

    // Dynamic JSON map from category code to required band label, e.g.
    // {"CONTROLS": "LOW", "LIKELIHOOD": "HIGH"}.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conditions", columnDefinition = "jsonb", nullable = false)
    private Map<String, String> conditions;

    // Resulting context risk/P_attack when the conditions are met.
    @Column(name = "context_risk", nullable = false)
    private Double contextRisk;
}
