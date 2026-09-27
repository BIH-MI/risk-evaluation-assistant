import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export default function MitigationPlannerHeader() {
  const { t } = useTranslation();

  return (
    <RABox textAlign="center" display="flex" flexDirection="column" gap={1}>
      <RATypography variant="h4" fontWeight="bold">
        {t("mitigationPlanner.title", "Mitigation Planner")}
      </RATypography>
      <RATypography variant="body2">
        {t(
          "mitigationPlanner.subtitle",
          "Review risk factors, configured mitigation options, Project constraints, and the remaining evaluations needed before a sharing arrangement can be considered."
        )}
      </RATypography>
    </RABox>
  );
}
