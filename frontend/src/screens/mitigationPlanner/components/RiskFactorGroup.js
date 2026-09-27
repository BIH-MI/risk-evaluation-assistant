import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RiskFactorTable from "./RiskFactorTable";
import { visibleRiskFactors } from "../utils/mitigationPlanRows";

export default function RiskFactorGroup({ title, drivers, actionRows, builder, currentHeader }) {
  const { t } = useTranslation();
  const visible = visibleRiskFactors(drivers);

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <RATypography variant="subtitle1" fontWeight="bold">
        {title}
      </RATypography>
      {visible.length > 0 ? (
        <RiskFactorTable drivers={visible} actionRows={actionRows} builder={builder} currentHeader={currentHeader} />
      ) : (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.factors.none", "No critical or high-priority risk factors in this category.")}
        </RATypography>
      )}
    </RABox>
  );
}

RiskFactorGroup.propTypes = {
  title: PropTypes.string.isRequired,
  drivers: PropTypes.array.isRequired,
  actionRows: PropTypes.array,
  builder: PropTypes.object.isRequired,
  currentHeader: PropTypes.string,
};

RiskFactorGroup.defaultProps = { actionRows: [], currentHeader: null };
