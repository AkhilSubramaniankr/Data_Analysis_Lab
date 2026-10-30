/**
 * Cell value type used by the in-browser DataFrame engine.
 *
 * The values are real JS values — never fabricated. `null` represents
 * a Pandas NaN/None for any column type. Strings are stored as-is.
 * Numbers are JS numbers. Dates are ISO strings (we display + filter
 * them as strings to avoid timezone pitfalls in a deterministic demo).
 */

export type CellValue = string | number | boolean | null;

/** A row is a record keyed by column name. */
export type Row = Record<string, CellValue>;

/** Logical Pandas dtype for a column. */
export type DType =
  | "int64"
  | "float64"
  | "bool"
  | "object"
  | "datetime64[ns]"
  | "category";

/** Human-readable description of a column for the data dictionary. */
export interface ColumnSchema {
  name: string;
  dtype: DType;
  /** Beginner-friendly description. */
  description: string;
  /** Example value (for the dictionary) — type matches the dtype. */
  example: CellValue;
  /** Whether the column is a candidate identifier / primary key. */
  isKey?: boolean;
  /** Whether the column is a candidate target variable for ML. */
  isTargetCandidate?: boolean;
  /** Allowed values, for categorical columns (optional). */
  categories?: string[];
  /** Min/max for numerical columns (optional, for validation display). */
  range?: { min: number; max: number };
}

/** A complete dataset specification. */
export interface DatasetSpec {
  id: string;
  name: string;
  /** One-paragraph business context. */
  context: string;
  columns: ColumnSchema[];
  rows: Row[];
  /** Known data-quality issues (used by Module 2 + Dataset Explorer). */
  knownIssues: string[];
  /** Suggested analytical questions for the learner. */
  analyticalQuestions: string[];
  /** Feature-engineering opportunities. */
  featureOpportunities: string[];
  /** Documented limitations (no fabrication). */
  limitations: string[];
  /** Whether the dataset must not be used to automate sensitive decisions. */
  ethicalWarning?: string;
  /** Seed used to generate the data deterministically. */
  seed: number;
}

/** Aggregation function identifiers, mirroring Pandas names. */
export type AggFunc = "sum" | "mean" | "median" | "min" | "max" | "count" | "nunique" | "std" | "var" | "first" | "last";

/** Pandas-like sort order. */
export type SortOrder = "asc" | "desc";

/** Join types, mirroring Pandas `how`. */
export type JoinHow = "inner" | "left" | "right" | "outer";

/** A filter condition for the FilterBuilder UI. */
export interface FilterCondition {
  column: string;
  op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "startswith" | "isna" | "notna";
  /** Value(s) for comparison — type depends on `op`. */
  value: CellValue | CellValue[];
}
