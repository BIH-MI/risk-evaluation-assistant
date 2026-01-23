package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.report.ExposureRiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.TotalRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.ReportResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.report.Report;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.report.ReportRepository;
import org.bihealth.mi.risk_assessment_api.utils.RiskComputationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Service for managing and calculating risk reports based on questionnaires.
 */
@Service
@Transactional
public class ReportService {
    private final ReportRepository reportRepository;
    private final RiskComputationService riskComputationService;
    private final DataSharingActivityRepository dataSharingActivityRepository;

    @Autowired
    public ReportService(
            ReportRepository reportRepository,
            RiskComputationService riskComputationService,
            DataSharingActivityRepository dataSharingActivityRepository
    ) {
        this.reportRepository = reportRepository;
        this.riskComputationService = riskComputationService;
        this.dataSharingActivityRepository = dataSharingActivityRepository;
    }

    public List<ReportResponseDTO> getReportsForUser(String username) {
        return reportRepository.findByCreatorUsername(username)
                .stream()
                .map(ReportResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public ReportResponseDTO getReportForUserById(Integer reportId, String username) {
        Report rpt = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found"));
        if (!username.equals(rpt.getCreatorUsername())) {
            throw new SecurityException("Access denied");
        }
        return ReportResponseDTO.fromEntity(rpt);
    }

    /**
     * Orchestrates the risk calculation process for a DataSharingActivity based on questionnaire scores
     * and attribute-based Re-identification risk.
     *
     * @param req      The DTO containing input parameters for the calculation.
     * @param save     If true, the resulting report is saved to the database.
     * @param username The username of the user performing the calculation.
     * @return A DTO containing the full breakdown of the calculated risk score.
     * @throws EntityNotFoundException if the associated DataSharingActivity is not found.
     */
    /**
     * Orchestrates the risk calculation process.
     * Computes Context Risk, IP Thresholds, and Max Data Risk based on Questionnaire scores and User Overrides.
     */
    public TotalRiskResponseDTO calculateExposureRisk(ExposureRiskRequestDTO req, boolean save, String username) {
        DataSharingActivity activity = dataSharingActivityRepository.findById(req.getActivityId())
                .orElseThrow(() -> new EntityNotFoundException("Activity not found"));

        // 1. Compute Risk using Service (with Overrides and Manual Threshold)
        // Assuming Request DTO has these getters for the Overrides (-1, 0, 1) and Manual Threshold (Double)
        RiskComputationService.RiskCalculationResult res = riskComputationService.computeNormalizedRisk(
                activity,
                req.getManualRiskThreshold()         // Double (Manual Threshold)
        );

        Integer reportId = (req.getReportId() != null)
                ? req.getReportId()
                : reportRepository.findTopByDataSharingActivityIdOrderByIdDesc(activity.getId())
                .map(Report::getId).orElse(null);

        if (save) {
            Report report;
            if (req.getReportId() != null) {
                report = reportRepository.findById(req.getReportId())
                        .orElseThrow(() -> new EntityNotFoundException("Report not found for id: " + req.getReportId()));
            } else {
                report = new Report();
                report.setDataSharingActivity(activity);
                report.setCreatorUsername(username);
            }

            // ——— 2. Save Overall Logic Metrics (Context, Threshold, Data Risk) ———
            report.setContextRisk(res.getContextRisk());
            report.setRiskThreshold(res.getIpThreshold());
            report.setMaximumDataRisk(res.getMaximumDataRisk());

            // ——— 3. Save Category Details (Scores & Classifications) ———

            // Motives & Capacity
            RiskComputationService.CategoryResult catMOTC = res.getResMOTC();
            report.setMotivesCapacityNormalizedScore(catMOTC.getNormalizedScore());
            report.setMotivesCapacityClassification(catMOTC.getClassification().name());

            // Mitigating Controls
            RiskComputationService.CategoryResult catMITC = res.getResMITC();
            report.setMitigatingControlsNormalizedScore(catMITC.getNormalizedScore());
            report.setMitigatingControlsClassification(catMITC.getClassification().name());

            // Invasion of Privacy
            RiskComputationService.CategoryResult catIP = res.getResIP();
            report.setInvasionPrivacyNormalizedScore(catIP.getNormalizedScore());
            report.setInvasionPrivacyClassification(catIP.getClassification().name());

            // Save
            reportRepository.saveAndFlush(report);
            reportId = report.getId();

            // Link to Activity if not already linked
            if (activity.getReport() == null || !Objects.equals(activity.getReport().getId(), reportId)) {
                activity.setReport(report);
                dataSharingActivityRepository.save(activity);
            }
        }

        // ——— 4. Construct Response DTO ———
        RiskComputationService.CategoryResult rMOTC = res.getResMOTC();
        RiskComputationService.CategoryResult rMITC = res.getResMITC();
        RiskComputationService.CategoryResult rIP = res.getResIP();

        return new TotalRiskResponseDTO(
                activity.getId(),
                reportId,

                // Context Risk
                res.getContextRisk(),

                // IP Threshold
                res.getIpThreshold(),
                res.getManualRiskThreshold(),

                // Max Data Risk Target
                res.getMaximumDataRisk(),

                // Classifications (Enums)
                rMOTC.getClassification(),
                rMITC.getClassification(),
                rIP.getClassification()
        );
    }
}