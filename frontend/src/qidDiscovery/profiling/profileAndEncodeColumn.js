import { detectMeasurement } from "utils/detectMeasurement";
import { MISSING_VALUE, normalizeCellValue } from "../normalization";
import { buildAttributeStatistics } from "../metrics/profile";

/**
 * Traverses one observed source column exactly once. During that pass it:
 * - normalizes each cell value;
 * - counts missing values;
 * - counts normalized equivalence-class frequencies;
 * - assigns a compact integer dictionary code;
 * - writes the encoded code for each row.
 */
export function profileAndEncodeColumn(rows = [], sourceField) {
  const valueProfiles = new Map();
  const observedDistinctValues = [];
  const encodedCodes = new Uint32Array(rows.length);
  let missingCount = 0;
  let nextCode = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rawValue = rows[rowIndex]?.[sourceField];
    const normalizedValue = normalizeCellValue(rawValue);

    if (normalizedValue === MISSING_VALUE) {
      missingCount += 1;
    }

    let valueProfile = valueProfiles.get(normalizedValue);
    if (!valueProfile) {
      valueProfile = {
        code: nextCode,
        count: 0,
      };
      valueProfiles.set(normalizedValue, valueProfile);
      nextCode += 1;

      if (normalizedValue !== MISSING_VALUE) {
        observedDistinctValues.push(rawValue);
      }
    }

    valueProfile.count += 1;
    encodedCodes[rowIndex] = valueProfile.code;
  }

  const classSizes = Array.from(valueProfiles.values()).map(
    ({ count }) => count
  );
  const { dataType } = detectMeasurement(observedDistinctValues, sourceField);

  return {
    sourceField,
    stableAttributeId: sourceField,
    statistics: buildAttributeStatistics({
      recordCount: rows.length,
      analysedRecordCount: rows.length,
      missingCount,
      classSizes,
    }),
    encoded: {
      sourceField,
      codes: encodedCodes,
      distinctCodeCount: nextCode,
    },
    dataType,
  };
}
