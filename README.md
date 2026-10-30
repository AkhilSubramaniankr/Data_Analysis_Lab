# Pandas Lab — Data Analysis & Feature Engineering with Pandas

An interactive educational web application for learning Pandas, data analysis,
feature engineering, and ML data preparation. Built with Next.js 16, React 19,
TypeScript, Tailwind CSS 4, Zustand, Recharts, and a custom in-browser
DataFrame engine that mirrors the Pandas API.

## Quick start

```bash
# Install dependencies (Bun is the package manager; npm/yarn also work)
bun install

# Run the dev server
bun run dev
# → http://localhost:3000

# Production build
bun run build
bun run start

# Run unit tests (104 tests / 2610 assertions)
bun test tests/unit/

# Lint
bun run lint

# TypeScript check
bunx tsc --noEmit
```

## What's inside

- **14 module labs** covering the full Pandas curriculum (M1: Dataset
  Exploration → M14: ML Preparation). Each lab is a self-contained interactive
  experience with real datasets, real computations, and 5-6 validated
  exercises.
- **9-phase capstone** — Retail Sales Analysis & ML Dataset Preparation.
  Reachable from the Roadmap and the Projects top-nav view.
- **Interactive Learning tab** — 45 topics across 10 categories (Pandas
  Fundamentals, Data Exploration, Data Cleaning, Statistics, Grouping &
  Aggregation, Correlation, Time Series, Feature Engineering, Feature
  Selection, ML Preparation). Every topic has a live in-browser demo plus
  full WHAT/WHY/WHEN/HOW/EXAMPLE/CODE/INTERPRETATION/MISTAKES/TAKEAWAY
  educational content.
- **6 practice tabs** — Interactive Learning, Pandas Playground (15-operation
  palette with step history), Practice Center (cross-module exercise bank),
  Statistical Lab, Feature Engineering Lab, Feature Selection Lab.
- **5 built-in datasets** — Retail Sales (240 rows), Customers (300 rows),
  Employees (250 rows), Messy Retail (deliberate quality issues), Marketing
  (with confounder).
- **Custom DataFrame engine** (`src/lib/data/frame.ts`) — mirrors the Pandas
  API: head/tail/sample/loc/iloc/sort/groupby/agg/pivot_table/crosstab/merge/
  describe/info/corr/resample/rolling/pct_change/getDummies/factorize/
  mapColumn/frequencyEncode/targetEncode/cutEqualWidth/cutEqualFreq/cutCustom/
  transform/interaction/polynomial/standardize/minMaxScale/robustScale/
  maxAbsScale/randomSplit/stratifiedSplit — plus a full ML layer (Pipeline,
  ColumnTransformer, SimpleImputer, OneHotEncoder, StandardScaler) and
  feature-selection methods (varianceThreshold, selectKBest with chi2/
  ANOVA F/mutual info, treeFeatureImportance, lassoFeatureImportance,
  permutationImportance, rfe, rfecv, sequentialForwardSelection).

## Architecture

```
src/
├── app/                    Next.js App Router (single route: /)
├── components/
│   ├── charts/             Histogram, BarChart, LineChart, ScatterChart,
│   │                       BoxPlot, CorrelationHeatmap, ChartShell, ChartSizer
│   ├── data/               DatasetTable, DataQualityReport, CodeAndResult, etc.
│   ├── effects/            ParticleBackground, MagneticButton, PageTransition
│   ├── learning/           ModuleShell, LessonCard, CodePanel, PageHeader, etc.
│   ├── layout/             AppShell, TopNav, Sidebar, Footer, ProgressIndicator
│   ├── practice/           InteractiveLearning, PandasPlayground, PracticeCenter,
│   │                       StatisticalLab, FeatureEngineeringLab, FeatureSelectionLab,
│   │                       CapstoneFlow, TopicDemo (21 demo kinds)
│   ├── ui/                 shadcn/ui primitives
│   └── views/              HomeView, RoadmapView, ModuleView, DatasetsView,
│                           PracticeView, ProjectsView, GlossaryView, HelpView
│                           + module-labs/Module{1..14}Lab.tsx
└── lib/
    ├── content/            modules.ts (curriculum spec), interactive-topics.ts
    │                       (45 topics), glossary.ts (34 terms), exercises/
    ├── data/               frame.ts (engine), stats.ts, ml.ts, feature-selection.ts,
    │                       datasets/ (5 built-in datasets), types.ts, rng.ts
    ├── store/              navigation.ts (Zustand + persist)
    └── utils.ts            cn() helper
```

## Verification (all green as of this release)

| Check | Command | Result |
|---|---|---|
| ESLint | `bun run lint` | 0 errors, 0 warnings |
| TypeScript | `bunx tsc --noEmit` | 0 errors in src/ and tests/ |
| Unit tests | `bun test tests/unit/` | 104 pass / 0 fail / 2610 assertions |
| Production build | `bun run build` | Compiled successfully, 4/4 static pages |
| Dev server | `curl http://localhost:3000/` | HTTP 200 |

## Documentation

- `PROJECT_STATUS.md` — architecture, completed features, phases, dependencies.
- `IMPLEMENTATION_PLAN.md` — multi-phase build plan (all 7 phases delivered).
- `worklog.md` — detailed development log.

## License

Educational use. The datasets are synthetic and deterministic (seeded RNG) —
no real customer data.
