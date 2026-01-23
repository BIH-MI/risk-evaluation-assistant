package org.bihealth.mi.risk_assessment_api.dto.request.recipient;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;

import java.util.HashSet;
import java.util.Set;

/**
 * Represents the request payload for creating or updating a Recipient.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecipientRequestDTO {
    // Renamed from 'organization' for consistency with AuditableEntity
    private String name;
    private String description;
    private String organizationLink;
    private Set<String> sharedUsernames;

    /**
     * Converts this DTO into a new, non-persisted Recipient entity.
     *
     * @param username The username of the user creating the recipient.
     * @return A new Recipient entity, ready to be saved by the service layer.
     */
    public Recipient toEntity(String username) {
        Recipient r = new Recipient();
        r.setCreatorUsername(username);

        // Set both the inherited 'name' and the specific 'organization' field
        r.setName(this.name);
        r.setOrganization(this.name);

        r.setDescription(this.description);
        r.setOrganizationLink(this.organizationLink);
        if (this.sharedUsernames != null) {
            r.setSharedUsernames(new HashSet<>(this.sharedUsernames));
        }
        return r;
    }
}