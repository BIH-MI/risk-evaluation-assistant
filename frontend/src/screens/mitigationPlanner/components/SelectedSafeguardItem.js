import PropTypes from "prop-types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  addressedDriverGroups,
  planActionParameterLines,
  transformationTooltipDetails,
} from "../utils/mitigationPlanRows";
import { RiskPriorityChip } from "./riskFactorTableHelpers";
import { formatAttributeList } from "../utils/mitigationPlannerFormatters";

function appliesToAction(change, action) {
  if ((change.actionIds || []).map(Number).includes(Number(action.actionId))) return true;
  return (change.actionNames || []).includes(action.actionName);
}

// Tooltip content. Every box and text inherits the tooltip's theme colour; labels are secondary
// through opacity only, so they stay legible on both light and dark tooltip surfaces.
function LabelledValue({ label, value }) {
  return (
    <RABox color="inherit">
      <RATypography variant="caption" color="inherit" display="block" sx={{ opacity: 0.72 }}>
        {label}
      </RATypography>
      <RATypography variant="body2" color="inherit">
        {value || "—"}
      </RATypography>
    </RABox>
  );
}

LabelledValue.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string };
LabelledValue.defaultProps = { value: null };

function ChangeLine({ change, index, showNumber }) {
  return (
    <RABox color="inherit" display="flex" flexDirection="column" gap={1}>
      <RATypography variant="body2" color="inherit" sx={{ fontWeight: 600 }}>
        {showNumber ? `${index + 1}. ` : ""}
        {change.questionText}
      </RATypography>
      <LabelledValue label="Current" value={change.currentOptionText} />
      <LabelledValue label="After verified implementation" value={change.projectedOptionText} />
    </RABox>
  );
}

ChangeLine.propTypes = {
  change: PropTypes.shape({
    questionText: PropTypes.string,
    currentOptionText: PropTypes.string,
    projectedOptionText: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
  showNumber: PropTypes.bool.isRequired,
};

function SafeguardTooltipContent({ changes }) {
  if (changes.length === 1) {
    return <ChangeLine change={changes[0]} index={0} showNumber={false} />;
  }

  return (
    <RABox color="inherit" display="flex" flexDirection="column" gap={1.5}>
      <RATypography variant="body2" color="inherit" sx={{ fontWeight: 600 }}>
        Mapped assessment changes
      </RATypography>
      {changes.map((change, index) => (
        <ChangeLine
          key={`${change.frameworkName}:${change.questionCode}:${change.currentOptionText}:${change.projectedOptionText}`}
          change={change}
          index={index}
          showNumber
        />
      ))}
    </RABox>
  );
}

SafeguardTooltipContent.propTypes = {
  changes: PropTypes.array.isRequired,
};

function TransformationTooltipContent({ details }) {
  return (
    <RABox color="inherit" display="flex" flexDirection="column" gap={1}>
      <RATypography variant="body2" color="inherit" sx={{ fontWeight: 600 }}>
        {formatAttributeList(details.attributeNames)}
      </RATypography>
      {details.parameters.map(({ label, value }) => (
        <LabelledValue key={label} label={label} value={value} />
      ))}
    </RABox>
  );
}

TransformationTooltipContent.propTypes = {
  details: PropTypes.shape({
    attributeNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    parameters: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, value: PropTypes.string })).isRequired,
  }).isRequired,
};

function InfoTooltip({ title }) {
  return (
    <RequirementHelpTooltip title={title}>
      <InfoOutlinedIcon
        fontSize="small"
        tabIndex={0}
        aria-label="More information"
        aria-hidden={false}
        sx={{ color: "text.secondary", cursor: "help" }}
      />
    </RequirementHelpTooltip>
  );
}

InfoTooltip.propTypes = { title: PropTypes.node.isRequired };

export function changesForAction(action, changes = []) {
  return changes.filter((change) => appliesToAction(change, action));
}

/**
 * One selected action of the plan: its name, the Risk Driver categories it structurally addresses
 * (from the actual linked drivers) and an info tooltip: for context controls the mapped
 * questionnaire change, for data transformations the affected dataset attributes and parameters.
 * "Addresses" is linkage, not proof the risk is eliminated.
 */
export default function SelectedSafeguardItem({ action, appliedChanges, driversById }) {
  const actionChanges = changesForAction(action, appliedChanges);
  const groups = addressedDriverGroups(action, driversById);
  const transformationDetails =
    action.actionType === "DATA_TRANSFORMATION" ? transformationTooltipDetails(action, driversById) : null;

  return (
    <li>
      <RATypography variant="body2">{action.actionName}</RATypography>
      {(groups.length > 0 || actionChanges.length > 0 || transformationDetails) && (
        <RABox display="flex" alignItems="center" flexWrap="wrap" columnGap={1} rowGap={0.5} mt={0.25}>
          {groups.length > 0 && (
            <RATypography variant="body2" sx={{ color: "text.secondary" }}>
              Addresses:
            </RATypography>
          )}
          {groups.map(({ category, priorities }) => (
            <RABox key={category} display="flex" alignItems="center" flexWrap="wrap" gap={0.75}>
              <RATypography variant="body2" sx={{ color: "text.secondary" }}>
                {category}
              </RATypography>
              {priorities.map(({ priority, count }) => (
                <RiskPriorityChip key={priority} priority={priority} count={count} />
              ))}
            </RABox>
          ))}
          {actionChanges.length > 0 && <InfoTooltip title={<SafeguardTooltipContent changes={actionChanges} />} />}
          {transformationDetails && (
            <InfoTooltip title={<TransformationTooltipContent details={transformationDetails} />} />
          )}
        </RABox>
      )}
      {planActionParameterLines(action).map((line) => (
        <RATypography key={line} variant="body2" sx={{ color: "text.secondary" }}>
          {line}
        </RATypography>
      ))}
    </li>
  );
}

SelectedSafeguardItem.propTypes = {
  action: PropTypes.shape({
    actionId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    actionName: PropTypes.string,
    actionType: PropTypes.string,
    addressedRiskDriverIds: PropTypes.array,
  }).isRequired,
  appliedChanges: PropTypes.array,
  driversById: PropTypes.instanceOf(Map),
};

SelectedSafeguardItem.defaultProps = {
  appliedChanges: [],
  driversById: new Map(),
};
