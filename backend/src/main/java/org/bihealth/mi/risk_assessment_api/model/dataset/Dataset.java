package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.*;

/**
 * Represents a collection of data tables, forming a complete dataset.
 * This is a top-level entity that extends AuditableEntity to track
 * creation metadata.
 *
 * <p>A dataset is the data-side aggregate root. It owns its table schema and
 * can have multiple framework-specific dataset assessments.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "datasets")
public class Dataset extends AuditableEntity {

    // Usernames with explicit access to this dataset in addition to the creator.
    @ElementCollection
    @CollectionTable(name = "dataset_shared_users",
            joinColumns = @JoinColumn(name = "dataset_id"))
    @Column(name = "username")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<String> sharedUsernames = new HashSet<>();

    // Physical/logical tables that make up this dataset.
    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetTable> tables = new ArrayList<>();

    // Assessments of this dataset under one or more risk configurations.
    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetAssessment> datasetAssessments = new ArrayList<>();
}
