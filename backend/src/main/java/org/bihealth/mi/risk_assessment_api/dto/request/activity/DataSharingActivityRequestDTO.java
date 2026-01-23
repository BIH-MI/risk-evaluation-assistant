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
    private String name;
    private String description;
    private Set<String> sharedUsernames;
    private Integer datasetAssessmentId;
    private Integer recipientAssessmentId;
    private List<DataSharingActivityTableAssessmentRequestDTO> tableAssessments;

    /**
     * Converts this DTO into a new, non-persisted DataSharingActivity entity.
     * This method orchestrates the conversion of the entire nested DTO structure.
     *
     * @param creatorUsername The username of the user creating the activity.
     * @param da              The pre-fetched DatasetAssessment entity.
     * @param ra              The pre-fetched RecipientAssessment entity.
     * @param tableRepo       A repository passed down to child DTOs to resolve table assessment references.
     * @param attributeRepo   A repository passed down to child DTOs to resolve attribute references.
     * @return A complete DataSharingActivity entity graph, ready to be saved.
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