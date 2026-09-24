import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Collapse, TableCell, TableRow } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import MitigationCard from "./MitigationCard";
import {
  RISK_FACTOR_COLUMN_COUNT,
  actionIdKey,
  domId,
  hasSelectedAction,
  parameterChoicesForAction,
} from "./riskFactorTableHelpers";

export default function MitigationCardStack({
  riskFactorKey,
  riskFactor,
  actions,
  expanded,
  selectedActionIds,
  parameterChoices,
  onToggleAction,
  onToggleDetails,
  onChooseParameter,
  expandedActionIds,
}) {
  const { t } = useTranslation();
  if (actions.length === 0) return null;

  return (
    <TableRow>
      <TableCell colSpan={RISK_FACTOR_COLUMN_COUNT} sx={{ p: 0, borderBottom: expanded ? undefined : 0 }}>
        <Collapse in={expanded} unmountOnExit>
          <RABox
            id={`risk-factor-mitigations-${domId(riskFactorKey)}`}
            sx={{
              px: { xs: 1, md: 2 },
              py: 1.5,
              bgcolor: "action.hover",
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <RATypography variant="body2" fontWeight="bold" mb={1}>
              {t("mitigationPlanner.actions.availableMitigation", "Available mitigation")}
            </RATypography>
            <RABox display="flex" flexDirection="column" gap={1.5}>
              {actions.map((action) => {
                const detailKey = actionIdKey(action.actionId);
                return (
                  <MitigationCard
                    key={detailKey}
                    action={action}
                    riskFactor={riskFactor}
                    riskFactorKey={riskFactorKey}
                    selected={hasSelectedAction(selectedActionIds, action.actionId)}
                    parameterChoices={parameterChoicesForAction(parameterChoices, action.actionId)}
                    detailExpanded={expandedActionIds.has(detailKey)}
                    onToggleAction={onToggleAction}
                    onToggleDetails={(actionId) => onToggleDetails(actionIdKey(actionId))}
                    onChooseParameter={onChooseParameter}
                  />
                );
              })}
            </RABox>
          </RABox>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

MitigationCardStack.propTypes = {
  riskFactorKey: PropTypes.string.isRequired,
  riskFactor: PropTypes.object.isRequired,
  actions: PropTypes.array.isRequired,
  expanded: PropTypes.bool.isRequired,
  selectedActionIds: PropTypes.array.isRequired,
  parameterChoices: PropTypes.object.isRequired,
  onToggleAction: PropTypes.func.isRequired,
  onToggleDetails: PropTypes.func.isRequired,
  onChooseParameter: PropTypes.func.isRequired,
  expandedActionIds: PropTypes.instanceOf(Set).isRequired,
};
