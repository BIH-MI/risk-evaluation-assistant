package org.bihealth.mi.risk_assessment_api.dto.request.activity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;

import java.util.*;

/**
 * Represents the top-level request payload for creating or updating a DataSharingActivity.
 * It contains all the necessary information to link dataset and recipient assessments.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSharingActivityRequestDTO {
    // User-facing name of the data sharing scenario.
    private String name;

    // Optional description of the sharing purpose or context.
    private String description;

    // Additional users who should be able to view this activity.
    private Set<String> sharedUsernames;

    // Dataset assessment selected as the data-side input.
    private Long datasetAssessmentId;

    // Recipient assessment selected as the recipient/context-side input.
    private Long recipientAssessmentId;

    // Optional activity-specific table overrides.
    private List<DataSharingActivityTableAssessmentRequestDTO> tableAssessments;


    /**
     * Builds a new DataSharingActivity aggregate from already-resolved
     * assessment entities.
     *
     * <p>The service layer resolves and validates the dataset/recipient
     * assessment IDs before calling this method; this DTO only wires the entity
     * graph and nested activity-specific table overrides.</p>
     */
    public DataSharingActivity toEntity(
            String creatorUsername,
            DatasetAssessment da,
            RecipientAssessment ra,
            DatasetTableAssessmentRepository tableRepo,
            DatasetTableAssessmentAttributeRepository attributeRepo
    ) {
        DataSharingActivity act = new DataSharingActivity();
        act.setCreatorUsername(creatorUsername);
        act.setName(name);
        act.setDescription(description);
        act.setSharedUsernames(sharedUsernames != null
                ? sharedUsernames
                : Collections.emptySet());
        act.setDatasetAssessment(da);
        act.setRecipientAssessment(ra);

        if (tableAssessments != null) {
            for (var taDto : tableAssessments) {
                var ta = taDto.toEntity(act, tableRepo, attributeRepo);
                act.getTableAssessments().add(ta);
            }
        }
        return act;
    }
}
