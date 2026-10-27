import Papa from "papaparse";
import {
  CSV_RESOURCE_LIMITS,
  requireCsvFileWithinLimits,
} from "../resourceLimits";

/** Parse all accepted records locally, rejecting ambiguous input rather than profiling
 * silently repaired rows. Values remain strings. Missing values are normalized later.
 * Resource checks run before accumulating each chunk; no partial profile is returned.
 */
export function parseCsvFile(file, { onFields, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    requireCsvFileWithinLimits(file);
    const rows = [];
    let fields = [];
    let fieldsReported = false;
    const parsingWarnings = new Set();
    let failed = false;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      worker: false,
      chunkSize: 1024 * 1024,
      chunk: ({ data, meta, errors = [] }, parser) => {
        try {
          fields = meta?.fields || fields;
          // A one-column CSV has no delimiter to infer; retain this benign
          // diagnostic visibly instead of rejecting valid zero-subset input.
          const fatalErrors = errors.filter((error) => {
            if (error.code === "UndetectableDelimiter" && fields.length === 1) {
              parsingWarnings.add(
                "No delimiter was detected; this file was read as a single-column CSV."
              );
              return false;
            }
            return true;
          });
          if (fatalErrors.length) {
            // Parser messages may include input text. Expose codes and row numbers only.
            const details = fatalErrors
              .slice(0, 3)
              .map(
                (error) =>
                  `${error.code || "ParseError"}${
                    Number.isInteger(error.row)
                      ? ` at data row ${error.row + 1}`
                      : ""
                  }`
              )
              .join(", ");
            throw new Error(
              `CSV parsing failed (${details}). Correct the file and select it again.`
            );
          }
          fields = meta?.fields || fields;
          if (
            !fields.length ||
            fields.some((field) => !field.trim()) ||
            new Set(fields).size !== fields.length ||
            Object.keys(meta?.renamedHeaders || {}).length
          ) {
            throw new Error(
              "CSV headers must be non-empty and unique. Correct the header row and select the file again."
            );
          }
          const count = rows.length + data.length;
          if (
            fields.length > CSV_RESOURCE_LIMITS.maxColumns ||
            count > CSV_RESOURCE_LIMITS.maxRows ||
            count * fields.length > CSV_RESOURCE_LIMITS.maxCells
          ) {
            throw new Error(
              "CSV exceeds browser limits: 100 columns, 100,000 rows or 2,000,000 cells. Select a smaller file; partial data will not be profiled."
            );
          }
          for (const row of data) rows.push(row);
          if (!fieldsReported) {
            fieldsReported = true;
            onFields?.(fields.slice());
          }
          onProgress?.();
        } catch (error) {
          failed = true;
          reject(error);
          parser.abort();
        }
      },
      complete: () => {
        if (failed) return;
        if (!fields.length || !rows.length) {
          reject(
            new Error("CSV must contain a header and at least one data row.")
          );
          return;
        }
        resolve({ rows, fields, parsingWarnings: [...parsingWarnings] });
      },
      error: reject,
    });
  });
}
