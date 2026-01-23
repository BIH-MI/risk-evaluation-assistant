package org.bihealth.mi.risk_assessment_api.model.assessment;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;

import java.util.ArrayList;
import java.util.List;

/**
 * An abstract base entity for all types of assessments (e.g., for Datasets or Recipients).
 * It uses a JOINED inheritance strategy, meaning common fields are in a 'base_assessment' table.
 * It extends AuditableEntity to inherit fields like id, name, creator, and creation date.
 */
@Getter
@Setter
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
// Extend the base class
public abstract class BaseAssessment extends AuditableEntity {
    @OneToMany(mappedBy = "assessment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Answer> answers = new ArrayList<>();
}