package org.bihealth.mi.risk_assessment_api.repository.assessment.dataset;

import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.springframework.data.jpa.repository.JpaRepository;


public interface DatasetTableAssessmentRepository extends JpaRepository<DatasetTableAssessment, Long> {
}