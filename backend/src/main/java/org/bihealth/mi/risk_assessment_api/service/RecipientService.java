package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.recipient.RecipientRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.recipient.RecipientResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for recipient profile management.
 *
 * <p>Recipients represent organizations or parties that may receive a dataset.
 * The service applies ownership/sharing access rules and maps recipient request
 * DTOs to the persisted recipient profile.</p>
 */
@Service
@Transactional
public class RecipientService {

    // Root repository for recipient records.
    private final RecipientRepository recipientRepository;

    /**
     * Creates the service with the recipient repository.
     */
    public RecipientService(RecipientRepository recipientRepository) {
        this.recipientRepository = recipientRepository;
    }

    /**
     * Verifies if the user is an admin, the creator, or in the shared usernames list.
     */
    protected void verifyRecipientAccess(Recipient recipient, String username, boolean isAdmin) {
        // Admins bypass recipient ownership and sharing checks.
        if (isAdmin) return;

        if (!recipient.getCreatorUsername().equals(username) &&
                (recipient.getSharedUsernames() == null || !recipient.getSharedUsernames().contains(username))) {
            throw new AccessDeniedException("No access to recipient: " + recipient.getId());
        }
    }

    /**
     * Returns recipients visible to the authenticated user.
     */
    public List<RecipientResponseDTO> getAllRecipients(String username, boolean isAdmin) {
        if (isAdmin) {
            return recipientRepository.findAll().stream()
                    .map(RecipientResponseDTO::new)
                    .collect(Collectors.toList());
        }

        // Regular users see recipients they created or that were shared with them.
        return recipientRepository.findAll().stream()
                .filter(r -> r.getCreatorUsername().equals(username) ||
                        (r.getSharedUsernames() != null && r.getSharedUsernames().contains(username)))
                .map(RecipientResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Loads one recipient after access checks.
     */
    public RecipientResponseDTO getRecipientById(Long id, String username, boolean isAdmin) {
        Recipient recipient = recipientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + id));

        verifyRecipientAccess(recipient, username, isAdmin);
        return new RecipientResponseDTO(recipient);
    }

    /**
     * Creates a new recipient owned by the authenticated user.
     */
    public RecipientResponseDTO createRecipient(RecipientRequestDTO dto, String username, boolean isAdmin) {
        Recipient recipient = new Recipient();
        recipient.setCreatorUsername(username);

        // The UI currently has one recipient name field. Keep the inherited name
        // and organization field synchronized for compatibility with existing views.
        recipient.setName(dto.getName());
        recipient.setOrganization(dto.getName());

        recipient.setDescription(dto.getDescription());
        recipient.setOrganizationLink(dto.getOrganizationLink());

        if (dto.getSharedUsernames() != null) {
            recipient.setSharedUsernames(new HashSet<>(dto.getSharedUsernames()));
        }

        Recipient saved = recipientRepository.save(recipient);
        return new RecipientResponseDTO(saved);
    }

    /**
     * Updates recipient metadata and sharing list after access checks.
     */
    public RecipientResponseDTO updateRecipient(Long id, RecipientRequestDTO dto, String username, boolean isAdmin) {
        Recipient recipient = recipientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + id));

        verifyRecipientAccess(recipient, username, isAdmin);

        // Keep name and organization mirrored as in createRecipient.
        recipient.setName(dto.getName());
        recipient.setOrganization(dto.getName());

        recipient.setDescription(dto.getDescription());
        recipient.setOrganizationLink(dto.getOrganizationLink());

        if (dto.getSharedUsernames() != null) {
            recipient.setSharedUsernames(new HashSet<>(dto.getSharedUsernames()));
        }

        Recipient updated = recipientRepository.save(recipient);
        return new RecipientResponseDTO(updated);
    }

    /**
     * Deletes a recipient after access checks.
     */
    public void deleteRecipient(Long id, String username, boolean isAdmin) {
        Recipient recipient = recipientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found: " + id));

        verifyRecipientAccess(recipient, username, isAdmin);

        recipientRepository.delete(recipient);
    }
}
