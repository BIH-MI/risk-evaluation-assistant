import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { CircularProgress, Divider } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import DataTransformationAccordion from "./DataTransformationAccordion";
import RiskFactorGroup from "./RiskFactorGroup";
import {
  isControlsDriver,
  isDatasetEvidenceDriver,
  isImpactDriver,
  isLikelihoodDriver,
} from "../utils/mitigationPlanRows";

function RiskHeading({ title }) {
  return (
    <RATypography variant="h5" fontWeight="bold" textAlign="center" width="100%">
      {title}
    </RATypography>
  );
}

RiskHeading.propTypes = { title: PropTypes.string.isRequired };

function UnavailableNotice({ section }) {
  if (section?.availability !== "UNAVAILABLE") return null;
  return (
    <RABox display="flex" alignItems="center" gap={1}>
      <WarningAmberIcon fontSize="small" sx={{ color: "warning.main" }} />
      <RATypography variant="body2">{section.unavailableReason}</RATypography>
    </RABox>
  );
}

UnavailableNotice.propTypes = { section: PropTypes.object };
UnavailableNotice.defaultProps = { section: null };

/**
 * Risk factors and configured mitigation options:
 *   Data Risk: Impact factors and data transformations (collapsed)
 *   Context Risk: Controls and Likelihood factors
 * Candidate plans are researcher-constructed; selection identity is always the action id.
 */
export default function MitigationPlanning({ overview, builder }) {
  const { t } = useTranslation();
  const { dataRows, contextRows } = builder;
  const dataDrivers = overview.riskDrivers?.dataDrivers || [];
  const contextDrivers = overview.riskDrivers?.contextDrivers || [];

  return (
    <RABox display="flex" flexDirection="column" gap={4}>
      <RABox component="section" display="flex" flexDirection="column" gap={2.5}>
        <RiskHeading title={t("mitigationPlanner.planning.dataTitle", "Data Risk")} />
        <UnavailableNotice section={overview.dataOpportunities} />
        <RiskFactorGroup
          title={t("mitigationPlanner.planning.impactTitle", "Impact")}
          drivers={dataDrivers.filter(isImpactDriver)}
          actionRows={dataRows}
          builder={builder}
        />
        <DataTransformationAccordion
          evidenceDrivers={dataDrivers.filter(isDatasetEvidenceDriver)}
          dataRows={dataRows}
          builder={builder}
        />
      </RABox>

      <Divider />

      <RABox component="section" display="flex" flexDirection="column" gap={2.5}>
        <RiskHeading title={t("mitigationPlanner.planning.contextTitle", "Context Risk")} />
        <UnavailableNotice section={overview.contextOpportunities} />
        <RiskFactorGroup
          title={t("mitigationPlanner.planning.controlsTitle", "Controls")}
          drivers={contextDrivers.filter(isControlsDriver)}
          actionRows={contextRows}
          builder={builder}
        />
        <RiskFactorGroup
          title={t("mitigationPlanner.planning.likelihoodTitle", "Likelihood")}
          drivers={contextDrivers.filter(isLikelihoodDriver)}
          actionRows={contextRows}
          builder={builder}
        />
      </RABox>

      <RABox display="flex" flexDirection="column" alignItems="center" gap={1}>
        <RAButton
          variant="contained"
          disabled={builder.creating || builder.selectedActionIds.length === 0}
          onClick={builder.createPlan}
          startIcon={builder.creating ? <CircularProgress size={18} /> : null}
        >
          {t("mitigationPlanner.planning.create", "Create candidate plan")}
        </RAButton>
        <RATypography variant="caption" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.planning.selectedCount", "{{count}} action(s) selected", { count: builder.selectedActionIds.length })}
        </RATypography>
      </RABox>
    </RABox>
  );
}

MitigationPlanning.propTypes = {
  overview: PropTypes.shape({
    dataOpportunities: PropTypes.object,
    contextOpportunities: PropTypes.object,
    riskDrivers: PropTypes.object,
  }).isRequired,
  builder: PropTypes.shape({
    dataRows: PropTypes.array.isRequired,
    contextRows: PropTypes.array.isRequired,
    selectedActionIds: PropTypes.array.isRequired,
    parameterChoices: PropTypes.object.isRequired,
    creating: PropTypes.bool.isRequired,
    toggleAction: PropTypes.func.isRequired,
    chooseParameter: PropTypes.func.isRequired,
    createPlan: PropTypes.func.isRequired,
  }).isRequired,
};
