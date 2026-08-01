import React, { useMemo } from "react";
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
  addRiskMatrixRow,
  updateRiskMatrixRow,
} from "../../../store/configurations/configurationSlice";

// Predefined default probabilities
const DEFAULT_MATRIX_VALUES = {
  HIGH_LOW: 0.05,
  HIGH_MEDIUM: 0.1,
  HIGH_HIGH: 0.2,
  HIGH_MAX: 0.4,
  MEDIUM_LOW: 0.2,
  MEDIUM_MEDIUM: 0.3,
  MEDIUM_HIGH: 0.4,
  MEDIUM_MAX: 0.6,
  LOW_LOW: 0.4,
  LOW_MEDIUM: 0.5,
  LOW_HIGH: 0.6,
  LOW_MAX: 0.8,
  NONE_LOW: 0.6,
  NONE_MEDIUM: 0.8,
  NONE_HIGH: 0.9,
  NONE_MAX: 1.0,
};

const EMPTY_ARRAY = [];

export default function RiskMatrixEditor({ isReadOnly }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const matrix =
    useSelector(
      (state) =>
        state.configurations.configDetails?.riskMatrices ||
        state.configurations.configDetails?.riskMatrix
    ) || EMPTY_ARRAY;

  const categories =
    useSelector((state) => state.configurations.configDetails?.categories) ||
    EMPTY_ARRAY;

  // Identify the fixed categories
  const controlsCat = categories.find((c) => c.code === "CONTROLS");
  const likelihoodCat = categories.find((c) => c.code === "LIKELIHOOD");

  const controlsBands = controlsCat?.riskBands || EMPTY_ARRAY;
  const likelihoodBands = likelihoodCat?.riskBands || EMPTY_ARRAY;

  // --- AUTO-GENERATE ALL COMBINATIONS ---
  const exhaustiveMatrix = useMemo(() => {
    const list = [];
    controlsBands.forEach((cBand) => {
      likelihoodBands.forEach((lBand) => {
        const cLabel = cBand.label || "";
        const lLabel = lBand.label || "";

        // Check if this combination already exists in the Redux store
        const existingRow = matrix.find(
          (r) =>
            r.conditions?.CONTROLS === cLabel &&
            r.conditions?.LIKELIHOOD === lLabel
        );

        // Fallback to dictionary default, or 0.5 if totally unknown
        const lookupKey = `${cLabel}_${lLabel}`.toUpperCase();
        const defaultRisk =
          DEFAULT_MATRIX_VALUES[lookupKey] !== undefined
            ? DEFAULT_MATRIX_VALUES[lookupKey]
            : 0.5;

        list.push({
          cLabel,
          lLabel,
          uid: existingRow?.id || existingRow?._tempId || `${cLabel}-${lLabel}`,
          contextRisk: existingRow ? existingRow.contextRisk : defaultRisk,
        });
      });
    });
    return list;
  }, [controlsBands, likelihoodBands, matrix]);

  // --- ROW SPAN CALCULATOR FOR CLEAN UI ---
  const rowSpans = useMemo(() => {
    const spans = {};
    exhaustiveMatrix.forEach((row, index) => {
      if (index === 0 || exhaustiveMatrix[index - 1].cLabel !== row.cLabel) {
        let spanCount = 1;
        for (let i = index + 1; i < exhaustiveMatrix.length; i++) {
          if (exhaustiveMatrix[i].cLabel === row.cLabel) {
            spanCount++;
          } else {
            break;
          }
        }
        spans[index] = spanCount;
      } else {
        spans[index] = 0; // Hide this cell if it's part of a span
      }
    });
    return spans;
  }, [exhaustiveMatrix]);

  // --- SMART UPDATE HANDLER ---
  const handleUpdateContextRisk = (cLabel, lLabel, val) => {
    if (isReadOnly) return;

    let numericVal = parseFloat(String(val).replace(",", "."));
    if (isNaN(numericVal)) numericVal = 1.0;
    if (numericVal < 0) numericVal = 0.0;
    if (numericVal > 1) numericVal = 1.0;

    // Find if it exists in the active state
    const targetRow = matrix.find(
      (r) =>
        r.conditions?.CONTROLS === cLabel && r.conditions?.LIKELIHOOD === lLabel
    );

    if (targetRow) {
      dispatch(
        updateRiskMatrixRow({
          ...targetRow,
          contextRisk: numericVal,
        })
      );
    } else {
      dispatch(
        addRiskMatrixRow({
          _tempId: Date.now(),
          conditions: { CONTROLS: cLabel, LIKELIHOOD: lLabel },
          contextRisk: numericVal,
        })
      );
    }
  };

  return (
    <RABox>
      <RATypography variant="body2" color="secondary" mb={3} align="center">
        {t(
          "configurations.riskMatrix.description",
          "Map combination scenarios to define the contextual attack probability."
        )}
      </RATypography>

      <TableContainer
        component={Paper}
        sx={{ boxShadow: "none", border: "1px solid #e0e0e0" }}
      >
        <Table size="small">
          <TableHead
            sx={{ display: "table-header-group", backgroundColor: "#fafafa" }}
          >
            <TableRow>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "33%",
                  borderRight: "1px solid #e0e0e0",
                }}
              >
                {controlsCat?.name || "Mitigating Controls"}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", width: "33%" }}
              >
                {likelihoodCat?.name || "Likelihood (Motives & Capacity)"}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", width: "34%" }}
              >
                {t(
                  "configurations.riskMatrix.contextRisk",
                  "Context Risk Probability (0.0 - 1.0)"
                )}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {exhaustiveMatrix.map((row, index) => {
              const span = rowSpans[index];

              return (
                <TableRow key={row.uid}>
                  {/* Column 1: CONTROLS (Grouped via rowSpan) */}
                  {span > 0 && (
                    <TableCell
                      align="center"
                      rowSpan={span}
                      sx={{
                        borderRight: "1px solid #e0e0e0",
                        verticalAlign: "middle",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <RATypography
                        variant="button"
                        fontWeight="medium"
                        color="text"
                      >
                        {row.cLabel}
                      </RATypography>
                    </TableCell>
                  )}

                  {/* Column 2: LIKELIHOOD */}
                  <TableCell align="center" sx={{ verticalAlign: "middle" }}>
                    <RATypography
                      variant="button"
                      fontWeight="medium"
                      color="text"
                    >
                      {row.lLabel}
                    </RATypography>
                  </TableCell>

                  {/* Column 3: Context Risk Probability */}
                  <TableCell align="center">
                    <RABox sx={{ maxWidth: 100, mx: "auto", py: 0.5 }}>
                      <OnBlurRAInput
                        type="number"
                        value={row.contextRisk}
                        onCommit={(v) =>
                          handleUpdateContextRisk(row.cLabel, row.lLabel, v)
                        }
                        disabled={isReadOnly}
                        size="small"
                        inputProps={{ min: 0, max: 1, step: "0.01" }}
                        sx={{ "& .MuiInputBase-root": { height: "36px" } }}
                      />
                    </RABox>
                  </TableCell>
                </TableRow>
              );
            })}

            {exhaustiveMatrix.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                  <RATypography variant="button" color="text">
                    {t(
                      "configurations.riskMatrix.noRules",
                      "Define Risk Bands in the Controls and Likelihood categories to generate the matrix."
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
