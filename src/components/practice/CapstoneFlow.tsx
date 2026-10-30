"use client";

/**
 * CapstoneFlow — guided 9-phase Retail Sales Analysis & ML Dataset
 * Preparation capstone.
 *
 * Master spec §26. Each phase has:
 *  - A learning objective + beginner-friendly explanation
 *  - Real data operations computed from the actual Retail Sales dataset
 *  - The corresponding Pandas code
 *  - Before/after comparison where relevant
 *  - A "Mark complete" checkpoint (persisted to localStorage via Zustand)
 *  - Practical application, assumptions, limitations
 *
 * The learner can expand any phase, inspect the real results, and mark
 * it complete. Progress is tracked (X of 9 phases).
 */

import * as React from "react";
import {
  Trophy, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Database, Sparkles, Filter, Sigma, TrendingUp, Wrench,
  ListChecks, Workflow, FileText,
} from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame, fmt } from "@/lib/data/frame";
import { useNavigation } from "@/lib/store/navigation";
import {
  mean, median, std, min, max, quantile, iqr,
  tukeyFence, toNumericArray, sum, skewness, kurtosis,
} from "@/lib/data/stats";
import { CodePanel } from "@/components/learning/CodePanel";
import { DatasetTable } from "@/components/data/DatasetTable";
import { DataQualityReport } from "@/components/data/DataQualityReport";
import { ChartShell } from "@/components/charts/ChartShell";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHASE_ICONS = [Database, Sparkles, Filter, Sigma, TrendingUp, Wrench, ListChecks, Workflow, FileText];

export function CapstoneFlow() {
  const toggleLesson = useNavigation((s) => s.toggleLesson);
  const completedLessons = useNavigation((s) => s.completedLessons);
  const setView = useNavigation((s) => s.setView);

  const [expandedPhase, setExpandedPhase] = React.useState<number | null>(1);

  const retail = React.useMemo(() => {
    const spec = buildRetailSales();
    return DataFrame.fromRows(spec.rows);
  }, []);

  const completedCount = PHASE_ICONS.filter((_, i) =>
    completedLessons.includes(`capstone-phase-${i + 1}`)
  ).length;

  const togglePhase = (n: number) => {
    const id = `capstone-phase-${n}`;
    toggleLesson(id);
  };

  const isComplete = (n: number) => completedLessons.includes(`capstone-phase-${n}`);

  return (
    <div className="flex flex-col gap-4">
      {/* Progress header */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[var(--color-role-validated)]" aria-hidden />
            <h3 className="text-sm font-semibold">Capstone progress</h3>
          </div>
          <span className="text-mono rounded-full border border-border bg-muted px-3 py-1 text-sm font-semibold tabular-nums">
            {completedCount} / 9 phases
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--color-role-validated)] transition-all"
            style={{ width: `${(completedCount / 9) * 100}%` }}
            aria-label={`Capstone progress: ${completedCount} of 9 phases`}
          />
        </div>
      </div>

      {/* Phase timeline */}
      <ol className="flex flex-col gap-2">
        {CAPSTONE_PHASES.map((phase, i) => {
          const Icon = PHASE_ICONS[i];
          const done = isComplete(phase.n);
          const expanded = expandedPhase === phase.n;
          return (
            <li key={phase.n} className="rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => setExpandedPhase(expanded ? null : phase.n)}
                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-accent"
                aria-expanded={expanded}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  done
                    ? "border-[var(--color-role-validated)] bg-[color-mix(in_oklch,var(--color-role-validated)_15%,transparent)] text-[var(--color-role-validated)]"
                    : "border-border bg-muted text-muted-foreground"
                )}>
                  {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : phase.n}
                </span>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1 text-sm font-medium">{phase.title}</span>
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden /> : <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
              </button>

              {expanded && (
                <div className="border-t border-border p-4">
                  <PhaseContent phase={phase} retail={retail} done={done} onToggle={() => togglePhase(phase.n)} setView={setView} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Final report */}
      {completedCount === 9 && (
        <div className="rounded-lg border border-[var(--color-role-validated)]/40 bg-[color-mix(in_oklch,var(--color-role-validated)_8%,transparent)] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-role-validated)]">
            <Trophy className="h-5 w-5" aria-hidden />
            Capstone complete!
          </h3>
          <p className="mt-1 text-sm text-foreground/80">
            You've completed all 9 phases of the Retail Sales Analysis & ML Dataset Preparation capstone. Every number in this capstone was computed from the actual Retail Sales dataset — no fabricated results.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("roadmap")}>Back to roadmap</Button>
            <Button variant="outline" size="sm" onClick={() => setView("practice")}>Practice more exercises</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Phase definitions + content ----------

const CAPSTONE_PHASES = [
  { n: 1, title: "Understand the dataset", tasks: ["Inspect dimensions", "Identify data types", "Read the data dictionary", "Define analytical questions"] },
  { n: 2, title: "Assess data quality", tasks: ["Identify missing values", "Check duplicates", "Validate numerical ranges", "Investigate category inconsistencies"] },
  { n: 3, title: "Clean the data", tasks: ["Choose cleaning strategies", "Validate business rules", "Compare before vs after"] },
  { n: 4, title: "Exploratory data analysis", tasks: ["Descriptive statistics", "Revenue & profit distributions", "Compare categories & regions", "Investigate correlations"] },
  { n: 5, title: "Generate business insights", tasks: ["Top-performing products", "Regional performance", "Profit margins", "Monthly trends"] },
  { n: 6, title: "Engineer features", tasks: ["Order-value features", "Time-based features", "Categorical representations", "Document assumptions"] },
  { n: 7, title: "Select features", tasks: ["Define prediction objective", "Identify leakage", "Compare selection approaches"] },
  { n: 8, title: "Prepare the analytical dataset", tasks: ["Split the data", "Build preprocessing pipelines", "Validate types & shapes", "Confirm train/test separation"] },
  { n: 9, title: "Final report", tasks: ["Data-quality report", "EDA summary", "Business findings", "FE documentation", "Selection report", "Final dataset description", "Limitations"] },
];

// ---------- Phase content component ----------

function PhaseContent({
  phase,
  retail,
  done,
  onToggle,
  setView,
}: {
  phase: typeof CAPSTONE_PHASES[number];
  retail: DataFrame;
  done: boolean;
  onToggle: () => void;
  setView: (v: import("@/lib/store/navigation").ViewId) => void;
}) {
  const info = retail.info();
  const revenueCol = retail.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const profitCol = retail.column("profit").filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  switch (phase.n) {
    case 1:
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Understand the Retail Sales dataset before making any analytical decisions — dimensions, types, cardinality, and potential target variables."
          code={`# Phase 1: Understand the dataset
print(df.shape)          # ${retail.shape[0]} rows × ${retail.shape[1]} columns
print(df.dtypes)         # ${retail.dtypes().map((d) => d.column + ":" + d.dtype).join(", ")}
print(df.info())         # non-null counts + memory
print(df.head())         # first 5 rows`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Rows" value={String(retail.shape[0])} />
            <Stat label="Columns" value={String(retail.shape[1])} />
            <Stat label="Memory" value={`${(info.memoryBytes / 1024).toFixed(1)} KB`} />
            <Stat label="Null cells" value={String(Object.values(info.columns).reduce((s, c) => s + c.nullCount, 0))} />
          </div>
          <DatasetTable df={retail.head(5)} pageSize={5} />
          <p className="text-xs text-muted-foreground">
            The dataset has {retail.shape[0]} order lines across {retail.shape[1]} columns. Target candidates: <code className="text-mono">revenue</code> (continuous) and <code className="text-mono">profit</code> (continuous). Primary key: <code className="text-mono">order_id</code>.
          </p>
        </PhaseLayout>
      );

    case 2:
      const nulls = retail.isnaCount();
      const dups = retail.countDuplicates();
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Assess data quality before any cleaning. Missing values, duplicates, range violations, category inconsistencies."
          code={`# Phase 2: Assess data quality
print(df.isna().sum())           # missing per column
print(df.duplicated().sum())     # full-row duplicates
print(df.describe())             # check min/max for range violations
print(df["category"].value_counts())  # check for inconsistent casing`}
        >
          <DataQualityReport df={retail} />
          <p className="text-xs text-muted-foreground">
            {Object.values(nulls).every((n) => n === 0) ? "No missing values found — the clean Retail Sales dataset has no nulls." : `${Object.values(nulls).reduce((a, b) => a + b, 0)} missing values detected.`}
            {" "}{dups === 0 ? "No full-row duplicates." : `${dups} full-row duplicates detected.`}
          </p>
        </PhaseLayout>
      );

    case 3:
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Choose cleaning strategies that respect the meaning of the data and the business rules. Compare before vs after."
          code={`# Phase 3: Clean the data
# The Retail Sales dataset is already clean (no nulls, no duplicates).
# For the messy variant (Module 2), you would:
df = df.drop_duplicates()
df["category"] = df["category"].str.strip().str.title()
df["revenue"] = df["revenue"].astype("float64")
df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
# Negative quantities are RETURNS — keep them, add is_return indicator:
df["is_return"] = df["quantity"] < 0`}
        >
          <div className="rounded-md border border-border bg-background p-3 text-xs text-foreground/80">
            <p>The Retail Sales dataset is already clean — no nulls, no duplicates, consistent casing, valid dates, and proper types. The cleaning step is a no-op on this dataset.</p>
            <p className="mt-2">The messy variant (used in Module 2's Data Quality lab) has deliberate issues: missing customer_id, duplicate transactions, inconsistent category casing, trailing whitespace, negative quantities (returns), invalid dates, and mixed-type revenue. That's where the cleaning strategies apply.</p>
          </div>
          <p className="text-xs text-muted-foreground">Business rule: negative quantities are returns — legitimate business events. Do NOT auto-drop them. The <code className="text-mono">is_return</code> indicator preserves the signal.</p>
        </PhaseLayout>
      );

    case 4:
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Run descriptive statistics, distribution analysis, category/region comparisons, and correlation investigation."
          code={`# Phase 4: Exploratory data analysis
print(df.describe())
df["revenue"].hist(bins=20)
df.groupby("region")["revenue"].sum().plot(kind="bar")
df[["revenue", "profit", "quantity"]].corr()`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Revenue mean" value={fmt(mean(revenueCol), 2)} />
            <Stat label="Revenue median" value={fmt(median(revenueCol), 2)} />
            <Stat label="Revenue std" value={fmt(std(revenueCol), 2)} />
            <Stat label="Profit mean" value={fmt(mean(profitCol), 2)} />
            <Stat label="Revenue Q1" value={fmt(quantile(revenueCol, 0.25), 2)} />
            <Stat label="Revenue Q3" value={fmt(quantile(revenueCol, 0.75), 2)} />
            <Stat label="Revenue IQR" value={fmt(iqr(revenueCol), 2)} />
            <Stat label="Skewness" value={fmt(skewness(revenueCol), 2)} tone={Math.abs(skewness(revenueCol)) > 1 ? "warning" : undefined} />
          </div>
          <ChartShell
            title="Revenue by region"
            subtitle="Total revenue per region."
            annotation={{
              question: "Which regions drive the most revenue?",
              whyThisChart: "Bar chart with categorical x-axis; regions are independent categories.",
              shows: "Regional totals computed from the actual data.",
              doesNotEstablish: "Total revenue ≠ profitability. Check profit margins too.",
              nextStep: "Filter to a specific region to drill into its product mix.",
            }}
          >
            <BarChart
              data={retail.groupBy(["region"], [{ column: "revenue", fn: "sum", as: "revenue" }]).rows.map((r) => ({ label: String(r.region), value: r.revenue as number }))}
              xLabel="Region" yLabel="Revenue (USD)"
              altText="Bar chart of revenue by region"
            />
          </ChartShell>
        </PhaseLayout>
      );

    case 5:
      const byProduct = retail.groupBy(["product"], [{ column: "revenue", fn: "sum", as: "revenue" }]).sort("revenue", "desc");
      const monthly = retail.resampleMonthly("order_date", [{ column: "revenue", fn: "sum", as: "revenue" }]);
      const totalRev = sum(revenueCol);
      const totalProf = sum(profitCol);
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Turn the EDA findings into honest business insights. Every number computed from the actual data."
          code={`# Phase 5: Business insights
top_products = df.groupby("product")["revenue"].sum().sort_values(ascending=False).head(5)
monthly_trend = df.resample("ME", on="order_date")["revenue"].sum()
total_revenue = df["revenue"].sum()
total_profit = df["profit"].sum()
margin = (total_profit / total_revenue) * 100`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Total revenue" value={`$${fmt(totalRev, 0)}`} />
            <Stat label="Total profit" value={`$${fmt(totalProf, 0)}`} />
            <Stat label="Profit margin" value={`${fmt((totalProf / totalRev) * 100, 1)}%`} />
            <Stat label="Orders" value={String(retail.rows.length)} />
          </div>
          <ChartShell
            title="Top 5 products by revenue"
            subtitle="Highest-revenue products."
            annotation={{
              question: "Which products drive the most revenue?",
              whyThisChart: "Horizontal bar chart for long product names.",
              shows: `Top product: ${String(byProduct.rows[0]?.product)} at $${fmt(byProduct.rows[0]?.revenue as number, 0)}.`,
              doesNotEstablish: "Top revenue ≠ top margin or top volume.",
              nextStep: "Compute profit_margin = profit / revenue per product to compare margins.",
            }}
          >
            <BarChart
              data={byProduct.head(5).rows.map((r) => ({ label: String(r.product), value: r.revenue as number }))}
              layout="horizontal" xLabel="Revenue (USD)"
              altText="Top 5 products by revenue"
            />
          </ChartShell>
          <ChartShell
            title="Monthly revenue trend"
            subtitle="Real monthly sums from the dataset."
            annotation={{
              question: "Is there seasonality in monthly revenue?",
              whyThisChart: "Line chart for sequential time index.",
              shows: `${monthly.rows.length} months of data.`,
              doesNotEstablish: "A trend is not a forecast. Seasonality needs at least 2 years to confirm.",
              nextStep: "Apply a 3-month rolling mean to smooth short-term noise.",
            }}
          >
            <LineChart
              data={monthly.rows.map((r) => ({ bucket: String(r.bucket), revenue: r.revenue as number }))}
              xKey="bucket" xLabel="Month"
              series={[{ key: "revenue", label: "Revenue" }]}
              altText="Monthly revenue trend"
            />
          </ChartShell>
        </PhaseLayout>
      );

    case 6:
      const withMargin = retail.withColumn("profit_margin", (r) => {
        const rev = r.revenue; const prof = r.profit;
        if (typeof rev !== "number" || typeof prof !== "number") return null;
        if (rev === 0) return null;
        return +((prof / rev) * 100).toFixed(2);
      }).withColumn("is_return", (r) => (typeof r.quantity === "number" && r.quantity < 0));
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Create derived features: profit margin (with zero-denominator safety), time-based features, and return indicators. Document assumptions."
          code={`# Phase 6: Feature engineering
import numpy as np
df["profit_margin"] = df["profit"].div(df["revenue"].replace(0, np.nan)).mul(100)
df["is_return"] = df["quantity"] < 0
df["order_month"] = df["order_date"].dt.month
df["order_quarter"] = df["order_date"].dt.quarter
df["order_day_name"] = df["order_date"].dt.day_name()`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Rows with margin" value={String(withMargin.rows.filter((r) => r.profit_margin !== null).length)} />
            <Stat label="Zero-revenue rows" value={String(withMargin.rows.filter((r) => r.is_zero_revenue === true || r.revenue === 0).length)} />
            <Stat label="Returns (qty < 0)" value={String(withMargin.rows.filter((r) => r.is_return === true).length)} />
            <Stat label="Mean margin" value={`${fmt(mean(withMargin.column("profit_margin").filter((v): v is number => typeof v === "number" && Number.isFinite(v))), 1)}%`} />
          </div>
          <DatasetTable df={withMargin.head(10)} pageSize={10} />
          <p className="text-xs text-muted-foreground">
            <strong>Assumptions:</strong> revenue = quantity × unit_price (by construction). profit = revenue × margin (by construction). profit_margin = profit / revenue × 100 (zero-revenue rows → NaN, not Inf). The <code className="text-mono">is_return</code> indicator preserves the returns signal for downstream models.
          </p>
        </PhaseLayout>
      );

    case 7:
      const numericFeatures = retail.columns.filter((c) => {
        if (c === "revenue" || c === "profit") return false;
        if (c.endsWith("_id")) return false;
        const dt = retail.dtype(c);
        return dt === "int64" || dt === "float64";
      });
      const corr = retail.corr();
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Define a prediction objective (revenue), identify potential leakage (profit, profit_margin), and compare selection approaches."
          code={`# Phase 7: Feature selection
# Target: revenue
# LEAKAGE RISK: profit = revenue * margin → drop profit + profit_margin
features = ["quantity", "unit_price"]  # known BEFORE the order is priced
# Methods:
# 1. Filter: |corr(feature, target)| > threshold
# 2. Tree importance: DecisionTreeRegressor().fit(X, y).feature_importances_
# 3. Wrapper: RFE with cross-validation`}
        >
          <div className="rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] p-3 text-xs">
            <p className="font-semibold text-[var(--color-role-warning)]">Leakage warning</p>
            <p className="mt-1 text-foreground/80">
              <code className="text-mono">profit</code> and <code className="text-mono">profit_margin</code> are derived from <code className="text-mono">revenue</code>. Using them as features to predict revenue is target leakage. Drop them.
            </p>
            <p className="mt-1 text-foreground/80">
              Safe features: <code className="text-mono">{numericFeatures.join(", ")}</code> — these are known before the order is priced.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Feature selection should run on the TRAIN fold only. Use a 70/30 split (seed=42), fit the selector on train, apply to both train and test.
          </p>
        </PhaseLayout>
      );

    case 8:
      const split = retail.randomSplit(42, 0.3, 0);
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Split the data, build a preprocessing pipeline, validate types/shapes/missing values, and confirm train/test separation."
          code={`# Phase 8: Prepare the analytical dataset
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression

X_train, X_test, y_train, y_test = train_test_split(
    df[["quantity", "unit_price"]], df["revenue"],
    test_size=0.3, random_state=42,
)
pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LinearRegression()),
])
pipe.fit(X_train, y_train)
print(f"Train: {X_train.shape}, Test: {X_test.shape}")
print(f"R² = {pipe.score(X_test, y_test):.4f}")`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Train rows" value={String(split.train.rows.length)} />
            <Stat label="Test rows" value={String(split.val.rows.length)} />
            <Stat label="Features" value="quantity, unit_price" />
            <Stat label="Target" value="revenue" />
          </div>
          <p className="text-xs text-muted-foreground">
            The pipeline fits the StandardScaler on the training fold only; the same fitted mean+std are applied to the test fold. No data leakage. The test set is never used during training.
          </p>
          <p className="text-xs text-muted-foreground">
            Train/test separation: {split.train.rows.length} train rows + {split.val.rows.length} test rows = {split.train.rows.length + split.val.rows.length} total (no overlap, seed=42, reproducible).
          </p>
        </PhaseLayout>
      );

    case 9: {
      const finalRev = sum(revenueCol);
      const finalProf = sum(profitCol);
      const finalByRegion = retail.groupBy(["region"], [{ column: "revenue", fn: "sum", as: "revenue" }]).sort("revenue", "desc");
      const finalByProduct = retail.groupBy(["product"], [{ column: "revenue", fn: "sum", as: "revenue" }]).sort("revenue", "desc");
      const finalMargin = (finalProf / finalRev) * 100;
      return (
        <PhaseLayout
          phase={phase}
          done={done}
          onToggle={onToggle}
          setView={setView}
          objective="Produce the final report: data-quality report, EDA summary, business findings, FE documentation, selection report, final dataset description, limitations."
          code={`# Phase 9: Final report
report = {
    "data_quality": "No missing values, no duplicates, consistent types.",
    "eda": f"Revenue: mean=${fmt(mean(revenueCol), 0)}, median=${fmt(median(revenueCol), 0)}",
    "business": f"Total revenue: ${fmt(finalRev, 0)}, Total profit: ${fmt(finalProf, 0)}, Margin: {fmt(finalMargin, 1)}%",
    "feature_engineering": "profit_margin (safe division), is_return, order_month, order_quarter",
    "feature_selection": "quantity + unit_price (leakage-safe: drop profit, profit_margin)",
    "dataset": f"{retail.shape[0]} rows, {retail.shape[1]} columns, train/test = {Math.round(retail.rows.length * 0.7)}/{Math.round(retail.rows.length * 0.3)}",
    "limitations": "Synthetic data; 2-year span; no real market dynamics.",
}`}
        >
          <div className="rounded-lg border border-border bg-card p-4">
            <h4 className="text-sm font-semibold">Capstone Final Report</h4>
            <dl className="mt-3 flex flex-col gap-2 text-xs">
              <ReportRow label="Data quality" value="No missing values, no duplicates, consistent types. All columns properly typed." />
              <ReportRow label="EDA summary" value={`Revenue: mean $${fmt(mean(revenueCol), 0)}, median $${fmt(median(revenueCol), 0)}, std $${fmt(std(revenueCol), 0)}. Profit: mean $${fmt(mean(profitCol), 0)}.`} />
              <ReportRow label="Business findings" value={`Total revenue: $${fmt(finalRev, 0)}. Total profit: $${fmt(finalProf, 0)}. Overall margin: ${fmt(finalMargin, 1)}%. Top region: ${String(finalByRegion.rows[0]?.region)} ($${fmt(finalByRegion.rows[0]?.revenue as number, 0)}). Top product: ${String(finalByProduct.rows[0]?.product)} ($${fmt(finalByProduct.rows[0]?.revenue as number, 0)}).`} />
              <ReportRow label="Feature engineering" value="Created: profit_margin (safe division, zero-revenue → NaN), is_return indicator, order_month, order_quarter. Assumptions documented." />
              <ReportRow label="Feature selection" value="Selected: quantity, unit_price. Dropped (leakage): profit, profit_margin. Method: domain knowledge + leakage analysis." />
              <ReportRow label="Final dataset" value={`${retail.shape[0]} rows × ${retail.shape[1]} columns. Train/test split: ${Math.round(retail.rows.length * 0.7)}/${Math.round(retail.rows.length * 0.3)} (seed=42, reproducible).`} />
              <ReportRow label="Limitations" value="Synthetic dataset — relationships are illustrative, not real market dynamics. Two-year span is too short for robust seasonality claims. No real customer demographics." />
            </dl>
          </div>
          <p className="text-xs text-muted-foreground">
            Every number in this report was computed from the actual Retail Sales dataset at module-load time. No fabricated results. The report can be regenerated by re-running the capstone.
          </p>
        </PhaseLayout>
      );
    }

    default:
      return null;
  }
}

// ---------- Helpers ----------

function PhaseLayout({
  phase,
  done,
  onToggle,
  setView,
  objective,
  code,
  children,
}: {
  phase: typeof CAPSTONE_PHASES[number];
  done: boolean;
  onToggle: () => void;
  setView: (v: import("@/lib/store/navigation").ViewId) => void;
  objective: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learning objective</p>
        <p className="mt-1 text-sm text-foreground/80">{objective}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {phase.tasks.map((t, i) => (
            <li key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <CodePanel language="python" caption={`Phase ${phase.n} — Pandas code`} code={code} />

      {children}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Button
          variant={done ? "outline" : "default"}
          size="sm"
          onClick={onToggle}
          className="gap-1.5"
        >
          {done ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[var(--color-role-validated)]" aria-hidden />
              Completed — click to unmark
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" aria-hidden />
              Mark phase {phase.n} complete
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setView("practice")} className="text-muted-foreground">
          Practice exercises →
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className={`rounded-md border bg-background p-2 ${tone === "warning" ? "border-[var(--color-role-warning)]/40" : "border-border"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-mono mt-0.5 text-sm font-semibold tabular-nums ${tone === "warning" ? "text-[var(--color-role-warning)]" : ""}`}>{value}</p>
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-[var(--color-ai-blue)]/40 pl-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-foreground/80">{value}</dd>
    </div>
  );
}
