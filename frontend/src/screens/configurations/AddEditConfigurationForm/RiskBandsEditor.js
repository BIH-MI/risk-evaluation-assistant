import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";

import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import RAButton from "../../../components/input/RAButton";
import OnBlurRAInput from "../../../components/input/RAInput/OnBlurRAInput";
import RAAlert from "../../../components/feedback/RAAlert";

import { updateRiskBandsForCategory } from "../../../store/configurations/configurationSlice";
import AddCircleIcon from "@mui/icons-material/AddCircle";

const EMPTY_ARRAY = [];

// --- DYNAMIC LABEL SEQUENCES ---
const getPredefinedLabels = (categoryCode, count) => {
  const isControls = categoryCode === "CONTROLS";
  if (isControls) {
    if (count === 1) return ["NONE"];
    if (count === 2) return ["NONE", "HIGH"];
    if (count === 3) return ["NONE", "MEDIUM", "HIGH"];
    if (count === 4) return ["NONE", "LOW", "MEDIUM", "HIGH"];
    const extended = [
      "NONE",
      "LOW",
      "MEDIUM",
      "HIGH",
      "MAX",
      "CRITICAL",
      "EXTREME",
    ];
    return count <= extended.length
      ? extended.slice(0, count)
      : Array(count)
          .fill("")
          .map((_, i) => extended[i] || `BAND ${i + 1}`);
  } else {
    if (count === 1) return ["LOW"];
    if (count === 2) return ["LOW", "HIGH"];
    if (count === 3) return ["LOW", "MEDIUM", "HIGH"];
    if (count === 4) return ["LOW", "MEDIUM", "HIGH", "MAX"];
    const extended = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "MAX",
      "CRITICAL",
      "EXTREME",
      "FATAL",
    ];
    return count <= extended.length
      ? extended.slice(0, count)
      : Array(count)
          .fill("")
          .map((_, i) => extended[i] || `BAND ${i + 1}`);
  }
};

export default function RiskBandsEditor({ categoryCode, isReadOnly }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(0, 0, 0, 0.12)";

  const category = useSelector((state) =>
    state.configurations.configDetails?.categories?.find(
      (c) => c.code === categoryCode
    )
  );

  const bands = category?.riskBands || EMPTY_ARRAY;

  // Local Toast State for Error Handling
  const [toast, setToast] = useState({
    open: false,
    msg: "",
    severity: "error",
  });

  /**
   * Powerful Core Engine: Drives Max from Min & Sorts Automatically
   */
  const enforceContinuousBands = (rawBands) => {
    if (!rawBands || rawBands.length === 0) return [];
    const newBands = JSON.parse(JSON.stringify(rawBands));

    // 1. Sort the bands automatically by their requested minimum value
    newBands.sort((a, b) => Number(a.rangeMinimum) - Number(b.rangeMinimum));

    // 2. Clamp the first band's minimum to strictly 0
    newBands[0].rangeMinimum = 0;

    // 3. Drive the max values seamlessly from the subsequent min values
    for (let i = 0; i < newBands.length; i++) {
      if (i < newBands.length - 1) {
        // The max of the current band is exactly the min of the next band
        newBands[i].rangeMaximum = newBands[i + 1].rangeMinimum;
      } else {
        // The final band always ends at exactly 100
        newBands[i].rangeMaximum = 100;
      }
    }
    return newBands;
  };

  useEffect(() => {
    if (!isReadOnly && bands.length > 0) {
      let isOutOfSync = false;
      if (Number(bands[0].rangeMinimum) !== 0) isOutOfSync = true;
      if (Number(bands[bands.length - 1].rangeMaximum) !== 100)
        isOutOfSync = true;

      for (let i = 1; i < bands.length; i++) {
        // Check for gaps
        if (
          Number(bands[i].rangeMinimum) !== Number(bands[i - 1].rangeMaximum)
        ) {
          isOutOfSync = true;
          break;
        }
        // Check if out of order
        if (Number(bands[i].rangeMinimum) < Number(bands[i - 1].rangeMinimum)) {
          isOutOfSync = true;
          break;
        }
      }

      if (isOutOfSync) {
        dispatch(
          updateRiskBandsForCategory({
            categoryCode,
            bands: enforceContinuousBands(bands),
          })
        );
      }
    }
  }, [bands, categoryCode, dispatch, isReadOnly]);

  const handleUpdate = (index, field, value) => {
    if (isReadOnly) return;
    const newBands = JSON.parse(JSON.stringify(bands));

    if (field === "rangeMinimum") {
      let numVal = Number(value);
      if (numVal < 0) numVal = 0;
      if (numVal > 100) numVal = 100;

      // Assign the new minimum. The engine will instantly sort and snap all bounds.
      newBands[index].rangeMinimum = numVal;
    } else if (field === "label") {
      const trimmedValue = (value || "").trim();

      if (!trimmedValue) {
        newBands[index].label = ""; // Allow user to temporarily blank it out
      } else {
        const isDuplicate = newBands.some(
          (b, i) =>
            i !== index &&
            (b.label || "").toLowerCase() === trimmedValue.toLowerCase()
        );

        if (isDuplicate) {
          // Trigger the Toast
          setToast({
            open: true,
            msg: t(
              "configurations.riskBands.duplicateLabel",
              "Label name must be unique."
            ),
            severity: "error",
          });
          // Reject and immediately erase the invalid name from the UI
          newBands[index].label = "";
        } else {
          newBands[index].label = trimmedValue;
        }
      }
    }

    dispatch(
      updateRiskBandsForCategory({
        categoryCode,
        bands: enforceContinuousBands(newBands),
      })
    );
  };

  const isFromScratch = (currentBands, catCode) => {
    if (currentBands.length === 0) return true;
    const expectedLabels = getPredefinedLabels(catCode, currentBands.length);
    const step = 100 / currentBands.length;

    for (let i = 0; i < currentBands.length; i++) {
      if ((currentBands[i].label || "").toUpperCase() !== expectedLabels[i]) {
        return false;
      }
      let expectedMin = parseFloat((i * step).toFixed(2));
      let expectedMax = parseFloat(((i + 1) * step).toFixed(2));
      if (i === 0) expectedMin = 0;
      if (i === currentBands.length - 1) expectedMax = 100;

      if (
        Number(currentBands[i].rangeMinimum) !== expectedMin ||
        Number(currentBands[i].rangeMaximum) !== expectedMax
      ) {
        return false;
      }
    }
    return true;
  };

  const handleAddBand = () => {
    if (isReadOnly) return;
    const newBands = JSON.parse(JSON.stringify(bands));

    if (isFromScratch(bands, categoryCode)) {
      const nextCount = newBands.length + 1;
      const newLabels = getPredefinedLabels(categoryCode, nextCount);
      const step = 100 / nextCount;
      const evenlyDistributedBands = [];

      for (let i = 0; i < nextCount; i++) {
        let min = parseFloat((i * step).toFixed(2));
        let max = parseFloat(((i + 1) * step).toFixed(2));
        if (i === 0) min = 0;
        if (i === nextCount - 1) max = 100;

        const existingId = newBands[i]
          ? newBands[i]._tempId || newBands[i].id
          : Date.now() + i;

        evenlyDistributedBands.push({
          label: newLabels[i],
          rangeMinimum: min,
          rangeMaximum: max,
          _tempId: existingId,
        });
      }
      dispatch(
        updateRiskBandsForCategory({
          categoryCode,
          bands: evenlyDistributedBands,
        })
      );
    } else {
      const lastBand = newBands[newBands.length - 1];
      const min = Number(lastBand.rangeMinimum);
      const mid = min + (100 - min) / 2;

      lastBand.rangeMaximum = parseFloat(mid.toFixed(2));

      const existingLabels = new Set(
        newBands.map((b) => (b.label || "").toUpperCase())
      );
      let newLabel = "NEW BAND";
      let counter = 1;
      while (existingLabels.has(newLabel.toUpperCase())) {
        counter += 1;
        newLabel = `NEW BAND ${counter}`;
      }

      newBands.push({
        label: newLabel,
        rangeMinimum: lastBand.rangeMaximum,
        rangeMaximum: 100,
        _tempId: Date.now(),
      });

      dispatch(
        updateRiskBandsForCategory({
          categoryCode,
          bands: enforceContinuousBands(newBands),
        })
      );
    }
  };

  const handleDelete = (index) => {
    if (isReadOnly) return;
    const newBands = [...bands];
    newBands.splice(index, 1);

    dispatch(
      updateRiskBandsForCategory({
        categoryCode,
        bands: enforceContinuousBands(newBands),
      })
    );
  };

  return (
    <RABox>
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: "none",
          backgroundColor: "transparent",
          border: `1px solid ${borderColor}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="left" sx={{ width: "35%", borderColor }}>
                <RATypography
                  variant="caption"
                  fontWeight="bold"
                  color={isDark ? "white" : "secondary"}
                  textTransform="uppercase"
                >
                  {t("configurations.riskBands.labelName")}
                </RATypography>
              </TableCell>
              {/* COMBINED RANGE HEADER */}
              <TableCell align="center" sx={{ width: "55%", borderColor }}>
                <RATypography
                  variant="caption"
                  fontWeight="bold"
                  color={isDark ? "white" : "secondary"}
                  textTransform="uppercase"
                >
                  {t("configurations.riskBands.range", "Range (%)")}
                </RATypography>
              </TableCell>
              {!isReadOnly && (
                <TableCell align="center" sx={{ width: "10%", borderColor }}>
                  <RATypography
                    variant="caption"
                    fontWeight="bold"
                    color={isDark ? "white" : "secondary"}
                    textTransform="uppercase"
                  >
                    {t("configurations.riskBands.action")}
                  </RATypography>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {bands.map((band, index) => {
              const isLastRow = index === bands.length - 1;
              const uid = band._tempId || band.id;

              return (
                <TableRow key={uid || index}>
                  {/* LABEL COLUMN - Editable */}
                  <TableCell sx={{ borderColor }}>
                    <OnBlurRAInput
                      value={band.label || ""}
                      onCommit={(v) => handleUpdate(index, "label", v)}
                      size="small"
                      placeholder={t("configurations.riskBands.placeholder")}
                      disabled={isReadOnly}
                      fullWidth
                    />
                  </TableCell>

                  {/* COMBINED RANGE COLUMN */}
                  <TableCell align="center" sx={{ borderColor }}>
                    <RABox
                      display="flex"
                      alignItems="center"
                      width="100%"
                      gap={1}
                    >
                      <RATypography
                        variant="body1"
                        fontWeight="bold"
                        color="text"
                      >
                        [
                      </RATypography>
                      <OnBlurRAInput
                        type="number"
                        value={band.rangeMinimum ?? 0}
                        disabled={index === 0 || isReadOnly}
                        onCommit={(v) => handleUpdate(index, "rangeMinimum", v)}
                        size="small"
                        inputProps={{ step: "0.01", min: 0, max: 100 }}
                        sx={{ flex: 1 }} // Stretches to fill empty space
                      />
                      <RATypography
                        variant="body1"
                        fontWeight="bold"
                        color="text"
                      >
                        ,
                      </RATypography>
                      <RATypography
                        variant="body2"
                        color="text"
                        sx={{ flex: 1, textAlign: "center" }}
                      >
                        {band.rangeMaximum ?? 0}
                      </RATypography>
                      <RATypography
                        variant="body1"
                        fontWeight="bold"
                        color="text"
                      >
                        {isLastRow ? "]" : ")"}
                      </RATypography>
                    </RABox>
                  </TableCell>

                  {/* DELETE ACTION */}
                  {!isReadOnly && (
                    <TableCell align="center" sx={{ borderColor }}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

            {bands.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isReadOnly ? 3 : 4}
                  align="center"
                  sx={{ borderColor }}
                >
                  <RATypography variant="button" color="text">
                    {t("configurations.riskBands.noBands")}
                  </RATypography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!isReadOnly && (
        <RABox mt={2} display="flex" justifyContent="center">
          <RAButton
            variant="outlined"
            color="primary"
            startIcon={<AddCircleIcon />}
            onClick={handleAddBand}
          >
            {t("configurations.riskBands.addBand")}
          </RAButton>
        </RABox>
      )}

      {/* Floating Toast Notification */}
      {toast.open && (
        <RABox
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 2000,
            width: 350,
          }}
        >
          <RAAlert
            color={toast.severity}
            dismissible
            onClose={() => setToast({ ...toast, open: false })}
          >
            <RATypography variant="body2" color="white">
              {toast.msg}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </RABox>
  );
}
