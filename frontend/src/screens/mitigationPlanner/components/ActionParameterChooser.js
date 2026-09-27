import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import CompatibilityChip from "./CompatibilityChip";
import { SectionLabel } from "./PlannerPrimitives";
import { formatParameterLabel, humanizeCode } from "../utils/mitigationPlannerFormatters";
import { isUnresolvableParameter, preferredValue } from "../utils/mitigationPlanRows";

function ValueOption({ option, preferred }) {
  const { t } = useTranslation();
  const incompatible = option.compatibility === "INCOMPATIBLE";

  return (
    <FormControlLabel
      value={option.value}
      disabled={incompatible}
      control={<Radio size="small" />}
      label={
        <RABox display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <RATypography variant="body2">{humanizeCode(option.value)}</RATypography>
          {preferred ? (
            <CompatibilityChip
              compatibility="COMPATIBLE"
              label={t("mitigationPlanner.actions.preferred", "Preferred under Project requirement")}
            />
          ) : (
            option.compatibility && <CompatibilityChip compatibility={option.compatibility} />
          )}
          {incompatible && option.compatibilityReason && (
            <RATypography variant="caption">{option.compatibilityReason}</RATypography>
          )}
        </RABox>
      }
    />
  );
}

ValueOption.propTypes = {
  option: PropTypes.shape({
    value: PropTypes.string,
    compatibility: PropTypes.string,
    compatibilityReason: PropTypes.string,
  }).isRequired,
  preferred: PropTypes.bool.isRequired,
};

// Nothing is pre-selected and incompatible values are disabled, so an incompatible parameter is
// never chosen silently.
export default function ActionParameterChooser({ parameters, choices, onChoose }) {
  const { t } = useTranslation();
  if (parameters.length === 0) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      {parameters.map((parameter) =>
        isUnresolvableParameter(parameter) ? (
          <RABox key={parameter.parameterCode}>
            <RABox display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <SectionLabel>{formatParameterLabel(parameter.parameterCode)}</SectionLabel>
              <CompatibilityChip
                compatibility={parameter.compatibility || "EVALUATION_REQUIRED"}
                label={t("mitigationPlanner.actions.parameterUnresolved", "Configuration needed")}
              />
            </RABox>
            <RATypography variant="body2" display="block" sx={{ color: "text.secondary" }}>
              {parameter.compatibilityReason ||
                t(
                  "mitigationPlanner.actions.valueSelectedLater",
                  "Configuration will be determined during transformation evaluation."
                )}
            </RATypography>
          </RABox>
        ) : (
          <RABox key={parameter.parameterCode}>
            <SectionLabel>{formatParameterLabel(parameter.parameterCode)}</SectionLabel>
            <RadioGroup
              value={choices[parameter.parameterCode] || ""}
              onChange={(event) => onChoose(parameter.parameterCode, event.target.value)}
            >
              {parameter.allowedValues.map((option) => (
                <ValueOption
                  key={option.value}
                  option={option}
                  preferred={preferredValue(parameter) === option.value}
                />
              ))}
            </RadioGroup>
          </RABox>
        )
      )}
    </RABox>
  );
}

ActionParameterChooser.propTypes = {
  parameters: PropTypes.array.isRequired,
  choices: PropTypes.object,
  onChoose: PropTypes.func.isRequired,
};

ActionParameterChooser.defaultProps = { choices: {} };
