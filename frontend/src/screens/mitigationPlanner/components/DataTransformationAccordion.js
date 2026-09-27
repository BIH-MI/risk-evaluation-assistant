import { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ButtonBase, Collapse } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RiskFactorTable from "./RiskFactorTable";
import { visibleRiskFactors } from "../utils/mitigationPlanRows";

const PANEL_ID = "possible-data-transformations";

/**
 * Dataset Assessment evidence (direct identifiers, Candidate QIDs and combinations) and the
 * data transformations that address it. Closed by default. Transformations remain selectable
 * for candidate plans but are proposals: no residual-risk reduction is claimed.
 */
export default function DataTransformationAccordion({ evidenceDrivers, dataRows, builder }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const evidence = visibleRiskFactors(evidenceDrivers);

  return (
    <RABox sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
      <ButtonBase
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        sx={{ width: "100%", justifyContent: "space-between", px: 2, py: 1.5, textAlign: "left", borderRadius: 1 }}
      >
        <RATypography variant="subtitle1" fontWeight="bold">
          {t("mitigationPlanner.data.transformationsTitle", "Data Transformations")}
          <RATypography component="span" variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
            ({dataRows.length})
          </RATypography>
        </RATypography>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <RABox id={PANEL_ID} display="flex" flexDirection="column" gap={2} px={2} pb={2}>
          <RATypography variant="body2" sx={{ color: "text.secondary" }}>
            {t(
              "mitigationPlanner.data.transformationsNotice",
              "These transformations are planning options derived from Dataset Assessment evidence. They are not yet executed and do not represent a measured reduction in residual data risk."
            )}
          </RATypography>
          {evidence.length > 0 ? (
            <RiskFactorTable
              drivers={evidence}
              actionRows={dataRows}
              builder={builder}
              currentHeader={t("mitigationPlanner.data.classification", "Current classification")}
            />
          ) : (
            <RATypography variant="body2" sx={{ color: "text.secondary" }}>
              {t("mitigationPlanner.factors.none", "No critical or high-priority risk factors in this category.")}
            </RATypography>
          )}
        </RABox>
      </Collapse>
    </RABox>
  );
}

DataTransformationAccordion.propTypes = {
  evidenceDrivers: PropTypes.array.isRequired,
  dataRows: PropTypes.array.isRequired,
  builder: PropTypes.object.isRequired,
};
