import { DataType } from "utils/DataType";
import {
  detectMeasurement,
  isMissingValueMarker,
} from "utils/detectMeasurement";
import { MISSING_VALUE, normalizeCellValue } from "./normalization";
import { buildAttributeStatistics } from "./metrics/profile";
import { createDirectIdentifierEvidenceAccumulator } from "./directIdentifierEvidence";

/**
 * Merges the classes of NA-like markers ("NA", "NULL", ...) into the missing
 * class and renumbers the codes in place so that they stay dense: a code is
 * the index of its class size, as subset partitions expect. Returns null when
 * the column has no marker.
 */
function mergeMissingMarkerClasses(valueProfiles, codes) {
  const markerCodes = new Set();
  let markerCount = 0;
  for (const [value, { code, count }] of valueProfiles) {
    if (value !== MISSING_VALUE && isMissingValueMarker(value)) {
      markerCodes.add(code);
      markerCount += count;
    }
  }
  if (!markerCodes.size) return null;

  // Map order is code order, so the kept classes keep their relative order.
  const newCodeByCode = new Uint32Array(valueProfiles.size);
  const classSizes = [];
  let missingCode = null;
  for (const [value, { code, count }] of valueProfiles) {
    const isMissingClass = value === MISSING_VALUE || markerCodes.has(code);
    if (isMissingClass && missingCode !== null) {
      newCodeByCode[code] = missingCode;
      classSizes[missingCode] += count;
    } else {
      newCodeByCode[code] = classSizes.length;
      if (isMissingClass) missingCode = classSizes.length;
      classSizes.push(count);
    }
  }
  for (let rowIndex = 0; rowIndex < codes.length; rowIndex += 1) {
    codes[rowIndex] = newCodeByCode[codes[rowIndex]];
  }

  return { classSizes, missingCode, markerCount };
}

/**
 * Traverses one observed source column exactly once. During that pass it:
 * - normalizes each cell value;
 * - counts missing values;
 * - counts normalized equivalence-class frequencies;
 * - collects aggregate direct-identifier value-pattern evidence;
 * - assigns a compact integer dictionary code;
 * - writes the encoded code for each row.
 * After the pass it infers the data type from the distinct values. If the
 * type is not STRING, NA-like markers join the missing class (see
 * normalization.js). `allowDecimalComma` is false for comma-separated files.
 */
export function profileAndEncodeColumn(
  rows = [],
  sourceField,
  { allowDecimalComma = true } = {}
) {
  const valueProfiles = new Map();
  const observedDistinctValues = [];
  const encodedCodes = new Uint32Array(rows.length);
  const directIdentifierAccumulator =
    createDirectIdentifierEvidenceAccumulator();
  let missingCount = 0;
  let missingCode = null;
  let nextCode = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rawValue = rows[rowIndex]?.[sourceField];
    const normalizedValue = normalizeCellValue(rawValue);
    const isMissing = normalizedValue === MISSING_VALUE;

    if (isMissing) {
      missingCount += 1;
    }
    directIdentifierAccumulator.observe(rawValue, !isMissing);

    let valueProfile = valueProfiles.get(normalizedValue);
    if (!valueProfile) {
      valueProfile = {
        code: nextCode,
        count: 0,
      };
      valueProfiles.set(normalizedValue, valueProfile);
      nextCode += 1;

      if (normalizedValue === MISSING_VALUE) {
        missingCode = valueProfile.code;
      } else {
        observedDistinctValues.push(rawValue);
      }
    }

    valueProfile.count += 1;
    encodedCodes[rowIndex] = valueProfile.code;
  }

  const { dataType, typeNote } = detectMeasurement(
    observedDistinctValues,
    sourceField,
    { allowDecimalComma }
  );
  let classSizes = Array.from(valueProfiles.values()).map(
    ({ count }) => count
  );
  let markerCount = 0;
  // Type detection ignores NA-like markers. In a column it typed (numbers,
  // dates, ...), they mean "no value", like empty cells. In a text column they
  // stay values: there, "NA" or "None" can be a real answer.
  if (dataType !== DataType.STRING) {
    const merged = mergeMissingMarkerClasses(valueProfiles, encodedCodes);
    if (merged) {
      classSizes = merged.classSizes;
      missingCode = merged.missingCode;
      markerCount = merged.markerCount;
    }
  }

  return {
    sourceField,
    statistics: buildAttributeStatistics({
      recordCount: rows.length,
      analysedRecordCount: rows.length,
      missingCount: missingCount + markerCount,
      classSizes,
    }),
    encoded: {
      sourceField,
      codes: encodedCodes,
      distinctCodeCount: classSizes.length,
      missingCode,
    },
    dataType,
    // Browser-local preview hint with raw example values; never persisted.
    typeNote,
    directIdentifierEvidence: directIdentifierAccumulator.finalize({
      reclassifiedMissingCount: markerCount,
    }),
  };
}
