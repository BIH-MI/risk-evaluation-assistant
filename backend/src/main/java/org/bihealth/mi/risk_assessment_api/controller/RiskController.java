package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.risk.RiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.service.DataSharingActivityService;
import org.bihealth.mi.risk_assessment_api.service.RiskService;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for calculating dynamic risk via the Universal Framework Engine.
 *
 * <p>This controller does not own the calculation rules. It forwards a
 * lightweight request to {@link RiskService}, which loads the linked data
 * sharing activity, applies the selected configuration, and returns the report
 * DTO expected by the UI.</p>
 */
@RestController
@RequestMapping("/api/risk")
public class RiskController {

    private final RiskService riskService;
    private final DataSharingActivityService activityService;

    /**
     * Creates the controller with the service that performs the risk
     * calculation and report mapping.
     */
    @Autowired
    public RiskController(RiskService riskService, DataSharingActivityService activityService) {
        this.riskService = riskService;
        this.activityService = activityService;
    }

    /**
     * Calculates the total risk based on the user's questionnaire answers.
     *
     * This is a stateless operation that does not persist a report to the database.
     *
     * @param dto The request body containing the activity ID and optional thresholds.
     * @return A ResponseEntity containing the calculated risk score and its detailed breakdown.
     */
    @PostMapping("/calculate")
    public ResponseEntity<GenericRiskResponseDTO> calculateTotalRisk(
            @RequestBody RiskRequestDTO dto,
            JwtAuthenticationToken token
    ) {
        if (dto.getActivityId() == null) {
            throw new IllegalArgumentException("activityId is required.");
        }
        // The result is derived from the activity's Dataset and Recipient Assessments, so the caller
        // needs the same read access as for the activity itself (404 if missing, 403 if denied).
        activityService.getAccessibleActivityEntity(
                dto.getActivityId(), SecurityUtils.getUsername(token), SecurityUtils.isAdminRole(token));
        GenericRiskResponseDTO resp = riskService.calculateRisk(dto);
        return ResponseEntity.ok(resp);
    }
}
