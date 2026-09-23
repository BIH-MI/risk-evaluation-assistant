package org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStrategy;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.enums.ResidualDataRiskState;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Evaluation of one draft plan. The plan has no identifier: display labels (A1, B1, C1) are
 * presentation-only and assigned by the client.
 */
@Data
@NoArgsConstructor
public class MitigationPlanDraftEvaluationDTO {

    private MitigationPlanStrategy strategy;
    // Internal status; researcher-facing guidance is carried by nextStep.
    private MitigationPlanStatus status;
    // Plan-level summary of all Project constraint checks.
    private ProjectConstraintResult projectConstraintResult;
    // Researcher-facing next action, e.g. "Evaluate transformed data". Never "approved" or "safe".
    private String nextStep;
    private boolean dataRiskEvaluationRequired;
    // Why the status is not READY_FOR_REVIEW (or why it is INVALID/INCOMPATIBLE).
    private List<String> statusReasons = new ArrayList<>();
    private List<String> remainingEvaluationItems = new ArrayList<>();

    private List<PlanAction> actions = new ArrayList<>();
    private List<String> addressedRiskDriverIds = new ArrayList<>();

    // Required data-risk threshold R_anon under the plan's context: the maximum residual data
    // risk that would be acceptable. It is not a measured data risk q.
    private Double requiredDataRiskThreshold;
    private Double baselineRequiredDataRiskThreshold;
    // Measured residual data risk q. NOT_EVALUATED (value null) until a transformation engine
    // has executed the plan's data transformations; REA never estimates q from metadata.
    private ResidualDataRisk residualDataRisk = new ResidualDataRisk();

    private CostEstimate costEstimate = new CostEstimate();
    private SetupEstimate setupEstimate = new SetupEstimate();
    private List<ProjectCheck> projectChecks = new ArrayList<>();

    // Baseline versus projected context risk. Null for DATA plans: no Context Control is
    // included, so Controls, Likelihood and P_attack are not re-evaluated.
    private CounterfactualContextResultDTO counterfactualContextResult;
    // At least one mapped questionnaire answer was changed in memory.
    private boolean contextActionsApplied;
    // Controls band, Likelihood band, P_attack or R_anon differ from the baseline.
    private boolean contextRiskChanged;

    private List<String> warnings = new ArrayList<>();

    @Data
    @NoArgsConstructor
    public static class PlanAction {
        private Long actionId;
        private String actionName;
        private MitigationActionType actionType;
        private MitigationResultingDataForm resultingDataForm;
        private MitigationRecordRetentionEffect recordRetentionEffect;
        private List<PlanActionParameter> parameters = new ArrayList<>();
        private List<String> addressedRiskDriverIds = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class PlanActionParameter {
        private MitigationParameterCode parameterCode;
        // Null means the parameter is unresolved.
        private String value;
        private boolean resolved;
        private ParameterValueCompatibility compatibility;
    }

    public enum EstimateAvailability { KNOWN, PARTIAL, UNKNOWN, REQUIRES_ESTIMATE }

    @Data
    @NoArgsConstructor
    public static class CostEstimate {
        private EstimateAvailability availability = EstimateAvailability.UNKNOWN;
        private BigDecimal min;
        private BigDecimal max;
        private String currency;
        private String note;
    }

    @Data
    @NoArgsConstructor
    public static class SetupEstimate {
        private EstimateAvailability availability = EstimateAvailability.UNKNOWN;
        private Integer minDays;
        private Integer maxDays;
        private String note;
    }

    @Data
    @NoArgsConstructor
    public static class ProjectCheck {
        private String key;
        private String label;
        private String required;
        private String constraintType;
        private String planEvidence;
        private ProjectConstraintResult status;
        private String note;
    }

    @Data
    @NoArgsConstructor
    public static class ResidualDataRisk {
        private ResidualDataRiskState state = ResidualDataRiskState.NOT_EVALUATED;
        private Double value;
    }
}
