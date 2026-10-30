import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Divider } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { REQUIREMENT_GROUPS, formatRequirementValue } from "../utils/mitigationPlannerFormatters";

// Lists sit below their label instead of squeezing into a narrow right column.
const STACKED_REQUIREMENTS = new Set(["analysisDataNeeded", "requiredExternalDeliverables"]);
const STACKED_LENGTH = 40;

function RequirementRow({ requirement, label, value }) {
  const stacked = STACKED_REQUIREMENTS.has(requirement) || value.length > STACKED_LENGTH;

  return stacked ? (
    <RABox py={0.75}>
      <RATypography variant="body2" fontWeight="bold">
        {label}
      </RATypography>
      <RATypography variant="body2">{value}</RATypography>
    </RABox>
  ) : (
    <RABox display="flex" justifyContent="space-between" gap={3} py={0.75}>
      <RATypography variant="body2">{label}</RATypography>
      <RATypography variant="body2" fontWeight="bold" sx={{ textAlign: "right" }}>
        {value}
      </RATypography>
    </RABox>
  );
}

RequirementRow.propTypes = {
  requirement: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

function RequirementGroup({ title, items }) {
  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={0.5}>
        {title}
      </RATypography>
      {items.map((item) => (
        <RequirementRow key={item.requirement} {...item} />
      ))}
    </RABox>
  );
}

RequirementGroup.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
};

// Only requirements the Activity actually specifies are listed; each group is a full-width row.
export default function ActivityRequirementsSummary({ requirements }) {
  const { t } = useTranslation();
  const groups = REQUIREMENT_GROUPS.map((group) => ({
    ...group,
    items: group.keys
      .map((requirement) => ({
        requirement,
        label: t(`activityRequirements.fields.${requirement}`),
        value: formatRequirementValue(requirement, requirements, t),
      }))
      .filter((item) => item.value),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <RATypography variant="body2">
        {t("mitigationPlanner.requirements.none", "The Activity does not specify any sharing requirements.")}
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

ActivityRequirementsSummary.propTypes = {
  // The activity's sharing requirements as returned in the overview (activityRequirements).
  requirements: PropTypes.object,
};

ActivityRequirementsSummary.defaultProps = { requirements: null };
