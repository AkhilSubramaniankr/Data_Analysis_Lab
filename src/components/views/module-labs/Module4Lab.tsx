"use client";

/**
 * Module 4 Lab — Descriptive Statistics.
 *
 * Master spec §9. Interactive mean/median/mode/var/std/quantile/IQR/
 * skewness/kurtosis explorer + outlier investigation + the
 * "edit-an-observation" widget that shows how a single outlier
 * distorts the mean and std.
 *
 * All numbers are computed from the real Retail Sales dataset.
 */

import * as React from "react";
import { Sigma, BookOpen, TrendingUp, TrendingDown, AlertTriangle, RotateCcw } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import {
  mean,
  median,
  mode,
  min,
  max,
  variance,
  variancePop,
  std,
  stdPop,
  quantile,
  iqr,
  skewness,
  kurtosis,
  tukeyFence,
  toNumericArray,
} from "@/lib/data/stats";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE4_EXERCISES } from "@/lib/content/exercises/module4";

export function Module4Lab() {
  const retail = React.useMemo(() => {
    const spec = buildRetailSales();
    return DataFrame.fromRows(spec.rows);
  }, []);

  const numericCols = retail.columns.filter((c) => {
    const dt = retail.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const [col, setCol] = React.useState<string>(numericCols.find((c) => c === "revenue") ?? numericCols[0]);
  const safeCol = numericCols.includes(col) ? col : numericCols[0];

  // ----- editable observation widget state -----
  const [editIdx, setEditIdx] = React.useState<number>(0);
  const [editValue, setEditValue] = React.useState<string>("100");
  const [applied, setApplied] = React.useState<{ idx: number; value: number } | null>(null);

  // Compute the numeric array for the chosen column. The dataset is small
  // (240 rows) so we compute directly — no manual memoization needed.
  const xs = toNumericArray(retail.column(safeCol));
  const xsEdited = applied
    ? xs.map((v, i) => (i === applied.idx ? applied.value : v))
    : xs;

  const fence = tukeyFence(xsEdited);

  // Compute all the stats. The arithmetic is real — no rounding inside.
  const stats = {
    count: xsEdited.length,
    mean: mean(xsEdited),
    median: median(xsEdited),
    mode: mode(xsEdited),
    min: min(xsEdited),
    max: max(xsEdited),
    range: max(xsEdited) - min(xsEdited),
    variance: variance(xsEdited),
    variancePop: variancePop(xsEdited),
    std: std(xsEdited),
    stdPop: stdPop(xsEdited),
    q25: quantile(xsEdited, 0.25),
    q50: quantile(xsEdited, 0.50),
    q75: quantile(xsEdited, 0.75),
    iqr: iqr(xsEdited),
    skewness: skewness(xsEdited),
    kurtosis: kurtosis(xsEdited),
    outliers: fence.outliers,
  };

  const statsCode = `col = "${safeCol}"
s = df["${safeCol}"]

s.count()           # ${stats.count}
s.mean()            # ${fmt(stats.mean, 4)}
s.median()          # ${fmt(stats.median, 4)}
s.min()             # ${fmt(stats.min, 2)}
s.max()             # ${fmt(stats.max, 2)}
s.var()             # ${fmt(stats.variance, 4)}  (sample, ddof=1)
s.std()             # ${fmt(stats.std, 4)}
s.quantile(0.25)    # ${fmt(stats.q25, 4)}
s.quantile(0.50)    # ${fmt(stats.q50, 4)}  (median)
s.quantile(0.75)    # ${fmt(stats.q75, 4)}
s.skew()            # ${fmt(stats.skewness, 4)}
s.kurt()            # ${fmt(stats.kurtosis, 4)}`;

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Sigma className="h-4 w-4 text-[var(--color-role-stats)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a numerical column, see every descriptive statistic computed from the actual data. Then edit a single observation and watch how the mean and std move — a vivid demo of why outliers distort the mean but barely move the median.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Label className="text-xs font-semibold uppercase tracking-wider">Column</Label>
        <Select value={safeCol} onValueChange={setCol}>
          <SelectTrigger className="w-[12rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-mono text-xs text-muted-foreground">
          n = {stats.count} · dtype = {retail.dtype(safeCol)}
        </span>
      </div>

      <div className="mt-4">
        <CodeAndResult code={statsCode} caption="describe() — every statistic at once" note="var() and std() default to ddof=1 (sample). Use ddof=0 for population statistics. The 50% quantile equals the median. The IQR (Q3 − Q1) is the basis for the Tukey outlier fence at Q1 − 1.5·IQR and Q3 + 1.5·IQR.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="count" value={fmt(stats.count, 0)} tone="data" />
            <Stat label="mean" value={fmt(stats.mean, 2)} tone="stats" />
            <Stat label="median" value={fmt(stats.median, 2)} tone="stats" />
            <Stat label="mode" value={stats.mode.length === 0 ? "—" : stats.mode.map((m) => fmt(m, 2)).join(", ")} tone="stats" />
            <Stat label="min" value={fmt(stats.min, 2)} tone="data" />
            <Stat label="max" value={fmt(stats.max, 2)} tone="data" />
            <Stat label="range" value={fmt(stats.range, 2)} tone="data" />
            <Stat label="var (sample)" value={fmt(stats.variance, 2)} tone="stats" />
            <Stat label="std (sample)" value={fmt(stats.std, 2)} tone="stats" />
            <Stat label="var (population)" value={fmt(stats.variancePop, 2)} tone="stats" />
            <Stat label="std (population)" value={fmt(stats.stdPop, 2)} tone="stats" />
            <Stat label="Q1 (25%)" value={fmt(stats.q25, 2)} tone="stats" />
            <Stat label="Q2 (50%, median)" value={fmt(stats.q50, 2)} tone="stats" />
            <Stat label="Q3 (75%)" value={fmt(stats.q75, 2)} tone="stats" />
            <Stat label="IQR" value={fmt(stats.iqr, 2)} tone="stats" />
            <Stat label="skewness" value={fmt(stats.skewness, 3)} tone={Math.abs(stats.skewness) > 1 ? "warning" : "stats"} />
            <Stat label="excess kurtosis" value={fmt(stats.kurtosis, 3)} tone="stats" />
          </div>
        </CodeAndResult>
      </div>

      {/* Mean vs median interpretation */}
      <div className={`mt-4 rounded-md border p-3 text-sm ${Math.abs(stats.skewness) > 1 ? "border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)]" : "border-border bg-card"}`}>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          {stats.skewness > 0.5 ? (
            <>
              <TrendingUp className="h-3.5 w-3.5 text-[var(--color-role-warning)]" aria-hidden />
              <span className="text-[var(--color-role-warning)]">Right-skewed distribution</span>
            </>
          ) : stats.skewness < -0.5 ? (
            <>
              <TrendingDown className="h-3.5 w-3.5 text-[var(--color-role-warning)]" aria-hidden />
              <span className="text-[var(--color-role-warning)]">Left-skewed distribution</span>
            </>
          ) : (
            <span className="text-muted-foreground">Approximately symmetric</span>
          )}
        </p>
        <p className="mt-1 text-foreground/80">
          {Math.abs(stats.skewness) > 1
            ? `The skewness is ${fmt(stats.skewness, 3)} — outside ±1, meaning the distribution is noticeably skewed. Mean (${fmt(stats.mean, 2)}) and median (${fmt(stats.median, 2)}) differ because the tail pulls the mean in its direction. For a fair summary, report the median and IQR, not the mean and std.`
            : `The skewness is ${fmt(stats.skewness, 3)} — within ±0.5, meaning the distribution is roughly symmetric. Mean and median are close (${fmt(stats.mean, 2)} vs ${fmt(stats.median, 2)}), and either is a reasonable summary.`}
        </p>
      </div>

      {/* Outlier investigation */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-[var(--color-role-warning)]" aria-hidden />
          Outlier investigation (Tukey's 1.5·IQR fence)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The Tukey fence flags values below Q1 − 1.5·IQR or above Q3 + 1.5·IQR. The fence is robust: it depends on quantiles, not the mean or std, so the fence itself isn't pulled by the outliers.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Q1" value={fmt(stats.q25, 2)} tone="stats" />
          <Stat label="Q3" value={fmt(stats.q75, 2)} tone="stats" />
          <Stat label="Lower fence" value={fmt(fence.lower, 2)} tone="warning" />
          <Stat label="Upper fence" value={fmt(fence.upper, 2)} tone="warning" />
          <Stat label="Outliers flagged" value={String(stats.outliers.length)} tone={stats.outliers.length > 0 ? "warning" : "validated"} />
          <Stat label="Outlier % of n" value={`${((stats.outliers.length / Math.max(stats.count, 1)) * 100).toFixed(2)}%`} tone="data" />
        </div>
        {stats.outliers.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-role-validated)]">No outliers flagged at the 1.5·IQR fence.</p>
        ) : (
          <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border bg-background p-2">
            <ul className="text-mono text-xs">
              {stats.outliers.slice(0, 30).map((o) => (
                <li key={o.index}>
                  row {o.index}: <span className="text-[var(--color-role-warning)]">{fmt(o.value, 2)}</span>
                </li>
              ))}
              {stats.outliers.length > 30 && <li>... and {stats.outliers.length - 30} more</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Edit-an-observation widget */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-[var(--color-ai-blue)]" aria-hidden />
          Edit an observation: watch the statistics move
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a row index (0 to n-1) and set a new value for <code className="text-mono">{safeCol}</code>. Watch the mean and std move toward the new value — but the median and IQR barely move. This is the classic illustration of why the mean and std are not robust to outliers.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="row-idx" className="text-xs">Row index</Label>
            <Input
              id="row-idx"
              type="number"
              min={0}
              max={Math.max(0, stats.count - 1)}
              value={editIdx}
              onChange={(e) => setEditIdx(Math.max(0, Math.min(stats.count - 1, Number(e.target.value))))}
              className="text-mono mt-1 h-8 w-24"
            />
          </div>
          <div>
            <Label htmlFor="row-val" className="text-xs">New value</Label>
            <Input
              id="row-val"
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="text-mono mt-1 h-8 w-32"
            />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const v = Number(editValue);
              if (Number.isFinite(v)) setApplied({ idx: editIdx, value: v });
            }}
          >
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setApplied(null)} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
        </div>

        {applied && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Compare label="Original" stats={{
              mean: mean(xs), median: median(xs), std: std(xs), iqr: iqr(xs),
            }} />
            <Compare label={`After (row ${applied.idx} → ${applied.value})`} stats={{
              mean: stats.mean, median: stats.median, std: stats.std, iqr: stats.iqr,
            }} highlight />
          </div>
        )}
        <div className="mt-3 rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] p-2 text-xs text-foreground/80">
          <span className="font-semibold text-[var(--color-role-warning)]">Practical takeaway: </span>
          Try setting row 0 to {fmt(stats.max * 10, 0)} (10× the current max). The mean will jump; the median will barely move. This is why income, house prices, and other long-tailed distributions are reported with the median, not the mean.
        </div>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE4_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "data" | "transform" | "stats" | "validated" | "warning" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-2 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold text-role tabular-nums">{value}</p>
    </div>
  );
}

function Compare({
  label,
  stats,
  highlight,
}: {
  label: string;
  stats: { mean: number; median: number; std: number; iqr: number };
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-md border border-border bg-background p-3 ${highlight ? "ring-1 ring-[var(--color-ai-blue)]/40" : ""}`}>
      <p className="text-xs font-semibold">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">mean: </span><span className="text-mono font-semibold">{fmt(stats.mean, 2)}</span></div>
        <div><span className="text-muted-foreground">median: </span><span className="text-mono font-semibold">{fmt(stats.median, 2)}</span></div>
        <div><span className="text-muted-foreground">std: </span><span className="text-mono font-semibold">{fmt(stats.std, 2)}</span></div>
        <div><span className="text-muted-foreground">IQR: </span><span className="text-mono font-semibold">{fmt(stats.iqr, 2)}</span></div>
      </div>
    </div>
  );
}
