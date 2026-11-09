package org.bihealth.mi.risk_assessment_api.config.demo.shared;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import org.bihealth.mi.risk_assessment_api.model.activity.ReleaseModel;
import org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoRecipientSeeder.DemoRecipients;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.springframework.stereotype.Component;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoRecipientSeeder.ACADEMIC_RECIPIENT;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoRecipientSeeder.COMMERCIAL_RECIPIENT;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoRecipientSeeder.PUBLIC_RECIPIENT;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.sameName;

@Component
public class DemoDataSharingActivitySeeder {
    private final DataSharingActivityRepository dataSharingActivityRepository;

    public DemoDataSharingActivitySeeder(DataSharingActivityRepository dataSharingActivityRepository) {
        this.dataSharingActivityRepository = dataSharingActivityRepository;
    }

    public void ensureActivities(DatasetAssessment leossElEmam, DatasetAssessment leossSphn,
                                 DatasetAssessment epicElEmam, DemoRecipients recipients) {
        ensureLeossActivities(leossElEmam, leossSphn, recipients);
        ensureEpicActivities(epicElEmam, recipients);
    }

    private void ensureLeossActivities(DatasetAssessment elEmamDA, DatasetAssessment sphnDA, DemoRecipients recipients) {

        // =========================================================================
        // TRUSTED RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 1: Academic evaluated under SPHN
        DataSharingActivity act1 = new DataSharingActivity();
        act1.setCreatorUsername("user");
        act1.setName("LEOSS / " + ACADEMIC_RECIPIENT + " (SPHN)");
        act1.setDescription("Sharing COVID-19 tabular data with a trusted university lab. " +
                "Evaluated under the strict SPHN framework.");
        act1.setDatasetAssessment(sphnDA);
        act1.setRecipientAssessment(recipients.academicSphn());
        act1.setSharedUsernames(new HashSet<>(Set.of("anna.mueller")));
        act1.setReleaseModel(ReleaseModel.NON_PUBLIC);
        saveDemoActivityIfMissing(act1);

        // Scenario 2: Academic evaluated under El Emam
        DataSharingActivity act2 = new DataSharingActivity();
        act2.setCreatorUsername("user");
        act2.setName("LEOSS / " + ACADEMIC_RECIPIENT + " (El Emam)");
        act2.setDescription("Controlled academic research scenario evaluated under El Emam; " +
                "safeguards are scenario assumptions.");
        act2.setDatasetAssessment(elEmamDA);
        act2.setRecipientAssessment(recipients.academicElEmam());
        act2.setReleaseModel(ReleaseModel.NON_PUBLIC);
        saveDemoActivityIfMissing(act2);


        // =========================================================================
        // PUBLIC RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 5: Public Release evaluated under El Emam
        DataSharingActivity act5 = new DataSharingActivity();
        act5.setCreatorUsername("user");
        act5.setName("LEOSS / " + PUBLIC_RECIPIENT + " (El Emam)");
        act5.setDescription("Unrestricted release scenario evaluated under El Emam, without recipient-specific " +
                "safeguards or an assumption that every recipient is malicious.");
        act5.setDatasetAssessment(elEmamDA);
        act5.setRecipientAssessment(recipients.publicElEmam());
        act5.setReleaseModel(ReleaseModel.PUBLIC);
        saveDemoActivityIfMissing(act5);

        // Scenario 6: Public Release evaluated under SPHN
        DataSharingActivity act6 = new DataSharingActivity();
        act6.setCreatorUsername("user");
        act6.setName("LEOSS / " + PUBLIC_RECIPIENT + " (SPHN)");
        act6.setDescription("Evaluating a totally open data release against the strict clinical IT and contextual " +
                "standards of the SPHN framework.");
        act6.setDatasetAssessment(sphnDA);
        act6.setRecipientAssessment(recipients.publicSphn());
        act6.setReleaseModel(ReleaseModel.PUBLIC);
        saveDemoActivityIfMissing(act6);


        // =========================================================================
        // COMMERCIAL RECIPIENT SCENARIOS
        // =========================================================================

        // Scenario 7: Commercial evaluated under El Emam
        DataSharingActivity act7 = new DataSharingActivity();
        act7.setCreatorUsername("user");
        act7.setName("LEOSS / " + COMMERCIAL_RECIPIENT + " (El Emam)");
        act7.setDescription("Controlled commercial research scenario evaluated under El Emam, with strong safeguards, " +
                "technical capability, resources and potential commercial value.");
        act7.setDatasetAssessment(elEmamDA);
        act7.setRecipientAssessment(recipients.commercialElEmam());
        act7.setSharedUsernames(new HashSet<>(Set.of("max.mustermann", "sophie.becker")));
        act7.setReleaseModel(ReleaseModel.NON_PUBLIC);
        saveDemoActivityIfMissing(act7);

        // Scenario 8: Commercial evaluated under SPHN
        DataSharingActivity act8 = new DataSharingActivity();
        act8.setCreatorUsername("user");
        act8.setName("LEOSS / " + COMMERCIAL_RECIPIENT + " (SPHN)");
        act8.setDescription("Commercial data sharing agreement evaluated under the SPHN framework, with strong controls" +
                " but elevated likelihood due to hospital-affiliated staff with EHR access.");
        act8.setDatasetAssessment(sphnDA);
        act8.setRecipientAssessment(recipients.commercialSphn());
        act8.setSharedUsernames(new HashSet<>(Set.of("max.mustermann", "sophie.becker")));
        act8.setReleaseModel(ReleaseModel.NON_PUBLIC);
        saveDemoActivityIfMissing(act8);
    }

    private void ensureEpicActivities(DatasetAssessment assessment, DemoRecipients recipients) {
        ensureEpicActivity(assessment, recipients.academicElEmam(), ACADEMIC_RECIPIENT, ReleaseModel.NON_PUBLIC,
                "EPIC-Potsdam P1090 data sharing with a trusted academic research institute under strong " +
                        "institutional, contractual and technical safeguards.");
        ensureEpicActivity(assessment, recipients.commercialElEmam(), COMMERCIAL_RECIPIENT, ReleaseModel.NON_PUBLIC,
                "EPIC-Potsdam P1090 data sharing with a controlled commercial research partner, with contractual " +
                        "safeguards but greater technical capability, resources and potential commercial value.");
        ensureEpicActivity(assessment, recipients.publicElEmam(), PUBLIC_RECIPIENT, ReleaseModel.PUBLIC,
                "EPIC-Potsdam P1090 data considered for public or unrestricted release with minimal or " +
                        "no recipient-specific contextual controls.");
    }

    private void ensureEpicActivity(DatasetAssessment assessment, RecipientAssessment recipient,
                                    String name, ReleaseModel releaseModel, String description) {
        DataSharingActivity activity = new DataSharingActivity();
        activity.setCreatorUsername("user");
        activity.setName("EPIC-Potsdam / " + name + " (El Emam)");
        activity.setDescription(description);
        activity.setReleaseModel(releaseModel);
        activity.setDatasetAssessment(assessment);
        activity.setRecipientAssessment(recipient);
        saveDemoActivityIfMissing(activity);
    }


    private void saveDemoActivityIfMissing(DataSharingActivity activity) {
        var matches = dataSharingActivityRepository.findAll().stream().filter(existing ->
                sameName(existing.getName(), activity.getName())
                || hasSameAssessments(existing, activity)).toList();
        if (matches.isEmpty()) {
            dataSharingActivityRepository.save(activity);
            return;
        }

        // Only fill missing metadata on an exact known demo. Never overwrite a selection
        // or guess the release model of user-created activities from recipient names.
        if (matches.size() == 1) {
            var existing = matches.get(0);
            if (existing.getReleaseModel() == null
                    && "user".equals(existing.getCreatorUsername())
                    && Objects.equals(existing.getName(), activity.getName())
                    && Objects.equals(existing.getDescription(), activity.getDescription())
                    && hasSameAssessments(existing, activity)) {
                existing.setReleaseModel(activity.getReleaseModel());
                dataSharingActivityRepository.save(existing);
            }
        }
    }

    private boolean hasSameAssessments(DataSharingActivity existing, DataSharingActivity candidate) {
        return existing.getDatasetAssessment() != null && existing.getRecipientAssessment() != null
                && Objects.equals(existing.getDatasetAssessment().getId(), candidate.getDatasetAssessment().getId())
                && Objects.equals(existing.getRecipientAssessment().getId(), candidate.getRecipientAssessment().getId());
    }
}
