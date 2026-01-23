package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;

import java.util.*;

/**
 * Represents a collection of data tables, forming a complete dataset.
 * This is a top-level entity that extends AuditableEntity to track
 * creation metadata.
 */
@Getter
@Setter
@Entity
@Table(name = "datasets")
public class Dataset extends AuditableEntity {

    @ElementCollection
    @CollectionTable(name = "dataset_shared_users",
            joinColumns = @JoinColumn(name = "dataset_id"))
    @Column(name = "username")
    private Set<String> sharedUsernames = new HashSet<>();

    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DatasetTable> tables = new ArrayList<>();

    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DatasetAssessment> datasetAssessments = new ArrayList<>();
}
