import PropTypes from "prop-types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { planActionParameterLines } from "../utils/mitigationPlanRows";

function appliesToAction(change, action) {
  if ((change.actionIds || []).map(Number).includes(Number(action.actionId))) return true;
  return (change.actionNames || []).includes(action.actionName);
}

function ChangeLine({ change, index, showNumber }) {
  return (
    <RABox>
      {showNumber && (
        <RATypography variant="body2" fontWeight="bold">
          {index + 1}.
        </RATypography>
      )}
      <RATypography variant="body2" fontWeight="bold">
        {change.questionText}
      </RATypography>
      <RATypography variant="body2">Current: {change.currentOptionText || "—"}</RATypography>
      <RATypography variant="body2">
        After verified implementation: {change.projectedOptionText || "—"}
      </RATypography>
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
    <RABox display="flex" flexDirection="column" gap={1}>
      <RATypography variant="body2" fontWeight="bold">
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

export function changesForAction(action, changes = []) {
  return changes.filter((change) => appliesToAction(change, action));
}

export default function SelectedSafeguardItem({ action, appliedChanges }) {
  const actionChanges = changesForAction(action, appliedChanges);

  return (
    <li>
      <RABox display="flex" alignItems="center" gap={0.75}>
        <RATypography variant="body2">{action.actionName}</RATypography>
        {actionChanges.length > 0 && (
          <RequirementHelpTooltip title={<SafeguardTooltipContent changes={actionChanges} />}>
            <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
          </RequirementHelpTooltip>
        )}
      </RABox>
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
  }).isRequired,
  appliedChanges: PropTypes.array,
};

SelectedSafeguardItem.defaultProps = {
  appliedChanges: [],
};
