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
 * Papa always reads a File in chunks (Papa.LocalChunkSize, 10 MB) with the
 * same delimiter detection, quoting, BOM and empty-line handling. The `chunk`
 * callback only replaces Papa's internal per-chunk `concat` of results with
 * pushing the same row objects into one array, and lets the header fields be
 * reported once the first chunk is parsed, before the remaining chunks.
 *
 * @param {File} file
 * @param {{ onFields?: (fields: string[]) => void }} [options]
 * @returns {Promise<{ rows: Object[], fields: string[] }>}
 */
export function parseCsvFile(file, { onFields } = {}) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let fields = [];
    let fieldsReported = false;

    Papa.parse(file, {
      ...CSV_PARSE_OPTIONS,
      chunk: ({ data, meta }) => {
        for (let index = 0; index < data.length; index += 1) {
          rows.push(data[index]);
        }
        fields = meta?.fields || fields;
        if (!fieldsReported && fields.length) {
          fieldsReported = true;
          onFields?.(fields.slice());
        }
      },
      complete: () => {
        resolve({
          rows,
          fields,
        });
      },
      error: reject,
    });
  });
}
