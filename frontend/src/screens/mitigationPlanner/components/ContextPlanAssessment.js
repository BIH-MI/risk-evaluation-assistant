import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import AppliedQuestionChanges from "./AppliedQuestionChanges";
import BaselinePlanComparison from "./BaselinePlanComparison";
import ContextRiskMatrix from "./ContextRiskMatrix";

/**
 * Context side of a plan: the counterfactual result of RiskComputationService on in-memory
 * Recipient Assessment answers. A control may change an answer without changing the modelled
 * band; that is reported as such, never forced into an improvement.
 */
export default function ContextPlanAssessment({ evaluation, planLabel }) {
  const { t } = useTranslation();
  const context = evaluation.counterfactualContextResult;
  if (!context?.baseline || !context?.projected) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <BaselinePlanComparison context={context} planLabel={planLabel} />
      {evaluation.contextActionsApplied && !evaluation.contextRiskChanged && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t(
            "mitigationPlanner.context.noBandChange",
            "The selected controls change the assessment inputs but do not change the modelled context-risk band under the current configuration."
          )}
        </RATypography>
      )}
      {context.matrix && (
        <ContextRiskMatrix
          matrix={context.matrix}
          baseline={context.baseline}
          projected={context.projected}
          planLabel={planLabel}
          impactBand={context.impactBand}
          targetThreshold={context.targetThreshold}
        />
      )}
      <AppliedQuestionChanges changes={context.appliedQuestionChanges || []} />
    </RABox>
  );
}

ContextPlanAssessment.propTypes = {
  evaluation: PropTypes.shape({
    counterfactualContextResult: PropTypes.object,
    contextActionsApplied: PropTypes.bool,
    contextRiskChanged: PropTypes.bool,
  }).isRequired,
  planLabel: PropTypes.string,
};

ContextPlanAssessment.defaultProps = { planLabel: "" };
