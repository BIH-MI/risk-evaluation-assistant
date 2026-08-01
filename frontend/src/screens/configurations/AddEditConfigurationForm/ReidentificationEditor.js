import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import OnBlurRAInput from "../../../components/input/RAInput/OnBlurRAInput";

import {
  updateThreshold,
  addThreshold,
} from "../../../store/configurations/configurationSlice";

// Predefined default threshold values based on standard risk classifications
const DEFAULT_THRESHOLDS = {
  LOW: 0.1,
  MEDIUM: 0.075,
  HIGH: 0.05,
  MAX: 0.05,
};

export default function ReidentificationEditor({ isReadOnly }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // Read thresholds and categories from configDetails
  const thresholds =
    useSelector(
      (state) =>
        state.configurations.configDetails?.reidThresholds ||
        state.configurations.configDetails?.thresholds
    ) || [];
  const categories =
    useSelector((state) => state.configurations.configDetails?.categories) ||
    [];

  // Strictly fetch the fixed IMPACT category
  const impactCategory = categories.find((c) => c.code === "IMPACT");
  const impactBands = impactCategory?.riskBands || [];

  const handleUpdate = (index, bandLabel, val) => {
    let numericVal = parseFloat(String(val).replace(",", "."));
    const defaultSuggestedValue = DEFAULT_THRESHOLDS[bandLabel?.toUpperCase()] ?? 0.05;

    if (isNaN(numericVal)) numericVal = defaultSuggestedValue;
    if (numericVal < 0) numericVal = 0;
    if (numericVal > 1) numericVal = 1;

    // Load current active values into an array
    let currentValues = impactBands.map((b) => {
      const t = thresholds.find((th) => th.riskClassification === b.label);
      return t ? t.thresholdValue : (DEFAULT_THRESHOLDS[b.label?.toUpperCase()] ?? 0.05);
    });

    currentValues[index] = numericVal;

    // Cascade up (less severe bands must be >= current band)
    for (let i = index - 1; i >= 0; i--) {
      if (currentValues[i] < currentValues[i + 1]) {
        currentValues[i] = currentValues[i + 1];
      }
    }
    // Cascade down (more severe bands must be <= current band)
    for (let i = index + 1; i < currentValues.length; i++) {
      if (currentValues[i] > currentValues[i - 1]) {
        currentValues[i] = currentValues[i - 1];
      }
    }

    // Dispatch the cascaded results
    impactBands.forEach((band, i) => {
      const target = thresholds.find((t) => t.riskClassification === band.label);
      const newVal = currentValues[i];

      if (target) {
        if (target.thresholdValue !== newVal) {
          dispatch(updateThreshold({ ...target, thresholdValue: newVal }));
        }
      } else {
        dispatch(
          addThreshold({
            _tempId: Date.now() + i, // prevent duplicate IDs during fast loops
            riskClassification: band.label,
            thresholdValue: newVal,
          })
        );
      }
    });
  };

  return (
    <RABox>
      <RATypography variant="body2" color="secondary" mb={3}>
        {t("configurations.reidThresholds.description")}
      </RATypography>

      <TableContainer
        component={Paper}
        sx={{ boxShadow: "none", border: "1px solid #e0e0e0" }}
      >
        <Table size="small">
          <TableHead sx={{ display: "table-header-group" }}>
            <TableRow>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", width: "50%" }}
              >
                {t("configurations.reidThresholds.riskClassBand")}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", width: "50%" }}
              >
                {t("configurations.reidThresholds.thresholdProb")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {impactBands.map((band, index) => {
              const matchedThreshold = thresholds.find(
                (t) => t.riskClassification === band.label
              );

              const defaultSuggestedValue =
                DEFAULT_THRESHOLDS[band.label?.toUpperCase()] ?? 0.05;
              const thresholdValue = matchedThreshold
                ? matchedThreshold.thresholdValue
                : defaultSuggestedValue;

              const rowKey = band.id || band._tempId || index;

              return (
                <TableRow key={rowKey}>
                  <TableCell align="center">
                    <RABox sx={{ maxWidth: 150, mx: "auto", py: 1 }}>
                      <RATypography
                        variant="body2"
                        color="text"
                        sx={{ flex: 1, textAlign: "center" }}
                      >
                        {band.label || ""}
                      </RATypography>
                    </RABox>
                  </TableCell>
                  <TableCell align="center">
                    <RABox sx={{ maxWidth: 120, mx: "auto", py: 1 }}>
                      <OnBlurRAInput
                        type="number"
                        size="small"
                        value={thresholdValue}
                        onCommit={(val) => handleUpdate(index, band.label, val)}
                        disabled={isReadOnly}
                        inputProps={{
                          step: "0.001",
                          min: 0,
                          max: 1,
                        }}
                        sx={{ "& .MuiInputBase-root": { height: "36px" } }}
                      />
                    </RABox>
                  </TableCell>
                </TableRow>
              );
            })}

            {impactBands.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 3 }}>
                  <RATypography variant="button" color="text">
                    {t(
                      "configurations.reidThresholds.noBands",
                      "No risk re-identification thresholds defined in the Impact category."
                    )}
                  </RATypography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </RABox>
  );
}
