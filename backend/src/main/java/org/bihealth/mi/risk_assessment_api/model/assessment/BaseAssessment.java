package org.bihealth.mi.risk_assessment_api.model.assessment;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.ArrayList;
import java.util.List;


/**
 * An abstract base entity for all types of assessments (e.g., for Datasets or Recipients).
 *
 * <p>Every assessment is interpreted through exactly one configuration and owns
 * a set of questionnaire answers. Joined inheritance keeps common assessment
 * data in the base table while dataset/recipient-specific fields live in their
 * own tables.</p>
 */
@Getter
@Setter
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class BaseAssessment extends AuditableEntity {

    // Framework configuration used to interpret this assessment's answers.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "configuration_id", nullable = false)
    private Configuration configuration;

    // Selected answers for the configuration questions relevant to this assessment.
    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<Answer> answers = new ArrayList<>();
}
