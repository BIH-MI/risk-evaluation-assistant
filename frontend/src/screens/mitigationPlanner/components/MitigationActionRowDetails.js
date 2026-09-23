import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ContextFindingSummary from "./ContextFindingSummary";
import MatchedDataEvidence from "./MatchedDataEvidence";
import OpportunityDetails from "./OpportunityDetails";
import { SectionLabel } from "./PlannerPrimitives";
import { driverTitle } from "../utils/mitigationPlanRows";

function AddressedFindings({ drivers }) {
  const { t } = useTranslation();
  if (drivers.length < 2) return null;
  return (
    <RABox>
      <SectionLabel>
        {t("mitigationPlanner.details.addresses", "Addresses {{count}} current findings", { count: drivers.length })}
      </SectionLabel>
      <RABox component="ul" sx={{ my: 0, pl: 3 }}>
        {drivers.map((driver) => (
          <li key={driver.id}>
            <RATypography variant="body2">{driverTitle(driver)}</RATypography>
          </li>
        ))}
      </RABox>
    </RABox>
  );
}

AddressedFindings.propTypes = { drivers: PropTypes.array.isRequired };

// Illustrative catalogue estimates must stay recognisable as planning assumptions.
function EstimateBasis({ estimate, feasibility }) {
  const { t } = useTranslation();
  if (!estimate?.source && !estimate?.assumptions && !feasibility) return null;
  return (
    <RABox>
      <SectionLabel>{t("mitigationPlanner.details.estimate", "Operational estimate")}</SectionLabel>
      {estimate?.source && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.details.estimateSource", "Source")}: {estimate.source}
        </RATypography>
      )}
      {estimate?.assumptions && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.details.estimateAssumptions", "Assumptions")}: {estimate.assumptions}
        </RATypography>
      )}
      {feasibility?.reasons?.length > 0 && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.details.feasibility", "Project feasibility")}: {feasibility.reasons.join(" · ")}
        </RATypography>
      )}
    </RABox>
  );
}

EstimateBasis.propTypes = { estimate: PropTypes.object, feasibility: PropTypes.object };
EstimateBasis.defaultProps = { estimate: null, feasibility: null };

// Expanded row content. Long evidence lists and guidance live here, not in the summary tables.
export default function MitigationActionRowDetails({ row }) {
  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      {row.description && <RATypography variant="body2">{row.description}</RATypography>}
      <AddressedFindings drivers={row.addressedRiskDrivers || []} />
      {row.group === "DATA" ? (
        <MatchedDataEvidence targets={row.matchedTargets || []} />
      ) : (
        <ContextFindingSummary findings={row.matchedFindings || []} />
      )}
      <EstimateBasis estimate={row.estimate} feasibility={row.projectFeasibility} />
      <OpportunityDetails opportunity={row} />
    </RABox>
  );
}

MitigationActionRowDetails.propTypes = {
  row: PropTypes.shape({
    group: PropTypes.string,
    description: PropTypes.string,
    addressedRiskDrivers: PropTypes.array,
    matchedTargets: PropTypes.array,
    matchedFindings: PropTypes.array,
    estimate: PropTypes.object,
    projectFeasibility: PropTypes.object,
  }).isRequired,
};
