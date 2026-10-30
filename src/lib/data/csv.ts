/**
 * CSV parser + validator (client-side only).
 *
 * Design:
 *  - Pure TypeScript, runs in the browser.
 *  - 1 MB hard file-size limit (per the master spec).
 *  - Strict, tolerant of common delimiter variations (auto-detect , ; | \t).
 *  - Handles quoted fields with embedded commas, newlines, and doubled
 *    quotes (per RFC 4180).
 *  - Infers dtypes (int64 / float64 / bool / datetime64 / object) for the
 *    resulting DataFrame.
 *  - Returns clear, actionable error messages.
 *
 * Security: no external transmission. The file is processed entirely
 * in-memory in the user's browser.
 */

import { DataFrame } from "./frame";
import type { DatasetSpec, DType, Row, CellValue } from "./types";

export const CSV_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

export interface CsvParseResult {
  ok: boolean;
  dataFrame?: DataFrame;
  spec?: DatasetSpec;
  error?: string;
  warning?: string;
  delimiter?: string;
  rowsParsed?: number;
}

/**
 * Auto-detect the most likely delimiter based on the first non-empty line.
 * Falls back to comma.
 */
export function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts: Record<string, number> = { ",": 0, ";": 0, "|": 0, "\t": 0 };
  for (const ch of firstLine) {
    if (ch in counts) counts[ch]++;
  }
  let best = ",";
  let bestCount = 0;
  for (const [d, c] of Object.entries(counts)) {
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Strict RFC-4180 CSV parser. Yields rows as arrays of strings.
 */
export function parseCsv(text: string, delimiter: string = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Lookahead for an escaped quote (doubled)
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }

    if (ch === "\r") {
      // handle CRLF
      i++;
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Trim trailing empty row (a final newline would create an empty trailing row)
  if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }

  return rows;
}

/** Coerce a string cell to a CellValue using the inferred dtype. */
function coerceCell(s: string, dtype: DType): CellValue {
  const trimmed = s.trim();
  if (trimmed === "") return null;
  switch (dtype) {
    case "int64": {
      const n = Number(trimmed);
      if (Number.isFinite(n) && Number.isInteger(n)) return n;
      return trimmed;
    }
    case "float64": {
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
      return trimmed;
    }
    case "bool":
      if (trimmed.toLowerCase() === "true") return true;
      if (trimmed.toLowerCase() === "false") return false;
      return trimmed;
    case "datetime64[ns]":
      // Keep as ISO string for our engine (we don't parse to Date).
      if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?Z?)?$/.test(trimmed)) return trimmed;
      return trimmed;
    default:
      return trimmed;
  }
}

/** Infer the dtype for a column from its cells (sample-based). */
function inferDtype(values: string[]): DType {
  let allInt = true;
  let allFloat = true;
  let allBool = true;
  let allIsoDate = true;
  let nonEmpty = 0;
  for (const v of values) {
    const t = v.trim();
    if (t === "") continue;
    nonEmpty++;
    if (!/^-?\d+$/.test(t)) allInt = false;
    if (!/^-?\d+(\.\d+)?$/.test(t)) allFloat = false;
    if (!(t.toLowerCase() === "true" || t.toLowerCase() === "false")) allBool = false;
    if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?Z?)?$/.test(t)) allIsoDate = false;
  }
  if (nonEmpty === 0) return "object";
  if (allBool) return "bool";
  if (allInt) return "int64";
  if (allFloat) return "float64";
  if (allIsoDate) return "datetime64[ns]";
  return "object";
}

/** Build a DatasetSpec from a parsed CSV. */
export function buildDatasetSpec(rows: string[][], name: string): DatasetSpec {
  if (rows.length === 0) {
    throw new Error("CSV has no rows.");
  }
  const header = rows[0].map((h) => h.trim());
  if (header.length === 0 || header.some((h) => h === "")) {
    throw new Error("CSV header is empty or contains empty column names.");
  }
  // Detect duplicate header names
  const seen = new Set<string>();
  for (const h of header) {
    if (seen.has(h)) {
      throw new Error(`CSV header has a duplicate column name: "${h}".`);
    }
    seen.add(h);
  }
  const body = rows.slice(1);
  // Transpose
  const colArrays: string[][] = header.map(() => []);
  for (const row of body) {
    for (let i = 0; i < header.length; i++) {
      colArrays[i].push(row[i] ?? "");
    }
  }
  const dtypes = colArrays.map(inferDtype);
  const dataRows: Row[] = body.map((row) => {
    const obj: Row = {};
    header.forEach((h, i) => {
      obj[h] = coerceCell(row[i] ?? "", dtypes[i]);
    });
    return obj;
  });

  return {
    id: `upload-${Date.now()}`,
    name,
    context:
      "User-uploaded CSV. The dataset was parsed entirely in your browser; no data left your machine. The dtypes shown below were inferred from a sample of the data — review and adjust if needed.",
    columns: header.map((h, i) => ({
      name: h,
      dtype: dtypes[i],
      description: "Inferred from the uploaded CSV.",
      example: String(body[0]?.[i] ?? ""),
    })),
    rows: dataRows,
    knownIssues: [
      "Dtypes are inferred automatically — verify them with the dataset's data dictionary before modelling.",
      "Empty cells were converted to null (Pandas NaN-equivalent).",
    ],
    analyticalQuestions: ["What business question does this dataset answer?"],
    featureOpportunities: ["Inspect each column's dtype and cardinality before deciding on a cleaning strategy."],
    limitations: [
      "User-uploaded; we have no knowledge of the source schema beyond the inferred dtypes.",
      "1 MB upload cap applies; larger files are rejected before parsing.",
    ],
    seed: 0,
  };
}

/**
 * Top-level CSV upload handler. Reads the File, enforces the size cap,
 * parses, builds a DatasetSpec, and returns a result object suitable for
 * the UI.
 */
export async function handleCsvUpload(file: File): Promise<CsvParseResult> {
  if (file.size > CSV_MAX_BYTES) {
    return {
      ok: false,
      error: `File is ${(file.size / 1024).toFixed(1)} KB, which exceeds the 1 MB limit. Choose a smaller file or sample it down before uploading.`,
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    return {
      ok: false,
      error: `Could not read the file. ${(e as Error).message}`,
    };
  }

  if (text.trim().length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  const delimiter = detectDelimiter(text);
  let rows: string[][];
  try {
    rows = parseCsv(text, delimiter);
  } catch (e) {
    return { ok: false, error: `CSV parse failed. ${(e as Error).message}` };
  }

  if (rows.length < 2) {
    return { ok: false, error: "CSV must contain a header row and at least one data row." };
  }

  let spec: DatasetSpec;
  try {
    spec = buildDatasetSpec(rows, file.name);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const df = DataFrame.fromRows(spec.rows);
  let warning: string | undefined;
  if (df.shape[0] > 5000) {
    warning = `Parsed ${df.shape[0]} rows. Performance in the labs is best below 5,000 rows.`;
  }

  return {
    ok: true,
    dataFrame: df,
    spec,
    delimiter: delimiter === "\t" ? "tab" : delimiter,
    rowsParsed: df.shape[0],
    warning,
  };
}
