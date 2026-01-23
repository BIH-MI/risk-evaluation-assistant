package org.bihealth.mi.risk_assessment_api.model.matrix;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@Table(name = "risk_matrix")
public class RiskMatrix {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mitigating_controls")
    private String mitigatingControls;

    @Column(name = "motives_capacity")
    private String motivesCapacity;

    @Column(name = "context_risk")
    private Double contextRisk;

}