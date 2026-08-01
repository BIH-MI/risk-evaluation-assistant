package org.bihealth.mi.risk_assessment_api.repository.activity;

import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface DataSharingActivityTableAssessmentRepository
        extends JpaRepository<DataSharingActivityTableAssessment, Long> {
    List<DataSharingActivityTableAssessment> findByDataSharingActivityId(Long dataSharingActivityId);
}