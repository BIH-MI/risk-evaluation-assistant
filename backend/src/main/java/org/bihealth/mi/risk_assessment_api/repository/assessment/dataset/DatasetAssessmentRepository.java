package org.bihealth.mi.risk_assessment_api.repository.assessment.dataset;

import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DatasetAssessmentRepository extends JpaRepository<DatasetAssessment, Long> {

    // Add this line so Spring Boot auto-generates the query
    List<DatasetAssessment> findByDatasetId(Long datasetId);
    boolean existsByConfigurationId(Long configurationId);
    long countByConfigurationId(Long configurationId);
}