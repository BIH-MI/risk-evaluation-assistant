package org.bihealth.mi.risk_assessment_api.model.questionnaire;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.AnswerOption;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;

/**
 * Represents a single answer provided for a question within an assessment.
 * This is a unified entity for answers from all assessment types.
 */
@Getter
@Setter
@Entity
@Table(name = "answers")
@NoArgsConstructor
public class Answer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    @JsonBackReference
    private BaseAssessment assessment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "answer", nullable = false)
    @Enumerated(EnumType.STRING)
    @NotNull
    private AnswerOption answer;

    /**
     * The constructor that was missing.
     * @param assessment The parent assessment.
     * @param question The question being answered.
     * @param answer The selected answer option.
     */
    public Answer(BaseAssessment assessment, Question question, AnswerOption answer) {
        this.assessment = assessment;
        this.question = question;
        this.answer = answer;
    }
}