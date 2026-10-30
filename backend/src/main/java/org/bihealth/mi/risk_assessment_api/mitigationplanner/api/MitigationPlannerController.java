package org.bihealth.mi.risk_assessment_api.mitigationplanner.api;

import org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner.MitigationCandidatePlanRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner.MitigationPlanDraftRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.MitigationPlannerOverviewService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.MitigationPlanningService;
import org.bihealth.mi.risk_assessment_api.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Researcher-facing, read-only mitigation planner for one Data Sharing Activity.
 *
 * <p>Uses the same activity read-access rule as the activity endpoints; the planner is not an
 * admin-only feature. Nothing here persists plans or modifies assessments, and the Knowledge
 * Base used is always the Activity's pinned version.</p>
 */
@RestController
@RequestMapping("/api/data-sharing-activities/{id}/mitigation-planner")
public class MitigationPlannerController {

    private final MitigationPlannerOverviewService overviewService;
    private final MitigationPlanningService planningService;

    public MitigationPlannerController(
            MitigationPlannerOverviewService overviewService,
            MitigationPlanningService planningService
    ) {
        this.overviewService = overviewService;
        this.planningService = planningService;
    }

    /** Baseline risk, Risk Drivers and applicable mitigation opportunities (inference only). */
    @GetMapping("/opportunities")
    public ResponseEntity<MitigationPlannerOverviewDTO> getOpportunities(
            @PathVariable Long id,
            @RequestParam(required = false) Double manualRiskThreshold,
            JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(overviewService.getOverview(
                id, SecurityUtils.getUsername(token), SecurityUtils.isAdminRole(token), manualRiskThreshold));
    }

    /** Generates, evaluates and selects candidate plans: recommended plan plus up to three alternatives. */
    @PostMapping("/candidate-plans")
    public ResponseEntity<MitigationCandidatePlanResponseDTO> generateCandidatePlans(
            @PathVariable Long id,
            @RequestBody(required = false) MitigationCandidatePlanRequestDTO request,
            JwtAuthenticationToken token
    ) {
        Double manualRiskThreshold = request == null ? null : request.getManualRiskThreshold();
        return ResponseEntity.ok(planningService.generateCandidatePlans(
                id, manualRiskThreshold, SecurityUtils.getUsername(token), SecurityUtils.isAdminRole(token)));
    }

    /** Evaluates one researcher-assembled plan with the same evaluator as generated candidates. */
    @PostMapping("/plan-drafts/evaluate")
    public ResponseEntity<MitigationPlanDraftEvaluationDTO> evaluatePlanDraft(
            @PathVariable Long id,
            @RequestBody MitigationPlanDraftRequestDTO request,
            JwtAuthenticationToken token
    ) {
        return ResponseEntity.ok(planningService.evaluateDraft(
                id, request, SecurityUtils.getUsername(token), SecurityUtils.isAdminRole(token)));
    }
}
