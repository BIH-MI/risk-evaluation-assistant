package org.bihealth.mi.risk_assessment_api.model.questionnaire;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.MeasureType;
import org.bihealth.mi.risk_assessment_api.enums.QuestionType;

/**
 * Represents a single question in the risk assessment questionnaire.
 */
@Getter
@Setter
@Entity
@Table(name = "questions")
public class Question {

    @Id
    @Column(name = "id", nullable = false)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @NotNull
    private QuestionType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "measure_type", nullable = false)
    @NotNull
    private MeasureType measureType;

    @Column(name = "text", length = 1024, nullable = false)
    @NotNull
    private String text;

    @Column(name = "weight_yes", nullable = false)
    private double weightYes;

    @Column(name = "weight_no", nullable = false)
    private double weightNo;

    @Column(name = "weight_na", nullable = false)
    private double weightNa;

    @Column(name = "risk_weight", nullable = false)
    private double riskWeight;
}