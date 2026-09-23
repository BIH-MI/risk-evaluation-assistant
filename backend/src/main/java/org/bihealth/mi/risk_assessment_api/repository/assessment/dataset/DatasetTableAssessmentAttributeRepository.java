package org.bihealth.mi.risk_assessment_api.repository.assessment.dataset;

import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DatasetTableAssessmentAttributeRepository extends JpaRepository<DatasetTableAssessmentAttribute, Long> {

    @Query("select a from DatasetTableAssessmentAttribute a join fetch a.attribute attr join fetch attr.table "
            + "where a.assessment.datasetAssessment.id = :datasetAssessmentId")
    List<DatasetTableAssessmentAttribute> findAllForDatasetAssessment(
            @Param("datasetAssessmentId") Long datasetAssessmentId);
}
