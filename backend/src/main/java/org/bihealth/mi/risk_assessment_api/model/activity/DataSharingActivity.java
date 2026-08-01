package org.bihealth.mi.risk_assessment_api.model.activity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.*;

import org.bihealth.mi.risk_assessment_api.model.AuditableEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Represents a data-sharing activity that ties together
 * dataset-level, table-level, and recipient-level assessments.
 *
 * <p>This is the main entity evaluated by the risk endpoint. It combines one
 * dataset assessment with one recipient assessment and can hold optional
 * activity-specific overrides for table/attribute risk metadata.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "data_sharing_activities")
public class DataSharingActivity extends AuditableEntity {

    // Usernames with explicit access to this activity in addition to the creator.
    @ElementCollection
    @CollectionTable(
            name = "sharing_activity_shared_users",
            joinColumns = @JoinColumn(name = "activity_id")
    )
    @Column(name = "username")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<String> sharedUsernames = new HashSet<>();

    // Data-side assessment used for IMPACT/data-risk classification.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_assessment_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private DatasetAssessment datasetAssessment;

    // Recipient/context-side assessment used for controls and likelihood classification.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_assessment_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private RecipientAssessment recipientAssessment;

    // Optional activity-specific table/attribute overrides.
    @OneToMany(
            mappedBy = "dataSharingActivity",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DataSharingActivityTableAssessment> tableAssessments = new ArrayList<>();
}
