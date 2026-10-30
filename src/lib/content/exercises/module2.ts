/**
 * Module 2 exercises — Data Quality & Cleaning.
 * Validators compute real values from the messy retail dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildMessyRetail } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const messy = buildMessyRetail();
const df = DataFrame.fromRows(messy.rows);

// Hoist expected values to module top-level so they can be used in
// both the validator closures AND the solution template strings.
const NULL_CUSTOMER_IDS = df.isnaCount().customer_id ?? 0;
const FULL_ROW_DUPLICATES = df.countDuplicates();

export const MODULE2_EXERCISES: ExerciseSpec[] = [
  {
    id: "m2-null-count",
    tier: "beginner",
    moduleId: "data-quality",
    question: "How many missing customer_id values are in the messy dataset? Use `df['customer_id'].isna().sum()`.",
    task: "Report the integer count of nulls in customer_id.",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === NULL_CUSTOMER_IDS;
      return {
        correct,
        explanation: correct
          ? `Correct — ${NULL_CUSTOMER_IDS} missing customer_id values. You can verify: df["customer_id"].isna().sum() returns ${NULL_CUSTOMER_IDS}.`
          : `Not quite. df["customer_id"].isna().sum() returns ${NULL_CUSTOMER_IDS}, not ${answer}. Re-check your filter — nulls only, not non-nulls.`,
      };
    },
    hint: "isna() returns a Boolean mask of where the value is null. .sum() on a Boolean series counts True values (True = 1).",
    solution: `df["customer_id"].isna().sum()  # → ${NULL_CUSTOMER_IDS}\n# or, equivalently:\ndf["customer_id"].isnull().sum()`,
    commonMistakes: [
      "Using df.isna().sum() — returns null counts per column, not a single number.",
      "Counting non-nulls instead of nulls — use isna(), not notna().",
    ],
    concept: "Missing value",
    nextLessonId: "selection-filtering",
  },

  {
    id: "m2-duplicate-count",
    tier: "beginner",
    moduleId: "data-quality",
    question: "How many FULL-ROW duplicates are in the messy dataset? (i.e., rows beyond the first that are entirely identical to an earlier row.)",
    task: "Report the integer count.",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === FULL_ROW_DUPLICATES;
      return {
        correct,
        explanation: correct
          ? `Correct — ${FULL_ROW_DUPLICATES} full-row duplicates. df.duplicated().sum() returns ${FULL_ROW_DUPLICATES}.`
          : `Not quite. df.duplicated().sum() returns ${FULL_ROW_DUPLICATES}, not ${answer}. Note: this counts only rows BEYOND the first occurrence of each duplicate group.`,
      };
    },
    hint: "duplicated() returns a Boolean mask where True means 'this row is a duplicate of an earlier row'. Sum the True values.",
    solution: `df.duplicated().sum()  # → ${FULL_ROW_DUPLICATES}\n# To inspect the actual duplicate rows:\ndf[df.duplicated(keep=False)]  # keep=False shows ALL copies`,
    commonMistakes: [
      "Confusing df.duplicated() with df.duplicated(subset=['order_id']) — the latter counts subset duplicates.",
      "Counting rows in df[df.duplicated()] (which is the same as .sum() but inefficient for large frames).",
    ],
    concept: "Data type",
    nextLessonId: "selection-filtering",
  },

  {
    id: "m2-returns-decision",
    tier: "intermediate",
    moduleId: "data-quality",
    question: "You discover 4 rows with quantity < 0 in the messy retail dataset. What is the correct cleaning decision?",
    task: "Pick the policy that respects business meaning.",
    type: "mcq",
    options: [
      { value: "drop", label: "Drop the rows with quantity < 0 — they are clearly errors." },
      { value: "abs", label: "Take the absolute value of quantity — negative numbers break the schema." },
      { value: "indicator", label: "Keep the rows; add an is_return indicator column for downstream analysis." },
      { value: "impute-zero", label: "Replace negative quantities with 0 — neutralises them without losing rows." },
    ],
    validator: (answer) => {
      const correct = answer === "indicator";
      return {
        correct,
        explanation: correct
          ? `Correct — negative quantities in a retail dataset are almost always RETURNS. They are legitimate revenue reversals, not errors. Dropping them silently erases returns and inflates every revenue/profit metric. Taking abs() turns returns into fake sales. Imputing zero destroys the signal. The right move is to keep the rows and add an is_return indicator column for downstream analysis.`
          : `Not quite. ${answer === "drop" ? "Dropping the rows silently erases returns and inflates every metric." : answer === "abs" ? "Taking abs() turns returns into fake sales — the revenue column would also have to be negated, which is a different choice you haven't made." : "Imputing zero destroys the signal — downstream code can no longer tell returns from new orders."} The correct move is to keep the rows and add an is_return = (quantity < 0) indicator column.`,
      };
    },
    hint: "Think about the business meaning: in retail, what does a negative quantity usually mean?",
    solution: `# Returns are real business events — do not drop them.\ndf["is_return"] = df["quantity"] < 0\n\n# If you need to model revenue without returns, FILTER rather than DROP:\ndf_clean = df[~df["is_return"]]\n# Document the choice: "excludes returns".`,
    commonMistakes: [
      "Auto-dropping 'negative values' without checking what they mean — silent data loss.",
      "Taking absolute values — turns returns into fake sales, double-counts revenue.",
      "Imputing zero without an indicator — destroys the signal entirely.",
    ],
    concept: "Missing value",
    nextLessonId: "selection-filtering",
  },

  {
    id: "m2-imputation-tradeoff",
    tier: "intermediate",
    moduleId: "data-quality",
    question: "You decide to fill missing profit values with the median profit. What is the main downside of this approach?",
    task: "Pick the most accurate description.",
    type: "mcq",
    options: [
      { value: "memory", label: "It increases memory usage because the column becomes float64." },
      { value: "variance", label: "It shrinks the variance of the profit column, biasing downstream models." },
      { value: "speed", label: "It is computationally expensive — O(n log n) per column." },
      { value: "type", label: "It changes the dtype from float64 to object." },
    ],
    validator: (answer) => {
      const correct = answer === "variance";
      return {
        correct,
        explanation: correct
          ? `Correct — filling missing values with a single statistic (mean, median, or mode) shrinks the variance of the column: the more rows you impute, the more the distribution concentrates around the imputed value. This biases downstream models and inflates apparent predictability. Prefer (a) a missing-value indicator column so the model can learn that the value was imputed, (b) group-based imputation (median per category), or (c) model-based imputation — and ALWAYS fit imputation on the training fold only.`
          : `Not quite. Memory and dtype are unaffected. Speed is O(n) — negligible. The real problem is variance shrinkage: filling many rows with the same number flattens the distribution and biases any model trained on it.`,
      };
    },
    hint: "Think about what happens to a column's distribution when many of its missing values are replaced by the same number.",
    solution: `# Variance-shrinkage-safe imputation:\nfrom sklearn.impute import SimpleImputer\n# Add a 'was missing' indicator:\ndf["profit_is_missing"] = df["profit"].isna()\n# Group-based imputation (more honest than a single global median):\ndf["profit"] = df.groupby("category")["profit"].transform(\n    lambda s: s.fillna(s.median())\n)`,
    commonMistakes: [
      "Imputing without a missing-indicator column — the model can't distinguish real from imputed values.",
      "Imputing on the full dataset before splitting — leakage! Fit imputation on the training fold only.",
    ],
    concept: "Imputation",
    nextLessonId: "selection-filtering",
  },

  {
    id: "m2-casing-fix",
    tier: "advanced",
    moduleId: "data-quality",
    question: "The category column has values 'apparel', 'APPAREL', 'Apparel', 'accessories', 'Accessories'. Write the Pandas one-liner to normalise casing to titlecase AND strip whitespace.",
    task: "Provide the code (the right side of the assignment).",
    type: "code",
    validator: (answer) => {
      const a = answer.toLowerCase().replace(/\s+/g, "");
      const hasStrip = a.includes("str.strip()");
      const hasTitle = a.includes("str.title()");
      const correct = hasStrip && hasTitle && a.includes('category') && a.includes('=');
      return {
        correct,
        explanation: correct
          ? `Correct — df["category"] = df["category"].str.strip().str.title() strips whitespace first, then titlecases. The chain is read left-to-right: strip → title.`
          : `Not quite. The right one-liner is: df["category"] = df["category"].str.strip().str.title(). Strip first (to remove trailing whitespace), then titlecase (so 'APPAREL' becomes 'Apparel'). You can also use .str.lower() if your convention is lowercase — the key is to pick one and apply it everywhere.`,
      };
    },
    hint: "str.strip() removes leading/trailing whitespace. str.title() titlecases each word. Chain them in the right order.",
    solution: `df["category"] = df["category"].str.strip().str.title()\n# Verify:\ndf["category"].value_counts()\n#  Apparel        62\n#  Accessories    47\n#  ...`,
    commonMistakes: [
      "Calling str.title() before str.strip() — leaves leading/trailing whitespace that breaks joins.",
      "Forgetting to assign back to df['category'] — the column won't change.",
      "Using replace() with one variant at a time — error-prone; casing methods are cleaner.",
    ],
    concept: "Data type",
    nextLessonId: "selection-filtering",
  },
];
