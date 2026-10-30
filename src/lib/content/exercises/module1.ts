/**
 * Module 1 exercises — Dataset Exploration.
 *
 * Each exercise validates against the actual Retail Sales DataFrame
 * (deterministic). No fabricated answer keys.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

// Hoist the expected values to module top-level so they can be used in
// both the validator closures AND the solution template strings.
const ROWS = df.shape[0];
const COLS = df.shape[1];
const REGION_NUNIQUE = df.nunique("region");

export const MODULE1_EXERCISES: ExerciseSpec[] = [
  // --- Beginner: shape ---
  {
    id: "m1-shape",
    tier: "beginner",
    moduleId: "dataset-exploration",
    question: "How many rows does the Retail Sales dataset have? Use `df.shape`.",
    task: "Report the number of rows (the first element of the shape tuple).",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === ROWS;
      return {
        correct,
        explanation: correct
          ? `Correct — df.shape returns (${ROWS}, ${COLS}), so the dataset has ${ROWS} rows.`
          : `Not quite. df.shape returns (${ROWS}, ${COLS}) — the first element (${ROWS}) is the row count. You answered ${answer}.`,
      };
    },
    hint: "df.shape returns a tuple (rows, columns). The first element is the row count.",
    solution: `df.shape           # → (${ROWS}, ${COLS})\ndf.shape[0]        # → ${ROWS} (rows)`,
    commonMistakes: [
      "Confusing rows and columns — shape is (rows, columns).",
      "Using len(df.columns) instead of df.shape[0].",
    ],
    concept: "Dataset",
    nextLessonId: "data-quality",
  },

  // --- Beginner: dtypes ---
  {
    id: "m1-dtypes",
    tier: "beginner",
    moduleId: "dataset-exploration",
    question: "What is the dtype of the `order_date` column in the Retail Sales dataset?",
    task: "Pick the dtype Pandas would infer.",
    type: "mcq",
    options: [
      { value: "int64", label: "int64" },
      { value: "object", label: "object" },
      { value: "datetime64[ns]", label: "datetime64[ns]" },
      { value: "category", label: "category" },
    ],
    validator: (answer) => {
      const expected = "datetime64[ns]";
      const correct = answer === expected;
      return {
        correct,
        explanation: correct
          ? `Correct — order_date values match the ISO date pattern YYYY-MM-DD, so Pandas infers datetime64[ns]. (In our engine, the dtype matches once the column is parsed as a date.)`
          : `Not quite. The values in order_date are ISO-format dates like "2023-04-17". Pandas would infer datetime64[ns], not ${answer}. (In a real CSV-loaded frame, you'd call pd.to_datetime() to make this happen.)`,
      };
    },
    hint: "Look at the example value: 2023-04-17. What format does that look like?",
    solution: `df["order_date"].dtype  # dtype('datetime64[ns]')\n# (in a freshly loaded CSV it may start as object;\n#  call pd.to_datetime(df["order_date"]) to convert it)`,
    commonMistakes: [
      "Choosing object because the raw CSV values are strings — they are strings only until you call pd.to_datetime.",
      "Choosing category — datetime columns are not categorical.",
    ],
    concept: "Data type",
    nextLessonId: "data-quality",
  },

  // --- Beginner: nunique ---
  {
    id: "m1-nunique",
    tier: "beginner",
    moduleId: "dataset-exploration",
    question: "How many distinct regions does the `region` column contain? Use `df['region'].nunique()`.",
    task: "Report the integer count of distinct regions.",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === REGION_NUNIQUE;
      return {
        correct,
        explanation: correct
          ? `Correct — df["region"].nunique() returns ${REGION_NUNIQUE}. The regions are: ${retail.columns.find((c) => c.name === "region")?.categories?.join(", ")}.`
          : `Not quite. df["region"].nunique() returns ${REGION_NUNIQUE}, not ${answer}. You can verify with df["region"].unique().`,
      };
    },
    hint: "nunique() counts distinct non-null values. The region column has a small fixed set of values.",
    solution: `df["region"].nunique()        # → ${REGION_NUNIQUE}\ndf["region"].unique()        # array(['North', 'South', 'East', 'West', 'Central'])`,
    commonMistakes: [
      "Using len(df) — that returns the row count, not the distinct-value count.",
      "Using df['region'].count() — that returns non-null rows, not distinct values.",
    ],
    concept: "Observation",
    nextLessonId: "data-quality",
  },

  // --- Intermediate: info vs describe ---
  {
    id: "m1-info-vs-describe",
    tier: "intermediate",
    moduleId: "dataset-exploration",
    question: "Which call tells you the dtype and non-null count of every column?",
    task: "Pick the right call.",
    type: "mcq",
    options: [
      { value: "info", label: "df.info()" },
      { value: "describe", label: "df.describe()" },
      { value: "head", label: "df.head()" },
      { value: "memory_usage", label: "df.memory_usage()" },
    ],
    validator: (answer) => {
      const correct = answer === "info";
      return {
        correct,
        explanation: correct
          ? `Correct — df.info() prints dtypes, non-null counts per column, and total memory. describe() returns distributional statistics for numeric columns; it does not show dtypes or null counts.`
          : `Not quite. ${answer === "describe" ? "describe() returns numeric statistics, not dtypes or null counts." : answer === "head" ? "head() returns the first rows — no dtype or null summary." : "memory_usage() returns bytes per column — no dtype or null info."} The right call is df.info().`,
      };
    },
    hint: "Think about what each call is for: inspecting schema, summarising distributions, peeking at rows, or measuring memory.",
    solution: `df.info()  # dtypes + non-null counts + memory\n# vs.\ndf.describe()  # count/mean/std/min/quantiles/max for numeric columns`,
    commonMistakes: [
      "Calling describe() first and being surprised it gives no dtypes — describe() is for distributions.",
      "Calling head() repeatedly when info() is what you actually need.",
    ],
    concept: "Dataset",
    nextLessonId: "data-quality",
  },

  // --- Intermediate: cardinality / target ---
  {
    id: "m1-target-candidate",
    tier: "intermediate",
    moduleId: "dataset-exploration",
    question: "You want to predict revenue. Which column is the LEAST suitable as an input feature?",
    task: "Pick the column that would cause target leakage or be a trivial identifier.",
    type: "mcq",
    options: [
      { value: "quantity", label: "quantity" },
      { value: "unit_price", label: "unit_price" },
      { value: "profit", label: "profit" },
      { value: "region", label: "region" },
    ],
    validator: (answer) => {
      const correct = answer === "profit";
      return {
        correct,
        explanation: correct
          ? `Correct — profit = revenue * margin is a function of revenue itself. Using profit as a feature to predict revenue is target leakage: the model would learn revenue = profit / margin and the test set would not have profit available at inference time anyway. quantity and unit_price are legitimate inputs (revenue = quantity * unit_price is the actual relationship you'd model). region is a legitimate categorical feature.`
          : `Not quite. quantity and unit_price are the legitimate inputs (revenue = quantity * unit_price). region is a legitimate categorical feature. profit is the trap: profit = revenue * margin depends on revenue itself, so including it as a feature would be target leakage.`,
      };
    },
    hint: "Leakage happens when a feature is derived from (or only known after) the target. Which column here is computed from revenue?",
    solution: `# Target leakage: profit = revenue * margin\n# Including profit as a feature to predict revenue is leakage.\n# Keep quantity, unit_price, region — they are known before the order is priced.\n\n# Safe feature matrix (without profit):\nX = df[["quantity", "unit_price", "region"]]\ny = df["revenue"]`,
    commonMistakes: [
      "Treating profit as a 'feature' because it sounds useful — it's a derived value, not an input.",
      "Assuming order_id is safe — identifiers should also be dropped (they have no predictive value).",
    ],
    concept: "Target variable",
    nextLessonId: "data-quality",
  },

  // --- Advanced: memory ---
  {
    id: "m1-memory",
    tier: "advanced",
    moduleId: "dataset-exploration",
    question: "Which column likely uses the MOST memory in the Retail Sales dataset (with deep=True)?",
    task: "Pick the column whose memory_usage(deep=True) is the largest.",
    type: "select",
    options: [
      { value: "order_id", label: "order_id (unique strings like 'ORD-10001')" },
      { value: "revenue", label: "revenue (float64 numbers)" },
      { value: "quantity", label: "quantity (int64 numbers)" },
      { value: "product", label: "product (short strings, only 10 distinct)" },
    ],
    validator: (answer) => {
      const mem = df.memoryUsage();
      const sorted = [...mem].sort((a, b) => b.bytes - a.bytes);
      const largest = sorted[0].column;
      const correct = answer === largest;
      return {
        correct,
        explanation: correct
          ? `Correct — with deep=True, ${largest} uses the most bytes (${(sorted[0].bytes / 1024).toFixed(2)} KB) because each row carries a unique string with non-trivial length. Numeric columns (revenue, quantity) use 8 bytes per row regardless of value.`
          : `Not quite. With deep=True, ${largest} uses the most bytes (${(sorted[0].bytes / 1024).toFixed(2)} KB). You picked ${answer}. Numeric columns use a flat 8 bytes per row; long unique string columns use more because each value is a heap-allocated string.`,
      };
    },
    hint: "With deep=True, every string column accounts for both the pointer (8 bytes per row) and the actual character bytes. Numeric columns are a flat 8 bytes per row.",
    solution: `df.memory_usage(deep=True)\n# Numeric columns: 8 bytes per row\n# Object columns:   8 bytes (pointer) + len(string) per row\n# Long, unique string columns cost the most.\n# Convert a low-cardinality string to 'category' dtype to save memory:\ndf["region"] = df["region"].astype("category")`,
    commonMistakes: [
      "Forgetting that deep=True matters for object columns — without it, only the pointer is counted.",
      "Assuming float64 is heavier than int64 — both are 8 bytes per row.",
    ],
    concept: "Data type",
    nextLessonId: "data-quality",
  },
];
