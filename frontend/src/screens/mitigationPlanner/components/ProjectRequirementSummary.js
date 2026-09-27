import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Divider } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { REQUIREMENT_GROUPS, formatConstraintValue } from "../utils/mitigationPlannerFormatters";

// Long free-text values sit below their label instead of squeezing into a narrow right column.
const STACKED_VALUE_TYPES = new Set(["TEXT", "LONG_TEXT", "MULTI_SELECT"]);
const STACKED_LENGTH = 40;

function RequirementRow({ requirement }) {
  const value = formatConstraintValue(requirement);
  const stacked = STACKED_VALUE_TYPES.has(requirement.valueType) || value.length > STACKED_LENGTH;

  return stacked ? (
    <RABox py={0.75}>
      <RATypography variant="body2" fontWeight="bold">
        {requirement.label}
      </RATypography>
      <RATypography variant="body2">{value}</RATypography>
    </RABox>
  ) : (
    <RABox display="flex" justifyContent="space-between" gap={3} py={0.75}>
      <RATypography variant="body2">{requirement.label}</RATypography>
      <RATypography variant="body2" fontWeight="bold" sx={{ textAlign: "right" }}>
        {value}
      </RATypography>
    </RABox>
  );
}

RequirementRow.propTypes = {
  requirement: PropTypes.shape({ label: PropTypes.string, valueType: PropTypes.string }).isRequired,
};

function RequirementGroup({ title, items }) {
  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={0.5}>
        {title}
      </RATypography>
      {items.map((requirement) => (
        <RequirementRow key={requirement.key} requirement={requirement} />
      ))}
    </RABox>
  );
}

RequirementGroup.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
};

// Only requirements the Project actually defines are listed; each group is a full-width row.
export default function ProjectRequirementSummary({ requirements }) {
  const { t } = useTranslation();
  const byKey = new Map(requirements.map((requirement) => [requirement.key, requirement]));
  const groups = REQUIREMENT_GROUPS.map((group) => ({
    ...group,
    items: group.keys.map((key) => byKey.get(key)).filter(Boolean),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <RATypography variant="body2">
        {t("mitigationPlanner.requirements.none", "The Project does not define any planning requirements.")}
      </RATypography>
    );
  }

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      {groups.map((group, index) => (
        <RABox key={group.id} display="flex" flexDirection="column" gap={2}>
          {index > 0 && <Divider />}
          <RequirementGroup title={t(`mitigationPlanner.requirements.${group.id}`, group.title)} items={group.items} />
        </RABox>
      ))}
    </RABox>
  );
}

ProjectRequirementSummary.propTypes = {
  requirements: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string, value: PropTypes.string })
  ),
};

ProjectRequirementSummary.defaultProps = { requirements: [] };
