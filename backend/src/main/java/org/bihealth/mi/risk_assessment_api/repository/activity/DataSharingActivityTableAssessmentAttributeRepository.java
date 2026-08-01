package org.bihealth.mi.risk_assessment_api.repository.activity;

import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface DataSharingActivityTableAssessmentAttributeRepository
        extends JpaRepository<DataSharingActivityTableAssessmentAttribute, Long> {

    List<DataSharingActivityTableAssessmentAttribute> findByTableAssessmentId(Long tableAssessmentId);
}