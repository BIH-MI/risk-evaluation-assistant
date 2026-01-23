package org.bihealth.mi.risk_assessment_api.repository.assessment.recipient;

import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecipientAssessmentRepository extends JpaRepository<RecipientAssessment, Integer> {

    @Query("""
      SELECT ra
      FROM RecipientAssessment ra
      JOIN ra.recipient r
      WHERE ra.creatorUsername = :username
         OR :username MEMBER OF r.sharedUsernames
      """)
    List<RecipientAssessment> findAccessibleByUsername(@Param("username") String username);
}