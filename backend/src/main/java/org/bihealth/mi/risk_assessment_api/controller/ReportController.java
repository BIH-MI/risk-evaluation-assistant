package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.report.ExposureRiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.TotalRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.ReportResponseDTO;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.bihealth.mi.risk_assessment_api.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing and calculating risk reports.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    @Autowired
    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    /**
     * Retrieves a list of all reports saved by the authenticated user.
     *
     * @param token The JWT token of the authenticated user.
     * @return A ResponseEntity containing a list of saved reports.
     */
    @GetMapping
    public ResponseEntity<List<ReportResponseDTO>> listReports(JwtAuthenticationToken token) {
        String username = SecurityUtils.getUsername(token);
        List<ReportResponseDTO> dtos = reportService.getReportsForUser(username);
        return ResponseEntity.ok(dtos);
    }

    /**
     * Retrieves a single saved report by its ID.
     *
     * @param id    The ID of the report to retrieve.
     * @param token The JWT token of the authenticated user for authorization.
     * @return A ResponseEntity containing the requested report.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReportResponseDTO> getReport(
            @PathVariable Integer id,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        ReportResponseDTO dto = reportService.getReportForUserById(id, username);
        return ResponseEntity.ok(dto);
    }

    /**
     * Calculates the total exposure risk based on a set of input parameters.
     * This endpoint can also optionally save the resulting report to the database.
     *
     * @param dto       The request body containing all inputs for the risk calculation.
     * @param save      A boolean query parameter. If true, the generated report is saved. Defaults to false.
     * @param token     The JWT token of the authenticated user.
     * @return A ResponseEntity containing the calculated risk score and its breakdown.
     */
    @PostMapping("/total-risk")
    public ResponseEntity<TotalRiskResponseDTO> totalRisk(
            @RequestBody ExposureRiskRequestDTO dto,
            @RequestParam(value = "save", required = false, defaultValue = "false") boolean save,
            JwtAuthenticationToken token
    ) {
        String username = SecurityUtils.getUsername(token);
        TotalRiskResponseDTO resp = reportService.calculateExposureRisk(dto, save, username);
        return ResponseEntity.ok(resp);
    }
}