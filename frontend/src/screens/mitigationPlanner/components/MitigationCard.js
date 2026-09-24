import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ButtonBase, Collapse, Paper } from "@mui/material";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ActionParameterChooser from "./ActionParameterChooser";
import MitigationActionDetails from "./MitigationActionDetails";
import MitigationCardHeader from "./MitigationCardHeader";
import MitigationEvidenceLine from "./MitigationEvidenceLine";
import { domId } from "./riskFactorTableHelpers";

export default function MitigationCard({
  action,
  riskFactor,
  riskFactorKey,
  selected,
  parameterChoices,
  detailExpanded,
  onToggleAction,
  onToggleDetails,
  onChooseParameter,
}) {
  const { t } = useTranslation();
  const detailId = `mitigation-details-${domId(riskFactorKey)}-${domId(action.actionId)}`;
  const hasParameters = (action.parameters || []).length > 0;
  const hasDetails = Boolean(action.implementationGuidance || action.verificationCriteria);

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        px: 2,
        py: 1.5,
        borderRadius: 2,
        borderColor: "divider",
        boxShadow: "none",
        bgcolor: selected ? "action.selected" : "background.paper",
        "&:hover": { bgcolor: selected ? "action.selected" : "action.hover" },
      }}
    >
      <RABox display="flex" flexDirection="column" gap={1}>
        <MitigationCardHeader action={action} selected={selected} onToggleAction={onToggleAction} />

        {action.description && (
          <RATypography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
            {action.description}
          </RATypography>
        )}

        <MitigationEvidenceLine action={action} riskFactor={riskFactor} />

        {selected && hasParameters && (
          <RABox mt={0.25}>
            <ActionParameterChooser
              parameters={action.parameters || []}
              choices={parameterChoices}
              onChoose={(code, value) => onChooseParameter(action.actionId, code, value)}
            />
          </RABox>
        )}

        {hasDetails && (
          <>
            <ButtonBase
              onClick={() => onToggleDetails(action.actionId)}
              aria-expanded={detailExpanded}
              aria-controls={detailId}
              sx={{
                alignSelf: "flex-end",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              <RATypography variant="body2" fontWeight="bold">
                {t("mitigationPlanner.actions.moreDetails", "More details")}
              </RATypography>
              {detailExpanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
            </ButtonBase>
            <Collapse in={detailExpanded} unmountOnExit>
              <RABox id={detailId} mt={0.5}>
                <MitigationActionDetails action={action} />
              </RABox>
            </Collapse>
          </>
        )}
      </RABox>
    </Paper>
  );
}

MitigationCard.propTypes = {
  action: PropTypes.object.isRequired,
  riskFactor: PropTypes.object.isRequired,
  riskFactorKey: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  parameterChoices: PropTypes.object.isRequired,
  detailExpanded: PropTypes.bool.isRequired,
  onToggleAction: PropTypes.func.isRequired,
  onToggleDetails: PropTypes.func.isRequired,
  onChooseParameter: PropTypes.func.isRequired,
};
