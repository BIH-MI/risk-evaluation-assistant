package org.bihealth.mi.risk_assessment_api.repository.assessment.dataset;

import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DatasetAssessmentRepository extends JpaRepository<DatasetAssessment, Integer> {

}
