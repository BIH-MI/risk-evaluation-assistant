package org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationOpportunityStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.PlannerAvailability;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverSource;
import org.bihealth.mi.risk_assessment_api.enums.RiskThresholdSource;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * Read-only baseline and mitigation-opportunity overview for one Data Sharing
 * Activity.
 *
 * <p>Opportunities describe which catalogue actions are applicable and why. They
 * intentionally carry no risk-reduction, cost-aggregation, or ranking fields.</p>
 */
@Data
@NoArgsConstructor
public class MitigationPlannerOverviewDTO {

    private ActivitySummary activity;
    private ProjectSummary project;
    private InputAvailability availability = new InputAvailability();
    private BaselineRisk baselineRisk;
    private List<ProjectConstraint> projectConstraints = new ArrayList<>();
    private RiskDriverGroups riskDrivers = new RiskDriverGroups();
    private OpportunitySection<DataOpportunity> dataOpportunities = new OpportunitySection<>();
    private OpportunitySection<ContextOpportunity> contextOpportunities = new OpportunitySection<>();
    private List<String> warnings = new ArrayList<>();

    @Data
    @NoArgsConstructor
    public static class ActivitySummary {
        private Long activityId;
        private String activityName;
        // Derived from the Project's sharing-model requirement; null when the Project does not define one.
        private MitigationSharingArrangement sharingArrangement;
        // Project access-pattern requirement value (raw option code), null when not defined.
        private String accessPattern;
        private List<DatasetSummary> datasets = new ArrayList<>();
        private List<RecipientSummary> recipients = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class DatasetSummary {
        private Long datasetId;
        private String datasetName;
        private Long datasetAssessmentId;
        private String datasetAssessmentName;
    }

    @Data
    @NoArgsConstructor
    public static class RecipientSummary {
        private Long recipientId;
        private String recipientName;
        private Long recipientAssessmentId;
        private String recipientAssessmentName;
        private String frameworkName;
    }

    @Data
    @NoArgsConstructor
    public static class ProjectSummary {
        private Long projectId;
        private String projectName;
        private String templateName;
    }

    @Data
    @NoArgsConstructor
    public static class InputAvailability {
        private PlannerAvailability project = PlannerAvailability.MISSING;
        private PlannerAvailability datasetAssessment = PlannerAvailability.MISSING;
        private PlannerAvailability recipientAssessment = PlannerAvailability.MISSING;
        private PlannerAvailability riskResult = PlannerAvailability.MISSING;
    }

    /** Values of the authoritative REA risk result; nothing is recomputed here. */
    @Data
    @NoArgsConstructor
    public static class BaselineRisk {
        private String impactBand;
        private String controlsBand;
        private String likelihoodBand;
        // Overall target threshold T actually used (manual override if present, else configured).
        private Double effectiveThreshold;
        private Double configuredThreshold;
        private Double manualThreshold;
        private RiskThresholdSource thresholdSource;
        // Context probability of attack.
        private Double attackProbability;
        // Required data-risk threshold R_anon; this is a requirement, not a measured q.
        private Double anonymizationThreshold;
    }

    @Data
    @NoArgsConstructor
    public static class ProjectConstraint {
        private String key;
        private String label;
        private String valueType;
        private String constraintType;
        // Text form of the stored value; selections are comma separated. Never a default.
        private String value;
        private String unit;
    }

    @Data
    @NoArgsConstructor
    public static class OpportunitySection<T> {
        private PlannerAvailability availability = PlannerAvailability.AVAILABLE;
        private String unavailableReason;
        private List<T> opportunities = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class OperationalEstimate {
        // Missing values are UNKNOWN (null), never zero.
        private BigDecimal costMin;
        private BigDecimal costMax;
        private String currency;
        private Integer setupDaysMin;
        private Integer setupDaysMax;
        private MitigationEstimateScope estimateScope;
        private String source;
        private String assumptions;
    }

    @Data
    @NoArgsConstructor
    public static class Opportunity {
        private Long actionId;
        private String actionCode;
        private String actionName;
        private MitigationActionType actionType;
        private MitigationOpportunityStatus status;
        private String description;
        private String implementationGuidance;
        private String verificationCriteria;
        private String evidenceReference;
        private String rationale;
        private OperationalEstimate estimate;
        private List<String> addressedRiskDriverIds = new ArrayList<>();
    }

    @Data
    @EqualsAndHashCode(callSuper = true)
    @NoArgsConstructor
    public static class DataOpportunity extends Opportunity {
        private List<DataTarget> matchedTargets = new ArrayList<>();
        private List<PlanParameter> parameters = new ArrayList<>();
        private MitigationResultingDataForm resultingDataForm;
        private MitigationRecordRetentionEffect recordRetentionEffect;
    }

    @Data
    @EqualsAndHashCode(callSuper = true)
    @NoArgsConstructor
    public static class ContextOpportunity extends Opportunity {
        private List<ContextFinding> matchedFindings = new ArrayList<>();
        // Budget/setup comparison of this single action; null when the Project defines neither.
        private ProjectFeasibility projectFeasibility;
    }

    /** Operational compatibility of one action with the Project budget and setup-time limits. */
    @Data
    @NoArgsConstructor
    public static class ProjectFeasibility {
        private ProjectConstraintResult result;
        private List<String> reasons = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    public static class DataTarget {
        private String tableName;
        // One name for a single attribute; several for a retained QID combination.
        private List<String> attributeNames = new ArrayList<>();
        private MitigationAttributeRole attributeRole;
        private DataType dataType;
        private String reason;
    }

    @Data
    @NoArgsConstructor
    public static class ContextFinding {
        private String frameworkName;
        private String questionCode;
        private String questionText;
        private String currentOptionCode;
        private String currentOptionText;
        private String answerImpact;
        private boolean highRiskTrigger;
        // Counterfactual questionnaire state defined by the catalogue; never persisted.
        private String potentialOptionCode;
        private String potentialOptionText;
        private String reason;
    }

    @Data
    @NoArgsConstructor
    public static class RiskDriverGroups {
        private List<RiskDriverDTO> dataDrivers = new ArrayList<>();
        private List<RiskDriverDTO> contextDrivers = new ArrayList<>();
    }

    /**
     * One assessment finding that contributes to the current risk. Priority explains the selected
     * option semantics; it is not an additional risk-scoring model.
     */
    @Data
    @NoArgsConstructor
    public static class RiskDriverDTO {
        private String id;
        private RiskDriverSource source;
        private String categoryCode;
        private String categoryLabel;
        private String questionCode;
        private String questionText;
        private String selectedOptionCode;
        private String selectedOptionText;
        // Impact of the selected QuestionOption; null for Dataset Assessment evidence drivers.
        private String answerImpact;
        private boolean highRiskTrigger;
        private RiskDriverPriority priority;
        private boolean actionable;
        private List<Long> matchedMitigationActionIds = new ArrayList<>();
        private List<String> matchedMitigationActionCodes = new ArrayList<>();
        private String explanation;

        private String tableName;
        private List<String> attributeNames = new ArrayList<>();
        private MitigationAttributeRole attributeRole;
        private DataType dataType;
    }

    @Data
    @NoArgsConstructor
    public static class PlanParameter {
        private MitigationParameterCode parameterCode;
        private String description;
        private List<ParameterValue> allowedValues = new ArrayList<>();
        // Parameter-level relationship to a Project constraint; null when none is explicit.
        private ParameterValueCompatibility compatibility;
        private String compatibilityReason;
    }

    @Data
    @NoArgsConstructor
    public static class ParameterValue {
        private String value;
        private ParameterValueCompatibility compatibility;
        private String compatibilityReason;
    }
}
