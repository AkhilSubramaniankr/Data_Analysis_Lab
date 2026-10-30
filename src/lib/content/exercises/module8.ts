/**
 * Module 8 exercises — Trend Analysis & Time-Based Data.
 * Validators compute real values from the retail dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

// Hoist expected values.
const withYear = df.dtYear("order_date");
const YEAR_2023_REVENUE = withYear.filter((r) => r.order_date_year === 2023).column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v)).reduce((a, b) => a + b, 0);
const YEAR_2024_REVENUE = withYear.filter((r) => r.order_date_year === 2024).column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v)).reduce((a, b) => a + b, 0);
const YOY_GROWTH_PCT = YEAR_2023_REVENUE > 0 ? ((YEAR_2024_REVENUE - YEAR_2023_REVENUE) / YEAR_2023_REVENUE) * 100 : NaN;
const MONTHLY = df.resampleMonthly("order_date", [{ column: "revenue", fn: "sum", as: "revenue" }]);
const NUM_MONTHS = MONTHLY.rows.length;
const MONTHLY_WITH_PCT = MONTHLY.pctChange("revenue");
const POSITIVE_MONTHS = MONTHLY_WITH_PCT.column("revenue_pct_change").filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0).length;

export const MODULE8_EXERCISES: ExerciseSpec[] = [
  {
    id: "m8-todatetime",
    tier: "beginner",
    moduleId: "trend-analysis",
    question: "What does pd.to_datetime(df['order_date'], errors='coerce') do when it encounters an invalid date string?",
    task: "Pick the correct behaviour.",
    type: "mcq",
    options: [
      { value: "raise", label: "Raises a ValueError and stops execution." },
      { value: "null", label: "Converts the invalid value to NaT (null) and continues processing the rest." },
      { value: "skip", label: "Drops the entire row containing the invalid date." },
      { value: "now", label: "Replaces the invalid value with today's date." },
    ],
    validator: (answer) => {
      const correct = answer === "null";
      return {
        correct,
        explanation: correct
          ? "Correct — errors='coerce' turns invalid dates into NaT (Not-a-Time, the datetime equivalent of NaN). It keeps the row and the rest of the row's data; you decide later what to do with the null. This is the safest option for EDA."
          : "Not quite. errors='coerce' turns invalid dates into NaT (null), keeps the row. Use errors='raise' (default) if you want to halt on invalid input, or errors='coerce' to silently null them and continue.",
      };
    },
    hint: "errors='coerce' → nulls invalid values. errors='raise' (default) → stops. errors='ignore' → leaves as-is.",
    solution: `df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")\n# Invalid → NaT; the row is kept. Inspect nulls:\ndf["order_date"].isna().sum()`,
    commonMistakes: [
      "Using errors='ignore' — leaves invalid strings in place, breaking downstream datetime ops.",
      "Assuming the row is dropped — it is NOT. The cell becomes NaT; the row remains.",
    ],
    concept: "Data type",
    nextLessonId: "feature-engineering-fundamentals",
  },

  {
    id: "m8-resample",
    tier: "intermediate",
    moduleId: "trend-analysis",
    question: "How would you compute the total revenue per month from a datetime-indexed DataFrame?",
    task: "Pick the correct expression.",
    type: "mcq",
    options: [
      { value: "resample-me-sum", label: "df.resample('ME').agg({'revenue': 'sum'})" },
      { value: "groupby-month", label: "df.groupby('month').sum()" },
      { value: "rolling-30", label: "df.rolling(30).sum()" },
      { value: "shift-1", label: "df.shift(1).sum()" },
    ],
    validator: (answer) => {
      const correct = answer === "resample-me-sum";
      return {
        correct,
        explanation: correct
          ? "Correct — resample('ME') groups by month-end and aggregates. ('ME' = Month End; the modern alias for 'M'.) The result is a time-indexed series of monthly sums. groupby('month') would also work but loses the year dimension (Jan-2023 and Jan-2024 would collapse together)."
          : "Not quite. groupby('month') collapses months across years (Jan-2023 and Jan-2024 become one bucket). rolling(30).sum() is a 30-row window, not monthly. shift(1).sum() makes no sense. The right call is resample('ME').agg({'revenue': 'sum'}).",
      };
    },
    hint: "resample takes a frequency string ('ME' = month end, 'QE' = quarter end, 'YE' = year end).",
    solution: `# Modern Pandas alias:\ndf.resample("ME").agg({"revenue": "sum"})\n# (Older alias 'M' is deprecated in Pandas 2.x.)\n# Or, more verbosely:\ndf.groupby(df.index.to_period("M"))["revenue"].sum()`,
    commonMistakes: [
      "Using groupby('month') — collapses same-month-different-year into one bucket.",
      "Using 'M' frequency (deprecated since Pandas 2.2).",
    ],
    concept: "Datetime64",
    nextLessonId: "feature-engineering-fundamentals",
  },

  {
    id: "m8-pct-change-zero",
    tier: "intermediate",
    moduleId: "trend-analysis",
    question: "Your monthly revenue series has [100, 0, 200]. What does .pct_change() return for the third period?",
    task: "Pick the correct value for period 3.",
    type: "mcq",
    options: [
      { value: "inf", label: "Infinity (∞) — division by zero." },
      { value: "nan", label: "NaN — undefined when the previous value is 0." },
      { value: "two", label: "200% — calculated as (200 - 0) / 100." },
      { value: "zero", label: "0% — special-cased to avoid the division." },
    ],
    validator: (answer) => {
      const correct = answer === "nan";
      return {
        correct,
        explanation: correct
          ? "Correct — pct_change() divides by the previous value. When the previous value is 0, the result is mathematically undefined. Pandas returns NaN (not Inf). You must investigate each NaN deliberately: was it a returns month? a data gap? a launch month? Never silently impute or drop."
          : "Not quite. Pandas returns NaN, not Infinity. The division-by-zero is not silently worked around — the result is undefined and you must decide what to do with it (keep as missing, document, or investigate).",
      };
    },
    hint: "Pandas returns NaN, not Inf, for zero-denominator pct_change. The result is undefined — investigate each NaN.",
    solution: `# Pandas returns NaN for zero denominators in pct_change:\ns = pd.Series([100, 0, 200])\ns.pct_change()  # → [NaN, -1.0, NaN]\n# The third value is NaN because the previous (0) is zero.\n# Investigate — do NOT silently impute.`,
    commonMistakes: [
      "Assuming pct_change returns Infinity — it returns NaN.",
      "Imputing the NaN to 0 or 100% without investigating — silent data loss.",
    ],
    concept: "Missing value",
    nextLessonId: "feature-engineering-fundamentals",
  },

  {
    id: "m8-yoy",
    tier: "advanced",
    moduleId: "trend-analysis",
    question: `What is the year-over-year (YoY) revenue growth from 2023 to 2024 in the Retail Sales dataset? (Round to 2 decimals; report as a percentage.)`,
    task: "YoY% = (revenue_2024 - revenue_2023) / revenue_2023 × 100",
    type: "text",
    validator: (answer) => {
      const expected = +YOY_GROWTH_PCT.toFixed(2);
      const n = Number(answer.replace(/[^0-9.-]/g, ""));
      const correct = Math.abs(n - expected) < 0.5;
      return {
        correct,
        explanation: correct
          ? `Correct — YoY growth = ($${Math.round(YEAR_2024_REVENUE).toLocaleString()} - $${Math.round(YEAR_2023_REVENUE).toLocaleString()}) / $${Math.round(YEAR_2023_REVENUE).toLocaleString()} × 100 = ${expected}%.`
          : `Not quite. YoY growth = ${expected}%. You answered ${answer}. Re-check: (rev_2024 - rev_2023) / rev_2023 × 100.`,
      };
    },
    hint: "Filter df by .dt.year, sum revenue per year, then compute the percentage change.",
    solution: `rev_2023 = df[df["order_date"].dt.year == 2023]["revenue"].sum()  # $${Math.round(YEAR_2023_REVENUE).toLocaleString()}\nrev_2024 = df[df["order_date"].dt.year == 2024]["revenue"].sum()  # $${Math.round(YEAR_2024_REVENUE).toLocaleString()}\nyoy_pct = (rev_2024 - rev_2023) / rev_2023 * 100  # ${YOY_GROWTH_PCT.toFixed(2)}%`,
    commonMistakes: [
      "Using df.groupby('year').pct_change() — pct_change operates within groups, so it produces NaN for the first year and month-over-month for the second.",
      "Computing (rev_2024 - rev_2023) without dividing by rev_2023 — that's the absolute change, not the percentage.",
    ],
    concept: "Variance",
    nextLessonId: "feature-engineering-fundamentals",
  },

  {
    id: "m8-rolling-interpretation",
    tier: "advanced",
    moduleId: "trend-analysis",
    question: "You apply df['revenue'].rolling(3).mean() to a monthly series. How many of the first rows are NaN?",
    task: "Pick the correct count.",
    type: "mcq",
    options: [
      { value: "0", label: "0 — rolling fills from the start." },
      { value: "1", label: "1 — the first row only." },
      { value: "2", label: "2 — the first two rows (window needs 3 values)." },
      { value: "3", label: "3 — the first three rows." },
    ],
    validator: (answer) => {
      const correct = answer === "2";
      return {
        correct,
        explanation: correct
          ? "Correct — Pandas rolling(3).mean() requires 3 values to compute the first result (min_periods defaults to the window size). So rows 0 and 1 (the first 2 = window - 1 rows) are NaN; row 2 is the first non-null result."
          : "Not quite. rolling(3) needs 3 values per result. So the first 2 rows (= window - 1) are NaN; row index 2 (the 3rd row) is the first non-null. If you want results from row 0, set min_periods=1.",
      };
    },
    hint: "min_periods defaults to the window size. rolling(3) needs 3 values per cell, so the first (window-1) cells are NaN.",
    solution: `df["revenue"].rolling(3).mean()\n# Row 0, 1: NaN (need 3 values)\n# Row 2: mean(rev_0, rev_1, rev_2)\n# Row 3: mean(rev_1, rev_2, rev_3)\n# ... \n# To fill from row 0:\ndf["revenue"].rolling(3, min_periods=1).mean()`,
    commonMistakes: [
      "Forgetting the first (window-1) rows are NaN — downstream code must handle nulls.",
      "Confusing rolling with expanding — rolling has a fixed window; expanding grows.",
    ],
    concept: "Standard deviation",
    nextLessonId: "feature-engineering-fundamentals",
  },
];
