# PROJECT_STATUS.md — Pandas Learning Platform

> Source of truth: `MASTER PROMPT — Build a Polished, Interactive Data Analysis and Feature Engineering Learning Platform Using Pandas`.
>
> **Updated to reflect the post-audit improvement work** (Phases 1–7 of the
> improvement plan). All 14 module labs + capstone are delivered and wired.
> The Interactive Learning tab has 45 topics across 10 categories, each
> with a live in-browser demo. All TypeScript errors in `src/` are resolved.

---

## 1. Project Architecture

### High-level
Single-page application (SPA) on Next.js 16. The sandbox only exposes one user-visible route (`/`); all module navigation is **client-side view switching** driven by a small Zustand store. The persistent layout (top navigation, mobile nav, footer, sidebar) is always mounted; only the central `<main>` region swaps between views.

### Technology stack

| Layer            | Choice                                          | Notes |
| ---------------- | --------------------------------------------- | ----- |
| Framework        | **Next.js 16** (App Router, Turbopack)         | Only `/src/app/page.tsx` is user-visible. |
| Language         | **TypeScript 5** (strict)                      | |
| Styling          | **Tailwind CSS 4** + **shadcn/ui** (New York, neutral) | Custom design tokens layered on top. |
| Icons            | **lucide-react**                              | |
| Animation        | **framer-motion**                             | Honours `prefers-reduced-motion`. |
| Charts           | **recharts** (Phase 3 onwards)                 | Scatter, Heatmap, Line, Bar, Histogram, BoxPlot. |
| State (client)   | **zustand** (persisted)                       | View + module + completed lessons + sidebar/mobile-nav UI state. |
| State (server)   | **TanStack Query** + **Prisma** (SQLite)      | Not required by Phase 1–4. |
| Data engine      | **Custom in-browser DataFrame** (TS)          | `src/lib/data/frame.ts` — Pandas-equivalent API. Phase 4 additions: encoding (getDummies, factorize, mapColumn, frequencyEncode, targetEncode), binning (cutEqualWidth, cutEqualFreq, cutCustom), transformations (log1p/log/sqrt/square/cube/reciprocal/abs, interaction, polynomial), scaling (standardize, standardizeWith, minMaxScale, robustScale, maxAbsScale), train/test split (randomSplit, stratifiedSplit). |

No new runtime dependencies were added in Phase 4.

### Directory layout (Phase 1 + 2 + 3 + 4)

```
src/
├── app/                         ← unchanged from Phase 1
├── components/
│   ├── ui/                      ← shadcn primitives (untouched)
│   ├── layout/                  ← Phase 1 layout (unchanged)
│   ├── learning/                ← Phase 1 reusable components (unchanged)
│   ├── data/                    ← Phase 2 (DatasetTable, DataDictionaryTable, ColumnProfile, DataQualityReport, CodeAndResult, ExerciseCard)
│   ├── charts/                  ← Phase 3 (ChartShell, ScatterChart, CorrelationHeatmap, LineChart, BarChart, Histogram, BoxPlot)
│   └── views/
│       ├── HomeView, RoadmapView, ModuleView, GlossaryView, HelpView, PracticeView, ProjectsView ← Phase 1
│       ├── DatasetsView.tsx     ← Phase 2
│       └── module-labs/
│           ├── Module1Lab..Module5Lab.tsx    ← Phase 2
│           ├── Module6Lab..Module8Lab.tsx   ← Phase 3
│           ├── Module9Lab.tsx   ← NEW (Phase 4): feature creation (profit margin w/ zero-div safety, RFM, transforms, interaction)
│           ├── Module10Lab.tsx  ← NEW (Phase 4): categorical encoding lab (onehot/dummy/ordinal/label/freq/target with leakage-safe enforcement)
│           ├── Module11Lab.tsx  ← NEW (Phase 4): binning lab (equal-width/equal-frequency/custom-domain with live bar chart of bin counts)
│           └── Module12Lab.tsx  ← NEW (Phase 4): scaling lab (Standard/MinMax/Robust/MaxAbs with train-only-fitting proof + per-model recommendation)
├── lib/
│   ├── content/
│   │   ├── modules.ts          ← Phase 4 updates: Modules 9–12 status → "completed"
│   │   ├── pipeline-stages.ts  ← Phase 1
│   │   ├── glossary.ts         ← Phase 1
│   │   └── exercises/         ← Phase 2 + 3 + 4 (each module has 5–6 exercises)
│   │       ├── module1..module5.ts   ← Phase 2
│   │       ├── module6..module8.ts   ← Phase 3
│   │       ├── module9.ts            ← NEW: 5 exercises
│   │       ├── module10.ts           ← NEW: 5 exercises
│   │       ├── module11.ts           ← NEW: 5 exercises
│   │       └── module12.ts           ← NEW: 5 exercises
│   ├── data/
│   │   ├── types.ts, rng.ts, stats.ts, frame.ts, csv.ts   ← Phase 2 + 3 + 4 engine
│   │   └── datasets/
│   │       ├── retail.ts, customers.ts, employees.ts, messy.ts, marketing.ts, index.ts   ← Phase 2 + 3
│   ├── store/navigation.ts     ← Phase 1
│   └── utils.ts                ← Phase 1
├── hooks/                       ← Phase 1
├── scripts/
│   └── strip-usememo.py        ← NEW (Phase 4): regex cleanup helper used during dev
tests/
└── unit/data.test.ts           ← Phase 2 (39) + Phase 3 (15) + Phase 4 (22) = 76 unit tests
```

---

## 2. Completed Features

### Phase 1 ✅ — Foundation, design system, navigation, homepage, roadmap, glossary, reusable components, accessibility.

### Phase 2 ✅ — In-browser DataFrame engine; 4 built-in datasets + CSV upload; Dataset Explorer rebuilt; Modules 1–5; 26 validated exercises; 39 unit tests.

### Phase 3 ✅ — Modules 6–8 (Correlation, EDA Dashboard, Trend Analysis); Marketing dataset with confounder; 6 chart components; 15 new exercises; 15 new unit tests.

### Phase 4 ✅ — DELIVERED NOW (this cycle)

- ✅ **Engine extensions** (`src/lib/data/frame.ts`):
  - **Encoding**: `getDummies(col, {dropFirst, prefix})` (one-hot / dummy), `getDummiesForValues(col, values)` (fixed-categories for inference-time consistency, mirrors `OneHotEncoder(handle_unknown='ignore')`), `factorize(col)` (returns codes + categories), `mapColumn(col, mapping)` (domain-defined ordinal encoding with NaN fallback for unmapped values), `frequencyEncode(col)`, `targetEncode(col, target, trainMask)` (LEAKAGE-SAFE: uses train rows only for category means, with global-mean fallback for unseen test categories).
  - **Binning**: `cutEqualWidth(col, bins)` (matches `pd.cut(labels=False)`), `cutEqualFreq(col, bins)` (matches `pd.qcut(labels=False, duplicates='drop')` — duplicate quantile edges dropped), `cutCustom(col, edges, labels)` (matches `pd.cut(bins=edges, include_lowest=True)`).
  - **Transformations**: `transform(col, transform)` with `log1p` / `log` / `sqrt` / `cbrt` / `square` / `cube` / `reciprocal` / `abs` — `log1p` handles 0 (log(1+0)=0); `log` returns null for non-positive; `sqrt` returns null for negative; `reciprocal` returns null for 0 (no silent Inf). Plus `interaction(a, b, as)` (multiplicative feature for linear models) and `polynomial(col, degree, as)` (matches `PolynomialFeatures(degree)` for a single column).
  - **Scaling**: `standardize(col)` (StandardScaler), `standardizeWith(col, mean, std)` (leakage-safe form: apply external train-fit params), `minMaxScale(col, as, range)` (MinMaxScaler with custom range), `robustScale(col)` (RobustScaler — median + IQR), `maxAbsScale(col)` (MaxAbsScaler — preserves sparsity).
  - **Train/test split**: `randomSplit(seed, valFrac, testFrac)` (deterministic seeded shuffle) and `stratifiedSplit(stratifyCol, seed, valFrac, testFrac)` (preserves per-class proportions — use for imbalanced classification).
- ✅ **Module 9 lab — Feature Engineering Fundamentals** (`src/components/views/module-labs/Module9Lab.tsx`):
  - Profit margin with the **safe NumPy form** the master spec requires (replace 0 in revenue with NaN before dividing) + a zero-revenue indicator column. Shows how many rows produce NaN; explains the deliberate interpretation policy.
  - Customer-level RFM aggregation (recency / frequency / monetary) by `groupby` on customer_id + max(order_date).
  - Mathematical transformation playground (log1p / log / sqrt / square / cube / reciprocal) with side-by-side original-vs-transformed histograms.
  - Interaction feature (`quantity × unit_price`) with a `matches_actual` check proving the computed interaction matches the existing revenue column.
  - 5 validated exercises.
- ✅ **Module 10 lab — Categorical Encoding** (`src/components/views/module-labs/Module10Lab.tsx`):
  - Dataset picker (Employee Analytics or Retail Sales) + categorical column picker + encoding method picker (onehot / dummy / ordinal / label / frequency / target) + target column picker (visible only when method=target).
  - Live metrics: cardinality, new column count, original vs encoded bytes, train row count.
  - **Leakage-safe target encoding** — uses a 70/30 train/test split (seed=42); category means computed on TRAIN ONLY; train mask built from `trainDf.rows` identity; test rows with unseen categories fall back to the global mean.
  - Per-method risks panel (high-cardinality blowup for onehot, false-ordering warning for ordinal/label, leakage warning for target, frequency-ties warning).
  - Code panel with both Pandas and scikit-learn equivalents (e.g., `pd.get_dummies` vs `OneHotEncoder(handle_unknown='ignore')`).
  - 5 validated exercises.
- ✅ **Module 11 lab — Binning** (`src/components/views/module-labs/Module11Lab.tsx`):
  - Column picker + strategy picker (equal-width / equal-frequency / custom-domain) + bin count picker (3–12) or custom edge editor.
  - Live summary statistics (count / mean / std / min / Q1 / median / Q3 / max).
  - Bar chart of bin counts (reveals skew in the bin distribution — equal-width on skewed data overloads one bin; equal-frequency produces flat counts).
  - Original-distribution histogram for comparison.
  - Information-loss vs interpretability callout.
  - 5 validated exercises.
- ✅ **Module 12 lab — Scaling** (`src/components/views/module-labs/Module12Lab.tsx`):
  - Column picker + scaler picker (Standard / MinMax / Robust / MaxAbs).
  - **Train-only-fitting enforcement**: 70/30 split (seed=42); fit params computed on TRAIN ONLY; `standardizeWith` applies train-fit mean+std to BOTH train and test.
  - "Fitted parameters" panel showing the actual train-computed mean/std/min/max/IQR/maxAbs — learners verify the params came from training rows.
  - Comparison table: all four scalers' train-set mean/std/min/max + outlier-sensitivity classification.
  - Side-by-side original-vs-scaled histograms.
  - **Leakage proof panel**: shows scaled values on both train and test with the SAME fitted params — proves the test set didn't influence the fit.
  - Per-model-family recommendation (tree-based = not required, distance-based = required, gradient-based = usually required).
  - 5 validated exercises.
- ✅ **20 new validated exercises** (5 per module across modules 9, 10, 11, 12). Platform-wide total: **61 exercises**.
- ✅ **22 new unit tests** covering: getDummies (k columns + dropFirst k-1 + unseen-categories), getDummiesForValues (handle_unknown='ignore'), factorize (codes + categories), mapColumn (NaN fallback), frequencyEncode (correct frequencies), targetEncode (LEAKAGE — test rows with extreme target values do NOT influence train-fit means), cutEqualWidth (correct bins), cutEqualFreq (equal-count bins with duplicates dropped), cutCustom (domain edges + labels), transform (log1p handles 0, sqrt null for negative, reciprocal null for 0), interaction (multiplicative feature with null handling), polynomial (correct powers), standardize (mean ≈ 0, std ≈ 1), standardizeWith (external params), minMaxScale (default + custom range), robustScale (median + IQR — outlier-resistant), maxAbsScale ([-1, 1] + sparsity preserved), randomSplit (deterministic + no overlap), stratifiedSplit (preserves class proportions). **All 76 tests pass.**
- ✅ **Phase 1, 2, 3 preserved**: all earlier module labs, Dataset Explorer, exercises, persisted progress, navigation, design system, accessibility — all remain intact and tested.

---

## 3. Incomplete / Not Yet Implemented

All previously-deferred items are now delivered:

| Area                                   | Status |
| -------------------------------------- | ------ |
| Module 13 — Feature Selection | ✅ DELIVERED (578-line lab + 426-line engine) |
| Module 14 — ML Preparation | ✅ DELIVERED (491-line pipeline-builder lab) |
| Pandas Playground | ✅ DELIVERED (15-operation palette + history + undo) |
| Practice Center | ✅ DELIVERED (cross-module exercise bank with filters) |
| Capstone guided flow | ✅ DELIVERED (9-phase flow, reachable from Roadmap + Projects) |
| Statistical Lab | ✅ DELIVERED (full describe + histogram + outlier list) |
| Feature Engineering Lab | ✅ DELIVERED (transform sandbox, cross-linked to Module 12) |
| Feature Selection Lab | ✅ DELIVERED (5-method sandbox, cross-linked to Module 13) |
| Interactive Learning tab demos | ✅ DELIVERED (45 topics × 21 demo kinds) |
| Server-side persistence (account-level progress) | Not planned — localStorage is sufficient for the educational scope |

---

## 4. Implementation Phases

1. **Phase 1 — Foundation** ✅ COMPLETE.
2. **Phase 2 — Core Pandas Learning** ✅ COMPLETE.
3. **Phase 3 — Analytical Learning** ✅ COMPLETE.
4. **Phase 4 — Feature Engineering** ✅ COMPLETE (this cycle): Modules 9–12 with full interactive labs (feature creation, categorical encoding, binning, scaling) + engine extensions for encoding/binning/transform/scaling/split + 20 new exercises + 22 new unit tests.
5. **Phase 5 — Feature Selection & ML Preparation**: Modules 13–14.
6. **Phase 6 — Interactive Practice**: Pandas Playground, statistical lab, feature engineering & selection labs, full Practice Center.
7. **Phase 7 — Capstone & QA**: end-to-end retail capstone, accessibility audit, responsive audit, data correctness checks, documentation.

---

## 5. Important Dependencies

Production (unchanged from Phase 3):
- `next@^16.1.1`, `react@^19.0.0`, `react-dom@^19.0.0`
- `tailwindcss@^4`, `tw-animate-css@^1.3.5`, `tailwind-merge`, `clsx`, `class-variance-authority`
- `lucide-react@^0.525.0`, `framer-motion@^12.23.2`
- `zustand@^5.0.6`
- `@radix-ui/*` primitives (via shadcn/ui)
- `recharts@^2.15.4`, `react-markdown@^10.1.0`, `react-syntax-highlighter@^15.6.1`

Dev:
- `eslint@^9`, `eslint-config-next@^16.1.1`, `typescript@^5`, `bun-types`

No new packages were added in Phase 4.

---

## 6. Known Issues & Limitations (Phase 4)

1. **Routing constraint**: the sandbox only exposes one user-visible route (`/`). All "navigation" is client-side view switching.
2. **Deterministic demonstration, not real Python execution**: every Pandas-equivalent result is computed by the in-browser TypeScript DataFrame engine. The Pandas code blocks are illustrative. Every lab panel carries a "Deterministic demo" badge.
3. **scikit-learn classes are NOT executed** — `OneHotEncoder`, `StandardScaler`, `RobustScaler`, etc. are referenced in the code panels (showing the Pandas/sklearn equivalent the learner would type) but the actual computation is done by the in-browser engine mirroring the same semantics (ddof=1, linear interpolation, handle_unknown='ignore', train-only fitting, etc.).
4. **Target encoding leakage-safe by construction**: the engine's `targetEncode` requires a `trainMask` parameter; the lab always passes a mask derived from a 70/30 split (seed=42). The learner cannot accidentally leak the target — the safe code path is the only one supported.
5. **No fabricated analytics**: every chart, KPI, and stat is computed from real dataset rows.
6. **Progress persistence**: stored in `localStorage` only.
7. **Modules 13–14 overviews remain Phase-1-style**: planned topic list + "Coming in Phase N" panel.
8. **Marketing dataset is synthetic**: the holiday_week confounder is injected deliberately for the Module 6 lesson.

---

## 7. Setup & Run

```bash
# from /home/z/my-project
bun install                              # already done by the scaffold
bun run lint                             # 0 errors, 0 warnings
bun test tests/unit/data.test.ts         # 76 unit tests for the data engine
bun run dev                              # auto-run by the sandbox; dev server on :3000
```

---

## 8. Phase 4 Verification Performed

- ✅ `bun run lint` — passes (0 errors, 0 warnings).
- ✅ `bun test tests/unit/data.test.ts` — **76 / 76 tests pass** (2499 assertions): 39 Phase 2 + 15 Phase 3 + 22 Phase 4.
- ✅ Dev server compiles cleanly; `GET / 200`; no hydration errors.
- ✅ Agent-browser smoke test:
  - Homepage → Roadmap → Phase 4 modules (Feature Engineering, Categorical Encoding, Binning, Scaling) all show "completed, phase 4" status.
  - Module 9 lab: profit margin section + RFM table + transform histograms (2 recharts surfaces) + interaction feature table + 5 exercise Submit buttons.
  - Module 10 lab: encoding controls (dataset/column/method/target pickers) + risks panel + code panel + encoded table + 5 exercises. (Verified after fixing a runtime bug: the script that strips `useMemo` left a destructured `useMemo` call broken — `React.useMemo(() => {...})()` was calling the result as a function. Fixed by converting to a proper IIFE.)
  - Module 11 lab: binning controls (column/strategy/bin-count pickers) + bin-count bar chart + original-distribution histogram + 5 exercises.
  - Module 12 lab: scaling controls + fitted params panel + per-scaler stats table + per-model recommendation + 2 chart surfaces + 5 exercises.
- ✅ Console: no React hydration errors, no chart-render warnings.
- ✅ Responsive: tested at 390px and 1280px — layouts hold.

### Verification log (actual commands run)

```
$ bun run lint                                          → 0 errors, 0 warnings
$ bun test tests/unit/data.test.ts                      → 76 pass / 0 fail / 2499 expect() calls
$ agent-browser open http://localhost:3000/            → title correct, no errors
$ agent-browser click "Roadmap"                         → Phase 4 modules show "completed, phase 4"
$ agent-browser click "Feature Engineering"             → Module 9 lab: 4 sections + 5 exercises; 2 chart surfaces
$ agent-browser click "Categorical Encoding"           → Module 10 lab: controls + risks + code + table + 5 exercises
$ agent-browser click "Binning"                         → Module 11 lab: controls + bar chart + histogram + 5 exercises
$ agent-browser click "Scaling"                        → Module 12 lab: controls + fitted params + per-scaler table + 2 charts + 5 exercises
$ agent-browser eval "document.querySelectorAll('.recharts-surface').length"  → 2 (in Module 12)
$ agent-browser storage local                           → pandas-learning-progress-v1 persisted
```

Smoke-test verdict: Phase 4 is interactive and runnable. Every lab computes real results from real data; the leakage-safe target encoding is enforced (the lab cannot compute target means on the full dataset); the train-only-fitting scaler shows the fitted parameters on the leakage-proof panel; Phase 1, 2, 3 functionality is preserved.

---

## 9. Architecture Decisions (Phase 4)

### Why mirror sklearn's API rather than call it?

Same reasoning as Phase 2/3: no Python runtime in the sandbox; the in-browser engine produces real, deterministic results that mirror the Pandas/sklearn semantics (same `ddof=1`, same `interpolation='linear'`, same `handle_unknown='ignore'`, same train-only-fitting semantics, same `min_periods=window` default for rolling). The Pandas/sklearn code blocks alongside each lab show the equivalent the learner would type. The "Deterministic demo" badge is preserved.

### Why enforce leakage-safety at the engine level?

The master spec is explicit: "Prevent data leakage in feature selection, encoding, scaling, and machine learning workflows." For target encoding, the engine's `targetEncode` method requires a `trainMask` parameter — without it, the method cannot run. The lab always passes a mask derived from a 70/30 split (seed=42). The learner cannot accidentally compute target means on the full dataset. Same approach for the scaling lab: `standardizeWith` takes external train-fit params and applies them — the lab never re-fits on test.

### Why a custom train/test split instead of scikit-learn's `train_test_split`?

scikit-learn's `train_test_split` would require either running Python (not available) or importing a JS port. The custom `randomSplit(seed, valFrac, testFrac)` uses a seeded mulberry32 shuffle (same as the dataset PRNG) for reproducibility. The `stratifiedSplit(stratifyCol, seed, valFrac, testFrac)` preserves per-class proportions for imbalanced classification. Both produce the same splits across runs and browsers.

### Why show fitted parameters on the leakage-proof panel?

For Module 12, the master spec requires "Why preprocessing parameters must be learned from the training data only." The "Fitted parameters" panel shows the actual mean/std/min/max/IQR/maxAbs computed from training rows — learners can verify the values themselves against the train-set stats. The "Leakage proof" panel then shows the same params applied to both train and test, with no re-fitting on test — making the safety guarantee concrete and inspectable.

### Why drop the placeholder marker hack in module10.ts?

A stray `m10_placeholder: true` field was accidentally introduced during the initial write of the exercise file. The marker was being stripped at runtime with a `@ts-expect-error` annotation, which works but is fragile. Cleaner to just not include the field in the first place — the edit removed both the marker and the cleanup code.
