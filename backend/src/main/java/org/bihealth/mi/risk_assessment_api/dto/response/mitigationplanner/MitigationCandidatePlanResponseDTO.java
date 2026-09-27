package org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverSource;

import java.util.ArrayList;
import java.util.List;

/**
 * Automatically generated candidate plans for one Data Sharing Activity.
 *
 * <p>The recommended plan is the one preferred by the configured deterministic
 * selection policy. It is not claimed to be optimal or proven effective.</p>
 */
@Data
@NoArgsConstructor
public class MitigationCandidatePlanResponseDTO {
    private Long knowledgeBaseId;
    private String knowledgeBaseName;
    private Long knowledgeBaseVersionId;
    private Integer knowledgeBaseVersionNumber;
    private String selectionPolicyName;
    private List<String> selectionCriteria = new ArrayList<>();
    private String selectionReason;
    private int generatedCandidateCount;
    private int criticalDriverTotal;
    private int highDriverTotal;
    private CandidatePlanDTO recommendedPlan;
    private List<CandidatePlanDTO> alternativePlans = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();

    @Data
    @NoArgsConstructor
    public static class CandidatePlanDTO {
        private String label;
        private boolean recommended;
        private List<Long> selectedActionIds = new ArrayList<>();
        private List<String> selectedActionCodes = new ArrayList<>();
        private int criticalDriverCoverage;
        private int highDriverCoverage;
        private int unresolvedProjectChecks;
        private String stableActionCodeKey;
        private List<String> planSummary = new ArrayList<>();
        private List<ActionRationale> actionRationales = new ArrayList<>();
        private MitigationPlanDraftEvaluationDTO evaluation;
    }

    /** Risk Driver → matched mapping/evidence → applicable action, per selected action. */
    @Data
    @NoArgsConstructor
    public static class ActionRationale {
        private Long actionId;
        private String actionCode;
        private String actionName;
        private MitigationActionType actionType;
        private List<DriverLink> riskDrivers = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class DriverLink {
        private String riskDriverId;
        private RiskDriverPriority priority;
        private RiskDriverSource source;
        private String categoryLabel;
        private String evidence;
        private String matchedRule;
    }
}
