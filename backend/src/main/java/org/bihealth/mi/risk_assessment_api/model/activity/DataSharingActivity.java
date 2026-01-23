package org.bihealth.mi.risk_assessment_api.model.activity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.*;

import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.report.Report;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;


/**
 * Represents a data-sharing activity that ties together
 * dataset-level, table-level, and recipient-level assessments.
 */
@Getter
@Setter
@Entity
@Table(name = "data_sharing_activities")
public class DataSharingActivity extends AuditableEntity {

    /** Other users (by username) with whom this activity is shared */
    @ElementCollection
    @CollectionTable(
            name = "sharing_activity_shared_users",
            joinColumns = @JoinColumn(name = "activity_id")
    )
    @Column(name = "username")
    private Set<String> sharedUsernames = new HashSet<>();

    /** Link to a dataset-level assessment */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_assessment_id")
    @OnDelete(action = OnDeleteAction.CASCADE) // FIX: Changed from SET_NULL to CASCADE
    private DatasetAssessment datasetAssessment;

    /** Link to a recipient-level assessment */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_assessment_id")
    @OnDelete(action = OnDeleteAction.CASCADE) // FIX: Added CASCADE here
    private RecipientAssessment recipientAssessment;

    @OneToMany(
            mappedBy = "dataSharingActivity",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<DataSharingActivityTableAssessment> tableAssessments = new ArrayList<>();

    @OneToOne(mappedBy = "dataSharingActivity",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Report report;
}
