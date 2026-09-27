import PropTypes from "prop-types";

import RABox from "components/layout/RABox";
import BaselinePlanComparison from "./BaselinePlanComparison";
import ContextRiskMatrix from "./ContextRiskMatrix";

/**
 * Context side of a plan: the counterfactual result of RiskComputationService on in-memory
 * Recipient Assessment answers. A control may change an answer without changing the modelled
 * band; the comparison shows that honestly rather than forcing an improvement. The backend's
 * detailed diagnostics (remaining high-risk triggers, category outcomes) are kept in the API
 * response for auditing but are not rendered here.
 */
export default function ContextPlanAssessment({ evaluation, planLabel }) {
  const context = evaluation.counterfactualContextResult;
  if (!context?.baseline || !context?.projected) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <BaselinePlanComparison context={context} planLabel={planLabel} />
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
  }).isRequired,
  planLabel: PropTypes.string,
};

ContextPlanAssessment.defaultProps = { planLabel: "" };
