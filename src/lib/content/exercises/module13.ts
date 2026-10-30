/**
 * Module 13 exercises — Feature Selection.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";

export const MODULE13_EXERCISES: ExerciseSpec[] = [
  {
    id: "m13-filter-vs-wrapper",
    tier: "beginner",
    moduleId: "feature-selection",
    question: "Which feature selection family fits a model on every candidate subset?",
    task: "Pick the correct family.",
    type: "mcq",
    options: [
      { value: "filter", label: "Filter methods — they rank features by intrinsic properties (variance, correlation, chi²)." },
      { value: "embedded", label: "Embedded methods — selection happens during model training (Lasso, tree importance)." },
      { value: "wrapper", label: "Wrapper methods (RFE, RFECV, SFS) — they fit a model on every candidate subset and pick the best." },
      { value: "all", label: "All three families fit a model on every subset." },
    ],
    validator: (answer) => {
      const correct = answer === "wrapper";
      return {
        correct,
        explanation: correct
          ? "Correct — wrapper methods (RFE, RFECV, SFS, SBS) wrap a model around the selection process. They fit a model on each candidate subset, score it on a validation set, and pick the subset with the best score. They're computationally expensive (k² fits for SFS, k fits for RFE) but often best-performing."
          : "Not quite. Filter methods (variance, correlation, chi²) are model-agnostic — they rank features without fitting anything. Embedded methods fit ONE model and read importance from it. Only wrapper methods fit a model on every candidate subset.",
      };
    },
    hint: "Wrapper = 'wrap a model around the selection process'. Filter and embedded don't iterate over subsets.",
    solution: `from sklearn.feature_selection import RFE, RFECV, SequentialFeatureSelector
# All three are wrapper methods — they fit a model per subset.\n# Filter methods: VarianceThreshold, SelectKBest (chi2, f_classif, mutual_info_classif)\n# Embedded methods: SelectFromModel (Lasso, tree-based)`,
    commonMistakes: [
      "Confusing embedded with wrapper — embedded fits ONE model; wrapper fits MANY.",
      "Assuming wrapper methods are always best — they're often best, but expensive.",
    ],
    concept: "Feature selection",
    nextLessonId: "ml-preparation",
  },

  {
    id: "m13-leakage-rule",
    tier: "intermediate",
    moduleId: "feature-selection",
    question: "When should feature selection be performed — before or after the train/test split?",
    task: "Pick the correct ordering.",
    type: "mcq",
    options: [
      { value: "before", label: "Before splitting — run selection on the full dataset, then split." },
      { value: "after", label: "After splitting — fit selection on the TRAIN fold only; the test fold is held out untouched." },
      { value: "either", label: "Either — it doesn't matter for filter methods." },
      { value: "test", label: "On the test fold — selection should match the test distribution." },
    ],
    validator: (answer) => {
      const correct = answer === "after";
      return {
        correct,
        explanation: correct
          ? "Correct — feature selection must run AFTER the split, on the TRAINING fold only. If you select features using the full dataset (train + test), the test target leaks into the selected features (especially for target encoding, mutual_info_classif, and any score involving the target). Cross-validation scores will be optimistically biased."
          : "Not quite. Selection MUST run after the split, on the TRAIN fold only. The 'either' answer is wrong even for filter methods — any filter that uses the target (correlation, chi², ANOVA F, mutual_info) leaks if computed on the full dataset.",
      };
    },
    hint: "If selection uses the test fold, the test target has influenced the selected features. That's leakage.",
    solution: `# RIGHT — split first, fit selection on train only:\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)\nselector = SelectKBest(score_func=f_classif, k=10)\nselector.fit(X_train, y_train)  # TRAIN ONLY\nX_train_sel = selector.transform(X_train)\nX_test_sel  = selector.transform(X_test)  # apply train-fit selection to test\n\n# WRONG — leakage:\nselector.fit(X, y)  # ← uses test target!`,
    commonMistakes: [
      "Running SelectKBest on the full dataset before splitting — classic leakage for any target-aware filter.",
      "Assuming 'model-agnostic' filter methods are leakage-safe by default — they're not, if they use the target.",
    ],
    concept: "Data leakage",
    nextLessonId: "ml-preparation",
  },

  {
    id: "m13-tree-instability",
    tier: "intermediate",
    moduleId: "feature-selection",
    question: "Why are tree-based feature importances considered unstable for correlated features?",
    task: "Pick the most accurate reason.",
    type: "mcq",
    options: [
      { value: "slow", label: "Tree fitting is slow." },
      { value: "split-sharing", label: "When two features are highly correlated, the tree splits on one of them arbitrarily; the importance score for that one feature is high, for the other it's near-zero — even though both are equally predictive." },
      { value: "memory", label: "Trees use too much memory for correlated features." },
      { value: "negative", label: "Tree importances can be negative for correlated features." },
    ],
    validator: (answer) => {
      const correct = answer === "split-sharing";
      return {
        correct,
        explanation: correct
          ? "Correct — when two features are highly correlated, a single tree will split on ONE of them (chosen arbitrarily at the split point) and the other gets near-zero importance. Re-running with a different random seed may flip which feature gets the high importance. Random Forest (averaging over many trees) reduces this instability; a single tree is unreliable for correlated features."
          : "Not quite. The instability is about split-sharing: for correlated features, the tree picks one arbitrarily, giving it all the importance. Speed/memory/negativity are not the issue.",
      };
    },
    hint: "Tree splits on one feature at a time. With two identical features, the split goes on just one of them.",
    solution: `# Reduce instability — use a forest, not a single tree:\nfrom sklearn.ensemble import RandomForestClassifier\nrf = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_train, y_train)\nimportances = rf.feature_importances_  # averaged over 100 trees\n\n# Or use permutation importance (model-agnostic, more stable):\nfrom sklearn.inspection import permutation_importance\nresult = permutation_importance(rf, X_val, y_val, n_repeats=5, random_state=42)`,
    commonMistakes: [
      "Trusting a single tree's importance — re-run with a different seed and the importance may flip.",
      "Using tree importance for highly-correlated features without cross-checking — try permutation importance.",
    ],
    concept: "Multicollinearity",
    nextLessonId: "ml-preparation",
  },

  {
    id: "m13-rfe-vs-rfecv",
    tier: "advanced",
    moduleId: "feature-selection",
    question: "What's the difference between RFE and RFECV?",
    task: "Pick the correct distinction.",
    type: "mcq",
    options: [
      { value: "same", label: "They are identical." },
      { value: "rfecv-cv", label: "RFE requires you to specify n_features_to_select; RFECV uses cross-validation to find the optimal n_features automatically." },
      { value: "faster", label: "RFECV is much faster than RFE." },
      { value: "regression", label: "RFE is for regression, RFECV for classification." },
    ],
    validator: (answer) => {
      const correct = answer === "rfecv-cv";
      return {
        correct,
        explanation: correct
          ? "Correct — RFE requires you to specify n_features_to_select up front. RFECV runs RFE for each subset size and uses cross-validation to pick the size that maximizes the validation score, returning the optimal n_features_ and a score curve. RFECV is SLOWER than RFE (because it does multiple RFE runs)."
          : "Not quite. RFE needs you to specify n_features; RFECV finds the optimal n automatically via CV. RFECV is SLOWER than RFE, not faster. Both work for any supervised task.",
      };
    },
    hint: "RFECV = RFE + cross-validation. The CV part finds the optimal number of features.",
    solution: `from sklearn.feature_selection import RFE, RFECV\n# RFE — you pick n_features_to_select\nrfe = RFE(model, n_features_to_select=10).fit(X_train, y_train)\n\n# RFECV — finds optimal n_features via CV\nrfecv = RFECV(model, cv=5, scoring="roc_auc").fit(X_train, y_train)\nprint(rfecv.n_features_)  # optimal count\nprint(rfecv.cv_results_)   # score curve`,
    commonMistakes: [
      "Using RFECV when you need determinism — CV scores can vary across runs; pick RFE with a fixed n for reproducibility.",
      "Assuming RFECV is faster — it's not (more fits).",
    ],
    concept: "Wrapper method",
    nextLessonId: "ml-preparation",
  },

  {
    id: "m13-fewer-features",
    tier: "advanced",
    moduleId: "feature-selection",
    question: "You select fewer features and the validation score drops by 0.001 (from 0.852 to 0.851). What's the right interpretation?",
    task: "Pick the correct interpretation.",
    type: "mcq",
    options: [
      { value: "better", label: "The selected subset is BETTER — simpler model, near-identical performance, less overfitting risk." },
      { value: "worse", label: "The selected subset is WORSE — the score dropped, so selection failed." },
      { value: "indifferent", label: "Indifferent — a 0.001 drop is within noise; report both and let the business decide." },
      { value: "impossible", label: "Selection can never improve a model." },
    ],
    validator: (answer) => {
      const correct = answer === "better";
      return {
        correct,
        explanation: correct
          ? "Correct — a 0.001 drop is within noise (typically < 1 std of CV variance). The selected subset is simpler (fewer features → less overfitting risk, faster training, easier to interpret and deploy). The master spec says: do NOT claim that fewer features automatically produce a better model — but if the drop is negligible, the simpler model is preferred. Run a robust CV before claiming the subset is BETTER; a single val score isn't enough."
          : "Not quite. A 0.001 drop is within noise; the simpler model (fewer features) is preferable when the score is near-identical. Don't claim 'selection failed' from a 0.001 drop.",
      };
    },
    hint: "Simpler model + near-identical performance = preferred. But run a CV before claiming 'better'.",
    solution: `# Run a robust CV before claiming the subset is better:\nfrom sklearn.model_selection import cross_val_score\nscores_all = cross_val_score(model, X_train_all, y_train, cv=5, scoring="roc_auc")\nscores_sel = cross_val_score(model, X_train_sel, y_train, cv=5, scoring="roc_auc")\nprint(f"All: {scores_all.mean():.4f} ± {scores_all.std():.4f}")\nprint(f"Sel: {scores_sel.mean():.4f} ± {scores_sel.std():.4f}")\n# Compare mean ± std. If they overlap, prefer the simpler subset.`,
    commonMistakes: [
      "Claiming the subset is 'better' from a single val score — it's within noise; need CV.",
      "Discarding the subset because the score dropped by 0.001 — that's noise; the simpler model is preferable.",
    ],
    concept: "Feature selection",
    nextLessonId: "ml-preparation",
  },
];
