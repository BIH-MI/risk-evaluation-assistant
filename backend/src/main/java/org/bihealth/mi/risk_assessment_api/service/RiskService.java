package org.bihealth.mi.risk_assessment_api.service;

import jakarta.persistence.EntityNotFoundException;
import org.bihealth.mi.risk_assessment_api.dto.request.risk.RiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.utils.RiskComputationService;
import org.bihealth.mi.risk_assessment_api.utils.RiskComputationService.GenericCalculationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Application service for stateless risk calculation requests.
 *
 * <p>This service does not implement the scoring formula itself. It loads the
 * saved data-sharing activity, collects the dataset and recipient answers,
 * selects the relevant configurations, delegates calculation to
 * {@link RiskComputationService}, and maps the result to the API response DTO.</p>
 */
@Service
@Transactional
public class RiskService {
    // Domain calculation engine containing the framework-independent risk logic.
    private final RiskComputationService riskComputationService;

    // Used to load the activity that links dataset and recipient assessments.
    private final DataSharingActivityRepository activityRepository;

    /**
     * Creates the service with the calculation engine and activity repository.
     */
    @Autowired
    public RiskService(
            RiskComputationService riskComputationService,
            DataSharingActivityRepository activityRepository) {
        this.riskComputationService = riskComputationService;
        this.activityRepository = activityRepository;
    }

    /**
     * Calculates risk for one DataSharingActivity without persisting a report.
     *
     * <p>The activity supplies two assessment halves: dataset answers for the
     * data/impact side and recipient answers for the context/attack side. The
     * computation engine returns both the final risk and the category breakdown
     * used by the frontend explanation view.</p>
     */
    public GenericRiskResponseDTO calculateRisk(RiskRequestDTO dto) {
        // Load the activity that binds dataset and recipient assessments.
        DataSharingActivity activity = activityRepository.findById(dto.getActivityId())
                .orElseThrow(() -> new EntityNotFoundException("Activity not found with ID: " + dto.getActivityId()));

        // Combine answers from both assessment halves. The computation service
        // groups them back into categories using each answer's question/category.
        List<Answer> combinedAnswers = new ArrayList<>();
        if (activity.getDatasetAssessment() != null && activity.getDatasetAssessment().getAnswers() != null) {
            combinedAnswers.addAll(activity.getDatasetAssessment().getAnswers());
        }
        if (activity.getRecipientAssessment() != null && activity.getRecipientAssessment().getAnswers() != null) {
            combinedAnswers.addAll(activity.getRecipientAssessment().getAnswers());
        }

        if (combinedAnswers.isEmpty()) {
            throw new IllegalStateException("Cannot calculate risk: No answers found in Dataset or Recipient assessments.");
        }

        // The dataset and recipient assessments each carry their own
        // configuration reference. For a valid activity these should normally be
        // the same framework, but the engine receives both explicitly.
        Configuration daConfig = null;
        if (activity.getDatasetAssessment() != null && activity.getDatasetAssessment().getConfiguration() != null) {
            daConfig = activity.getDatasetAssessment().getConfiguration();
        } else {
            throw new IllegalStateException("No Dataset Assessment Configuration found for this activity.");
        }

        Configuration raConfig = null;
        if (activity.getRecipientAssessment() != null && activity.getRecipientAssessment().getConfiguration() != null) {
            raConfig = activity.getRecipientAssessment().getConfiguration();
        } else {
            throw new IllegalStateException("No Recipient Assessment Configuration found for this activity.");
        }

        // Delegate the actual formula and category/matrix logic. A manual
        // threshold overrides the configured threshold only for this request.
        GenericCalculationResult result = riskComputationService.calculateTotalRisk(
                combinedAnswers,
                daConfig,
                raConfig,
                dto.getManualRiskThreshold()
        );

        // Map directly to the API response. No Report entity is saved for this
        // stateless calculation, so reportId remains null.
        GenericRiskResponseDTO response = new GenericRiskResponseDTO();
        response.setActivityId(activity.getId());
        response.setReportId(null);

        response.setFinalRisk(new GenericRiskResponseDTO.RiskMetric(
                result.getFinalRiskScore(),
                result.getFinalRiskClassification()
        ));

        // Map Context Risk
        response.setContextRisk(new GenericRiskResponseDTO.RiskMetric(
                result.getContextRisk(),
                null
        ));

        response.setThreshold(result.getThreshold());

        if (result.getAppliedMatrixConditions() != null) {
            // Include the matched matrix rule so users can see why the context
            // risk/P_attack value was selected.
            response.setAppliedMatrixRule(new GenericRiskResponseDTO.MatrixRule(
                    result.getAppliedMatrixConditions(),
                    result.getContextRisk()
            ));
        }

        response.setHighRiskTriggered(result.isHighRiskTriggered());

        // Convert the engine's category results into DTO metrics keyed by category code.
        Map<String, GenericRiskResponseDTO.CategoryMetric> dtoBreakdown = new HashMap<>();

        result.getCategoryBreakdown().forEach((categoryCode, catResult) -> {
            GenericRiskResponseDTO.CategoryMetric metric = new GenericRiskResponseDTO.CategoryMetric(
                    catResult.getRawScore(),
                    (catResult.getMatchedBand() != null) ? catResult.getMatchedBand().getLabel() : "UNKNOWN",
                    (catResult.getMatchedBand() != null) ? catResult.getMatchedBand().getRangeMinimum() : 0,
                    (catResult.getMatchedBand() != null) ? catResult.getMatchedBand().getRangeMaximum() : 0,
                    catResult.isHighRiskTriggered(),
                    catResult.getPositiveCount(),
                    catResult.getNeutralCount(),
                    catResult.getNegativeCount(),
                    catResult.getHighRiskCount()
            );
            dtoBreakdown.put(categoryCode, metric);
        });

        response.setCategoryBreakdown(dtoBreakdown);

        return response;
    }
}
