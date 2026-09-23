package org.bihealth.mi.risk_assessment_api.repository.activity;

import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface DataSharingActivityTableAssessmentAttributeRepository
        extends JpaRepository<DataSharingActivityTableAssessmentAttribute, Long> {

    List<DataSharingActivityTableAssessmentAttribute> findByTableAssessmentId(Long tableAssessmentId);

    @Query("select a from DataSharingActivityTableAssessmentAttribute a "
            + "join fetch a.tableAssessmentAttribute taa join fetch taa.attribute attr join fetch attr.table "
            + "where a.tableAssessment.dataSharingActivity.id = :activityId")
    List<DataSharingActivityTableAssessmentAttribute> findAllForActivity(@Param("activityId") Long activityId);
}
