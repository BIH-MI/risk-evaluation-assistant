import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Divider } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

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
 * Plans are generated automatically by the backend; ticking an action only adds it to the
 * researcher's Custom Plan and never changes the Recommended Plan.
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
  }).isRequired,
};
