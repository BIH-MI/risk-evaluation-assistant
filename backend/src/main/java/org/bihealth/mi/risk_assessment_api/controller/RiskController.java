package org.bihealth.mi.risk_assessment_api.controller;

import org.bihealth.mi.risk_assessment_api.dto.request.risk.RiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.service.RiskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    /**
     * Creates the controller with the service that performs the risk
     * calculation and report mapping.
     */
    @Autowired
    public RiskController(RiskService riskService) {
        this.riskService = riskService;
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
            @RequestBody RiskRequestDTO dto
    ) {
        GenericRiskResponseDTO resp = riskService.calculateRisk(dto);
        return ResponseEntity.ok(resp);
    }
}
