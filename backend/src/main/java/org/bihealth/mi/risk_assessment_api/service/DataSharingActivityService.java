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
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
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
 * Service class for managing all business logic related to DataSharingActivity entities.
 * This includes creation, retrieval, updates, deletion, and authorization checks.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class DataSharingActivityService {

    private final DataSharingActivityRepository repository;
    private final DatasetAssessmentRepository datasetAssessmentRepo;
    private final DatasetTableAssessmentRepository datasetTableAssessmentRepo;
    private final DatasetTableAssessmentAttributeRepository datasetTableAssessmentAttributeRepo;
    private final RecipientAssessmentRepository recipientAssessmentRepo;

    /**
     * Finds all activities that a user can access, either as the creator or through sharing.
     *
     * @param username The username of the user.
     * @return A list of DataSharingActivityResponseDTOs.
     */
    @Transactional(readOnly = true)
    public List<DataSharingActivityResponseDTO> findActivitiesByUsername(String username) {
        Set<DataSharingActivity> combined = new LinkedHashSet<>(repository.findByCreatorUsername(username));
        combined.addAll(repository.findBySharedUsernamesContains(username));
        return combined.stream()
                .map(DataSharingActivityResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single DataSharingActivity by its ID, ensuring the user has access.
     *
     * @param id       The ID of the activity to retrieve.
     * @param username The username for the authorization check.
     * @return A DataSharingActivityResponseDTO.
     * @throws EntityNotFoundException if the activity is not found.
     * @throws SecurityException       if the user does not have access.
     */
    @Transactional(readOnly = true)
    public DataSharingActivityResponseDTO getById(Integer id, String username) {
        DataSharingActivity act = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));
        if (!act.getCreatorUsername().equals(username)
                && !act.getSharedUsernames().contains(username)) {
            throw new SecurityException("Access denied to activity: " + id);
        }
        return new DataSharingActivityResponseDTO(act);
    }

    /**
     * Creates a new DataSharingActivity.
     *
     * @param dto      The DTO containing the request data.
     * @param username The username of the creator.
     * @return A DTO representing the newly created activity.
     */
    public DataSharingActivityResponseDTO create(
            DataSharingActivityRequestDTO dto,
            String username
    ) {
        // load the two assessments
        DatasetAssessment da = Optional.ofNullable(dto.getDatasetAssessmentId())
                .flatMap(datasetAssessmentRepo::findById)
                .orElse(null);
        RecipientAssessment ra = Optional.ofNullable(dto.getRecipientAssessmentId())
                .flatMap(recipientAssessmentRepo::findById)
                .orElse(null);

        // build the new entity (copies any DTO-supplied tableAssessments too)
        DataSharingActivity act = dto.toEntity(username, da, ra, datasetTableAssessmentRepo, datasetTableAssessmentAttributeRepo);

        DataSharingActivity saved = repository.save(act);
        return new DataSharingActivityResponseDTO(saved);
    }

    /**
     * Updates an existing DataSharingActivity in-place.
     * This method only allows updating scalar fields and does not permit adding or deleting
     * nested table or attribute assessments.
     *
     * @param id       The ID of the activity to update.
     * @param dto      The DTO containing the new data.
     * @param username The username for the authorization check.
     * @return A DTO representing the updated activity.
     * @throws EntityNotFoundException if the activity is not found.
     * @throws SecurityException       if the user is not the owner.
     * @throws IllegalArgumentException if the DTO attempts to add or remove nested items.
     */
    public DataSharingActivityResponseDTO update(
            Integer id,
            DataSharingActivityRequestDTO dto,
            String username
    ) {
        // 1) Load existing activity and verify access
        DataSharingActivity existing = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));
        if (!existing.getCreatorUsername().equals(username)) {
            throw new SecurityException("Not owner of activity: " + id);
        }

        // 2) Update top-level fields
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setSharedUsernames(dto.getSharedUsernames() != null ? dto.getSharedUsernames() : Collections.emptySet());

        // Re-link parent assessments
        DatasetAssessment da = Optional.ofNullable(dto.getDatasetAssessmentId())
                .flatMap(datasetAssessmentRepo::findById).orElse(null);
        RecipientAssessment ra = Optional.ofNullable(dto.getRecipientAssessmentId())
                .flatMap(recipientAssessmentRepo::findById).orElse(null);
        existing.setDatasetAssessment(da);
        existing.setRecipientAssessment(ra);

        // --- 3) Sync Table Assessments ---
        // Create a map of existing table assessments for easy lookup.
        Map<Integer, DataSharingActivityTableAssessment> existingTableAssessmentsMap =
                existing.getTableAssessments().stream()
                        .collect(Collectors.toMap(ta -> ta.getTable().getId(), Function.identity()));

        // Use a list to track which assessments are processed from the DTO.
        List<DataSharingActivityTableAssessment> processedTableAssessments = new ArrayList<>();

        if (dto.getTableAssessments() != null) {
            for (DataSharingActivityTableAssessmentRequestDTO taDto : dto.getTableAssessments()) {
                // Find an existing table assessment or create a new one.
                DataSharingActivityTableAssessment tableAssessment =
                        existingTableAssessmentsMap.getOrDefault(taDto.getTableId(), new DataSharingActivityTableAssessment());

                // Update or set its properties.
                tableAssessment.setDataSharingActivity(existing);
                tableAssessment.setTable(datasetTableAssessmentRepo.getReferenceById(taDto.getTableId()));

                // Now, sync the attributes for this table assessment
                syncAttributes(tableAssessment, taDto.getAttributes());

                processedTableAssessments.add(tableAssessment);
            }
        }

        // 4) Remove old table assessments that were not in the DTO and add the new/updated ones.
        existing.getTableAssessments().clear();
        existing.getTableAssessments().addAll(processedTableAssessments);

        // 5) Save and return
        DataSharingActivity saved = repository.save(existing);
        return new DataSharingActivityResponseDTO(saved);
    }

    /**
     * A helper method to synchronize the attributes of a table assessment.
     */
    private void syncAttributes(DataSharingActivityTableAssessment tableAssessment,
                                List<DataSharingActivityTableAttributeAssessmentRequestDTO> attributeDtos) {

        Map<Integer, DataSharingActivityTableAssessmentAttribute> existingAttributesMap =
                tableAssessment.getAttributes().stream()
                        .collect(Collectors.toMap(attr -> attr.getTableAssessmentAttribute().getId(), Function.identity()));

        List<DataSharingActivityTableAssessmentAttribute> processedAttributes = new ArrayList<>();

        if (attributeDtos != null) {
            for (DataSharingActivityTableAttributeAssessmentRequestDTO attrDto : attributeDtos) {
                DataSharingActivityTableAssessmentAttribute attribute =
                        existingAttributesMap.getOrDefault(attrDto.getAttributeId(), new DataSharingActivityTableAssessmentAttribute());

                attribute.setTableAssessment(tableAssessment);
                attribute.setTableAssessmentAttribute(datasetTableAssessmentAttributeRepo.getReferenceById(attrDto.getAttributeId()));
                attribute.setSensitivity(attrDto.getSensitivity());
                attribute.setReplicability(attrDto.getReplicability());
                attribute.setAvailability(attrDto.getAvailability());
                attribute.setDistinguishability(attrDto.getDistinguishability());
                attribute.setDirectIdentifier(attrDto.getDirectIdentifier());

                processedAttributes.add(attribute);
            }
        }

        tableAssessment.getAttributes().clear();
        tableAssessment.getAttributes().addAll(processedAttributes);
    }

    /**
     * Deletes a DataSharingActivity by its ID.
     *
     * @param id       The ID of the activity to delete.
     * @param username The username for the ownership check.
     * @throws EntityNotFoundException if the activity is not found.
     * @throws SecurityException       if the user is not the owner.
     */
    public void delete(Integer id, String username) {
        DataSharingActivity act = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Activity not found: " + id));
        if (!act.getCreatorUsername().equals(username)) {
            throw new SecurityException("Not owner of activity: " + id);
        }
        repository.delete(act);
    }
}