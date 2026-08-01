package org.bihealth.mi.risk_assessment_api.model.assessment.activity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.ArrayList;
import java.util.List;

/**
 * Acts as a linking entity that represents a table assessment specifically
 * within the context of a DataSharingActivity. This allows for overriding
 * the default table assessment scores for a particular data share.
 *
 * <p>The linked {@link DatasetTableAssessment} contains the dataset assessment's
 * default table risk profile. Child attributes on this entity store the values
 * that are specific to one sharing activity.</p>
 */
@Entity
@Table(name = "data_sharing_activity_table_assessments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DataSharingActivityTableAssessment {

    // Database primary key for this activity-specific table assessment.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    // Parent data-sharing activity.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_sharing_activity_id", nullable = false)
    @JsonBackReference
    private DataSharingActivity dataSharingActivity;

    // Default dataset table assessment being overridden or reused.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private DatasetTableAssessment table;

    // Activity-specific per-column overrides.
    @OneToMany(
            mappedBy = "tableAssessment",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DataSharingActivityTableAssessmentAttribute> attributes = new ArrayList<>();
}
