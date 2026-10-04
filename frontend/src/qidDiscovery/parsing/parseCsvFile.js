import Papa from "papaparse";

// Shared by the QID worker and the synchronous fallback so both paths parse
// identically. Values stay strings (no dynamic typing) so profiling sees the
// uploaded representation. Papa's own worker is disabled: the QID Web Worker
// is already the worker boundary, and nested workers are not needed.
const CSV_PARSE_OPTIONS = {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: false,
  worker: false,
};

/**
 * Parses an uploaded CSV File into header-keyed rows. Rows remain
 * browser-local; only aggregate profiling results are ever persisted.
 *
 * @param {File} file
 * @returns {Promise<{ rows: Object[], fields: string[] }>}
 */
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      ...CSV_PARSE_OPTIONS,
      complete: ({ data: rows, meta: { fields = [] } }) => {
        resolve({
          rows,
          fields,
        });
      },
      error: reject,
    });
  });
}
