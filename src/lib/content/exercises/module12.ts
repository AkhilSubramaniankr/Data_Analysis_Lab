/**
 * Module 12 exercises — Feature Scaling.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { mean, std } from "@/lib/data/stats";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

const REVENUE_MEAN = mean(df.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v)));
const REVENUE_STD = std(df.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v)));
const REVENUE_DESC = df.describe().find((d) => d.column === "revenue")!;
const STANDARDIZED = df.standardize("revenue");
const STANDARDIZED_VALUES = STANDARDIZED.column("revenue_z").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
const STANDARDIZED_MEAN = STANDARDIZED_VALUES.length > 0 ? mean(STANDARDIZED_VALUES) : NaN;
const STANDARDIZED_STD = STANDARDIZED_VALUES.length > 0 ? std(STANDARDIZED_VALUES) : NaN;
const MINMAXED = df.minMaxScale("revenue");
const MINMAX_VALUES = MINMAXED.column("revenue_mm").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
const MINMAX_MIN = MINMAX_VALUES.length > 0 ? Math.min(...MINMAX_VALUES) : NaN;
const MINMAX_MAX = MINMAX_VALUES.length > 0 ? Math.max(...MINMAX_VALUES) : NaN;

export const MODULE12_EXERCISES: ExerciseSpec[] = [
  {
    id: "m12-standardize-formula",
    tier: "beginner",
    moduleId: "scaling",
    question: "What formula does the StandardScaler (Z-score) use?",
    task: "Pick the correct formula.",
    type: "mcq",
    options: [
      { value: "mm", label: "(x - min) / (max - min)" },
      { value: "z", label: "(x - mean) / std" },
      { value: "median", label: "(x - median) / IQR" },
      { value: "maxabs", label: "x / max(|x|)" },
    ],
    validator: (answer) => {
      const correct = answer === "z";
      return {
        correct,
        explanation: correct
          ? `Correct — Z-score = (x - mean) / std. After standardization, mean ≈ ${STANDARDIZED_MEAN.toFixed(3)} (≈0) and std ≈ ${STANDARDIZED_STD.toFixed(3)} (≈1). Standardization is sensitive to outliers (both mean and std inflate when outliers are present).`
          : "Not quite. (x - min)/(max - min) is MinMax scaling; (x - median)/IQR is Robust scaling; x/max(|x|) is MaxAbs. The StandardScaler formula is (x - mean)/std — the Z-score.",
      };
    },
    hint: "StandardScaler centers to mean=0 and scales to std=1. The formula subtracts the mean and divides by the standard deviation.",
    solution: `from sklearn.preprocessing import StandardScaler\nscaler = StandardScaler()\nX_scaled = scaler.fit_transform(X_train)  # (x - mean) / std\nprint(scaler.mean_, scaler.scale_)  # the fitted mean and std`,
    commonMistakes: [
      "Confusing standardize (Z-score) with normalize (a different, row-wise operation in sklearn's Normalizer).",
      "Fitting the scaler on the full dataset instead of train only — leakage!",
    ],
    concept: "Standardization",
    nextLessonId: "feature-selection",
  },

  {
    id: "m12-minmax-range",
    tier: "beginner",
    moduleId: "scaling",
    question: `After MinMax scaling the retail revenue column to [0, 1], what are the min and max of the scaled values?`,
    task: "Report 'min,max' (e.g., '0,1').",
    type: "text",
    validator: (answer) => {
      const cleaned = answer.replace(/[^0-9.,-]/g, "");
      const parts = cleaned.split(",").map((s) => Number(s.trim()));
      const correct = parts.length === 2 && Math.abs(parts[0] - 0) < 0.01 && Math.abs(parts[1] - 1) < 0.01;
      return {
        correct,
        explanation: correct
          ? `Correct — MinMax scales to exactly [0, 1]: min = ${MINMAX_MIN.toFixed(3)}, max = ${MINMAX_MAX.toFixed(3)}. The min original value maps to 0, the max maps to 1, intermediate values are linearly interpolated.`
          : `Not quite. After MinMax scaling, min = ${MINMAX_MIN.toFixed(3)} and max = ${MINMAX_MAX.toFixed(3)} (the [0, 1] range is the default; you can change it with feature_range=(a, b)). You answered ${answer}.`,
      };
    },
    hint: "MinMax maps the original min to 0 and the original max to 1, by default.",
    solution: `from sklearn.preprocessing import MinMaxScaler\nscaler = MinMaxScaler(feature_range=(0, 1))  # default\nX_scaled = scaler.fit_transform(X_train)\nprint(X_scaled.min(), X_scaled.max())  # 0.0  1.0`,
    commonMistakes: [
      "Confusing MinMax with Robust — Robust uses median and IQR, not min and max.",
      "Forgetting that MinMax is sensitive to outliers — the max being an outlier compresses all other values near 0.",
    ],
    concept: "Normalization",
    nextLessonId: "feature-selection",
  },

  {
    id: "m12-robust-outliers",
    tier: "intermediate",
    moduleId: "scaling",
    question: "Why is RobustScaler preferred over StandardScaler for data with significant outliers?",
    task: "Pick the correct reason.",
    type: "mcq",
    options: [
      { value: "speed", label: "RobustScaler runs faster." },
      { value: "outlier-robust", label: "RobustScaler uses median + IQR (robust to outliers); StandardScaler uses mean + std (both inflate with outliers)." },
      { value: "range", label: "RobustScaler always maps to [-1, 1]." },
      { value: "memory", label: "RobustScaler uses less memory." },
    ],
    validator: (answer) => {
      const correct = answer === "outlier-robust";
      return {
        correct,
        explanation: correct
          ? "Correct — RobustScaler centers with the median (not the mean) and scales with the IQR (not the std). Median and IQR are robust statistics: a single outlier has limited effect on them, while the mean and std both inflate. Use RobustScaler when the data has outliers that are legitimate (not errors to be removed)."
          : "Not quite. RobustScaler is preferred because its parameters (median, IQR) are robust to outliers. The mean and std used by StandardScaler are both pulled by extreme values, distorting every scaled value.",
      };
    },
    hint: "Median and IQR are robust statistics — they resist outliers. Mean and std are sensitive.",
    solution: `from sklearn.preprocessing import RobustScaler\nscaler = RobustScaler()  # (x - median) / IQR\n# Use when the data has legitimate outliers that you don't want to drop.`,
    commonMistakes: [
      "Defaulting to StandardScaler when the data has heavy outliers — every scaled value is distorted.",
      "Dropping outliers to make StandardScaler work — drops legitimate business signal. Use RobustScaler instead.",
    ],
    concept: "Standardization",
    nextLessonId: "feature-selection",
  },

  {
    id: "m12-tree-no-scale",
    tier: "intermediate",
    moduleId: "scaling",
    question: "You're training a RandomForest on features with very different scales (revenue in $1000s, quantity in single digits). Do you need to scale?",
    task: "Pick the correct answer.",
    type: "mcq",
    options: [
      { value: "no", label: "No — tree-based models are invariant under monotonic transformations. The tree will split the same way regardless of scale." },
      { value: "yes", label: "Yes — all models benefit from scaling." },
      { value: "sometimes", label: "Sometimes — only if the trees are shallow." },
      { value: "only", label: "Only if you use Gini impurity (entropy doesn't need scaling)." },
    ],
    validator: (answer) => {
      const correct = answer === "no";
      return {
        correct,
        explanation: correct
          ? "Correct — tree-based models (RandomForest, XGBoost, LightGBM, decision trees) split on a single feature at a time. The split threshold is found by sorting the values, which is invariant under any monotonic transformation (including scaling). Pre-scaling tree features is unnecessary — it doesn't change the splits, only the threshold values. Scale matters for distance/gradient-based models."
          : "Not quite. Tree models split on a single feature; the threshold is found by sorting, which is invariant under scaling. Scaling tree features is wasted effort — it doesn't change the model.",
      };
    },
    hint: "Tree splits are based on sorted values. Monotonic transforms (including scaling) preserve the sorted order.",
    solution: `# Tree-based models — NO scaling needed:\nfrom sklearn.ensemble import RandomForestRegressor\nrf = RandomForestRegressor()\nrf.fit(X_train_raw, y_train)  # raw features are fine\n\n# Distance/gradient-based — scaling required:\nfrom sklearn.neighbors import KNeighborsRegressor\nfrom sklearn.linear_model import LogisticRegression\n# Scale before k-NN or logistic regression.`,
    commonMistakes: [
      "Defaulting to scaling every feature for every model — wastes effort and confuses the modelling story.",
      "Forgetting that scaling matters for distance-based (k-NN, k-means, SVM-RBF) and gradient-based (logistic regression, neural nets) models.",
    ],
    concept: "Standardization",
    nextLessonId: "feature-selection",
  },

  {
    id: "m12-train-only-fit",
    tier: "advanced",
    moduleId: "scaling",
    question: "You compute mean and std on the FULL dataset, then transform both train and test with those parameters. What's the consequence?",
    task: "Pick the consequence.",
    type: "mcq",
    options: [
      { value: "none", label: "No consequence — the test set is just transformed." },
      { value: "leakage", label: "Data leakage — the test set's statistics influenced the scaler, so the model has indirectly 'seen' the test data during training." },
      { value: "speed", label: "The scaler runs slower." },
      { value: "shape", label: "The transformed shapes will mismatch." },
    ],
    validator: (answer) => {
      const correct = answer === "leakage";
      return {
        correct,
        explanation: correct
          ? "Correct — fitting the scaler on the full dataset (train + test) leaks test information into the training-time parameters. The mean and std used to scale the training rows were influenced by the test rows. This is data leakage. Cross-validation scores will be optimistically biased. Always fit on TRAIN ONLY and apply to both splits."
          : "Not quite. The consequence is leakage: the test set's statistics influenced the scaler. CV scores will be inflated. The fix is fit-on-train-only.",
      };
    },
    hint: "If the test set's statistics influenced the scaler, the model has indirectly seen the test set during training.",
    solution: `# LEAKAGE-SAFE: fit on train, apply to both\nscaler = StandardScaler()\nscaler.fit(X_train)  # train ONLY\nX_train_scaled = scaler.transform(X_train)\nX_test_scaled  = scaler.transform(X_test)  # apply train-fit params\n\n# Or use a scikit-learn Pipeline to enforce this:\nfrom sklearn.pipeline import Pipeline\npipe = Pipeline([\n    ("scaler", StandardScaler()),\n    ("model", LogisticRegression()),\n])\npipe.fit(X_train, y_train)  # scaler fits on X_train only`,
    commonMistakes: [
      "Computing scaling params on the full dataset before splitting — classic leakage.",
      "Re-fitting the scaler on the test set — different params, different scale, broken model.",
    ],
    concept: "Data leakage",
    nextLessonId: "feature-selection",
  },
];
