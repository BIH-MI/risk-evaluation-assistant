package org.bihealth.mi.risk_assessment_api.model.activity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * One data-sharing scenario: a dataset assessment combined with a recipient assessment.
 *
 * <p>This is the main entity evaluated by the risk endpoint and by the mitigation planner. It
 * holds everything needed to evaluate the scenario: the sharing purpose, the sharing requirements,
 * the pinned mitigation Knowledge Base version, who may access the activity, and optional
 * activity-specific overrides for table/attribute risk metadata.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "data_sharing_activities",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = NamedResourceConstraints.DATA_SHARING_ACTIVITIES_NORMALIZED_NAME,
                        columnNames = "normalized_name"
                )
        }
)
public class DataSharingActivity extends NamedResourceEntity {

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

    // Why the data is shared, e.g. the scientific objective of the analysis.
    @Column(name = "sharing_purpose", length = 4000)
    private String sharingPurpose;

    // Requirements the mitigation planner checks candidate plans against.
    @Embedded
    private ActivityRequirements requirements = new ActivityRequirements();

    // Knowledge Base version the mitigation planner uses, pinned so recommendations stay
    // reproducible when administrators later edit the Knowledge Base.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mitigation_knowledge_base_version_id")
    private MitigationKnowledgeBaseVersion mitigationKnowledgeBaseVersion;

    // Optional activity-specific table/attribute overrides.
    @OneToMany(
            mappedBy = "dataSharingActivity",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DataSharingActivityTableAssessment> tableAssessments = new ArrayList<>();

    /** Never null: Hibernate loads an embedded value whose columns are all null as null. */
    public ActivityRequirements getRequirements() {
        if (requirements == null) {
            requirements = new ActivityRequirements();
        }
        return requirements;
    }
}
