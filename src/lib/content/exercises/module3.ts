/**
 * Module 3 exercises — Selection, Filtering, Sorting, Transformation, Joins.
 * Validators compute real values from the real datasets.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

// Hoist expected values to module top-level so they can be used in
// both the validator closures AND the solution template strings.
const REVENUE_OVER_200 = df.filter((r) => typeof r.revenue === "number" && r.revenue > 200).rows.length;

export const MODULE3_EXERCISES: ExerciseSpec[] = [
  {
    id: "m3-loc",
    tier: "beginner",
    moduleId: "selection-filtering",
    question: "Select the `revenue` and `profit` columns of the Retail Sales dataset using loc. How many columns does the result have?",
    task: "Report the integer count of columns in df.loc[:, ['revenue', 'profit']].",
    type: "text",
    validator: (answer) => {
      const expected = 2;
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === expected;
      return {
        correct,
        explanation: correct
          ? `Correct — df.loc[:, ['revenue', 'profit']] returns a DataFrame with 2 columns (revenue and profit) and ${df.shape[0]} rows.`
          : `Not quite. df.loc[:, ['revenue', 'profit']] returns 2 columns. You answered ${answer}. Remember: loc[rows, cols] — the second argument selects columns.`,
      };
    },
    hint: "loc[rows, cols] — for label-based selection. df.loc[:, ['revenue', 'profit']] selects all rows, two specific columns.",
    solution: `df.loc[:, ["revenue", "profit"]]\n# Returns a DataFrame of shape (${df.shape[0]}, 2)`,
    commonMistakes: [
      "Using df.loc[:, 'revenue'] (single column, returns a Series, not a DataFrame).",
      "Confusing loc (label) with iloc (positional).",
    ],
    concept: "Feature",
    nextLessonId: "descriptive-stats",
  },

  {
    id: "m3-iloc",
    tier: "beginner",
    moduleId: "selection-filtering",
    question: "What does `df.iloc[0:5]` return on the Retail Sales dataset?",
    task: "Pick the correct description.",
    type: "mcq",
    options: [
      { value: "first5", label: "The first 5 rows (rows 0,1,2,3,4)" },
      { value: "first6", label: "The first 6 rows (rows 0,1,2,3,4,5)" },
      { value: "row5", label: "Only row at index 5" },
      { value: "last5", label: "The last 5 rows" },
    ],
    validator: (answer) => {
      const correct = answer === "first5";
      return {
        correct,
        explanation: correct
          ? `Correct — iloc[0:5] is half-open: includes index 0, 1, 2, 3, 4 but excludes 5. Returns the first 5 rows. This matches Python slice semantics.`
          : `Not quite. iloc[0:5] uses Python half-open slicing: includes indices 0,1,2,3,4 but excludes 5. So the result is the first 5 rows, not 6.`,
      };
    },
    hint: "Python slices are half-open: start is inclusive, stop is exclusive. iloc[0:5] = [0, 1, 2, 3, 4].",
    solution: `df.iloc[0:5]    # first 5 rows (indices 0..4)\ndf.iloc[:5]     # same thing\ndf.iloc[5]      # scalar — the 6th row (index 5) as a Series\ndf.iloc[-1]     # last row`,
    commonMistakes: [
      "Assuming iloc[0:5] returns 6 rows — it doesn't, slices are half-open.",
      "Confusing iloc (positional) with loc (label) — for a default RangeIndex they look the same, but they differ the moment you have a non-integer index.",
    ],
    concept: "Dataset",
    nextLessonId: "descriptive-stats",
  },

  {
    id: "m3-filter-count",
    tier: "intermediate",
    moduleId: "selection-filtering",
    question: "How many retail orders had revenue strictly greater than 200? Use `df[df['revenue'] > 200]`.",
    task: "Report the integer count of matching rows.",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === REVENUE_OVER_200;
      return {
        correct,
        explanation: correct
          ? `Correct — ${REVENUE_OVER_200} rows have revenue > 200.`
          : `Not quite. ${REVENUE_OVER_200} rows have revenue > 200, not ${answer}. You may have used >= (which would include rows with revenue == 200).`,
      };
    },
    hint: "Boolean indexing: df[mask] returns only rows where the mask is True. df['revenue'] > 200 produces the mask.",
    solution: `df[df["revenue"] > 200]\n# Or, more explicitly:\nmask = df["revenue"] > 200\ndf[mask]\n# Count: (df["revenue"] > 200).sum() → ${REVENUE_OVER_200}`,
    commonMistakes: [
      "Using df['revenue'] >= 200 — includes revenue == 200 too.",
      "Counting all rows where revenue is not null, instead of only those > 200.",
    ],
    concept: "Observation",
    nextLessonId: "descriptive-stats",
  },

  {
    id: "m3-loc-vs-iloc",
    tier: "intermediate",
    moduleId: "selection-filtering",
    question: "Which statement is correct about loc vs iloc?",
    task: "Pick the accurate statement.",
    type: "mcq",
    options: [
      { value: "loc-int", label: "loc is for integer positions; iloc is for labels." },
      { value: "iloc-int", label: "iloc is for integer positions; loc is for labels." },
      { value: "same", label: "They are interchangeable when the index is the default RangeIndex." },
      { value: "iloc-first", label: "iloc[0] always returns the first row; loc[0] might raise an error if 0 is not in the index." },
    ],
    validator: (answer) => {
      const correct = answer === "iloc-int";
      return {
        correct,
        explanation: correct
          ? `Correct — iloc uses integer positions (0, 1, 2...); loc uses labels (whatever the index actually is). When the index is the default RangeIndex, loc[0] and iloc[0] happen to refer to the same row, but that's a coincidence of the index, not the rule. If the index were ['a', 'b', 'c'], loc[0] would raise KeyError, and loc['a'] would work.`
          : `Not quite. The accurate statement is: iloc uses integer positions; loc uses labels. ${answer === "same" ? "'They are interchangeable' is the most common misconception — they coincide for the default RangeIndex but are conceptually different." : answer === "iloc-first" ? "'iloc[0] always returns the first row; loc[0] might raise' is half right — iloc[0] does return the first row, but the implication that loc[0] usually raises is misleading; loc[0] only raises when 0 is not in the index." : "loc is for labels, iloc for positions — the other way around from what you picked."}`,
      };
    },
    hint: "Think about a DataFrame whose index is ['alice', 'bob', 'carol']. Which selector uses 'alice'? Which uses 0?",
    solution: `# iloc → integer positions\ndf.iloc[0]        # first row, regardless of index labels\ndf.iloc[1:3]      # rows at positions 1 and 2\n\n# loc → labels\ndf.loc["alice"]   # row whose index LABEL is "alice"\ndf.loc[["alice", "bob"]]\n# When the index is the default RangeIndex (0..n-1):\n# loc[0] == iloc[0]  — but only because the labels HAPPEN to be integers.`,
    commonMistakes: [
      "Using .loc[5] expecting 'the fifth row' — it actually means 'the row whose label is 5'.",
      "Mixing loc and iloc chains (df.loc[5].iloc[2:5]) — chained indexing is fragile and Pandas will warn.",
    ],
    concept: "Dataset",
    nextLessonId: "descriptive-stats",
  },

  {
    id: "m3-join-multiplication",
    tier: "advanced",
    moduleId: "selection-filtering",
    question: "You merge orders (1,000 rows) onto customers (200 rows) on customer_id. The merge produces 1,200 rows instead of 1,000. What most likely happened?",
    task: "Pick the most likely cause.",
    type: "mcq",
    options: [
      { value: "outer", label: "You used how='outer' — outer joins always multiply rows." },
      { value: "many-to-many", label: "The join keys are many-to-many — both sides have repeated keys, causing a cartesian product on matching keys." },
      { value: "validate", label: "Pandas silently validated the join as one-to-one but doubled the rows anyway." },
      { value: "left", label: "You used how='left' — left joins always double the rows." },
    ],
    validator: (answer) => {
      const correct = answer === "many-to-many";
      return {
        correct,
        explanation: correct
          ? `Correct — when both sides have repeated keys for the same customer_id, Pandas performs a cartesian product on the matching rows. If customer X appears 2 times in orders and 3 times in customers, the merge produces 6 rows for X. Always validate your joins: use merge(..., validate='1:1' | '1:m' | 'm:1' | 'm:m') and check df.shape before/after.`
          : `Not quite. ${answer === "outer" ? "how='outer' keeps all rows from both sides but doesn't multiply — unmatched rows appear once with nulls. It doesn't create extra rows for matched keys." : answer === "left" ? "how='left' keeps every left row, with nulls for unmatched right keys — it doesn't double the row count either." : "Pandas does NOT silently validate joins — you have to ask it to with validate=... and it raises MergeError on violation."} The most likely cause is many-to-many: repeated keys on both sides cause a cartesian product on matching keys.`,
      };
    },
    hint: "Row multiplication in a merge is the signature of a many-to-many relationship. Validate your join with the `validate` argument to catch it.",
    solution: `# Always validate joins — don't guess the relationship.\nmerged = orders.merge(\n    customers,\n    on="customer_id",\n    how="inner",\n    validate="m:1",   # many orders → one customer\n)\n# If the merge raises MergeError, you know the keys don't match the\n# expected relationship. Inspect:\norders["customer_id"].value_counts().head()\ncustomers["customer_id"].value_counts().head()`,
    commonMistakes: [
      "Assuming a merge that produces more rows than the left side is a bug — sometimes it's correct (many-to-many), sometimes it's a silent data error.",
      "Skipping the validate= argument — without it, many-to-many merges run silently.",
    ],
    concept: "Dataset",
    nextLessonId: "descriptive-stats",
  },
];
