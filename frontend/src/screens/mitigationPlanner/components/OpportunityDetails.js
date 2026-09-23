import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

function DetailBlock({ label, text }) {
  if (!text) return null;

  return (
    <RABox>
      <RATypography variant="body2" fontWeight="bold">
        {label}
      </RATypography>
      <RATypography variant="body2" fontWeight="regular" sx={{ whiteSpace: "pre-line", color: "text.secondary", lineHeight: 1.5 }}>
        {text}
      </RATypography>
    </RABox>
  );
}

DetailBlock.propTypes = {
  label: PropTypes.string.isRequired,
  text: PropTypes.string,
};

DetailBlock.defaultProps = {
  text: null,
};

// Rationale and estimate source/assumptions stay in the catalogue for admin/audit use.
export default function OpportunityDetails({ opportunity, children }) {
  const { t } = useTranslation();

  return (
    <RABox display="flex" flexDirection="column" gap={2} pt={1.5}>
      {children}
      <DetailBlock
        label={t("mitigationPlanner.details.implementation", "Implementation guidance")}
        text={opportunity.implementationGuidance}
      />
      <DetailBlock
        label={t("mitigationPlanner.details.verification", "Verification criteria")}
        text={opportunity.verificationCriteria}
      />
      <DetailBlock
        label={t("mitigationPlanner.details.evidence", "Evidence / reference")}
        text={opportunity.evidenceReference}
      />
    </RABox>
  );
}

OpportunityDetails.propTypes = {
  opportunity: PropTypes.shape({
    implementationGuidance: PropTypes.string,
    verificationCriteria: PropTypes.string,
    evidenceReference: PropTypes.string,
  }).isRequired,
  children: PropTypes.node,
};

OpportunityDetails.defaultProps = {
  children: null,
};
