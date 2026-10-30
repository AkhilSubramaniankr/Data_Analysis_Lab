/**
 * Module 6 exercises — Correlation & Relationship Analysis.
 * Validators compute real values from the Marketing dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildMarketing } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const marketing = buildMarketing();
const df = DataFrame.fromRows(marketing.rows);

// Hoist expected values (used in both validator closures AND solution templates).
const AD_REVENUE_PEARSON = df.corrPair("advertising_spend", "revenue");
const AD_REVENUE_SPEARMAN = df.corrSpearmanPair("advertising_spend", "revenue");
const QUANTITY_REVENUE_PEARSON = df.corrPair("quantity", "revenue");
const PEARSON_MATRIX = df.corr();

export const MODULE6_EXERCISES: ExerciseSpec[] = [
  {
    id: "m6-pearson-range",
    tier: "beginner",
    moduleId: "correlation",
    question: "What is the valid range of the Pearson correlation coefficient?",
    task: "Pick the correct range.",
    type: "mcq",
    options: [
      { value: "0to1", label: "0 to 1 (strength only)" },
      { value: "neg1topos1", label: "-1 to +1 (sign + strength)" },
      { value: "0to100", label: "0 to 100 (percentage)" },
      { value: "any", label: "Any real number" },
    ],
    validator: (answer) => {
      const correct = answer === "neg1topos1";
      return {
        correct,
        explanation: correct
          ? "Correct — Pearson r is in [-1, +1]. -1 = perfect negative linear association; +1 = perfect positive linear; 0 = no linear association. The sign shows direction, the magnitude shows strength."
          : "Not quite. Pearson r is in [-1, +1]. The sign shows direction (positive/negative), the magnitude shows strength (0 = no linear association, 1 = perfect linear). It is never a percentage or any real number.",
      };
    },
    hint: "Think about both direction and strength: the sign handles direction, the magnitude handles strength. What interval captures both?",
    solution: `# Verify on the actual data:\ndf["advertising_spend"].corr(df["revenue"])  # → ${AD_REVENUE_PEARSON.toFixed(3)}\n# In [-1, +1] always.`,
    commonMistakes: [
      "Treating r as a percentage (e.g., 'r = 0.6 means 60% correlation'). It's not — r is a dimensionless coefficient.",
      "Forgetting the sign: r = -0.8 is a strong NEGATIVE correlation, not a weak one.",
    ],
    concept: "Correlation",
    nextLessonId: "eda-business",
  },

  {
    id: "m6-pearson-vs-spearman",
    tier: "intermediate",
    moduleId: "correlation",
    question: "When would Spearman rank correlation give a very different value from Pearson?",
    task: "Pick the correct scenario.",
    type: "mcq",
    options: [
      { value: "linear", label: "When the relationship is perfectly linear." },
      { value: "nonlinear-monotonic", label: "When the relationship is monotonic but nonlinear (e.g., y = x³ over x > 0)." },
      { value: "binary", label: "When both variables are binary." },
      { value: "constant", label: "When one variable is constant." },
    ],
    validator: (answer) => {
      const correct = answer === "nonlinear-monotonic";
      return {
        correct,
        explanation: correct
          ? "Correct — Pearson measures linear association; Spearman measures monotonic association (using ranks). When the relationship is monotonic but nonlinear (e.g., exponential growth, x³), Pearson underestimates the strength while Spearman captures it. On our marketing data, advertising_spend vs revenue: Pearson = " + AD_REVENUE_PEARSON.toFixed(3) + ", Spearman = " + AD_REVENUE_SPEARMAN.toFixed(3) + " — the gap is small because the relationship is approximately linear."
          : "Not quite. For a perfectly linear relationship, Pearson and Spearman are equal. For binary or constant variables, one or both are undefined. The right answer is monotonic-but-nonlinear: Pearson misses it, Spearman catches it because it works on ranks.",
      };
    },
    hint: "Pearson fits a straight line. Spearman works on ranks. What kind of relationship ranks reveal but lines miss?",
    solution: `# Compare on the marketing data:\ndf["advertising_spend"].corr(df["revenue"], method="pearson")   # ${AD_REVENUE_PEARSON.toFixed(3)}\ndf["advertising_spend"].corr(df["revenue"], method="spearman")  # ${AD_REVENUE_SPEARMAN.toFixed(3)}\n# A big gap ⇒ nonlinear. A small gap ⇒ approximately linear.`,
    commonMistakes: [
      "Assuming Pearson is always the right default — for nonlinear monotonic relationships it underestimates the strength.",
      "Reporting Pearson without checking Spearman — they tell you different things; report both.",
    ],
    concept: "Correlation",
    nextLessonId: "eda-business",
  },

  {
    id: "m6-confounder",
    tier: "intermediate",
    moduleId: "correlation",
    question: "On the marketing dataset, advertising_spend and revenue are positively correlated. Does this prove advertising causes revenue?",
    task: "Pick the correct interpretation.",
    type: "mcq",
    options: [
      { value: "yes", label: "Yes — a high correlation implies causation when r is large enough." },
      { value: "no-confounder", label: "No — holiday_week is a confounder that drives both advertising and revenue independently." },
      { value: "no-sampling", label: "No — correlation is never meaningful on sampled data." },
      { value: "no-pearson", label: "No — Pearson is biased; only Spearman can imply causation." },
    ],
    validator: (answer) => {
      const correct = answer === "no-confounder";
      return {
        correct,
        explanation: correct
          ? "Correct — the marketing dataset has a deliberate confounder: holiday_week drives up BOTH advertising_spend and revenue independently. The high overall correlation conflates the direct effect of advertising with the indirect effect of holidays. Stratifying by holiday_week would give a more honest estimate. Correlation alone NEVER proves causation."
          : "Not quite. Correlation is meaningful on sampled data, and neither Pearson nor Spearman implies causation. The right reason is that holiday_week is a confounder driving both variables — stratify to isolate the direct effect.",
      };
    },
    hint: "Look at the columns of the marketing dataset. Is there a third variable that could influence both advertising and revenue?",
    solution: `# Stratify by the confounder and recompute:\nfor is_holiday in [True, False]:\n    sub = df[df["holiday_week"] == is_holiday]\n    r = sub["advertising_spend"].corr(sub["revenue"])\n    print(f"holiday_week={is_holiday}: r={r:.3f}")\n# Compare with the overall r = ${AD_REVENUE_PEARSON.toFixed(3)}.`,
    commonMistakes: [
      "Treating high correlation as evidence of causation — it is not, ever.",
      "Forgetting to check for confounders before drawing conclusions.",
    ],
    concept: "Correlation",
    nextLessonId: "eda-business",
  },

  {
    id: "m6-multicollinearity",
    tier: "advanced",
    moduleId: "correlation",
    question: "Two features in your model have a Pearson correlation of 0.97. What is the most likely consequence?",
    task: "Pick the most accurate description.",
    type: "mcq",
    options: [
      { value: "stability", label: "No consequence — high correlation is desirable in features." },
      { value: "instability", label: "Multicollinearity: coefficient estimates become unstable and individual feature attribution is unreliable." },
      { value: "leakage", label: "Target leakage — the model will overfit." },
      { value: "drop", label: "Pandas will refuse to fit the model." },
    ],
    validator: (answer) => {
      const correct = answer === "instability";
      return {
        correct,
        explanation: correct
          ? "Correct — high inter-feature correlation (|r| > 0.8 is a common threshold) is multicollinearity. Linear-model coefficient estimates become unstable (small data changes → big coefficient changes), and individual feature attribution is unreliable. Tree models tolerate it better. Diagnose with the correlation matrix, VIF, or condition number."
          : "Not quite. High feature correlation is multicollinearity — coefficient estimates become unstable. It is NOT target leakage (that requires the target itself). Pandas doesn't refuse — it just runs and produces unstable coefficients.",
      };
    },
    hint: "Multicollinearity is about feature-vs-feature correlation. It affects coefficient stability, not predictive power.",
    solution: `# Diagnose multicollinearity:\ncorr_matrix = df.corr()\n# Find high-correlation pairs (off-diagonal):\nhigh_corr = []\nfor i, c1 in enumerate(corr_matrix.columns):\n    for j, c2 in enumerate(corr_matrix.columns):\n        if i < j and abs(corr_matrix.iloc[i, j]) > 0.8:\n            high_corr.append((c1, c2, corr_matrix.iloc[i, j]))\n# Or use Variance Inflation Factor (VIF):\nfrom statsmodels.stats.outliers_influence import variance_inflation_factor`,
    commonMistakes: [
      "Confusing multicollinearity with target leakage — they're different problems.",
      "Dropping one of the correlated features without checking VIF or domain knowledge.",
    ],
    concept: "Multicollinearity",
    nextLessonId: "eda-business",
  },

  {
    id: "m6-corr-pair",
    tier: "advanced",
    moduleId: "correlation",
    question: `What is the Pearson correlation between advertising_spend and revenue in the marketing dataset? (Round to 2 decimals.)`,
    task: "Report r as a decimal (e.g., 0.42).",
    type: "text",
    validator: (answer) => {
      const expected = +AD_REVENUE_PEARSON.toFixed(2);
      const n = Number(answer.replace(/[^0-9.-]/g, ""));
      const correct = Math.abs(n - expected) < 0.05;
      return {
        correct,
        explanation: correct
          ? `Correct — df["advertising_spend"].corr(df["revenue"]) = ${expected}.`
          : `Not quite. df["advertising_spend"].corr(df["revenue"]) = ${expected}. You answered ${answer}.`,
      };
    },
    hint: "Use df['advertising_spend'].corr(df['revenue']) — Pandas defaults to Pearson.",
    solution: `df["advertising_spend"].corr(df["revenue"])  # → ${AD_REVENUE_PEARSON.toFixed(2)}\n# Spearman:\ndf["advertising_spend"].corr(df["revenue"], method="spearman")  # → ${AD_REVENUE_SPEARMAN.toFixed(2)}`,
    commonMistakes: [
      "Using df.corr() without subsetting — returns the full matrix.",
      "Reporting the absolute value — the sign matters.",
    ],
    concept: "Correlation",
    nextLessonId: "eda-business",
  },
];
