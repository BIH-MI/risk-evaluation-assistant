package org.bihealth.mi.risk_assessment_api.model.questionnaire;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;

/**
 * Represents a single answer provided for a question within an assessment.
 * This is a unified entity for answers from all assessment types.
 *
 * <p>The selected option supplies the raw score and high-risk trigger flag used
 * when the assessment is evaluated.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "answers")
public class Answer {

    // Database primary key for this answer.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    // Owning dataset or recipient assessment.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    @JsonBackReference
    private BaseAssessment assessment;

    // Question being answered.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    // Selected option for the question. It must belong to the linked question.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_option_id", nullable = false)
    private QuestionOption selectedOption;

    /**
     * Convenience constructor used when converting request DTOs into answers.
     */
    public Answer(BaseAssessment assessment, Question question, QuestionOption selectedOption) {
        this.assessment = assessment;
        this.question = question;
        this.selectedOption = selectedOption;
    }
}
