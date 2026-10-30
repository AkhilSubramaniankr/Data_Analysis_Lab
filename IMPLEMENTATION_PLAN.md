# IMPLEMENTATION_PLAN.md — Pandas Learning Platform

This plan covers the full multi-phase build. **Phases 1, 2, 3, and 4 are delivered.** Phases 5–7 are ordered for the next iterations.

---

## Phase 1 — Foundation ✅ COMPLETE

App shell, design system, navigation, homepage, learning roadmap, reusable components, accessibility. All items verified — see PROJECT_STATUS.md §2.

---

## Phase 2 — Core Pandas Learning ✅ COMPLETE

Dataset Explorer + CSV upload + Modules 1–5 with full interactive labs + 26 validated exercises + 39 unit tests. All items verified — see PROJECT_STATUS.md §2.

---

## Phase 3 — Analytical Learning ✅ COMPLETE

Modules 6–8 (Correlation, EDA Dashboard, Trend Analysis) + Marketing dataset with confounder + 6 chart components + 15 new exercises + 15 new unit tests. All items verified — see PROJECT_STATUS.md §2.

---

## Phase 4 — Feature Engineering ✅ COMPLETE (this cycle)

Goal: Modules 9–12 with full interactive labs for feature creation, categorical encoding, binning, and scaling. Plus engine extensions and unit tests.

### 4.1 Engine extensions ✅
- [x] Encoding: `getDummies` (+ `dropFirst`, `prefix`), `getDummiesForValues` (fixed-categories for inference), `factorize` (returns codes + categories), `mapColumn` (NaN fallback for unmapped), `frequencyEncode`, `targetEncode` (REQUIRES trainMask — leakage-safe by construction).
- [x] Binning: `cutEqualWidth`, `cutEqualFreq` (drops duplicate quantile edges), `cutCustom` (domain edges + labels).
- [x] Transformations: `transform` (log1p/log/sqrt/cbrt/square/cube/reciprocal/abs with edge-case nulls), `interaction` (multiplicative), `polynomial` (single-column).
- [x] Scaling: `standardize`, `standardizeWith` (leakage-safe), `minMaxScale` (with custom range), `robustScale` (median+IQR), `maxAbsScale` (preserves sparsity).
- [x] Train/test split: `randomSplit(seed, valFrac, testFrac)` (deterministic seeded shuffle) and `stratifiedSplit(stratifyCol, seed, valFrac, testFrac)` (preserves per-class proportions).

### 4.2 Module 9 lab — Feature Engineering Fundamentals ✅
- [x] Profit margin with safe NumPy form (replace 0 in revenue with NaN before dividing).
- [x] Zero-revenue indicator column.
- [x] Customer-level RFM aggregation (recency / frequency / monetary).
- [x] Mathematical transformation playground (log1p / log / sqrt / square / cube / reciprocal) with side-by-side original-vs-transformed histograms.
- [x] Interaction feature (`quantity × unit_price`) with `matches_actual` check.
- [x] 5 validated exercises.

### 4.3 Module 10 lab — Categorical Encoding ✅
- [x] Dataset picker (Employee Analytics or Retail Sales) + categorical column picker + encoding method picker + target column picker.
- [x] Live metrics: cardinality, new column count, original vs encoded bytes, train row count.
- [x] Leakage-safe target encoding (70/30 split, seed=42, train-only fitting, global-mean fallback for unseen categories).
- [x] Per-method risks panel (high-cardinality, false-ordering, leakage, frequency-ties).
- [x] Pandas AND scikit-learn equivalent code blocks.
- [x] 5 validated exercises.

### 4.4 Module 11 lab — Binning ✅
- [x] Column picker + strategy picker (equal-width / equal-frequency / custom-domain) + bin count picker + custom edge editor.
- [x] Live summary statistics (count / mean / std / min / Q1 / median / Q3 / max).
- [x] Bar chart of bin counts (reveals skew in the bin distribution).
- [x] Original-distribution histogram for comparison.
- [x] Information-loss vs interpretability callout.
- [x] 5 validated exercises.

### 4.5 Module 12 lab — Scaling ✅
- [x] Column picker + scaler picker (Standard / MinMax / Robust / MaxAbs).
- [x] Train-only-fitting enforcement (70/30 split, seed=42, fit params on TRAIN ONLY, `standardizeWith` applies to BOTH splits).
- [x] "Fitted parameters" panel showing train-computed mean/std/min/max/IQR/maxAbs.
- [x] Comparison table: all four scalers' train-set stats + outlier-sensitivity classification.
- [x] Side-by-side original-vs-scaled histograms.
- [x] Leakage proof panel (same params on train AND test).
- [x] Per-model-family recommendation (tree = not required, distance = required, gradient = usually required).
- [x] 5 validated exercises.

### 4.6 Exercise banks ✅
- [x] `module9.ts` — 5 exercises (zero-denominator handling, RFM, log1p purpose, interaction features, target leakage).
- [x] `module10.ts` — 5 exercises (one-hot column count, dummy drop_first, ordinal false-ordering, target leakage, high-cardinality strategy).
- [x] `module11.ts` — 5 exercises (cut vs qcut, qcut duplicate edges, tree-no-binning, domain bins, information loss).
- [x] `module12.ts` — 5 exercises (StandardScaler formula, MinMax range, RobustScaler outliers, tree-no-scaling, train-only fitting).

### 4.7 Tests ✅
- [x] 22 new unit tests added to `tests/unit/data.test.ts` for the engine extensions.
- [x] All 76 tests pass (39 Phase 2 + 15 Phase 3 + 22 Phase 4).

### 4.8 Integration + verification ✅
- [x] Labs wired into `ModuleView.tsx` via the LABS map.
- [x] `modules.ts` updated: Modules 9, 10, 11, 12 status → "completed".
- [x] Lint passes (0 errors).
- [x] All 76 unit tests pass.
- [x] Agent-browser smoke test of every new lab (Modules 9, 10, 11, 12): controls render, charts render, exercises validate.
- [x] Phase 1 + Phase 2 + Phase 3 functionality preserved.

---

## Phase 5 — Feature Selection & ML Preparation *(NEXT — recommended)*

Goal: Modules 13–14 with full interactive labs for feature selection and ML preparation.

### 5.1 Module 13 — Feature Selection
- [ ] Engine: filter methods (variance threshold, correlation-based, chi-square, ANOVA F, mutual information); model-based (tree importance, L1/Lasso, Elastic Net, SelectFromModel, permutation importance); wrapper (RFE, RFECV, Sequential Forward/Backward).
- [ ] Lab: pick a target, pick a selection method, set the desired feature count or threshold, see the selected feature names + ranking + model performance before vs after.
- [ ] Use appropriate metrics per problem type (accuracy / F1 / ROC-AUC for classification; MAE / RMSE / R² for regression).
- [ ] All selection/evaluation inside the train/val workflow — never on the test set.
- [ ] Explain limitations of importance measures (instability with correlated features, high-cardinality bias).
- [ ] Exercises.

### 5.2 Module 14 — ML Preparation
- [ ] Engine: a Pipeline class that wraps transformers + estimator; ColumnTransformer for heterogeneous columns; SimpleImputer integration with the existing engine.
- [ ] Lab: visual pipeline builder (raw → split → impute → encode → scale → select → train → evaluate). UI blocks fitting on the test set.
- [ ] Leakage prevention throughout (every transformer fit on training fold only).
- [ ] Model-ready dataset validation: types, shapes, missing values, train/test separation check.
- [ ] Reproducibility (fixed seeds throughout).
- [ ] Exercises.

### 5.3 Phase 5 verification
- [ ] Add unit tests for variance threshold, RFE, Pipeline, ColumnTransformer.
- [ ] Lint + agent-browser smoke test of every new lab.
- [ ] Update PROJECT_STATUS.md.

---

## Phase 6 — Interactive Practice

- [ ] Pandas Playground (dataset preview + code panel + output panel + explanation + reset + step history + before/after). If isolated Python execution is supported, use it; otherwise deterministic simulated execution clearly labelled.
- [ ] Statistical laboratory, feature engineering laboratory, feature selection laboratory.
- [ ] Full Practice Center: beginner / intermediate / advanced / industry-scenario exercises across all modules.

---

## Phase 7 — Capstone & QA

- [ ] Retail Sales Analysis & ML Dataset Preparation capstone (9 phases per spec §26).
- [ ] Progress tracking migration to server (if a backend is added).
- [ ] Accessibility audit (keyboard, screen reader, contrast, reduced motion).
- [ ] Responsive audit across 360 / 768 / 1024 / 1440.
- [ ] Data correctness audit (hand-checked arithmetic on a small fixed dataset).
- [ ] Documentation pass + final README.

---

## Cross-cutting rules (apply to every phase)

1. **No fabricated outputs** — every chart, statistic, table, or "result" must be computed from a real dataset (via the in-browser DataFrame engine or, in Phase 6+, real Pandas) or clearly labelled as an illustrative example.
2. **Modular, maintainable code** — one file per concern; data layer in `lib/data/*`; content in `lib/content/*`; pure helpers in `lib/*`; presentational components in `components/*`; view components in `components/views/*`; chart components in `components/charts/*`.
3. **Honest fallbacks** — every deferred feature shows a "Coming in Phase N" panel naming the future phase. Every "deterministic demo" panel carries a "Deterministic demo" badge.
4. **Reproducibility** — any deterministic dataset uses a fixed seed; no `Math.random()` in the data layer.
5. **Performance on modest hardware** — keep the client bundle small; recharts only on labs that need charts.
6. **Accessibility** — semantic HTML, ARIA labels, keyboard nav, `prefers-reduced-motion`, no colour-only meaning.
7. **Preserve earlier phases** — every new phase must not break the homepage, navigation, roadmap, Dataset Explorer, or any earlier module lab.
8. **Business rules first** — never auto-remove legitimate duplicates, impute all missing values, or discard negative numbers without considering business meaning.
9. **Leakage-safe by design** — from Phase 5 onward (and partially from Phase 4: target encoding and scaling both enforce train-only fitting), every preprocessing step is fit on training data only; the UI blocks fitting on the test set.
10. **Master spec §24 compliance** — every chart wrapped in `ChartShell` with the full annotation block.
