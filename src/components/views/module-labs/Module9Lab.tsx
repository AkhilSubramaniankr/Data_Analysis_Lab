"use client";

/**
 * Module 9 Lab — Feature Engineering Fundamentals.
 *
 * Master spec §14. Hands-on feature creation: total order value, profit
 * margin (with zero-denominator safety + the safe NumPy form), customer
 * tenure, RFM (recency/frequency/monetary) aggregation, and mathematical
 * transformations (log1p, sqrt, polynomial, interaction).
 *
 * Every feature is computed from the real Retail Sales dataset.
 */

import * as React from "react";
import { Wrench, BookOpen, AlertTriangle, Plus, RotateCcw } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ChartShell } from "@/components/charts/ChartShell";
import { Histogram } from "@/components/charts/Histogram";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE9_EXERCISES } from "@/lib/content/exercises/module9";

export function Module9Lab() {
  const retail = DataFrame.fromRows(buildRetailSales().rows);

  // Compute profit margin with safe (NumPy-style) division: replace 0 in revenue with NaN, then divide.
  const withMargin = retail.withColumn("profit_margin", (r) => {
    const rev = r.revenue;
    const prof = r.profit;
    if (typeof rev !== "number" || typeof prof !== "number") return null;
    if (!Number.isFinite(rev) || !Number.isFinite(prof)) return null;
    // Safe: revenue=0 → NaN (not Inf, not silently imputed)
    if (rev === 0) return null;
    return (prof / rev) * 100;
  }).withColumn("is_zero_revenue", (r) => (r.revenue === 0));

  const zeroRevenueCount = withMargin.rows.filter((r) => r.is_zero_revenue === true).length;
  const nullMarginCount = withMargin.rows.filter((r) => r.profit_margin === null).length;
  const marginValues = withMargin.column("profit_margin").filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  // ----- Customer-level features (RFM) -----
  // Recency = (max date - last transaction date per customer) in days
  // Frequency = count of orders per customer
  // Monetary = sum of revenue per customer
  const customerRfm = (() => {
    const maxDateStr = retail.rows.reduce((max, r) => {
      const d = r.order_date;
      return typeof d === "string" && d > max ? d : max;
    }, "0000-00-00");
    const maxDate = new Date(maxDateStr + "T00:00:00Z");
    // Group by customer_id
    const byCustomer = new Map<string, { dates: string[]; revenue: number; freq: number }>();
    for (const r of retail.rows) {
      const cid = r.customer_id;
      if (typeof cid !== "string") continue;
      const cur = byCustomer.get(cid) ?? { dates: [], revenue: 0, freq: 0 };
      if (typeof r.order_date === "string") cur.dates.push(r.order_date);
      if (typeof r.revenue === "number") cur.revenue += r.revenue;
      cur.freq += 1;
      byCustomer.set(cid, cur);
    }
    const rows = Array.from(byCustomer.entries()).map(([customer_id, data]) => {
      const lastDateStr = data.dates.sort().pop() ?? maxDateStr;
      const lastDate = new Date(lastDateStr + "T00:00:00Z");
      const recency = Math.max(0, Math.round((maxDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        customer_id,
        recency_days: recency,
        frequency: data.freq,
        monetary: +data.revenue.toFixed(2),
      };
    });
    return DataFrame.fromRows(rows).sort("monetary", "desc");
  })();

  // ----- Transform playground -----
  const numericCols = retail.columns.filter((c) => {
    const dt = retail.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const [transformCol, setTransformCol] = React.useState("revenue");
  const [transformType, setTransformType] = React.useState<"log1p" | "log" | "sqrt" | "square" | "cube" | "reciprocal">("log1p");
  const safeCol = numericCols.includes(transformCol) ? transformCol : numericCols[0];

  const transformedDf = retail.transform(safeCol, transformType);

  const originalValues = retail.column(safeCol).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const transformedValues = transformedDf.column(`${safeCol}_${transformType}`).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  // ----- Interaction feature -----
  const withInteraction = retail.interaction("quantity", "unit_price", "revenue_recomputed")
    .withColumn("matches_actual", (r) => {
      return typeof r.revenue === "number" && typeof r.revenue_recomputed === "number" && Math.abs(r.revenue - r.revenue_recomputed) < 0.01;
    });

  const transformCode = `# Apply a ${transformType} transform to the ${safeCol} column
df["${safeCol}_${transformType}"] = ${transformTransformCode(transformType, safeCol)}`;

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Build derived features on the real Retail Sales dataset: profit margin with zero-denominator safety (the safe NumPy form the master spec requires), customer RFM aggregation, mathematical transformations, and interaction features. Every result is computed from the actual rows.
      </p>

      {/* --- 1. Profit margin with safe division --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-[var(--color-role-warning)]" aria-hidden />
          Profit margin with zero-denominator safety
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          The naive form (<code className="text-mono">profit / revenue * 100</code>) divides by zero when revenue is 0 (returns). The master spec requires the safe NumPy form: replace 0 in revenue with NaN, then divide. Rows with revenue=0 produce NaN rather than ±Inf — the learner must decide how to interpret them (drop? impute? keep as a "returns" indicator?).
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Rows" value={String(withMargin.rows.length)} tone="data" />
          <Stat label="Zero-revenue rows (returns)" value={String(zeroRevenueCount)} tone="warning" />
          <Stat label="NaN margin produced" value={String(nullMarginCount)} tone="warning" />
          <Stat label="Mean margin (non-NaN)" value={`${fmt(marginValues.length > 0 ? marginValues.reduce((a, b) => a + b, 0) / marginValues.length : NaN, 2)}%`} tone="stats" />
        </div>

        <div className="mt-3">
          <CodeAndResult
            code={`# Naive form — divides by zero when revenue=0:
df["profit_margin_naive"] = df["profit"] / df["revenue"] * 100
# → produces ±Inf for zero-revenue rows.

# Safe form (master spec §21):
import numpy as np
df["profit_margin"] = (
    df["profit"]
        .div(df["revenue"].replace(0, np.nan))
        .mul(100)
)
# → produces NaN for zero-revenue rows.
df["is_zero_revenue"] = df["revenue"] == 0  # indicator`}
            caption="Profit margin — naive vs safe form (Pandas equivalent)"
            note="The indicator column is_zero_revenue preserves the 'was a return' signal — useful for downstream models. Decide a deliberate interpretation policy for the NaN margins (drop? impute? leave?)."
          >
            <DatasetTable df={withMargin.head(15)} pageSize={15} />
          </CodeAndResult>
        </div>
      </div>

      {/* --- 2. Customer RFM aggregation --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Customer-level features (RFM)</h3>
        <p className="mt-1 text-xs text-foreground/80">
          RFM = Recency (days since last order), Frequency (number of orders), Monetary (total revenue). The classic customer-segmentation feature set. Built by grouping orders by customer_id, then aggregating.
        </p>

        <div className="mt-3">
          <CodeAndResult
            code={`# Customer-level RFM features
snapshot_date = df["order_date"].max()
rfm = df.groupby("customer_id").agg(
    recency=("order_date", lambda s: (snapshot_date - s.max()).days),
    frequency=("order_id", "count"),
    monetary=("revenue", "sum"),
).reset_index()
# Sort by monetary descending to see top customers:
rfm = rfm.sort_values("monetary", ascending=False)`}
            caption="Customer-level RFM aggregation (Pandas equivalent)"
            note="RFM is a customer-level abstraction. The grain changes from order to customer; you cannot join it back to the original orders without a customer_id key."
          >
            <DatasetTable df={customerRfm.head(15)} pageSize={15} />
          </CodeAndResult>
        </div>
      </div>

      {/* --- 3. Mathematical transformations --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Mathematical transformations</h3>
        <p className="mt-1 text-xs text-foreground/80">
          Pick a column and a transform. Compare the original distribution to the transformed one. Long-tailed revenue becomes near-normal after log1p — useful for linear regression. Square and cube expose polynomial structure.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Column</Label>
            <Select value={safeCol} onValueChange={setTransformCol}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Transform</Label>
            <Select value={transformType} onValueChange={(v) => setTransformType(v as "log1p" | "log" | "sqrt" | "square" | "cube" | "reciprocal")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="log1p">log1p (log(1+x)) — handles 0</SelectItem>
                <SelectItem value="log">log(x) — positive only</SelectItem>
                <SelectItem value="sqrt">sqrt — non-negative only</SelectItem>
                <SelectItem value="square">square</SelectItem>
                <SelectItem value="cube">cube</SelectItem>
                <SelectItem value="reciprocal">reciprocal (1/x) — null for 0</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <CodeAndResult code={transformCode} caption="Transform (Pandas equivalent)" note="log1p is preferred over log for retail revenue — it handles the zero-revenue (returns) rows without producing -Inf. Square and cube should be paired with a polynomial feature in a linear model to capture curvature.">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartShell
                title={`Original: ${safeCol}`}
                subtitle="Real distribution from the Retail Sales dataset."
                annotation={{
                  question: `What is the shape of ${safeCol}?`,
                  whyThisChart: "Histogram reveals distribution shape (long-tail, normal, bimodal).",
                  shows: `Distribution of ${safeCol} across ${originalValues.length} non-null rows.`,
                  doesNotEstablish: "A long-tail shape does NOT establish that a model needs the raw feature — it suggests a transformation may help.",
                  nextStep: "Apply log1p to compress the long tail (see chart on the right).",
                }}
              >
                <Histogram values={originalValues} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of ${safeCol}`} />
              </ChartShell>

              <ChartShell
                title={`Transformed: ${safeCol}_${transformType}`}
                subtitle={`After applying ${transformType}.`}
                annotation={{
                  question: `How does ${transformType} change the distribution?`,
                  whyThisChart: "Compare with the original. log1p on a long-tailed variable compresses the tail — useful for linear models.",
                  shows: `Distribution of ${safeCol} after the ${transformType} transform.`,
                  doesNotEstablish: "A near-normal transformed distribution does NOT mean the raw feature was wrong — only that a model might prefer the transformed version.",
                  nextStep: "If the transform helps, use it in a model and compare cross-validation scores with the raw feature.",
                }}
              >
                <Histogram values={transformedValues} bins={12} xLabel={`${safeCol}_${transformType}`} yLabel="Frequency" altText={`Histogram of ${safeCol} after ${transformType}`} />
              </ChartShell>
            </div>
          </CodeAndResult>
        </div>
      </div>

      {/* --- 4. Interaction feature --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Interaction feature: quantity × unit_price</h3>
        <p className="mt-1 text-xs text-foreground/80">
          Create an interaction feature <code className="text-mono">quantity × unit_price</code> and verify it matches the existing <code className="text-mono">revenue</code> column. This is the canonical example: revenue IS the interaction — by construction.
        </p>

        <div className="mt-3">
          <CodeAndResult
            code={`# Create an interaction feature
df["revenue_recomputed"] = df["quantity"] * df["unit_price"]

# Verify it matches the existing revenue column (within rounding tolerance):
df["matches_actual"] = np.isclose(df["revenue"], df["revenue_recomputed"], atol=0.01)
assert df["matches_actual"].all()  # if any False, the dataset is inconsistent!`}
            caption="Interaction feature (Pandas equivalent)"
            note="For tree-based models, interactions are auto-discovered via splits. For linear models, you must add interaction features explicitly — the linear form has no native multiplicative term."
          >
            <DatasetTable df={withInteraction.head(15)} pageSize={15} />
          </CodeAndResult>
        </div>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE9_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

function transformTransformCode(t: string, col: string): string {
  switch (t) {
    case "log1p": return `np.log1p(df["${col}"])`;
    case "log": return `np.log(df["${col}"])  # positive only; negative → NaN`;
    case "sqrt": return `np.sqrt(df["${col}"])  # non-negative only`;
    case "square": return `df["${col}"] ** 2`;
    case "cube": return `df["${col}"] ** 3`;
    case "reciprocal": return `1 / df["${col}"].replace(0, np.nan)  # null for zero`;
    default: return `df["${col}"]`;
  }
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "data" | "transform" | "stats" | "validated" | "warning" | "error" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-2 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold text-role tabular-nums">{value}</p>
    </div>
  );
}
