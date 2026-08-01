package org.bihealth.mi.risk_assessment_api.model.questionnaire;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

/**
 * Selectable option for a questionnaire question.
 *
 * <p>The option's score is the raw value used by the risk calculation when the
 * option is selected. An option can also act as a high-risk trigger for its
 * owning category.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "question_options")
public class QuestionOption {

    // Database primary key for this option.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Owning question.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @JsonBackReference
    private Question question;

    // Default display text.
    @Column(length = 1024, nullable = false)
    private String text;

    // Optional translated display text keyed by language code.
    @ElementCollection
    @CollectionTable(name = "question_option_translations", joinColumns = @JoinColumn(name = "option_id"))
    @MapKeyColumn(name = "language_code", length = 10)
    @Column(name = "translated_text", length = 1024)
    private Map<String, String> textTranslations = new HashMap<>();

    // Raw score contributed by this option before question weighting.
    @Column(name = "score", nullable = false)
    private double score;

    // True when choosing this option should flag the owning category as high risk.
    @JsonProperty("isHighRiskTrigger")
    @Column(name = "is_high_risk_trigger", nullable = false)
    private boolean isHighRiskTrigger;

    // Optional framework-specific impact label.
    @Column(name = "impact", length = 50)
    private String impact;
}
