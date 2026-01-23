package org.bihealth.mi.risk_assessment_api.model.assessment.activity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;

import java.util.ArrayList;
import java.util.List;

/**
 * Acts as a linking entity that represents a table assessment specifically
 * within the context of a DataSharingActivity. This allows for overriding
 * the default table assessment scores for a particular data share.
 */
@Entity
@Table(name = "data_sharing_activity_table_assessments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class DataSharingActivityTableAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Integer id;

    /** Link back to the parent DataSharingActivity */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "data_sharing_activity_id", nullable = false)
    @JsonBackReference
    private DataSharingActivity dataSharingActivity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private DatasetTableAssessment table;

    /** One‐to‐many over the per‐column attributes */
    @OneToMany(
            mappedBy = "tableAssessment",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @JsonManagedReference
    private List<DataSharingActivityTableAssessmentAttribute> attributes = new ArrayList<>();
}