package org.bihealth.mi.risk_assessment_api.repository.report;

import org.bihealth.mi.risk_assessment_api.model.report.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Integer> {
    List<Report> findByCreatorUsername(String creatorUsername);
    Optional<Report> findTopByDataSharingActivityIdOrderByIdDesc(Integer activityId);
}