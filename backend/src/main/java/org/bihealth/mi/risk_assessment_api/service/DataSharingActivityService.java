package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.activity.DataSharingActivityRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.activity.DataSharingActivityTableAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.activity.DataSharingActivityTableAttributeAssessmentRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.activity.DataSharingActivityResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringDimension;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for creating and managing DataSharingActivity aggregates.
 *
 * <p>An activity is the unit evaluated by the risk endpoint: it links a dataset
 * assessment to a recipient assessment and may hold activity-specific overrides
 * for table and attribute risk metadata.</p>
 */
@Service
@Transactional
@RequiredArgsConstructor
public class DataSharingActivityService {

    // Root repository for activity records.
    private final DataSharingActivityRepository repository;

    // Repositories used to resolve the assessment IDs referenced by activity requests.
    private final DatasetAssessmentRepository datasetAssessmentRepo;
    private final DatasetTableAssessmentRepository datasetTableAssessmentRepo;
    private final DatasetTableAssessmentAttributeRepository datasetTableAssessmentAttributeRepo;
    private final RecipientAssessmentRepository recipientAssessmentRepo;
    private final AttributeScoringSystemService attributeScoringSystemService;

    /**
     * Returns activities visible to a user.
     *
     * <p>Admins receive all activities. Regular users receive the union of
     * activities they created and activities explicitly shared with them.</p>
     */
    @Transactional(readOnly = true)
    public List<DataSharingActivityResponseDTO> findActivitiesByUsername(String username, boolean isAdmin) {
        if (isAdmin) {
            return repository.findAll().stream()
                    .map(DataSharingActivityResponseDTO::new)
                    .collect(Collectors.toList());
        }

        // LinkedHashSet preserves repository iteration order while removing
        // duplicates when the creator is also in sharedUsernames.
        Set<DataSharingActivity> combined = new LinkedHashSet<>(repository.findByCreatorUsername(username));
        combined.addAll(repository.findBySharedUsernamesContains(username));
        return combined.stream()
                .map(DataSharingActivityResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Loads one activity and verifies read access.
     */
    @Transactional(readOnly = true)
    public DataSharingActivityResponseDTO getById(Long id, String username, boolean isAdmin) {
        DataSharingActivity act = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));

        // Read access allows owner, explicitly shared users, and admins.
        if (!isAdmin && !act.getCreatorUsername().equals(username) &&
                (act.getSharedUsernames() == null || !act.getSharedUsernames().contains(username))) {
            throw new SecurityException("Access denied to activity: " + id);
        }

        return new DataSharingActivityResponseDTO(act);
    }

    /**
     * Creates a new activity from existing dataset and recipient assessments.
     *
     * <p>The DTO resolves IDs only; this service loads the actual assessment
     * entities so the activity can be persisted as a valid aggregate.</p>
     */
    public DataSharingActivityResponseDTO create(DataSharingActivityRequestDTO dto, String username, boolean isAdmin) {
        DatasetAssessment da = datasetAssessmentRepo.findById(dto.getDatasetAssessmentId())
                .orElseThrow(() -> new EntityNotFoundException("Dataset Assessment not found"));

        RecipientAssessment ra = recipientAssessmentRepo.findById(dto.getRecipientAssessmentId())
                .orElseThrow(() -> new EntityNotFoundException("Recipient Assessment not found"));

        DataSharingActivity act = dto.toEntity(
                username, da, ra, datasetTableAssessmentRepo, datasetTableAssessmentAttributeRepo
        );
        normalizeActivityAttributeScores(act, ensureAttributeScoringVersion(da));

        DataSharingActivity saved = repository.save(act);
        return new DataSharingActivityResponseDTO(saved);
    }

    /**
     * Updates activity metadata, linked assessments, and nested override rows.
     *
     * <p>Only the creator or an admin can update. Shared users may read the
     * activity but do not automatically gain edit rights here.</p>
     */
    public DataSharingActivityResponseDTO update(Long id, DataSharingActivityRequestDTO dto, String username, boolean isAdmin) {
        DataSharingActivity existing = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));

        // Mutations are owner-only unless the caller is an admin.
        if (!isAdmin && !existing.getCreatorUsername().equals(username)) {
            throw new SecurityException("Not owner of activity: " + id);
        }

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setSharedUsernames(dto.getSharedUsernames() != null ? dto.getSharedUsernames() : Collections.emptySet());

        DatasetAssessment da = Optional.ofNullable(dto.getDatasetAssessmentId())
                .flatMap(datasetAssessmentRepo::findById)
                .orElse(existing.getDatasetAssessment());

        RecipientAssessment ra = Optional.ofNullable(dto.getRecipientAssessmentId())
                .flatMap(recipientAssessmentRepo::findById)
                .orElse(existing.getRecipientAssessment());

        if (da != null && ra != null) {
            ensureAttributeScoringVersion(da);
            existing.setDatasetAssessment(da);
            existing.setRecipientAssessment(ra);
        }

        // Sync table overrides by the referenced DatasetTableAssessment ID.
        // Incoming rows are upserted; omitted rows are removed by replacing the collection.
        Map<Long, DataSharingActivityTableAssessment> existingTableAssessmentsMap =
                existing.getTableAssessments().stream()
                        .collect(Collectors.toMap(ta -> ta.getTable().getId(), Function.identity()));

        List<DataSharingActivityTableAssessment> processedTableAssessments = new ArrayList<>();

        if (dto.getTableAssessments() != null) {
            for (DataSharingActivityTableAssessmentRequestDTO taDto : dto.getTableAssessments()) {
                DataSharingActivityTableAssessment tableAssessment =
                        existingTableAssessmentsMap.getOrDefault(taDto.getTableId(), new DataSharingActivityTableAssessment());

                tableAssessment.setDataSharingActivity(existing);
                tableAssessment.setTable(datasetTableAssessmentRepo.getReferenceById(taDto.getTableId()));

                syncAttributes(tableAssessment, taDto.getAttributes(), ensureAttributeScoringVersion(existing.getDatasetAssessment()));
                processedTableAssessments.add(tableAssessment);
            }
        }

        existing.getTableAssessments().clear();
        existing.getTableAssessments().addAll(processedTableAssessments);

        DataSharingActivity saved = repository.save(existing);
        return new DataSharingActivityResponseDTO(saved);
    }


    /**
     * Synchronizes activity-specific attribute overrides for one table override.
     *
     * <p>Attributes are matched by the referenced default
     * DatasetTableAssessmentAttribute ID. The final child collection mirrors the
     * request exactly, so omitted override rows are removed.</p>
     */
    private void syncAttributes(DataSharingActivityTableAssessment tableAssessment,
                                List<DataSharingActivityTableAttributeAssessmentRequestDTO> attributeDtos,
                                AttributeScoringSystemVersion scoringVersion) {

        Map<Long, DataSharingActivityTableAssessmentAttribute> existingAttributesMap =
                tableAssessment.getAttributes().stream()
                        .collect(Collectors.toMap(attr -> attr.getTableAssessmentAttribute().getId(), Function.identity()));

        List<DataSharingActivityTableAssessmentAttribute> processedAttributes = new ArrayList<>();

        if (attributeDtos != null) {
            for (DataSharingActivityTableAttributeAssessmentRequestDTO attrDto : attributeDtos) {
                DataSharingActivityTableAssessmentAttribute attribute =
                        existingAttributesMap.getOrDefault(attrDto.getAttributeId(), new DataSharingActivityTableAssessmentAttribute());

                attribute.setTableAssessment(tableAssessment);
                DatasetTableAssessmentAttribute sourceAttribute = datasetTableAssessmentAttributeRepo
                        .findById(attrDto.getAttributeId())
                        .orElseThrow(() -> new EntityNotFoundException("Dataset table assessment attribute not found: " + attrDto.getAttributeId()));
                attribute.setTableAssessmentAttribute(sourceAttribute);
                applyActivityAttributeScores(attribute, attrDto, sourceAttribute, scoringVersion);

                processedAttributes.add(attribute);
            }
        }

        tableAssessment.getAttributes().clear();
        tableAssessment.getAttributes().addAll(processedAttributes);
    }

    /**
     * Deletes an activity when the caller is the creator or an admin.
     */
    public void delete(Long id, String username, boolean isAdmin) {
        DataSharingActivity act = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));

        // Mutations are owner-only unless the caller is an admin.
        if (!isAdmin && !act.getCreatorUsername().equals(username)) {
            throw new SecurityException("Not owner of activity: " + id);
        }

        repository.delete(act);
    }

    private void normalizeActivityAttributeScores(
            DataSharingActivity activity,
            AttributeScoringSystemVersion scoringVersion
    ) {
        if (activity.getTableAssessments() == null) {
            return;
        }

        for (DataSharingActivityTableAssessment tableAssessment : activity.getTableAssessments()) {
            if (tableAssessment.getAttributes() == null) {
                continue;
            }
            for (DataSharingActivityTableAssessmentAttribute attribute : tableAssessment.getAttributes()) {
                applyActivityAttributeScores(
                        attribute,
                        attribute.getSensitivity(),
                        attribute.getReplicability(),
                        attribute.getAvailability(),
                        attribute.getDistinguishability(),
                        attribute.isDirectIdentifier(),
                        attribute.getTableAssessmentAttribute(),
                        scoringVersion
                );
            }
        }
    }

    private void applyActivityAttributeScores(
            DataSharingActivityTableAssessmentAttribute attribute,
            DataSharingActivityTableAttributeAssessmentRequestDTO dto,
            DatasetTableAssessmentAttribute sourceAttribute,
            AttributeScoringSystemVersion scoringVersion
    ) {
        applyActivityAttributeScores(
                attribute,
                dto.getSensitivity(),
                dto.getReplicability(),
                dto.getAvailability(),
                dto.getDistinguishability(),
                Boolean.TRUE.equals(dto.getDirectIdentifier()),
                sourceAttribute,
                scoringVersion
        );
    }

    private void applyActivityAttributeScores(
            DataSharingActivityTableAssessmentAttribute attribute,
            Double sensitivity,
            Double replicability,
            Double availability,
            Double distinguishability,
            boolean directIdentifier,
            DatasetTableAssessmentAttribute sourceAttribute,
            AttributeScoringSystemVersion scoringVersion
    ) {
        boolean excluded = sourceAttribute != null
                && sourceAttribute.getAttribute() != null
                && sourceAttribute.getAttribute().isExcluded();
        attribute.setDirectIdentifier(directIdentifier);

        if (directIdentifier || excluded) {
            attribute.setSensitivity(null);
            attribute.setReplicability(null);
            attribute.setAvailability(null);
            attribute.setDistinguishability(null);
            return;
        }

        String context = "Activity attribute " + (sourceAttribute == null ? "" : sourceAttribute.getId());
        attributeScoringSystemService.validateScoreValue(
                scoringVersion, AttributeScoringDimension.SENSITIVITY, sensitivity, context);
        attributeScoringSystemService.validateScoreValue(
                scoringVersion, AttributeScoringDimension.REPLICABILITY, replicability, context);
        attributeScoringSystemService.validateScoreValue(
                scoringVersion, AttributeScoringDimension.AVAILABILITY, availability, context);
        attributeScoringSystemService.validateScoreValue(
                scoringVersion, AttributeScoringDimension.DISTINGUISHABILITY, distinguishability, context);

        attribute.setSensitivity(sensitivity);
        attribute.setReplicability(replicability);
        attribute.setAvailability(availability);
        attribute.setDistinguishability(distinguishability);
    }

    private AttributeScoringSystemVersion ensureAttributeScoringVersion(DatasetAssessment assessment) {
        if (assessment.getAttributeScoringSystemVersion() != null) {
            return assessment.getAttributeScoringSystemVersion();
        }

        AttributeScoringSystemVersion scoringVersion = attributeScoringSystemService.getDefaultActiveVersion();
        assessment.setAttributeScoringSystem(scoringVersion.getScoringSystem());
        assessment.setAttributeScoringSystemVersion(scoringVersion);
        assessment.setAttributeIdentifiabilityThreshold(scoringVersion.getDefaultIdentifiabilityThreshold());
        assessment.setAttributeSensitivityThreshold(scoringVersion.getDefaultSensitivityThreshold());
        datasetAssessmentRepo.save(assessment);
        return scoringVersion;
    }
}
