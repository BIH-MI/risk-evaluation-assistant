package org.bihealth.mi.risk_assessment_api.repository.recipient;

import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecipientRepository extends JpaRepository<Recipient, Long> {
    List<Recipient> findByCreatorUsername(String creatorUsername);
    List<Recipient> findBySharedUsernamesContains(String username);
}
