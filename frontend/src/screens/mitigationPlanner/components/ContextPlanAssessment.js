import PropTypes from "prop-types";

import RABox from "components/layout/RABox";
import BaselinePlanComparison from "./BaselinePlanComparison";
import ContextRiskMatrix from "./ContextRiskMatrix";
import RemainingTriggerExplanation from "./RemainingTriggerExplanation";

/**
 * Context side of a plan: the counterfactual result of RiskComputationService on in-memory
 * Recipient Assessment answers. A control may change an answer without changing the modelled
 * band; the backend diagnostics explain why instead of forcing an improvement.
 */
export default function ContextPlanAssessment({ evaluation, planLabel }) {
  const context = evaluation.counterfactualContextResult;
  if (!context?.baseline || !context?.projected) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <RABox display="flex" flexDirection="column" gap={1.5}>
        <BaselinePlanComparison context={context} planLabel={planLabel} />
        {evaluation.contextActionsApplied && (
          <RemainingTriggerExplanation
            outcomes={context.categoryOutcomes || []}
            remainingTriggers={context.remainingHighRiskTriggers || []}
          />
        )}
      </RABox>
      {context.matrix && (
        <ContextRiskMatrix
          matrix={context.matrix}
          baseline={context.baseline}
          projected={context.projected}
          planLabel={planLabel}
          categoryOutcomes={context.categoryOutcomes || []}
        />
      )}
    </RABox>
  );
}

ContextPlanAssessment.propTypes = {
  evaluation: PropTypes.shape({
    counterfactualContextResult: PropTypes.object,
    contextActionsApplied: PropTypes.bool,
  }).isRequired,
  planLabel: PropTypes.string,
};

ContextPlanAssessment.defaultProps = { planLabel: "" };
