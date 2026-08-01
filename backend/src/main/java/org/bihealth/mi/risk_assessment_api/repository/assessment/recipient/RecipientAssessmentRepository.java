package org.bihealth.mi.risk_assessment_api.repository.assessment.recipient;

import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecipientAssessmentRepository extends JpaRepository<RecipientAssessment, Long> {

    List<RecipientAssessment> findByRecipient(Recipient recipient);
    boolean existsByConfigurationId(Long configurationId);
    long countByConfigurationId(Long configurationId);
}