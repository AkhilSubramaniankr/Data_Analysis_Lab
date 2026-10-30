/**
 * Module 11 exercises — Binning & Discretization.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

const REVENUE_DESC = df.describe().find((d) => d.column === "revenue")!;
const REVENUE_BINS_5 = df.cutEqualWidth("revenue", 5);
const REVENUE_BINS_5_COUNTS = REVENUE_BINS_5.valueCounts("revenue_cut_bin");
const QBINS_5 = df.cutEqualFreq("revenue", 5);
const QBINS_5_COUNTS = QBINS_5.valueCounts("revenue_qcut_bin");

export const MODULE11_EXERCISES: ExerciseSpec[] = [
  {
    id: "m11-cut-vs-qcut",
    tier: "beginner",
    moduleId: "binning",
    question: "What is the difference between pd.cut and pd.qcut?",
    task: "Pick the correct distinction.",
    type: "mcq",
    options: [
      { value: "same", label: "They are identical; both create equal-width bins." },
      { value: "width-vs-freq", label: "pd.cut creates equal-WIDTH bins; pd.qcut creates equal-FREQUENCY (quantile) bins." },
      { value: "int-vs-str", label: "pd.cut returns integer bins; pd.qcut returns string labels." },
      { value: "na-vs-non", label: "pd.cut handles NaN; pd.qcut doesn't." },
    ],
    validator: (answer) => {
      const correct = answer === "width-vs-freq";
      return {
        correct,
        explanation: correct
          ? "Correct — pd.cut divides the range into bins of equal width (good when the data is roughly uniform); pd.qcut divides into bins of equal frequency (each bin has roughly the same number of rows — good for skewed data). On the retail revenue column (long-tailed), pd.cut puts ~most rows in one bin, while pd.qcut spreads them evenly."
          : "Not quite. The two are different: cut = equal-width, qcut = equal-frequency (quantile). Both return the same dtype; both handle NaN by labelling them <NA>.",
      };
    },
    hint: "Width vs frequency — that's the whole distinction.",
    solution: `pd.cut(df["revenue"], bins=5)     # 5 equal-width bins — most rows in one bin for skewed data\npd.qcut(df["revenue"], q=5)       # 5 equal-frequency bins — ~equal row counts`,
    commonMistakes: [
      "Using cut for skewed data — one bin ends up with ~all the rows.",
      "Forgetting duplicates='drop' on qcut when the data has many repeated quantile edges.",
    ],
    concept: "Discretization",
    nextLessonId: "scaling",
  },

  {
    id: "m11-qcut-duplicate-edges",
    tier: "intermediate",
    moduleId: "binning",
    question: "When you call pd.qcut with bins=5 and the column has many repeated values, what happens?",
    task: "Pick the correct behaviour.",
    type: "mcq",
    options: [
      { value: "raise", label: "Raises a ValueError and stops execution." },
      { value: "drop", label: "With duplicates='drop', it silently drops duplicate quantile edges and produces fewer bins. Without it, raises a ValueError." },
      { value: "five", label: "Always produces 5 bins regardless." },
      { value: "skip", label: "Drops rows with duplicate values." },
    ],
    validator: (answer) => {
      const correct = answer === "drop";
      return {
        correct,
        explanation: correct
          ? "Correct — pd.qcut with bins=5 on a column with many repeated quantile edges (e.g., heavy-tied integer data) raises ValueError('Bin edges must be unique'). duplicates='drop' silently drops the duplicate edges, producing fewer bins. The number of effective bins depends on how many duplicates there are."
          : "Not quite. qcut raises by default on duplicate edges; duplicates='drop' silently produces fewer bins. It never drops rows and never produces 5 bins if duplicates prevent it.",
      };
    },
    hint: "qcut raises on duplicate quantile edges by default. Use duplicates='drop' to silently produce fewer bins.",
    solution: `pd.qcut(df["age"], q=5, duplicates="drop")\n# May produce fewer than 5 bins if the data has many tied quantile edges.\n# Always check the result:\nprint(df["age_q"].nunique())  # may be < 5`,
    commonMistakes: [
      "Hard-coding the bin count downstream — qcut with duplicates='drop' may produce fewer bins than requested.",
      "Forgetting to check the actual bin count — surprises downstream.",
    ],
    concept: "Quantile",
    nextLessonId: "scaling",
  },

  {
    id: "m11-tree-no-binning",
    tier: "intermediate",
    moduleId: "binning",
    question: "You bin a continuous feature and feed the binned version to a RandomForest. What's the most likely effect?",
    task: "Pick the most likely outcome.",
    type: "mcq",
    options: [
      { value: "better", label: "The model performs BETTER because binning reduces noise." },
      { value: "worse", label: "The model performs WORSE or the same — tree models already discretize internally via splits; binning removes information they could use." },
      { value: "fail", label: "The model crashes — RandomForest cannot accept binned features." },
      { value: "faster", label: "Training is much faster." },
    ],
    validator: (answer) => {
      const correct = answer === "worse";
      return {
        correct,
        explanation: correct
          ? "Correct — tree-based models (RandomForest, XGBoost, LightGBM) discretize continuous features internally via splits. Pre-binning the feature can only lose information the model would otherwise use; at best it's neutral, at worst it's harmful. Binning is useful for linear models when the relationship is genuinely non-monotonic, or for human-readable reporting."
          : "Not quite. Tree models don't need binning — they split internally. Pre-binning typically loses information without any speed benefit (the tree just splits on the bin index instead of the raw value).",
      };
    },
    hint: "Tree models discretize internally. Pre-binning can only lose information.",
    solution: `# For tree-based models — keep the continuous feature raw:\ndf["age_raw"] = df["age"]  # raw\n# For linear models with non-monotonic relationships:\ndf["age_binned"] = pd.cut(df["age"], bins=5, labels=False)\n# Then compare CV scores with raw vs binned.`,
    commonMistakes: [
      "Bin-then-tree — almost always loses information. Tree models already split internally.",
      "Bin-then-linear without checking — binning is sometimes good for non-monotonic relationships; verify with CV.",
    ],
    concept: "Discretization",
    nextLessonId: "scaling",
  },

  {
    id: "m11-domain-bins",
    tier: "advanced",
    moduleId: "binning",
    question: "You want to bin customer age into youth (0-25), adult (25-65), senior (65+). Which Pandas call achieves this?",
    task: "Pick the correct call.",
    type: "mcq",
    options: [
      { value: "right", label: "pd.cut(df['age'], bins=[0, 25, 65, 200], labels=['youth', 'adult', 'senior'], include_lowest=True, right=True)" },
      { value: "no-labels", label: "pd.cut(df['age'], bins=[0, 25, 65], labels=False)" },
      { value: "qcut", label: "pd.qcut(df['age'], q=3, labels=['youth', 'adult', 'senior'])" },
      { value: "manual", label: "df['age'].map({0: 'youth', 1: 'adult', 2: 'senior'})" },
    ],
    validator: (answer) => {
      const correct = answer === "right";
      return {
        correct,
        explanation: correct
          ? "Correct — the right call uses explicit edges [0, 25, 65, 200] (the 200 captures '65 and above' as the upper edge), labels matching the 3 bins, include_lowest=True to include the lowest edge (age 0), and right=True (default) so bins are (lo, hi] except the first which is [lo, hi]."
          : "Not quite. qcut would bin by quantile, not by domain threshold. Without labels, you'd get integer bin codes. map() requires pre-coded integer values, not a continuous column.",
      };
    },
    hint: "Three bins need four edges. Use explicit edges + labels. include_lowest=True for the lowest bin.",
    solution: `df["age_group"] = pd.cut(\n    df["age"],\n    bins=[0, 25, 65, 200],  # 4 edges for 3 bins\n    labels=["youth", "adult", "senior"],\n    include_lowest=True,\n    right=True,  # bins are (lo, hi]; first bin is [0, 25]\n)`,
    commonMistakes: [
      "Forgetting include_lowest — the lowest edge (age 0) becomes NaN.",
      "Using bins=[0, 25, 65] for 3 bins — that's 2 bins, not 3 (you need one more edge than labels).",
      "Using qcut for domain thresholds — qcut bins by quantile, not by user-defined boundaries.",
    ],
    concept: "Discretization",
    nextLessonId: "scaling",
  },

  {
    id: "m11-information-loss",
    tier: "advanced",
    moduleId: "binning",
    question: "You bin a 1000-row continuous feature into 5 bins. Approximately how many distinct values does the binned column have?",
    task: "Pick the correct count.",
    type: "text",
    validator: (answer) => {
      const correct = String(answer.replace(/[^0-9]/g, "")) === "5";
      return {
        correct,
        explanation: correct
          ? "Correct — binning collapses the continuous feature to (at most) 5 distinct bin labels. The original 1000-row column had up to 1000 distinct values; the binned column has ≤5. That's the information loss — binning is a lossy transformation. Use it when interpretability matters more than precision, or when the relationship is genuinely non-monotonic and the bins capture the shape."
          : "Not quite. Binning into 5 bins produces at most 5 distinct values (possibly fewer if some bins are empty). That's the information loss — the original had up to 1000 distinct values.",
      };
    },
    hint: "5 bins = at most 5 distinct values. That's the information loss.",
    solution: `df["binned"] = pd.cut(df["feature"], bins=5)\ndf["binned"].nunique()  # ≤ 5 (could be fewer if some bins are empty)\n# Compare to the original:\ndf["feature"].nunique()  # up to 1000`,
    commonMistakes: [
      "Forgetting that binning is lossy — the model loses the ability to distinguish values within a bin.",
      "Bin-and-tree — see above; tree models don't need pre-binning.",
    ],
    concept: "Discretization",
    nextLessonId: "scaling",
  },
];
