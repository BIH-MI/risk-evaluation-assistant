package org.bihealth.mi.risk_assessment_api.model.project;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceEntity;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.*;

/**
 * Research/use-case workspace that groups datasets, recipients, sharing
 * scenarios, and project-level requirements for future mitigation planning.
 */
@Getter
@Setter
@Entity
@Table(
        name = "projects",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = NamedResourceConstraints.PROJECTS_NORMALIZED_NAME,
                        columnNames = "normalized_name"
                )
        }
)
public class Project extends NamedResourceEntity {

    // Usernames with explicit access to this project in addition to the creator.
    @ElementCollection
    @CollectionTable(
            name = "project_shared_users",
            joinColumns = @JoinColumn(name = "project_id")
    )
    @Column(name = "username")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<String> sharedUsernames = new HashSet<>();

    @Column(name = "notes", length = 4000)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_version_id")
    private ProjectTemplateVersion templateVersion;

    // Datasets available to activities in this project. The project does not own their lifecycle.
    @ManyToMany
    @JoinTable(
            name = "project_datasets",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "dataset_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_project_datasets_project_dataset",
                    columnNames = {"project_id", "dataset_id"}
            )
    )
    private Set<Dataset> datasets = new LinkedHashSet<>();

    // Recipients available to activities in this project. The project does not own their lifecycle.
    @ManyToMany
    @JoinTable(
            name = "project_recipients",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "recipient_id"),
            uniqueConstraints = @UniqueConstraint(
                    name = "uk_project_recipients_project_recipient",
                    columnNames = {"project_id", "recipient_id"}
            )
    )
    private Set<Recipient> recipients = new LinkedHashSet<>();

    // Sharing scenarios evaluated under this project. Projects with activities cannot be deleted.
    @OneToMany(mappedBy = "project")
    private List<DataSharingActivity> dataSharingActivities = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<ProjectRequirementResponse> requirementResponses = new ArrayList<>();

}
