import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

function DetailBlock({ icon, label, text }) {
  if (!text) return null;
  return (
    <RABox>
      <RABox display="flex" alignItems="center" gap={0.75} mb={0.5}>
        {icon}
        <RATypography variant="body2" fontWeight="bold">
          {label}
        </RATypography>
      </RABox>
      <RATypography variant="body2" sx={{ whiteSpace: "pre-line", color: "text.secondary", lineHeight: 1.5 }}>
        {text}
      </RATypography>
    </RABox>
  );
}

DetailBlock.propTypes = { icon: PropTypes.node.isRequired, label: PropTypes.string.isRequired, text: PropTypes.string };
DetailBlock.defaultProps = { text: null };

export default function MitigationActionDetails({ action }) {
  const { t } = useTranslation();

  return (
    <RABox display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={1.5}>
      <DetailBlock
        icon={<BuildRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />}
        label={t("mitigationPlanner.details.implementation", "Implementation guidance")}
        text={action.implementationGuidance}
      />
      <DetailBlock
        icon={<FactCheckRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />}
        label={t("mitigationPlanner.details.verification", "Verification criteria")}
        text={action.verificationCriteria}
      />
    </RABox>
  );
}

MitigationActionDetails.propTypes = {
  action: PropTypes.shape({
    implementationGuidance: PropTypes.string,
    verificationCriteria: PropTypes.string,
  }).isRequired,
};
