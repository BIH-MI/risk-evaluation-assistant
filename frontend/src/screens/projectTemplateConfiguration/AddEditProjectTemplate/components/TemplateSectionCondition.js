import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";

import RASelect from "components/input/RASelect";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatProjectEnumLabel } from "utils/projectDisplayLabels";
import {
  getConditionValueOptions,
  getEligibleDependencyRequirements,
  getRequirementReferenceKey,
} from "../projectTemplateFormUtils";

const MODE_ALWAYS = "ALWAYS";
const MODE_WHEN = "WHEN";

export default function TemplateSectionCondition({ sections, sectionIndex, section, error, showErrors, onChange }) {
  const { t } = useTranslation();
  const eligibleRequirements = getEligibleDependencyRequirements(sections, sectionIndex);
  const mode = section.dependsOnRequirementKey ? MODE_WHEN : MODE_ALWAYS;

  const dependency = eligibleRequirements.find(
    (requirement) => getRequirementReferenceKey(requirement) === section.dependsOnRequirementKey
  );
  const valueOptions = getConditionValueOptions(dependency);

  const handleModeChange = (event) => {
    if (event.target.value === MODE_ALWAYS) {
      onChange({ dependsOnRequirementKey: "", visibleWhenValues: [] });
    } else {
      const firstEligible = eligibleRequirements[0];
      onChange({
        dependsOnRequirementKey: firstEligible ? getRequirementReferenceKey(firstEligible) : "",
        visibleWhenValues: [],
      });
    }
  };

  const handleRequirementChange = (event) => {
    onChange({ dependsOnRequirementKey: event.target.value, visibleWhenValues: [] });
  };

  const toggleValue = (value) => {
    const next = new Set(section.visibleWhenValues || []);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange({ visibleWhenValues: Array.from(next) });
  };

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <RATypography
        variant="subtitle2"
        fontWeight="medium"
        sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
      >
        {t("projectTemplateConfiguration.section.conditionTitle")}
      </RATypography>

      <RASelect
        label={t("projectTemplateConfiguration.section.conditionMode")}
        value={mode}
        onChange={handleModeChange}
        options={[
          { value: MODE_ALWAYS, label: t("projectTemplateConfiguration.section.conditionAlways") },
          { value: MODE_WHEN, label: t("projectTemplateConfiguration.section.conditionWhen") },
        ]}
        disabled={mode === MODE_WHEN && eligibleRequirements.length === 0}
        fullWidth
      />

      {mode === MODE_WHEN && eligibleRequirements.length === 0 && (
        <RATypography variant="caption" color="error">
          {t("projectTemplateConfiguration.section.conditionNoEligibleRequirements")}
        </RATypography>
      )}

      {mode === MODE_WHEN && eligibleRequirements.length > 0 && (
        <>
          <RASelect
            label={t("projectTemplateConfiguration.section.conditionRequirementLabel")}
            value={section.dependsOnRequirementKey || ""}
            onChange={handleRequirementChange}
            options={eligibleRequirements.map((requirement) => ({
              value: getRequirementReferenceKey(requirement),
              label: requirement.label || getRequirementReferenceKey(requirement),
            }))}
            fullWidth
          />

          <RABox>
              <RATypography
              variant="body2"
              fontWeight="medium"
              sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
            >
              {t("projectTemplateConfiguration.section.conditionValuesLabel")}
            </RATypography>
            <FormGroup row>
              {valueOptions.map((value) => (
                <FormControlLabel
                  key={value}
                  control={
                    <Checkbox
                      checked={(section.visibleWhenValues || []).includes(value)}
                      onChange={() => toggleValue(value)}
                    />
                  }
                  label={
                    <RATypography
                      variant="body2"
                      sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
                    >
                      {formatProjectEnumLabel(value)}
                    </RATypography>
                  }
                />
              ))}
            </FormGroup>
          </RABox>
        </>
      )}

      {showErrors && error && (
        <RATypography variant="caption" color="error">
          {error}
        </RATypography>
      )}
    </RABox>
  );
}

TemplateSectionCondition.propTypes = {
  sections: PropTypes.array.isRequired,
  sectionIndex: PropTypes.number.isRequired,
  section: PropTypes.object.isRequired,
  error: PropTypes.string,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

TemplateSectionCondition.defaultProps = {
  error: "",
};
