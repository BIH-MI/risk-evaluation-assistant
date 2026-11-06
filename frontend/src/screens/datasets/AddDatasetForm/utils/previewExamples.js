import { DataType } from "utils/DataType";
import { isMissingValueMarker } from "utils/detectMeasurement";

// A comma would be ambiguous: values can contain decimal commas.
export const EXAMPLE_SEPARATOR = " · ";

const PREVIEW_EXAMPLE_ROW_LIMIT = 500;
const PREVIEW_EXAMPLE_COUNT = 3;

/**
 * The most frequent values per column in the preview rows, keyed by display
 * name. Blank cells are skipped, and so are NA-like markers in typed columns,
 * where they mean "no value" (see profileAndEncodeColumn).
 */
export function buildTopValuesMap(columnMeta = [], data = []) {
  const map = {};
  const sampleData = data.slice(0, PREVIEW_EXAMPLE_ROW_LIMIT);

  for (const { field, sourceField, level } of columnMeta) {
    const skipMarkers = Boolean(level) && level !== DataType.STRING;
    const frequencies = new Map();
    for (const row of sampleData) {
      const value = row[sourceField || field];
      if (value == null || String(value).trim() === "") continue;
      if (skipMarkers && isMissingValueMarker(value)) continue;
      frequencies.set(value, (frequencies.get(value) || 0) + 1);
    }
    map[field] = Array.from(frequencies)
      .sort((left, right) => right[1] - left[1])
      .slice(0, PREVIEW_EXAMPLE_COUNT)
      .map(([value]) => value);
  }

  return map;
}
