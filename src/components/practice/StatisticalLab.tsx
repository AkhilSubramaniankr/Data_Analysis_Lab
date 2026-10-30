"use client";

/**
 * StatisticalLab — a sandbox for computing statistics on any column of
 * any dataset. The learner picks a dataset + column and sees every
 * statistic (count, mean, median, std, var, quantiles, IQR, skewness,
 * kurtosis, outliers) computed from the real data.
 */

import * as React from "react";
import { Sigma, AlertTriangle } from "lucide-react";
import { BUILT_IN_DATASETS } from "@/lib/data/datasets";
import { DataFrame, fmt } from "@/lib/data/frame";
import {
  mean, median, mode, min, max, std, variance,
  quantile, iqr, skewness, kurtosis, tukeyFence, toNumericArray,
} from "@/lib/data/stats";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Histogram } from "@/components/charts/Histogram";
import { ChartShell } from "@/components/charts/ChartShell";

export function StatisticalLab() {
  const [datasetId, setDatasetId] = React.useState("retail");
  const [colName, setColName] = React.useState("revenue");
  const spec = BUILT_IN_DATASETS.find((d) => d.id === datasetId) ?? BUILT_IN_DATASETS[0];
  const df = DataFrame.fromRows(spec.rows);

  const numericCols = df.columns.filter((c) => {
    const dt = df.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const safeCol = numericCols.includes(colName) ? colName : numericCols[0] ?? "";

  const xs = toNumericArray(df.column(safeCol));
  const fence = tukeyFence(xs);

  const stats: { label: string; value: string; tone?: string }[] = xs.length > 0 ? [
    { label: "Count", value: String(xs.length) },
    { label: "Mean", value: fmt(mean(xs), 4) },
    { label: "Median", value: fmt(median(xs), 4) },
    { label: "Mode", value: mode(xs).length > 0 ? mode(xs).map((m) => fmt(m, 2)).join(", ") : "—" },
    { label: "Min", value: fmt(min(xs), 4) },
    { label: "Max", value: fmt(max(xs), 4) },
    { label: "Range", value: fmt(max(xs) - min(xs), 4) },
    { label: "Var (sample)", value: fmt(variance(xs), 4) },
    { label: "Std (sample)", value: fmt(std(xs), 4) },
    { label: "Q1 (25%)", value: fmt(quantile(xs, 0.25), 4) },
    { label: "Q2 (50%)", value: fmt(quantile(xs, 0.50), 4) },
    { label: "Q3 (75%)", value: fmt(quantile(xs, 0.75), 4) },
    { label: "IQR", value: fmt(iqr(xs), 4) },
    { label: "Skewness", value: fmt(skewness(xs), 4), tone: Math.abs(skewness(xs)) > 1 ? "warning" : undefined },
    { label: "Excess kurtosis", value: fmt(kurtosis(xs), 4) },
    { label: "Tukey lower fence", value: fmt(fence.lower, 4) },
    { label: "Tukey upper fence", value: fmt(fence.upper, 4) },
    { label: "Outliers (1.5·IQR)", value: String(fence.outliers.length), tone: fence.outliers.length > 0 ? "warning" : undefined },
  ] : [{ label: "No data", value: "—" }];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Dataset</Label>
          <Select value={datasetId} onValueChange={(v) => {
            setDatasetId(v);
            const newSpec = BUILT_IN_DATASETS.find((d) => d.id === v)!;
            const newDf = DataFrame.fromRows(newSpec.rows);
            const newNumCols = newDf.columns.filter((c) => {
              const dt = newDf.dtype(c);
              return dt === "int64" || dt === "float64";
            });
            setColName(newNumCols[0] ?? "");
          }}>
            <SelectTrigger className="mt-1 w-[16rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUILT_IN_DATASETS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Column</Label>
          <Select value={safeCol} onValueChange={setColName}>
            <SelectTrigger className="mt-1 w-[16rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono text-xs">{c}</code></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats grid */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Sigma className="h-4 w-4 text-muted-foreground" aria-hidden />
          Descriptive statistics — {safeCol}
        </h4>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-md border border-border bg-background p-2 ${s.tone === "warning" ? "border-[var(--color-role-warning)]/40" : ""}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-mono mt-0.5 text-sm font-semibold tabular-nums ${s.tone === "warning" ? "text-[var(--color-role-warning)]" : ""}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Histogram */}
      {xs.length > 0 && (
        <ChartShell
          title={`Distribution of ${safeCol}`}
          subtitle="Real histogram from the dataset."
          annotation={{
            question: `What is the shape of ${safeCol}?`,
            whyThisChart: "Histogram reveals the distribution shape — long-tail, symmetric, bimodal.",
            shows: `${xs.length} non-null values in ${Math.min(20, Math.max(8, Math.floor(xs.length / 20)))} bins.`,
            doesNotEstablish: "The distribution shape does not predict individual future values.",
            nextStep: "If long-tailed, try log1p transform (Module 9) or report median + IQR instead of mean + std.",
          }}
        >
          <Histogram values={xs} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of ${safeCol}`} />
        </ChartShell>
      )}

      {/* Outlier list */}
      {fence.outliers.length > 0 && (
        <div className="rounded-lg border border-[var(--color-role-warning)]/40 bg-card p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-role-warning)]">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Outliers flagged by Tukey&apos;s 1.5·IQR fence ({fence.outliers.length})
          </h4>
          <p className="mt-1 text-xs text-foreground/80">
            Outliers are not automatically errors — investigate each one before dropping. In retail, large orders may be legitimate bulk purchases; in finance, large transactions may be real.
          </p>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-background p-2">
            <ul className="text-mono text-xs">
              {fence.outliers.slice(0, 50).map((o) => (
                <li key={o.index}>row {o.index}: <span className="text-[var(--color-role-warning)]">{fmt(o.value, 2)}</span></li>
              ))}
              {fence.outliers.length > 50 && <li>... and {fence.outliers.length - 50} more</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
