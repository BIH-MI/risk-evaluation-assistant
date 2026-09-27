import PropTypes from "prop-types";
import { Divider } from "@mui/material";

import RABox from "components/layout/RABox";
import ContextPlanAssessment from "./ContextPlanAssessment";
import DataPlanAssessment from "./DataPlanAssessment";

// Both halves are shown. Context values may change; transformed-data risk evaluation remains a
// required follow-up. A hybrid plan is never treated as automatically feasible.
export default function HybridPlanAssessment({ evaluation, baselineRisk, planLabel }) {
  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <DataPlanAssessment evaluation={evaluation} baselineRisk={baselineRisk} />
      <Divider />
      <ContextPlanAssessment evaluation={evaluation} planLabel={planLabel} />
    </RABox>
  );
}

HybridPlanAssessment.propTypes = {
  evaluation: PropTypes.object.isRequired,
  baselineRisk: PropTypes.object,
  planLabel: PropTypes.string,
};

HybridPlanAssessment.defaultProps = { baselineRisk: null, planLabel: "" };
