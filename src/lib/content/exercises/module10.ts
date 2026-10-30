/**
 * Module 10 exercises — Categorical Encoding.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildEmployeeAnalytics } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const employees = buildEmployeeAnalytics();
const df = DataFrame.fromRows(employees.rows);

const DEPARTMENT_CARDINALITY = df.nunique("department");
const DEPARTMENTS = [...new Set(df.column("department").filter((v): v is string => typeof v === "string"))];

export const MODULE10_EXERCISES: ExerciseSpec[] = [
  {
    id: "m10-onehot-col-count",
    tier: "beginner",
    moduleId: "categorical-encoding",
    question: `The department column has ${DEPARTMENT_CARDINALITY} distinct values. How many new columns does pd.get_dummies(df, columns=['department']) produce?`,
    task: "Report the integer count of new columns.",
    type: "text",
    validator: (answer) => {
      const expected = DEPARTMENT_CARDINALITY;
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === expected;
      return {
        correct,
        explanation: correct
          ? `Correct — pd.get_dummies creates k columns for k distinct values: ${expected} new columns named department_${DEPARTMENTS[0]}, department_${DEPARTMENTS[1]}, ...`
          : `Not quite. k = ${expected} distinct values → k = ${expected} new columns. You answered ${answer}.`,
      };
    },
    hint: "One-hot produces k columns for k distinct values (one indicator column per category).",
    solution: `pd.get_dummies(df, columns=["department"])  # adds ${DEPARTMENT_CARDINALITY} new boolean columns`,
    commonMistakes: [
      "Confusing with dummy encoding (k-1) — dummy drops one as reference.",
      "Counting the original column too — get_dummies replaces the original; it doesn't keep both.",
    ],
    concept: "One-hot encoding",
    nextLessonId: "binning",
  },

  {
    id: "m10-dummy-drop",
    tier: "beginner",
    moduleId: "categorical-encoding",
    question: "What does pd.get_dummies(df, columns=['department'], drop_first=True) do?",
    task: "Pick the correct description.",
    type: "mcq",
    options: [
      { value: "dropna", label: "Drops rows with missing department values." },
      { value: "kminus1", label: "Creates k-1 columns (drops the first category as reference) to avoid perfect multicollinearity with the intercept." },
      { value: "dropcol", label: "Drops the original department column entirely." },
      { value: "sort", label: "Sorts the dummy columns alphabetically." },
    ],
    validator: (answer) => {
      const correct = answer === "kminus1";
      return {
        correct,
        explanation: correct
          ? "Correct — drop_first=True drops the first-seen category as a reference, producing k-1 columns. This avoids perfect multicollinearity with the intercept in linear models (if you have all k dummies + an intercept, the dummies sum to 1 — the design matrix is rank-deficient)."
          : "Not quite. drop_first drops one CATEGORY (the first-seen), not rows or the original column. The point is to produce k-1 columns to avoid perfect multicollinearity with the intercept.",
      };
    },
    hint: "drop_first=True → k-1 columns. Why? To avoid multicollinearity with the intercept in linear models.",
    solution: `pd.get_dummies(df, columns=["department"], drop_first=True)\n# ${DEPARTMENT_CARDINALITY - 1} new columns; the first category becomes the reference.\n# Coefficients are relative to the reference category.`,
    commonMistakes: [
      "Using drop_first=True for tree models — unnecessary, and loses one bit of information.",
      "Forgetting which category was the reference — keep a record or use a fixed category order.",
    ],
    concept: "Dummy variables",
    nextLessonId: "binning",
  },

  {
    id: "m10-ordinal-warning",
    tier: "intermediate",
    moduleId: "categorical-encoding",
    question: "You ordinal-encode a 'city' column (k=50 distinct cities) to integer codes 0..49 and use the codes as a feature in linear regression. What's the main risk?",
    task: "Pick the most accurate risk.",
    type: "mcq",
    options: [
      { value: "memory", label: "Memory usage will explode." },
      { value: "false-order", label: "Linear regression treats the integer codes as real numbers and infers a false ordering (city 47 > city 12 > city 0), which is meaningless for nominal categories." },
      { value: "missing", label: "Cities with no rows will crash the encoder." },
      { value: "speed", label: "Linear regression will run too slowly." },
    ],
    validator: (answer) => {
      const correct = answer === "false-order";
      return {
        correct,
        explanation: correct
          ? "Correct — ordinal/label encoding implies a false ordering for nominal categories. Linear regression (and any distance/gradient-based model) treats the integer codes as real numbers, inferring that city 47 > city 12 > city 0 — meaningless for cities. Tree-based models tolerate ordinal codes because they split, not multiply. For linear/distance-based models, use one-hot or target encoding instead."
          : "Not quite. Memory and speed are unaffected. The real issue is that integer codes imply a false ordering — linear regression takes them literally and produces meaningless coefficients.",
      };
    },
    hint: "Linear regression takes integer codes as real numbers. For nominal categories, codes 0..k-1 imply a false ordering.",
    solution: `# For linear / distance / gradient-based models — use one-hot or target:\nfrom sklearn.preprocessing import OneHotEncoder\nenc = OneHotEncoder(handle_unknown="ignore", sparse_output=False)\nenc.fit(df_train[["city"]])\n# Or for high-cardinality (>20): target encoding (leakage-safe).\n\n# Ordinal codes are OK for tree-based models:\ncodes, _ = pd.factorize(df["city"])`,
    commonMistakes: [
      "Using factorize / LabelEncoder indiscriminately — fine for tree models, problematic for linear/distance-based.",
      "Confusing label encoding (for features) with target encoding (a different technique).",
    ],
    concept: "Feature transformation",
    nextLessonId: "binning",
  },

  {
    id: "m10-target-leakage",
    tier: "advanced",
    moduleId: "categorical-encoding",
    question: "You target-encode a categorical feature using the mean of the target per category. You compute the means on the FULL dataset (train + test) before splitting. What's the consequence?",
    task: "Pick the most accurate consequence.",
    type: "mcq",
    options: [
      { value: "none", label: "No consequence — target encoding is leakage-safe." },
      { value: "leakage", label: "Target leakage: the test target values influenced the encoded features. Cross-validation scores will be inflated and the model will perform worse on truly unseen data." },
      { value: "speed", label: "The encoder will run slower." },
      { value: "memory", label: "Memory usage will double." },
    ],
    validator: (answer) => {
      const correct = answer === "leakage";
      return {
        correct,
        explanation: correct
          ? "Correct — computing target means on the full dataset (train + test) is target leakage. The test target values influenced the encoded features, so cross-validation scores are inflated. The fix: compute category means on TRAIN ONLY, then map them onto the test rows (with global-mean fallback for unseen categories). scikit-learn 1.4+ has TargetEncoder that does this for you."
          : "Not quite. Target encoding is leakage-prone — the means MUST be computed on training rows only. Computing on the full dataset (train + test) leaks the test target into features.",
      };
    },
    hint: "If the encoded feature uses test target values, the model has seen the test target during training. That's leakage.",
    solution: `# Leakage-safe target encoding:\nfrom sklearn.model_selection import train_test_split\ntrain, test = train_test_split(df, test_size=0.3, random_state=42)\n\n# Compute means on TRAIN ONLY\nmeans = train.groupby("category")["target"].mean()\nglobal_mean = train["target"].mean()\n\n# Apply to BOTH splits (use train mapping + global fallback)\ntrain["cat_enc"] = train["category"].map(means).fillna(global_mean)\ntest["cat_enc"]  = test["category"].map(means).fillna(global_mean)\n\n# scikit-learn 1.4+ does this for you:\nfrom sklearn.preprocessing import TargetEncoder\nenc = TargetEncoder()\nenc.fit_transform(train[["category"]], train["target"])`,
    commonMistakes: [
      "Computing target means on the full dataset before splitting — classic leakage.",
      "Forgetting the global-mean fallback for unseen test categories — produces NaN.",
    ],
    concept: "Data leakage",
    nextLessonId: "binning",
  },

  {
    id: "m10-high-cardinality-strategy",
    tier: "advanced",
    moduleId: "categorical-encoding",
    question: "You have a 'product_id' column with k=5000 distinct values. You're training a logistic regression. Which encoding is the LEAST suitable?",
    task: "Pick the worst choice.",
    type: "mcq",
    options: [
      { value: "onehot-bad", label: "One-hot encoding — creates 5000 sparse columns, blowing up dimensionality." },
      { value: "target-good", label: "Target encoding — collapses 5000 categories to a single column with the per-category target mean." },
      { value: "freq-ok", label: "Frequency encoding — collapses 5000 categories to a single column with the per-category frequency." },
      { value: "drop", label: "Drop the column — product_id may be a near-identifier with no predictive value." },
    ],
    validator: (answer) => {
      const correct = answer === "onehot-bad";
      return {
        correct,
        explanation: correct
          ? "Correct — one-hot on a 5000-cardinality column creates 5000 sparse columns. Logistic regression will be slow and prone to overfitting. Target encoding (leakage-safe!) or frequency encoding collapse to a single column. Dropping is also reasonable if product_id is a near-identifier."
          : "Not quite. Target, frequency, and dropping are all reasonable for high-cardinality features. The worst choice is one-hot — 5000 sparse columns blow up dimensionality and slow down training.",
      };
    },
    hint: "5000 distinct values × one-hot = 5000 columns. Logistic regression with 5000 sparse features is a disaster.",
    solution: `# High-cardinality feature: 5000 distinct product_ids\n# AVOID: pd.get_dummies — 5000 sparse columns\n# PREFER:\n# 1. Target encoding (leakage-safe) — single column with category-mean\n# 2. Frequency encoding — single column with category frequency\n# 3. Drop product_id if it's a near-identifier`,
    commonMistakes: [
      "Defaulting to one-hot for every categorical — fine for low-cardinality, disastrous for high-cardinality.",
      "Forgetting to consider whether the high-cardinality feature carries predictive signal at all (identifiers usually don't).",
    ],
    concept: "One-hot encoding",
    nextLessonId: "binning",
  },
];
