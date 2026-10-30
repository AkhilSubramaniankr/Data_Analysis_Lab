"use client";

/**
 * Module 11 Lab — Binning & Discretization.
 *
 * Master spec §16. Interactive binning lab: pick a numerical variable,
 * pick a binning strategy (equal-width / equal-frequency / custom-domain),
 * adjust the bin count, see the distribution shift + the summary statistics
 * change. Explains when binning helps business interpretation vs loses
 * information.
 */

import * as React from "react";
import { Scissors, BookOpen, AlertTriangle, RotateCcw } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ChartShell } from "@/components/charts/ChartShell";
import { Histogram } from "@/components/charts/Histogram";
import { BarChart } from "@/components/charts/BarChart";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE11_EXERCISES } from "@/lib/content/exercises/module11";

type BinningStrategy = "equal-width" | "equal-frequency" | "custom-domain";

export function Module11Lab() {
  const retail = React.useMemo(() => DataFrame.fromRows(buildRetailSales().rows), []);

  const numericCols = retail.columns.filter((c) => {
    const dt = retail.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const [col, setCol] = React.useState("revenue");
  const safeCol = numericCols.includes(col) ? col : numericCols[0];

  const [strategy, setStrategy] = React.useState<BinningStrategy>("equal-width");
  const [bins, setBins] = React.useState(5);

  // Custom domain bins (illustrative defaults; user can override via the editor below)
  const [customEdgesText, setCustomEdgesText] = React.useState("0, 50, 100, 200, 500");
  const customEdges = customEdgesText.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  const customLabels = customEdges.slice(0, -1).map((_, i) => `bin ${i + 1}`);

  const binned = (() => {
    try {
      if (strategy === "equal-width") {
        return retail.cutEqualWidth(safeCol, bins);
      }
      if (strategy === "equal-frequency") {
        return retail.cutEqualFreq(safeCol, bins);
      }
      if (customEdges.length >= 2 && customEdges.length === customLabels.length + 1) {
        return retail.cutCustom(safeCol, customEdges, customLabels);
      }
      return retail.cutEqualWidth(safeCol, bins);
    } catch {
      return retail.cutEqualWidth(safeCol, bins);
    }
  })();

  const binColName = strategy === "equal-width" ? `${safeCol}_cut_bin` : strategy === "equal-frequency" ? `${safeCol}_qcut_bin` : `${safeCol}_custom_bin`;

  // Compute bin counts for the bar chart
  const binCounts = (() => {
    const counts = new Map<string, number>();
    for (const v of binned.column(binColName)) {
      const key = v === null || v === undefined ? "null" : typeof v === "boolean" ? String(v) : v;
      counts.set(String(key), (counts.get(String(key)) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => {
      const aN = Number(a[0]); const bN = Number(b[0]);
      if (!Number.isFinite(aN) && !Number.isFinite(bN)) return 0;
      if (!Number.isFinite(aN)) return 1;
      if (!Number.isFinite(bN)) return -1;
      return aN - bN;
    }).map(([label, count]) => ({
      label: String(label),
      value: count,
    }));
  })();

  const originalValues = retail.column(safeCol).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  // Summary statistics on the original column
  const desc = retail.describe().find((d) => d.column === safeCol);

  const code = (() => {
    if (strategy === "equal-width") {
      return `# Equal-width binning with pd.cut
df["${safeCol}_cut_bin"] = pd.cut(df["${safeCol}"], bins=${bins}, labels=False)`;
    }
    if (strategy === "equal-frequency") {
      return `# Equal-frequency (quantile) binning with pd.qcut
df["${safeCol}_qcut_bin"] = pd.qcut(df["${safeCol}"], q=${bins}, labels=False, duplicates="drop")`;
    }
    return `# Custom (domain-defined) binning with pd.cut + explicit edges
edges = [${customEdges.join(", ")}]
labels = [${customLabels.map((l) => `"${l}"`).join(", ")}]
df["${safeCol}_custom_bin"] = pd.cut(
    df["${safeCol}"],
    bins=edges,
    labels=labels,
    include_lowest=True,
)`;
  })();

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Scissors className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a numerical variable, pick a binning strategy, adjust the bin count. Watch how the distribution shifts. Every bin count and edge is real — computed from the actual data.
      </p>

      {/* Controls */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Binning controls</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Column</Label>
            <Select value={safeCol} onValueChange={setCol}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as BinningStrategy)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equal-width">Equal-width (pd.cut)</SelectItem>
                <SelectItem value="equal-frequency">Equal-frequency (pd.qcut)</SelectItem>
                <SelectItem value="custom-domain">Custom domain bins</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {strategy !== "custom-domain" && (
            <div>
              <Label className="text-xs">Number of bins</Label>
              <Select value={String(bins)} onValueChange={(v) => setBins(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 8, 10, 12].map((k) => <SelectItem key={k} value={String(k)}>{k} bins</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {strategy === "custom-domain" && (
            <div>
              <Label className="text-xs">Custom edges (comma-separated)</Label>
              <Input
                value={customEdgesText}
                onChange={(e) => setCustomEdgesText(e.target.value)}
                className="text-mono mt-1 h-9"
                placeholder="0, 50, 100, 200, 500"
              />
            </div>
          )}
        </div>

        {/* Summary stats */}
        {desc && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Count" value={String(desc.count)} tone="data" />
            <Stat label="Mean" value={fmt(desc.mean, 2)} tone="stats" />
            <Stat label="Std" value={fmt(desc.std, 2)} tone="stats" />
            <Stat label="Min" value={fmt(desc.min, 2)} tone="data" />
            <Stat label="Q1 (25%)" value={fmt(desc.q25, 2)} tone="stats" />
            <Stat label="Median (50%)" value={fmt(desc.q50, 2)} tone="stats" />
            <Stat label="Q3 (75%)" value={fmt(desc.q75, 2)} tone="stats" />
            <Stat label="Max" value={fmt(desc.max, 2)} tone="data" />
          </div>
        )}
      </div>

      {/* Code + bin count distribution */}
      <div className="mt-5">
        <CodeAndResult
          code={code}
          caption={`Binning ${safeCol} with ${strategy} (Pandas equivalent)`}
          note={
            strategy === "equal-width"
              ? "Equal-width bins are simple but can be empty for skewed data (e.g., revenue). Use equal-frequency (qcut) instead."
              : strategy === "equal-frequency"
                ? "Equal-frequency (quantile) bins have ~equal row counts per bin. Better for skewed data; can drop duplicate quantile edges with duplicates='drop'."
                : "Custom domain bins encode business meaning (e.g., low / mid / high spend). Use when the business has explicit thresholds; otherwise let the data drive the cut."
          }
        >
          <ChartShell
            title={`${strategy} binning of ${safeCol}`}
            subtitle={`Bin counts after applying the ${strategy} strategy.`}
            annotation={{
              question: `How are rows distributed across the ${bins} bins?`,
              whyThisChart: "Bar chart of bin counts reveals skew in the bin distribution. Equal-width on skewed data tends to overload one bin; equal-frequency produces flat counts.",
              shows: `${binCounts.length} non-empty bins, with row counts per bin.`,
              doesNotEstablish: "Binning does not establish that discretization improves model performance — it loses information. Always compare a model with the binned feature to one with the raw feature.",
              nextStep: "If a single bin dominates, try equal-frequency instead. If bins are roughly flat, you've found a sensible discretization.",
            }}
          >
            <BarChart data={binCounts} xLabel="Bin index" yLabel="Row count" altText={`Bar chart of bin counts for ${safeCol} with ${strategy} strategy`} />
          </ChartShell>
        </CodeAndResult>
      </div>

      {/* Original vs binned view */}
      <div className="mt-5">
        <ChartShell
          title={`Original distribution of ${safeCol}`}
          subtitle="The raw, un-binned distribution for comparison."
          annotation={{
            question: `What does the original distribution look like?`,
            whyThisChart: "Histogram of the raw values lets you see whether binning will lose information.",
            shows: `${originalValues.length} non-null values across ${Math.min(20, Math.max(8, Math.floor(originalValues.length / 20)))} bins.`,
            doesNotEstablish: "The original distribution does NOT establish that binning is needed. Binning is a transformation choice, not a necessity.",
            nextStep: "If the distribution is long-tailed, log1p + raw bin may serve better than binning.",
          }}
        >
          <Histogram values={originalValues} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of original ${safeCol}`} />
        </ChartShell>
      </div>

      <div className="mt-5 rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-[var(--color-role-warning)]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Information loss vs interpretability
        </p>
        <p className="mt-1 text-foreground/80">
          Binning trades information for interpretability. A continuous feature like revenue has thousands of distinct values; binning collapses them to k bins. Tree models don't need binning (they discretize internally via splits); linear models benefit when the relationship is genuinely non-monotonic and the bins capture the shape.
        </p>
      </div>

      <div className="mt-5">
        <CodeAndResult
          code={`# Compare the original vs binned view
print("Original column dtype:", df["${safeCol}"].dtype)
print("Binned column dtype:  ", df["${binColName}"].dtype)
print("Distinct original values: ", df["${safeCol}"].nunique())
print("Distinct binned values:   ", df["${binColName}"].nunique())
print("Null binned values: ", df["${binColName}"].isna().sum())`}
          caption="Compare original vs binned"
        >
          <DatasetTable df={binned.head(15)} pageSize={15} />
        </CodeAndResult>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE11_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "data" | "transform" | "stats" | "validated" | "warning" | "error" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-2 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold text-role tabular-nums">{value}</p>
    </div>
  );
}
