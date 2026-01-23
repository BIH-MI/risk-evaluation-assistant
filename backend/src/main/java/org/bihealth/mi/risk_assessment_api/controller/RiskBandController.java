package org.bihealth.mi.risk_assessment_api.controller;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.model.matrix.RiskBand;
import org.bihealth.mi.risk_assessment_api.repository.matrix.RiskBandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/risk-bands")
public class RiskBandController {

    @Autowired
    private RiskBandRepository riskBandRepository;

    @GetMapping
    public List<RiskBand> getAllRiskBands() {
        return riskBandRepository.findAll();
    }

    @PostMapping
    public RiskBand createRiskBand(@RequestBody RiskBand riskBand) {
        return riskBandRepository.save(riskBand);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RiskBand> getRiskBandById(@PathVariable(value = "id") Integer riskBandId) {
        RiskBand riskBand = riskBandRepository.findById(riskBandId)
                .orElseThrow(() -> new EntityNotFoundException("RiskBand with id " + riskBandId + " not found"));
        return ResponseEntity.ok().body(riskBand);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RiskBand> updateRiskBand(@PathVariable(value = "id") Integer riskBandId,
                                                   @RequestBody RiskBand riskBandDetails) {
        RiskBand riskBand = riskBandRepository.findById(riskBandId)
                .orElseThrow(() -> new EntityNotFoundException("RiskBand with id " + riskBandId + " not found"));

        riskBand.setCategory(riskBandDetails.getCategory());
        riskBand.setValue(riskBandDetails.getValue());
        riskBand.setLabel(riskBandDetails.getLabel());
        riskBand.setColor(riskBandDetails.getColor());
        riskBand.setDescription(riskBandDetails.getDescription());
        riskBand.setRangeMinimum(riskBandDetails.getRangeMinimum());
        riskBand.setRangeMaximum(riskBandDetails.getRangeMaximum());

        RiskBand updatedRiskBand = riskBandRepository.save(riskBand);
        return ResponseEntity.ok(updatedRiskBand);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteRiskBand(@PathVariable(value = "id") Integer riskBandId) {
        RiskBand riskBand = riskBandRepository.findById(riskBandId)
                .orElseThrow(() -> new EntityNotFoundException("RiskBand with id " + riskBandId + " not found"));

        riskBandRepository.delete(riskBand);

        return ResponseEntity.ok().build();
    }
}