package org.bihealth.mi.risk_assessment_api.model.dataset;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;
import org.bihealth.mi.risk_assessment_api.model.NamedResourceEntity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;

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
@Table(
        name = "datasets",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = NamedResourceConstraints.DATASETS_NORMALIZED_NAME,
                        columnNames = "normalized_name"
                )
        }
)
public class Dataset extends NamedResourceEntity {

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

    /**
     * A profiling session retains the selected QID configuration version so later
     * schema refreshes cannot silently change search behavior.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qid_discovery_configuration_id")
    private QidDiscoveryConfiguration qidDiscoveryConfiguration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qid_discovery_configuration_version_id")
    private QidDiscoveryConfigurationVersion qidDiscoveryConfigurationVersion;

    // Assessments of this dataset under one or more risk configurations.
    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @OnDelete(action = OnDeleteAction.CASCADE)
    private List<DatasetAssessment> datasetAssessments = new ArrayList<>();

    public static String normalizeName(String name) {
        return EntityNameNormalizer.normalizeForStorage(name);
    }

    public static String normalizeNameKey(String name) {
        return EntityNameNormalizer.normalizeForComparison(name);
    }
}
