import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { CircularProgress, Divider } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import ContextActionTable from "./ContextActionTable";
import DataActionTable from "./DataActionTable";
import RiskDriverSection from "./RiskDriverSection";

function SideHeading({ title, description }) {
  return (
    <RABox>
      <RATypography variant="h6" fontWeight="bold">
        {title}
      </RATypography>
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        {description}
      </RATypography>
    </RABox>
  );
}

SideHeading.propTypes = { title: PropTypes.string.isRequired, description: PropTypes.string.isRequired };

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

// Stated once for all data transformations instead of repeating it on every row.
function ProposedTransformationNotice() {
  const { t } = useTranslation();
  return (
    <RABox display="flex" alignItems="flex-start" gap={1}>
      <InfoOutlinedIcon fontSize="small" sx={{ color: "info.main", mt: 0.25 }} />
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        <strong>{t("mitigationPlanner.data.residualNotEvaluated", "Residual data risk: Not evaluated.")}</strong>{" "}
        {t(
          "mitigationPlanner.data.proposalNotice",
          "The transformation has not been executed. Its effect on residual re-identification risk must be measured before it can be compared with the required anonymisation threshold."
        )}
      </RATypography>
    </RABox>
  );
}

/**
 * Risk drivers and their configured mitigation options, kept in two visually separate sides.
 * Candidate plans are researcher-constructed: nothing is combined or ranked automatically.
 */
export default function MitigationPlanning({ overview, builder }) {
  const { t } = useTranslation();
  const { dataRows, contextRows } = builder;

  return (
    <RABox display="flex" flexDirection="column" gap={4}>
      <RABox display="flex" alignItems="center" justifyContent="center" gap={0.75}>
        <RATypography variant="subtitle1" fontWeight="bold" textAlign="center">
          {t("mitigationPlanner.planning.driversTitle", "Risk Drivers and Mitigation Options")}
        </RATypography>
        <RequirementHelpTooltip
          title={t(
            "mitigationPlanner.planning.driversHelp",
            "Risk drivers are questionnaire answers or dataset findings that contribute to the current assessment. High-risk triggers are shown first because they override normal category scoring. Suggested actions are drawn only from the configured Mitigation Catalogue."
          )}
        >
          <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
        </RequirementHelpTooltip>
      </RABox>

      <RABox component="section" display="flex" flexDirection="column" gap={2}>
        <SideHeading
          title={t("mitigationPlanner.planning.dataTitle", "A. Data-side Risk Drivers")}
          description={t(
            "mitigationPlanner.planning.dataDescription",
            "Invasion of Privacy answers and Dataset Assessment evidence. Data transformations are proposals and do not change Impact or T until transformed data are reassessed."
          )}
        />
        <UnavailableNotice section={overview.dataOpportunities} />
        <RiskDriverSection drivers={overview.riskDrivers?.dataDrivers || []} actionRows={dataRows} />
        <RATypography variant="subtitle2" fontWeight="bold">
          {t("mitigationPlanner.planning.dataOptions", "Data transformation options")}
        </RATypography>
        {dataRows.length > 0 && <ProposedTransformationNotice />}
        <DataActionTable rows={dataRows} builder={builder} />
      </RABox>

      <Divider />

      <RABox component="section" display="flex" flexDirection="column" gap={2}>
        <SideHeading
          title={t("mitigationPlanner.planning.contextTitle", "B. Context-side Risk Drivers")}
          description={t(
            "mitigationPlanner.planning.contextDescription",
            "Mitigating Controls and Motives & Capacity answers. Only explicitly mapped context controls are offered; their projected context-model effect is evaluated in memory."
          )}
        />
        <UnavailableNotice section={overview.contextOpportunities} />
        <RiskDriverSection drivers={overview.riskDrivers?.contextDrivers || []} actionRows={contextRows} />
        <RATypography variant="subtitle2" fontWeight="bold">
          {t("mitigationPlanner.planning.contextOptions", "Context control options")}
        </RATypography>
        <ContextActionTable rows={contextRows} builder={builder} />
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
    creating: PropTypes.bool.isRequired,
    createPlan: PropTypes.func.isRequired,
  }).isRequired,
};
