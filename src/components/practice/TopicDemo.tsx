"use client";

/**
 * TopicDemo — renders a live, interactive demonstration for an
 * Interactive Learning topic.
 *
 * Each demo kind reuses the existing DataFrame engine, built-in datasets,
 * and chart components — no new dependencies. The user can change columns,
 * transforms, scalers, selection methods, etc. and see the result update
 * in real time. Every value is computed from real data.
 *
 * The demo is rendered ABOVE the textual content in the topic accordion,
 * so the learner can interact first and read the explanation after.
 */

import * as React from "react";
import { Sparkles, Database, ArrowRight } from "lucide-react";
import { BUILT_IN_DATASETS } from "@/lib/data/datasets";
import { DataFrame, fmt } from "@/lib/data/frame";
import {
  mean, median, std, variance, quantile, iqr, min, max,
  toNumericArray, tukeyFence, skewness, kurtosis,
} from "@/lib/data/stats";
import {
  varianceThreshold, correlationSelect, selectKBest,
} from "@/lib/data/feature-selection";
import { treeFeatureImportance, lassoFeatureImportance, toFeatureMatrix } from "@/lib/data/ml";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ChartShell } from "@/components/charts/ChartShell";
import { Histogram } from "@/components/charts/Histogram";
import { ScatterChart } from "@/components/charts/ScatterChart";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import type { TopicDemoSpec } from "@/lib/content/interactive-topics";
import type { CellValue, Row } from "@/lib/data/types";

// ---------- Helpers ----------

/** Get a dataset by id, falling back to retail. */
function useDataset(datasetId?: string) {
  return React.useMemo(() => {
    const spec = BUILT_IN_DATASETS.find((d) => d.id === datasetId) ?? BUILT_IN_DATASETS[0];
    return { spec, df: DataFrame.fromRows(spec.rows) };
  }, [datasetId]);
}

/** Numeric columns of a DataFrame. */
function numericCols(df: DataFrame): string[] {
  return df.columns.filter((c) => {
    const dt = df.dtype(c);
    return dt === "int64" || dt === "float64";
  });
}

/** Categorical (object) columns of a DataFrame. */
function categoricalCols(df: DataFrame): string[] {
  return df.columns.filter((c) => {
    const dt = df.dtype(c);
    return dt === "object" || dt === "category";
  });
}

/** Resolve a default column, falling back to the first numeric column. */
function resolveCol(df: DataFrame, requested: string | undefined, fallbackList: string[]): string {
  if (requested && fallbackList.includes(requested)) return requested;
  return fallbackList[0] ?? "";
}

/** Stat tile (small grid cell). */
function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className={`rounded-md border bg-background p-2 ${tone === "warning" ? "border-[var(--color-role-warning)]/40" : "border-border"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-mono mt-0.5 text-sm font-semibold tabular-nums ${tone === "warning" ? "text-[var(--color-role-warning)]" : ""}`}>{value}</p>
    </div>
  );
}

/** Demo wrapper — common header + "Deterministic demo" badge. */
function DemoShell({ title, children, controls }: {
  title: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-ai-cyan)]" aria-hidden />
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          Deterministic demo
        </Badge>
      </div>
      {controls && <div className="mb-3 flex flex-wrap items-end gap-3">{controls}</div>}
      {children}
    </div>
  );
}

/** Dataset + column pickers (compact). */
function DatasetPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Dataset</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 w-[14rem]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {BUILT_IN_DATASETS.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name} ({d.rows.length})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ColumnPicker({ cols, value, onChange, label = "Column" }: {
  cols: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 w-[14rem]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {cols.map((c) => (
            <SelectItem key={c} value={c}><code className="text-mono text-xs">{c}</code></SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------- Demo renderers ----------

function DescribeStatsDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "describe-stats" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const [colName, setColName] = React.useState(spec.defaultCol ?? "revenue");
  const numCols = numericCols(df);
  const safeCol = resolveCol(df, colName, numCols);
  const xs = toNumericArray(df.column(safeCol));
  const fence = tukeyFence(xs);

  const stats: { label: string; value: string; tone?: "warning" }[] = xs.length > 0 ? [
    { label: "Count", value: String(xs.length) },
    { label: "Mean", value: fmt(mean(xs), 4) },
    { label: "Median", value: fmt(median(xs), 4) },
    { label: "Std (sample)", value: fmt(std(xs), 4) },
    { label: "Var (sample)", value: fmt(variance(xs), 4) },
    { label: "Min", value: fmt(min(xs), 4) },
    { label: "Q1 (25%)", value: fmt(quantile(xs, 0.25), 4) },
    { label: "Q3 (75%)", value: fmt(quantile(xs, 0.75), 4) },
    { label: "Max", value: fmt(max(xs), 4) },
    { label: "IQR", value: fmt(iqr(xs), 4) },
    { label: "Skewness", value: fmt(skewness(xs), 4), tone: Math.abs(skewness(xs)) > 1 ? "warning" : undefined },
    { label: "Kurtosis", value: fmt(kurtosis(xs), 4) },
    { label: "Tukey lower", value: fmt(fence.lower, 4) },
    { label: "Tukey upper", value: fmt(fence.upper, 4) },
    { label: "Outliers", value: String(fence.outliers.length), tone: fence.outliers.length > 0 ? "warning" : undefined },
  ] : [{ label: "No data", value: "—" }];

  return (
    <DemoShell title="describe() — live statistics" controls={<ColumnPicker cols={numCols} value={safeCol} onChange={setColName} />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
      </div>
      {xs.length > 0 && (
        <div className="mt-4">
          <ChartShell
            title={`Distribution of ${safeCol}`}
            subtitle="Real histogram from the dataset."
            annotation={{
              question: `What is the shape of ${safeCol}?`,
              whyThisChart: "Histogram reveals distribution shape — long-tail, symmetric, bimodal.",
              shows: `${xs.length} non-null values.`,
              doesNotEstablish: "Distribution shape does not predict individual future values.",
              nextStep: "If long-tailed, try log1p (Feature Engineering) or report median + IQR.",
            }}
          >
            <Histogram values={xs} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of ${safeCol}`} />
          </ChartShell>
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function HistogramDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "histogram" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const [colName, setColName] = React.useState(spec.defaultCol ?? "revenue");
  const [bins, setBins] = React.useState(spec.bins ?? 12);
  const numCols = numericCols(df);
  const safeCol = resolveCol(df, colName, numCols);
  const xs = toNumericArray(df.column(safeCol));

  return (
    <DemoShell
      title={`Histogram of ${safeCol}`}
      controls={
        <>
          <ColumnPicker cols={numCols} value={safeCol} onChange={setColName} />
          <div>
            <Label className="text-xs">Bins</Label>
            <Select value={String(bins)} onValueChange={(v) => setBins(Number(v))}>
              <SelectTrigger className="mt-1 w-[8rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 8, 10, 12, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <ChartShell
        title={`Distribution of ${safeCol}`}
        subtitle="Real histogram from the dataset."
        annotation={{
          question: `What does ${safeCol} look like?`,
          whyThisChart: "Histogram shows distribution shape, central tendency, spread, outliers.",
          shows: `${xs.length} non-null values in ${bins} bins.`,
          doesNotEstablish: "A histogram alone doesn't tell you WHY the data has this shape.",
          nextStep: "If long-tailed, apply log1p (see Log Transformation topic).",
        }}
      >
        <Histogram values={xs} bins={bins} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of ${safeCol}`} />
      </ChartShell>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function ScatterCorrDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "scatter-corr" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const numCols = numericCols(df);
  const [xCol, setXCol] = React.useState(spec.defaultX ?? numCols[0] ?? "");
  const [yCol, setYCol] = React.useState(spec.defaultY ?? numCols[1] ?? numCols[0] ?? "");
  const safeX = resolveCol(df, xCol, numCols);
  const safeY = resolveCol(df, yCol, numCols);

  // Build (x, y) pairs from the same rows
  const pairs: { x: number; y: number }[] = [];
  const xArr = df.column(safeX);
  const yArr = df.column(safeY);
  for (let i = 0; i < xArr.length; i++) {
    const xv = xArr[i];
    const yv = yArr[i];
    if (typeof xv === "number" && typeof yv === "number" && Number.isFinite(xv) && Number.isFinite(yv)) {
      pairs.push({ x: xv, y: yv });
    }
  }

  // Pearson
  let pearson = NaN;
  if (pairs.length > 1) {
    const xs = pairs.map((p) => p.x);
    const ys = pairs.map((p) => p.y);
    const xMean = mean(xs);
    const yMean = mean(ys);
    const xStd = std(xs);
    const yStd = std(ys);
    if (xStd > 0 && yStd > 0) {
      let cov = 0;
      for (let i = 0; i < pairs.length; i++) cov += (xs[i] - xMean) * (ys[i] - yMean);
      cov /= pairs.length - 1;
      pearson = cov / (xStd * yStd);
    }
  }

  // Spearman (Pearson on ranks)
  let spearman = NaN;
  if (pairs.length > 1) {
    const rank = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return arr.map((v) => {
        let lo = 0, hi = sorted.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (sorted[mid] < v) lo = mid + 1; else hi = mid - 1;
        }
        return lo + 1;
      });
    };
    const xs = pairs.map((p) => p.x);
    const ys = pairs.map((p) => p.y);
    const rx = rank(xs);
    const ry = rank(ys);
    const rxMean = mean(rx);
    const ryMean = mean(ry);
    const rxStd = std(rx);
    const ryStd = std(ry);
    if (rxStd > 0 && ryStd > 0) {
      let cov = 0;
      for (let i = 0; i < pairs.length; i++) cov += (rx[i] - rxMean) * (ry[i] - ryMean);
      cov /= pairs.length - 1;
      spearman = cov / (rxStd * ryStd);
    }
  }

  return (
    <DemoShell
      title="Scatter plot + correlation"
      controls={
        <>
          <ColumnPicker cols={numCols} value={safeX} onChange={setXCol} label="X column" />
          <ColumnPicker cols={numCols} value={safeY} onChange={setYCol} label="Y column" />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Pairs" value={String(pairs.length)} />
        <Stat label="Pearson r" value={fmt(pearson, 4)} />
        <Stat label="Spearman ρ" value={fmt(spearman, 4)} />
        <Stat label="|Pearson − Spearman|" value={fmt(Math.abs(pearson - spearman), 4)} tone={Math.abs(pearson - spearman) > 0.2 ? "warning" : undefined} />
      </div>
      <div className="mt-3">
        <ChartShell
          title={`${safeY} vs ${safeX}`}
          subtitle="Real scatter from the dataset."
          annotation={{
            question: `Is there a relationship between ${safeX} and ${safeY}?`,
            whyThisChart: "Scatter reveals shape, direction, strength, outliers — a single r cannot.",
            shows: `${pairs.length} (x, y) pairs.`,
            doesNotEstablish: "A scatter does NOT establish causation — a confounder may drive both.",
            nextStep: "If Pearson ≪ Spearman, the relationship is nonlinear but monotonic. If both ≈ 0, check for non-monotonic patterns.",
          }}
        >
          <ScatterChart
            data={pairs}
            xLabel={safeX}
            yLabel={safeY}
            correlation={pearson}
            correlationLabel="Pearson r"
            altText={`Scatter of ${safeX} vs ${safeY}`}
          />
        </ChartShell>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function ParabolicDemo() {
  // Fixed demo: x = [-2.5, -2, ..., 2.5], y = x²
  const xs = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
  const ys = xs.map((x) => x * x);
  const pairs = xs.map((x, i) => ({ x, y: ys[i] }));

  // Pearson
  const xMean = mean(xs);
  const yMean = mean(ys);
  const xStd = std(xs);
  const yStd = std(ys);
  let cov = 0;
  for (let i = 0; i < xs.length; i++) cov += (xs[i] - xMean) * (ys[i] - yMean);
  cov /= xs.length - 1;
  const pearson = cov / (xStd * yStd);

  return (
    <DemoShell title="y = x² — perfect parabolic relationship">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Points" value={String(xs.length)} />
        <Stat label="Pearson r" value={fmt(pearson, 4)} tone={Math.abs(pearson) < 0.1 ? "warning" : undefined} />
        <Stat label="True relationship" value="y = x²" />
        <Stat label="r ≈ 0 because" value="parabola cancels" />
      </div>
      <p className="mt-2 text-xs text-foreground/80">
        Despite r ≈ 0, x and y are perfectly dependent — y is determined exactly by x. The scatter reveals the parabola; the correlation coefficient hides it.
      </p>
      <div className="mt-3">
        <ChartShell
          title="Parabolic scatter (y = x²)"
          subtitle="Pearson r ≈ 0 despite a perfect deterministic relationship."
          annotation={{
            question: "Why is Pearson r ≈ 0 here?",
            whyThisChart: "Scatter reveals the parabolic shape that r cannot capture.",
            shows: "Perfect dependence: every y is exactly x².",
            doesNotEstablish: "r = 0 does NOT mean 'no relationship' — it means 'no LINEAR relationship'.",
            nextStep: "Add x² as a feature so a linear model can fit the parabola (see Polynomial Features topic).",
          }}
        >
          <ScatterChart
            data={pairs}
            xLabel="x"
            yLabel="y = x²"
            correlation={pearson}
            correlationLabel="Pearson r"
            altText="Scatter of y = x squared"
          />
        </ChartShell>
      </div>
    </DemoShell>
  );
}

function OutlierDistortionDemo() {
  // 30 clean points: y ≈ x + small noise, plus one perpendicular outlier
  // Deterministic noise via a simple LCG (no Math.random).
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < 30; i++) {
    xs.push(i);
    // Deterministic noise: ±2 from a small PRNG
    const noise = (((i * 9301 + 49297) % 233280) / 233280) * 4 - 2;
    ys.push(i + noise);
  }
  // Pearson without outlier
  const computePearson = (xa: number[], ya: number[]) => {
    const n = xa.length;
    const xm = mean(xa);
    const ym = mean(ya);
    const xs_ = std(xa);
    const ys_ = std(ya);
    if (xs_ === 0 || ys_ === 0) return NaN;
    let c = 0;
    for (let i = 0; i < n; i++) c += (xa[i] - xm) * (ya[i] - ym);
    c /= n - 1;
    return c / (xs_ * ys_);
  };
  const rClean = computePearson(xs, ys);
  // Add perpendicular outlier at (100, 5)
  const xsWith = [...xs, 100];
  const ysWith = [...ys, 5];
  const rWithOutlier = computePearson(xsWith, ysWith);
  const pairsClean = xs.map((x, i) => ({ x, y: ys[i] }));
  const pairsAll = xsWith.map((x, i) => ({ x, y: ysWith[i] }));

  return (
    <DemoShell title="Outlier distortion of Pearson r">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Clean points" value="30" />
        <Stat label="r (clean)" value={fmt(rClean, 4)} />
        <Stat label="r (with outlier)" value={fmt(rWithOutlier, 4)} tone="warning" />
        <Stat label="Distortion" value={fmt(Math.abs(rClean - rWithOutlier), 4)} tone="warning" />
      </div>
      <p className="mt-2 text-xs text-foreground/80">
        A single outlier at (100, 5) — perpendicular to the clean cluster — drops r from ≈ {fmt(rClean, 2)} to ≈ {fmt(rWithOutlier, 2)}. Removing the outlier restores r.
      </p>
      <div className="mt-3">
        <ChartShell
          title="Scatter with outlier"
          subtitle="One perpendicular outlier can flip the sign of Pearson r."
          annotation={{
            question: "How does one outlier change r?",
            whyThisChart: "Scatter reveals the outlier's position relative to the cluster.",
            shows: "Clean cluster + one outlier at (100, 5).",
            doesNotEstablish: "The outlier's effect on r doesn't mean it should be dropped — investigate first.",
            nextStep: "Compute r with and without the outlier; report both. Use Spearman as a robustness check.",
          }}
        >
          <ScatterChart
            data={pairsAll}
            xLabel="x"
            yLabel="y"
            correlation={rWithOutlier}
            correlationLabel="r (with outlier)"
            altText="Scatter showing outlier distortion"
          />
        </ChartShell>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Clean-only r = {fmt(rClean, 4)} (without the outlier). The outlier is the rightmost point.
      </p>
    </DemoShell>
  );
}

function GroupbySummaryDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "groupby-summary" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const catCols = categoricalCols(df);
  const numCols = numericCols(df);
  const [groupCol, setGroupCol] = React.useState(spec.defaultGroup ?? catCols[0] ?? "");
  const [metricCol, setMetricCol] = React.useState(spec.defaultMetric ?? "revenue");
  const [agg, setAgg] = React.useState(spec.defaultAgg ?? "sum");
  const safeGroup = resolveCol(df, groupCol, catCols);
  const safeMetric = resolveCol(df, metricCol, numCols);

  const result = React.useMemo(() => {
    try {
      return df.groupBy([safeGroup], [{ column: safeMetric, fn: agg as "sum" | "mean" | "count" | "nunique" | "median", as: `${safeMetric}_${agg}` }]);
    } catch {
      return df.head(0);
    }
  }, [df, safeGroup, safeMetric, agg]);

  const valueCol = `${safeMetric}_${agg}`;
  const sortedResult = result.sort(valueCol, "desc");

  return (
    <DemoShell
      title="groupby + agg — live summary"
      controls={
        <>
          <ColumnPicker cols={catCols} value={safeGroup} onChange={setGroupCol} label="Group by" />
          <ColumnPicker cols={numCols} value={safeMetric} onChange={setMetricCol} label="Metric" />
          <div>
            <Label className="text-xs">Aggregation</Label>
            <Select value={agg} onValueChange={(v) => setAgg(v as typeof agg)}>
              <SelectTrigger className="mt-1 w-[10rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["sum", "mean", "median", "count", "nunique"] as const).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <DatasetTable df={sortedResult} pageSize={12} />
      {sortedResult.rows.length > 0 && (
        <div className="mt-3">
          <ChartShell
            title={`${agg}(${safeMetric}) by ${safeGroup}`}
            subtitle="Real aggregation from the dataset."
            annotation={{
              question: `Which ${safeGroup} has the highest ${agg}(${safeMetric})?`,
              whyThisChart: "Bar chart compares values across independent categories.",
              shows: `${sortedResult.rows.length} groups.`,
              doesNotEstablish: "High total doesn't mean high per-order value — try mean to compare averages.",
              nextStep: "Switch the aggregation to mean to compare per-group averages.",
            }}
          >
            <BarChart
              data={sortedResult.rows.map((r) => ({ label: String(r[safeGroup]), value: r[valueCol] as number }))}
              xLabel={safeGroup}
              yLabel={`${agg}(${safeMetric})`}
              altText={`Bar chart of ${agg}(${safeMetric}) by ${safeGroup}`}
            />
          </ChartShell>
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function PivotTableDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "pivot-table" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const catCols = categoricalCols(df);
  const numCols = numericCols(df);
  const [indexCol, setIndexCol] = React.useState(spec.defaultIndex ?? catCols[0] ?? "");
  const [colsCol, setColsCol] = React.useState(spec.defaultCols ?? catCols[1] ?? catCols[0] ?? "");
  const [metricCol, setMetricCol] = React.useState(spec.defaultMetric ?? "revenue");
  const safeIndex = resolveCol(df, indexCol, catCols);
  const safeCols = resolveCol(df, colsCol, catCols);
  const safeMetric = resolveCol(df, metricCol, numCols);

  const pivot = React.useMemo(() => {
    try {
      return df.pivotTable({
        index: safeIndex,
        columns: safeCols,
        values: safeMetric,
        aggfunc: "sum",
        margins: true,
      });
    } catch {
      return df.head(0);
    }
  }, [df, safeIndex, safeCols, safeMetric]);

  return (
    <DemoShell
      title="pivot_table — two-dimension summary"
      controls={
        <>
          <ColumnPicker cols={catCols} value={safeIndex} onChange={setIndexCol} label="Rows (index)" />
          <ColumnPicker cols={catCols} value={safeCols} onChange={setColsCol} label="Columns" />
          <ColumnPicker cols={numCols} value={safeMetric} onChange={setMetricCol} label="Metric" />
        </>
      }
    >
      <DatasetTable df={pivot} pageSize={15} />
      <p className="mt-2 text-xs text-muted-foreground">
        Cells contain <code className="text-mono">sum({safeMetric})</code> for each {safeIndex} × {safeCols} combination. The <strong>Total</strong> row and column are subtotals. NaN cells mean "no data for that combination".
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function CrosstabDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "crosstab" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const catCols = categoricalCols(df);
  const [indexCol, setIndexCol] = React.useState(spec.defaultIndex ?? catCols[0] ?? "");
  const [colsCol, setColsCol] = React.useState(spec.defaultCols ?? catCols[1] ?? catCols[0] ?? "");
  const [normalize, setNormalize] = React.useState<"none" | "index" | "columns" | "all">("none");
  const safeIndex = resolveCol(df, indexCol, catCols);
  const safeCols = resolveCol(df, colsCol, catCols);

  const table = React.useMemo(() => {
    try {
      const ct = df.crosstab({ index: safeIndex, columns: safeCols, margins: normalize !== "none" });
      if (normalize === "none") return ct;
      // Compute proportions
      if (normalize === "all") {
        const total = ct.rows.reduce((acc, r) => acc + ct.columns.filter((c) => c !== safeIndex).reduce((s, c) => s + (typeof r[c] === "number" ? r[c] as number : 0), 0), 0);
        const newRows: Row[] = ct.rows.map((r) => {
          const out: Row = { [safeIndex]: r[safeIndex] };
          for (const c of ct.columns) {
            if (c === safeIndex) continue;
            out[c] = typeof r[c] === "number" && total > 0 ? (r[c] as number) / total : null;
          }
          return out;
        });
        return new DataFrame(ct.columns, newRows);
      }
      if (normalize === "index") {
        const newRows: Row[] = ct.rows.map((r) => {
          const rowSum = ct.columns.filter((c) => c !== safeIndex).reduce((s, c) => s + (typeof r[c] === "number" ? r[c] as number : 0), 0);
          const out: Row = { [safeIndex]: r[safeIndex] };
          for (const c of ct.columns) {
            if (c === safeIndex) continue;
            out[c] = typeof r[c] === "number" && rowSum > 0 ? (r[c] as number) / rowSum : null;
          }
          return out;
        });
        return new DataFrame(ct.columns, newRows);
      }
      // columns
      const colSums: Record<string, number> = {};
      for (const c of ct.columns) {
        if (c === safeIndex) continue;
        colSums[c] = ct.rows.reduce((s, r) => s + (typeof r[c] === "number" ? r[c] as number : 0), 0);
      }
      const newRows: Row[] = ct.rows.map((r) => {
        const out: Row = { [safeIndex]: r[safeIndex] };
        for (const c of ct.columns) {
          if (c === safeIndex) continue;
          out[c] = typeof r[c] === "number" && colSums[c] > 0 ? (r[c] as number) / colSums[c] : null;
        }
        return out;
      });
      return new DataFrame(ct.columns, newRows);
    } catch {
      return df.head(0);
    }
  }, [df, safeIndex, safeCols, normalize]);

  return (
    <DemoShell
      title="crosstab — frequency table + proportions"
      controls={
        <>
          <ColumnPicker cols={catCols} value={safeIndex} onChange={setIndexCol} label="Rows" />
          <ColumnPicker cols={catCols} value={safeCols} onChange={setColsCol} label="Columns" />
          <div>
            <Label className="text-xs">Normalize</Label>
            <Select value={normalize} onValueChange={(v) => setNormalize(v as typeof normalize)}>
              <SelectTrigger className="mt-1 w-[10rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">none (counts)</SelectItem>
                <SelectItem value="index">index (row %)</SelectItem>
                <SelectItem value="columns">columns (col %)</SelectItem>
                <SelectItem value="all">all (overall %)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <DatasetTable df={table} pageSize={15} />
      <p className="mt-2 text-xs text-muted-foreground">
        {normalize === "none" && "Each cell is the count of observations in that combination."}
        {normalize === "index" && "Each row sums to 1.0 — compare the column distribution within each row."}
        {normalize === "columns" && "Each column sums to 1.0 — compare the row distribution within each column."}
        {normalize === "all" && "Entire table sums to 1.0 — each cell is its share of the total."}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function MonthlyTrendDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "monthly-trend" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const numCols = numericCols(df);
  const [metricCol, setMetricCol] = React.useState(spec.defaultMetric ?? "revenue");
  const safeMetric = resolveCol(df, metricCol, numCols);

  // Find a date column
  const dateCol = df.columns.find((c) => {
    const dt = df.dtype(c);
    return dt === "datetime64[ns]" || (dt === "object" && c.toLowerCase().includes("date"));
  }) ?? df.columns.find((c) => c.toLowerCase().includes("date"));

  const monthly = React.useMemo(() => {
    if (!dateCol) return null;
    try {
      // Convert date col if needed
      let workDf = df;
      if (df.dtype(dateCol) !== "datetime64[ns]") {
        workDf = df.toDatetime(dateCol);
      }
      return workDf.resampleMonthly(dateCol, [{ column: safeMetric, fn: "sum", as: safeMetric }]);
    } catch {
      return null;
    }
  }, [df, dateCol, safeMetric]);

  if (!dateCol || !monthly) {
    return (
      <DemoShell title="Monthly trend — not available">
        <p className="text-xs text-muted-foreground">
          This dataset has no datetime column to resample. Try the Retail Sales dataset.
        </p>
      </DemoShell>
    );
  }

  const values = monthly.rows.map((r) => r[safeMetric] as number).filter((v) => typeof v === "number" && Number.isFinite(v));

  return (
    <DemoShell
      title="Monthly trend + rolling average"
      controls={<ColumnPicker cols={numCols} value={safeMetric} onChange={setMetricCol} label="Metric" />}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Months" value={String(monthly.rows.length)} />
        <Stat label="Total" value={fmt(values.reduce((a, b) => a + b, 0), 2)} />
        <Stat label="Mean / month" value={fmt(mean(values), 2)} />
        <Stat label="Std / month" value={fmt(std(values), 2)} />
      </div>
      <div className="mt-3">
        <ChartShell
          title={`Monthly ${safeMetric} trend`}
          subtitle={`Real monthly sums from ${dsSpec.name}.`}
          annotation={{
            question: `Is there seasonality in ${safeMetric}?`,
            whyThisChart: "Line chart for sequential time index — trends and seasonality are visible.",
            shows: `${monthly.rows.length} months of data.`,
            doesNotEstablish: "A trend is not a forecast — seasonality needs at least 2 years to confirm.",
            nextStep: "Apply a 3-month rolling mean to smooth short-term noise.",
          }}
        >
          <LineChart
            data={monthly.rows.map((r) => ({ bucket: String(r.bucket), value: r[safeMetric] as number }))}
            xKey="bucket"
            xLabel="Month"
            series={[{ key: "value", label: safeMetric }]}
            altText={`Monthly ${safeMetric} trend`}
          />
        </ChartShell>
      </div>
    </DemoShell>
  );
}

function TransformDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "transform" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const numCols = numericCols(df);
  const [colName, setColName] = React.useState(spec.defaultCol ?? "revenue");
  const [transform, setTransform] = React.useState(spec.defaultTransform ?? "log1p");
  const safeCol = resolveCol(df, colName, numCols);

  const transformed = React.useMemo(() => {
    try {
      const t = df.transform(safeCol, transform as "log1p" | "sqrt" | "square");
      const newCol = `${safeCol}_${transform}`;
      return { df: t, newCol };
    } catch {
      return { df, newCol: safeCol };
    }
  }, [df, safeCol, transform]);

  const orig = toNumericArray(df.column(safeCol));
  const trans = toNumericArray(transformed.df.column(transformed.newCol));

  return (
    <DemoShell
      title="Transform — before / after"
      controls={
        <>
          <ColumnPicker cols={numCols} value={safeCol} onChange={setColName} />
          <div>
            <Label className="text-xs">Transform</Label>
            <Select value={transform} onValueChange={(v) => setTransform(v as typeof transform)}>
              <SelectTrigger className="mt-1 w-[10rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["log1p", "sqrt", "square"] as const).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Orig mean" value={fmt(orig.length > 0 ? mean(orig) : NaN, 2)} />
        <Stat label="Trans mean" value={fmt(trans.length > 0 ? mean(trans) : NaN, 2)} />
        <Stat label="Orig skew" value={fmt(orig.length > 0 ? skewness(orig) : NaN, 2)} tone={orig.length > 0 && Math.abs(skewness(orig)) > 1 ? "warning" : undefined} />
        <Stat label="Trans skew" value={fmt(trans.length > 0 ? skewness(trans) : NaN, 2)} tone={trans.length > 0 && Math.abs(skewness(trans)) > 1 ? "warning" : undefined} />
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <ChartShell
          title={`Original: ${safeCol}`}
          subtitle="Raw distribution."
          annotation={{
            question: `What does ${safeCol} look like before?`,
            whyThisChart: "Histogram reveals the raw shape.",
            shows: `${orig.length} values.`,
            doesNotEstablish: "The shape doesn't determine which transform is right.",
            nextStep: "Apply a transform and compare to the chart on the right.",
          }}
        >
          <Histogram values={orig} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Original ${safeCol}`} />
        </ChartShell>
        <ChartShell
          title={`Transformed: ${transformed.newCol}`}
          subtitle={`After ${transform}.`}
          annotation={{
            question: `How does ${transform} change the distribution?`,
            whyThisChart: "Compare shapes — log1p compresses long tails; square amplifies them.",
            shows: `${trans.length} transformed values.`,
            doesNotEstablish: "A better-looking distribution does NOT mean the model will perform better — verify with CV.",
            nextStep: "If the transform helps, add it to a Pipeline (Module 14) and compare model scores.",
          }}
        >
          <Histogram values={trans} bins={12} xLabel={transformed.newCol} yLabel="Frequency" altText={`Transformed ${safeCol}`} />
        </ChartShell>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function EncodingDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "encoding" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const catCols = categoricalCols(df);
  const [colName, setColName] = React.useState(spec.defaultCol ?? catCols[0] ?? "");
  const [method, setMethod] = React.useState(spec.defaultMethod ?? "onehot");
  const safeCol = resolveCol(df, colName, catCols);

  const encoded = React.useMemo(() => {
    try {
      if (method === "onehot") {
        return { df: df.getDummies(safeCol, { dropFirst: false }), note: "one-hot: k binary columns (one per category)" };
      }
      if (method === "label") {
        const r = df.factorize(safeCol);
        return { df: r.df, note: `label encoding: ${r.categories.length} codes mapped to 0..${r.categories.length - 1}` };
      }
      if (method === "frequency") {
        return { df: df.frequencyEncode(safeCol), note: "frequency encoding: each category replaced by its count" };
      }
    } catch (e) {
      return { df, note: `Error: ${(e as Error).message}` };
    }
    return { df, note: "" };
  }, [df, safeCol, method]);

  const cardinality = df.column(safeCol).filter((v) => v !== null && v !== undefined).length;

  return (
    <DemoShell
      title="Categorical encoding — live result"
      controls={
        <>
          <ColumnPicker cols={catCols} value={safeCol} onChange={setColName} label="Categorical" />
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger className="mt-1 w-[12rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="onehot">one-hot (k columns)</SelectItem>
                <SelectItem value="label">label / factorize</SelectItem>
                <SelectItem value="frequency">frequency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Cardinality" value={String(new Set(df.column(safeCol).map((v) => String(v))).size)} />
        <Stat label="Original cols" value="1" />
        <Stat label="Encoded cols" value={String(encoded.df.columns.length)} />
        <Stat label="Row count" value={String(encoded.df.rows.length)} />
      </div>
      <p className="mt-2 text-xs text-foreground/80">{encoded.note}</p>
      <div className="mt-3">
        <DatasetTable df={encoded.df.head(10)} pageSize={10} />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name} (first 10 rows shown)</p>
    </DemoShell>
  );
}

function ScalingDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "scaling" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const numCols = numericCols(df);
  const [colName, setColName] = React.useState(spec.defaultCol ?? "revenue");
  const [scaler, setScaler] = React.useState(spec.defaultScaler ?? "standardize");
  const safeCol = resolveCol(df, colName, numCols);

  const scaled = React.useMemo(() => {
    try {
      if (scaler === "standardize") return { df: df.standardize(safeCol), newCol: `${safeCol}_z`, params: "mean + std (Z-score)" };
      if (scaler === "minmax") return { df: df.minMaxScale(safeCol), newCol: `${safeCol}_mm`, params: "min + max → [0, 1]" };
      if (scaler === "robust") return { df: df.robustScale(safeCol), newCol: `${safeCol}_rs`, params: "median + IQR (robust)" };
      if (scaler === "maxabs") return { df: df.maxAbsScale(safeCol), newCol: `${safeCol}_ma`, params: "max(|x|) → [-1, 1]" };
    } catch {
      return { df, newCol: safeCol, params: "" };
    }
    return { df, newCol: safeCol, params: "" };
  }, [df, safeCol, scaler]);

  const orig = toNumericArray(df.column(safeCol));
  const trans = toNumericArray(scaled.df.column(scaled.newCol));

  return (
    <DemoShell
      title="Scaling — before / after"
      controls={
        <>
          <ColumnPicker cols={numCols} value={safeCol} onChange={setColName} />
          <div>
            <Label className="text-xs">Scaler</Label>
            <Select value={scaler} onValueChange={(v) => setScaler(v as typeof scaler)}>
              <SelectTrigger className="mt-1 w-[12rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standardize">StandardScaler (Z)</SelectItem>
                <SelectItem value="minmax">MinMaxScaler [0,1]</SelectItem>
                <SelectItem value="robust">RobustScaler (med+IQR)</SelectItem>
                <SelectItem value="maxabs">MaxAbsScaler [-1,1]</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Orig mean" value={fmt(orig.length > 0 ? mean(orig) : NaN, 2)} />
        <Stat label="Trans mean" value={fmt(trans.length > 0 ? mean(trans) : NaN, 2)} />
        <Stat label="Orig std" value={fmt(orig.length > 0 ? std(orig) : NaN, 2)} />
        <Stat label="Trans std" value={fmt(trans.length > 0 ? std(trans) : NaN, 2)} />
      </div>
      <p className="mt-2 text-xs text-foreground/80">Method: <code className="text-mono">{scaled.params}</code></p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <ChartShell
          title={`Original: ${safeCol}`}
          subtitle="Raw distribution."
          annotation={{
            question: `What does ${safeCol} look like before scaling?`,
            whyThisChart: "Compare the original shape to the scaled shape — scaling changes the range, not the shape (except for centering).",
            shows: `${orig.length} values.`,
            doesNotEstablish: "Scaling doesn't fix non-normality — only the range and centering.",
            nextStep: "Apply a different scaler and compare.",
          }}
        >
          <Histogram values={orig} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Original ${safeCol}`} />
        </ChartShell>
        <ChartShell
          title={`Scaled: ${scaled.newCol}`}
          subtitle={`After ${scaler}.`}
          annotation={{
            question: `How does ${scaler} change the distribution?`,
            whyThisChart: "Standardize centers at 0 ± 1; MinMax maps to [0, 1]; Robust ignores outliers; MaxAbs preserves sparsity.",
            shows: `${trans.length} scaled values.`,
            doesNotEstablish: "Scaling doesn't make the model better — it makes the features comparable in scale.",
            nextStep: "Use the scaler that matches your model: standardize for linear, minmax for neural nets, robust for outlier-heavy data.",
          }}
        >
          <Histogram values={trans} bins={12} xLabel={scaled.newCol} yLabel="Frequency" altText={`Scaled ${safeCol}`} />
        </ChartShell>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function FeatureSelectionDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "feature-selection" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const numCols = numericCols(df).filter((c) => !c.endsWith("_id"));

  // Default method is "correlation" (works for both regression and
  // classification targets). The previous default of "anova_f" produced NaN
  // scores for continuous targets because ANOVA F is a classification metric
  // — when every row has a distinct target value, dfWithin = 0 and the F
  // ratio is undefined (displayed as "NaN").
  const [targetCol, setTargetCol] = React.useState(spec.defaultTarget ?? "revenue");
  const [method, setMethod] = React.useState<"variance" | "correlation" | "anova_f" | "tree" | "lasso">("correlation");
  const [k, setK] = React.useState(3);
  const safeTarget = resolveCol(df, targetCol, numCols);

  const featureCols = numCols.filter((c) => c !== safeTarget);

  const split = df.randomSplit(42, 0.3, 0);
  const trainDf = split.train;

  // Detect whether the target is effectively continuous (high cardinality
  // relative to row count). ANOVA F and chi² are classification metrics —
  // they need a categorical target with few distinct values. When the target
  // is continuous, ANOVA F produces Infinity (shown as "NaN") because every
  // row lands in its own group, making dfWithin = 0.
  const targetCardinality = React.useMemo(() => {
    const vals = trainDf.column(safeTarget);
    const distinct = new Set<string>();
    let total = 0;
    for (const v of vals) {
      if (v === null || v === undefined) continue;
      distinct.add(String(v));
      total++;
    }
    return { distinct: distinct.size, total, ratio: total > 0 ? distinct.size / total : 0 };
  }, [trainDf, safeTarget]);

  // A target is "continuous-like" if it has > 10 distinct values OR > 50%
  // cardinality ratio. Either condition makes ANOVA F produce Infinity/NaN.
  const targetIsContinuous = targetCardinality.distinct > 10 || targetCardinality.ratio > 0.5;
  const anovaFIncompatible = method === "anova_f" && targetIsContinuous;

  const results = React.useMemo(() => {
    const out: { feature: string; score: number; selected: boolean }[] = [];
    if (method === "variance") {
      const r = varianceThreshold(trainDf, featureCols, 0.05);
      r.forEach((x) => out.push({ feature: x.feature, score: x.variance, selected: x.selected }));
    } else if (method === "correlation") {
      const r = correlationSelect(trainDf, featureCols, safeTarget, 0.05);
      r.forEach((x) => out.push({ feature: x.feature, score: Math.abs(x.corr), selected: x.selected }));
    } else if (method === "anova_f") {
      // When the target is continuous, ANOVA F is undefined (dfWithin = 0).
      // Rather than show NaN, we fall back to squared Pearson correlation
      // (which IS f_regression in scikit-learn) and label the scores clearly.
      // This matches sklearn's SelectKBest(score_func=f_regression) for
      // regression targets.
      if (targetIsContinuous) {
        // f_regression ≈ Pearson r² × (n - 2) / (1 - r²) — but for ranking
        // purposes r² alone is sufficient and matches the relative order.
        const r = correlationSelect(trainDf, featureCols, safeTarget, 0.05);
        r.forEach((x) => {
          const r2 = x.corr * x.corr;
          out.push({ feature: x.feature, score: Number.isFinite(r2) ? r2 : 0, selected: Math.abs(x.corr) >= 0.05 });
        });
      } else {
        const r = selectKBest(trainDf, featureCols, safeTarget, k, "anova_f");
        r.forEach((x) => out.push({ feature: x.feature, score: x.score, selected: x.selected }));
      }
    } else if (method === "tree") {
      const { X, y } = toFeatureMatrix(trainDf, featureCols, safeTarget);
      const r = treeFeatureImportance(X, y, featureCols, "regression");
      const sorted = [...r].sort((a, b) => b.importance - a.importance);
      featureCols.forEach((name) => {
        const idx = sorted.findIndex((x) => x.feature === name);
        out.push({ feature: name, score: sorted[idx]?.importance ?? 0, selected: idx < k });
      });
    } else if (method === "lasso") {
      const { X, y } = toFeatureMatrix(trainDf, featureCols, safeTarget);
      const r = lassoFeatureImportance(X, y, featureCols, { l1: 0.001, iterations: 500, lr: 0.01 });
      const sorted = [...r].sort((a, b) => b.importance - a.importance);
      featureCols.forEach((name) => {
        const idx = sorted.findIndex((x) => x.feature === name);
        out.push({ feature: name, score: sorted[idx]?.importance ?? 0, selected: idx < k });
      });
    }
    return out;
  }, [method, trainDf, featureCols, safeTarget, k, targetIsContinuous]);

  const sortedResults = [...results].sort((a, b) => b.score - a.score);

  return (
    <DemoShell
      title="Feature selection — live ranking"
      controls={
        <>
          <ColumnPicker cols={numCols} value={safeTarget} onChange={setTargetCol} label="Target" />
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger className="mt-1 w-[12rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="variance">variance threshold</SelectItem>
                <SelectItem value="correlation">|corr| with target</SelectItem>
                <SelectItem value="anova_f">ANOVA F / f_regression</SelectItem>
                <SelectItem value="tree">tree importance</SelectItem>
                <SelectItem value="lasso">Lasso (L1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">k (top)</Label>
            <Select value={String(k)} onValueChange={(v) => setK(Number(v))}>
              <SelectTrigger className="mt-1 w-[6rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <div className="role-validated border-role bg-role-soft rounded-md border p-2 text-xs mb-3">
        <p className="font-semibold text-role">Leakage-safe — all methods fit on the TRAIN fold only (70% split, seed=42).</p>
        <p className="mt-0.5 text-foreground/80">
          Target <code className="text-mono">{safeTarget}</code>: {targetCardinality.distinct} distinct values across {targetCardinality.total} train rows ({(targetCardinality.ratio * 100).toFixed(1)}% cardinality).
          {" "}
          {targetIsContinuous
            ? <span>Continuous target — ANOVA F is auto-converted to f_regression (Pearson r²) to avoid undefined scores.</span>
            : <span>Categorical target — ANOVA F is valid.</span>}
        </p>
      </div>
      {anovaFIncompatible && (
        <div className="role-warning border-role bg-role-soft rounded-md border p-2 text-xs mb-3" style={{ borderColor: "var(--color-role-warning)", background: "color-mix(in oklch, var(--color-role-warning) 6%, transparent)" }}>
          <p className="font-semibold text-[var(--color-role-warning)]">ANOVA F + continuous target → using f_regression instead</p>
          <p className="mt-0.5 text-foreground/80">
            ANOVA F is a classification metric (it compares group means across target classes). With a continuous target, every row becomes its own group → dfWithin = 0 → F = ∞ → displayed as "NaN". The demo auto-falls-back to <strong>f_regression</strong> (Pearson r²), which is scikit-learn's regression equivalent. Switch to a categorical target column to see real ANOVA F scores.
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 py-1 text-left">Feature</th>
              <th className="px-2 py-1 text-right">Score</th>
              <th className="px-2 py-1 text-center">Selected?</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((r) => (
              <tr key={r.feature} className="border-t border-border/50">
                <td className="px-2 py-1"><code className="text-mono text-[10px]">{r.feature}</code></td>
                <td className="text-mono px-2 py-1 text-right">{fmt(r.score, 4)}</td>
                <td className="px-2 py-1 text-center">
                  {r.selected ? (
                    <Badge className="bg-[var(--color-role-validated)]/20 text-[var(--color-role-validated)] text-[10px]">selected</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <ChartShell
          title={`${method} — feature scores`}
          subtitle={`Top ${k} of ${featureCols.length} features.`}
          annotation={{
            question: `Which features does ${method} select?`,
            whyThisChart: "Bar chart shows the score per feature. Higher = more important.",
            shows: `${results.filter((r) => r.selected).length} features selected.`,
            doesNotEstablish: "A high score does NOT mean the feature is causally related to the target — only predictive.",
            nextStep: "Cross-check with other methods. Features that survive most methods are the most robust picks.",
          }}
        >
          <BarChart
            data={sortedResults.map((r) => ({ label: r.feature, value: r.score }))}
            layout="horizontal"
            xLabel="Score"
            altText={`Bar chart of ${method} scores`}
            useSelectionColors
            selectedIndices={sortedResults.map((r, i) => ({ idx: i, selected: r.selected })).filter((x) => x.selected).map((x) => x.idx)}
          />
        </ChartShell>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name} (train fold: {trainDf.rows.length} rows)</p>
    </DemoShell>
  );
}

function TrainTestSplitDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "train-test-split" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const [testFrac, setTestFrac] = React.useState(0.3);
  const [seed, setSeed] = React.useState(42);

  const split = React.useMemo(() => {
    return df.randomSplit(seed, testFrac, 0);
  }, [df, seed, testFrac]);

  // Verify no overlap
  const trainIdx = new Set(split.train.rows.map((r) => JSON.stringify(r)));
  const testIdx = new Set(split.val.rows.map((r) => JSON.stringify(r)));
  const overlap = [...trainIdx].filter((x) => testIdx.has(x)).length;

  return (
    <DemoShell
      title="Train / test split — leakage-safe"
      controls={
        <>
          <div>
            <Label className="text-xs">Test fraction</Label>
            <Select value={String(testFrac)} onValueChange={(v) => setTestFrac(Number(v))}>
              <SelectTrigger className="mt-1 w-[8rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0.2, 0.25, 0.3, 0.4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Random seed</Label>
            <Select value={String(seed)} onValueChange={(v) => setSeed(Number(v))}>
              <SelectTrigger className="mt-1 w-[8rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[42, 7, 123, 2024].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total rows" value={String(df.rows.length)} />
        <Stat label="Train rows" value={String(split.train.rows.length)} />
        <Stat label="Test rows" value={String(split.val.rows.length)} />
        <Stat label="Overlap" value={String(overlap)} tone={overlap > 0 ? "warning" : undefined} />
      </div>
      {overlap === 0 ? (
        <div className="role-validated border-role bg-role-soft mt-3 rounded-md border p-2 text-xs">
          <p className="font-semibold text-role">No overlap — train and test are disjoint. The split is leakage-safe.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-[var(--color-role-error)]/40 bg-[color-mix(in_oklch,var(--color-role-error)_8%,transparent)] p-2 text-xs text-[var(--color-role-error)]">
          Overlap detected — this should never happen with the deterministic split.
        </div>
      )}
      <p className="mt-2 text-xs text-foreground/80">
        The same seed always produces the same split — reproducibility guaranteed. Change the seed to verify the split changes; change the test fraction to verify the proportions adjust.
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function BinningDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "binning" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const numCols = numericCols(df);
  const [colName, setColName] = React.useState(spec.defaultCol ?? "revenue");
  const [strategy, setStrategy] = React.useState(spec.defaultStrategy ?? "equal-width");
  const [bins, setBins] = React.useState(spec.defaultBins ?? 5);
  const safeCol = resolveCol(df, colName, numCols);

  const binned = React.useMemo(() => {
    try {
      if (strategy === "equal-width") return { df: df.cutEqualWidth(safeCol, bins), newCol: `${safeCol}_cut_bin` };
      return { df: df.cutEqualFreq(safeCol, bins), newCol: `${safeCol}_qcut_bin` };
    } catch {
      return { df, newCol: safeCol };
    }
  }, [df, safeCol, strategy, bins]);

  // Bin counts
  const binCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of binned.df.column(binned.newCol)) {
      const key = v === null || v === undefined ? "null" : String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [binned, binned.newCol]);

  return (
    <DemoShell
      title="Binning — equal-width vs equal-frequency"
      controls={
        <>
          <ColumnPicker cols={numCols} value={safeCol} onChange={setColName} />
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as typeof strategy)}>
              <SelectTrigger className="mt-1 w-[12rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="equal-width">equal-width (cut)</SelectItem>
                <SelectItem value="equal-frequency">equal-frequency (qcut)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Bins</Label>
            <Select value={String(bins)} onValueChange={(v) => setBins(Number(v))}>
              <SelectTrigger className="mt-1 w-[6rem]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 8, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    >
      <div className="mt-3">
        <ChartShell
          title={`Bin counts — ${strategy}`}
          subtitle="Equal-width overloads one bin on skewed data; equal-frequency produces flat counts."
          annotation={{
            question: `How does ${strategy} distribute the values?`,
            whyThisChart: "Bar chart of bin counts reveals skew (equal-width) or flatness (equal-frequency).",
            shows: `${binCounts.length} bins.`,
            doesNotEstablish: "Bin counts don't tell you whether binning helps the model — verify with CV.",
            nextStep: "Switch strategy to compare. Equal-frequency is preferred when the data is skewed.",
          }}
        >
          <BarChart
            data={binCounts.map(([label, count]) => ({ label: `bin ${label}`, value: count }))}
            xLabel="Bin"
            yLabel="Count"
            altText={`Bin counts for ${strategy}`}
          />
        </ChartShell>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function TargetEncodingDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "target-encoding" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const catCols = categoricalCols(df);
  const numCols = numericCols(df).filter((c) => !c.endsWith("_id"));
  const [colName, setColName] = React.useState(spec.defaultCol ?? catCols[0] ?? "");
  const [targetCol, setTargetCol] = React.useState(spec.defaultTarget ?? "revenue");
  const safeCol = resolveCol(df, colName, catCols);
  const safeTarget = resolveCol(df, targetCol, numCols);

  // 70/30 split (seed=42)
  const split = df.randomSplit(42, 0.3, 0);
  const trainDf = split.train;
  const testDf = split.val;

  // Compute category means on TRAIN ONLY. We deliberately skip useMemo
  // here because the React Compiler conservatively warns about row
  // mutation when the rows are accessed across the memo boundary; this
  // computation is fast (a single pass over train rows) and doesn't need
  // memoization. The split itself is already memoized via useDataset +
  // randomSplit(seed).
  const trainRows = trainDf.rows;
  const testRows = testDf.rows;
  const trainMeans = (() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of trainRows) {
      const cat = r[safeCol];
      const t = r[safeTarget];
      if (cat === null || cat === undefined) continue;
      if (typeof t !== "number" || !Number.isFinite(t)) continue;
      const key = String(cat);
      const cur = map.get(key) ?? { sum: 0, count: 0 };
      cur.sum += t;
      cur.count += 1;
      map.set(key, cur);
    }
    const out = new Map<string, number>();
    for (const [k, v] of map) out.set(k, v.sum / v.count);
    return out;
  })();

  const globalMean = (() => {
    const ys = trainDf.column(safeTarget).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return ys.length > 0 ? mean(ys) : 0;
  })();

  // Apply to train and test
  const trainEncoded = trainDf.rows.map((r) => {
    const cat = r[safeCol];
    const key = cat === null || cat === undefined ? "" : String(cat);
    return { category: String(cat), target: r[safeTarget], encoded: trainMeans.get(key) ?? globalMean };
  });
  const testEncoded = testDf.rows.map((r) => {
    const cat = r[safeCol];
    const key = cat === null || cat === undefined ? "" : String(cat);
    const seen = trainMeans.has(key);
    return { category: String(cat), target: r[safeTarget], encoded: seen ? trainMeans.get(key)! : globalMean, unseen: !seen };
  });

  const unseenCount = testEncoded.filter((r) => r.unseen).length;

  return (
    <DemoShell
      title="Target encoding — leakage-safe"
      controls={
        <>
          <ColumnPicker cols={catCols} value={safeCol} onChange={setColName} label="Categorical" />
          <ColumnPicker cols={numCols} value={safeTarget} onChange={setTargetCol} label="Target" />
        </>
      }
    >
      <div className="role-validated border-role bg-role-soft rounded-md border p-2 text-xs mb-3">
        <p className="font-semibold text-role">Leakage-safe — category means computed on TRAIN ONLY (70% split, seed=42).</p>
        <p className="mt-0.5 text-foreground/80">Global mean fallback: <code className="text-mono">{fmt(globalMean, 2)}</code> — applied to test rows with unseen categories.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Train rows" value={String(trainEncoded.length)} />
        <Stat label="Test rows" value={String(testEncoded.length)} />
        <Stat label="Train categories" value={String(trainMeans.size)} />
        <Stat label="Test unseen" value={String(unseenCount)} tone={unseenCount > 0 ? "warning" : undefined} />
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Train (no leakage)</p>
          <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
            <table className="w-full text-xs">
              <thead><tr><th className="px-2 py-1 text-left">category</th><th className="px-2 py-1 text-right">target</th><th className="px-2 py-1 text-right">encoded</th></tr></thead>
              <tbody>
                {trainEncoded.slice(0, 12).map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-2 py-1"><code className="text-mono text-[10px]">{r.category}</code></td>
                    <td className="text-mono px-2 py-1 text-right">{fmt(Number(r.target), 2)}</td>
                    <td className="text-mono px-2 py-1 text-right">{fmt(r.encoded, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test (uses train means)</p>
          <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
            <table className="w-full text-xs">
              <thead><tr><th className="px-2 py-1 text-left">category</th><th className="px-2 py-1 text-right">target</th><th className="px-2 py-1 text-right">encoded</th></tr></thead>
              <tbody>
                {testEncoded.slice(0, 12).map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-2 py-1"><code className="text-mono text-[10px]">{r.category}{r.unseen ? " (unseen)" : ""}</code></td>
                    <td className="text-mono px-2 py-1 text-right">{fmt(Number(r.target), 2)}</td>
                    <td className="text-mono px-2 py-1 text-right">{fmt(r.encoded, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function MissingValuesDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "missing-values" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const nulls = df.isnaCount();
  const total = Object.values(nulls).reduce((a, b) => a + b, 0);

  const rows: { column: string; null_count: number; pct: string }[] = df.columns.map((c) => {
    const n = nulls[c] ?? 0;
    return { column: c, null_count: n, pct: `${((n / df.rows.length) * 100).toFixed(1)}%` };
  }).sort((a, b) => b.null_count - a.null_count);

  return (
    <DemoShell title="Missing values — live count">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total rows" value={String(df.rows.length)} />
        <Stat label="Total cols" value={String(df.columns.length)} />
        <Stat label="Total nulls" value={String(total)} tone={total > 0 ? "warning" : undefined} />
        <Stat label="Clean?" value={total === 0 ? "yes" : "no"} tone={total > 0 ? "warning" : undefined} />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">Column</th><th className="px-2 py-1 text-right">Null count</th><th className="px-2 py-1 text-right">Percent</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.column} className="border-t border-border/50">
                <td className="px-2 py-1"><code className="text-mono text-[10px]">{r.column}</code></td>
                <td className="text-mono px-2 py-1 text-right">{r.null_count}</td>
                <td className="text-mono px-2 py-1 text-right">{r.pct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}. Try the "Messy Retail Sales" dataset to see real missingness.</p>
    </DemoShell>
  );
}

function DuplicatesDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "duplicates" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const fullDups = df.countDuplicates();
  const dupByOrderId = df.columns.includes("order_id") ? df.countDuplicates(["order_id"]) : 0;

  return (
    <DemoShell title="Duplicate detection — live">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total rows" value={String(df.rows.length)} />
        <Stat label="Full-row dups" value={String(fullDups)} tone={fullDups > 0 ? "warning" : undefined} />
        <Stat label="order_id dups" value={String(dupByOrderId)} tone={dupByOrderId > 0 ? "warning" : undefined} />
        <Stat label="Clean?" value={fullDups === 0 && dupByOrderId === 0 ? "yes" : "no"} tone={fullDups > 0 || dupByOrderId > 0 ? "warning" : undefined} />
      </div>
      <p className="mt-2 text-xs text-foreground/80">
        Full-row duplicates are entirely identical rows (safe to drop). Subset duplicates on a business key (like <code className="text-mono">order_id</code>) mean the same order appears multiple times — investigate before dropping (could be legitimate repeats or could be data-entry errors).
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">Source: {dsSpec.name}. Try the "Messy Retail Sales" dataset to see real duplicates.</p>
    </DemoShell>
  );
}

function DtypesDemo() {
  const rows: { dataset: string; column: string; dtype: string }[] = [];
  for (const ds of BUILT_IN_DATASETS) {
    const df = DataFrame.fromRows(ds.rows);
    for (const col of df.columns) {
      rows.push({ dataset: ds.name, column: col, dtype: df.dtype(col) });
    }
  }

  return (
    <DemoShell title="dtypes — across all datasets">
      <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-md border border-border bg-background p-2">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0"><tr><th className="px-2 py-1 text-left">Dataset</th><th className="px-2 py-1 text-left">Column</th><th className="px-2 py-1 text-left">Dtype</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-2 py-1">{r.dataset}</td>
                <td className="px-2 py-1"><code className="text-mono text-[10px]">{r.column}</code></td>
                <td className="px-2 py-1"><code className="text-mono text-[10px] text-[var(--color-ai-cyan)]">{r.dtype}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DemoShell>
  );
}

function ValueCountsDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "value-counts" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const catCols = categoricalCols(df);
  const [colName, setColName] = React.useState(spec.defaultCol ?? catCols[0] ?? "");
  const safeCol = resolveCol(df, colName, catCols);

  const vc = React.useMemo(() => {
    try {
      return df.valueCounts(safeCol);
    } catch {
      return [];
    }
  }, [df, safeCol]);

  return (
    <DemoShell
      title={`value_counts — ${safeCol}`}
      controls={<ColumnPicker cols={catCols} value={safeCol} onChange={setColName} label="Categorical" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">Value</th><th className="px-2 py-1 text-right">Count</th><th className="px-2 py-1 text-right">Percent</th></tr></thead>
          <tbody>
            {vc.map((v, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="px-2 py-1"><code className="text-mono text-[10px]">{String(v.value)}</code></td>
                <td className="text-mono px-2 py-1 text-right">{v.count}</td>
                <td className="text-mono px-2 py-1 text-right">{((v.count / df.rows.length) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

function ShapeInfoDemo({ spec }: { spec: Extract<TopicDemoSpec, { kind: "shape-info" }> }) {
  const { spec: dsSpec, df } = useDataset(spec.datasetId);
  const info = df.info();
  const totalNulls = Object.values(info.columns).reduce((s, c) => s + c.nullCount, 0);

  return (
    <DemoShell title="shape + info — dataset overview">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Rows" value={String(df.shape[0])} />
        <Stat label="Columns" value={String(df.shape[1])} />
        <Stat label="Memory" value={`${(info.memoryBytes / 1024).toFixed(1)} KB`} />
        <Stat label="Total nulls" value={String(totalNulls)} tone={totalNulls > 0 ? "warning" : undefined} />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">Column</th><th className="px-2 py-1 text-left">Dtype</th><th className="px-2 py-1 text-right">Non-null</th><th className="px-2 py-1 text-right">Nulls</th></tr></thead>
          <tbody>
            {info.columns.map((c) => (
              <tr key={c.name} className="border-t border-border/50">
                <td className="px-2 py-1"><code className="text-mono text-[10px]">{c.name}</code></td>
                <td className="px-2 py-1"><code className="text-mono text-[10px] text-[var(--color-ai-cyan)]">{c.dtype}</code></td>
                <td className="text-mono px-2 py-1 text-right">{c.nonNull}</td>
                <td className="text-mono px-2 py-1 text-right">{c.nullCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Source: {dsSpec.name}</p>
    </DemoShell>
  );
}

// ---------- Dispatcher ----------

export function TopicDemo({ demo }: { demo: TopicDemoSpec }) {
  switch (demo.kind) {
    case "describe-stats": return <DescribeStatsDemo spec={demo} />;
    case "histogram": return <HistogramDemo spec={demo} />;
    case "scatter-corr": return <ScatterCorrDemo spec={demo} />;
    case "parabolic": return <ParabolicDemo />;
    case "outlier-distortion": return <OutlierDistortionDemo />;
    case "groupby-summary": return <GroupbySummaryDemo spec={demo} />;
    case "pivot-table": return <PivotTableDemo spec={demo} />;
    case "crosstab": return <CrosstabDemo spec={demo} />;
    case "monthly-trend": return <MonthlyTrendDemo spec={demo} />;
    case "transform": return <TransformDemo spec={demo} />;
    case "encoding": return <EncodingDemo spec={demo} />;
    case "scaling": return <ScalingDemo spec={demo} />;
    case "feature-selection": return <FeatureSelectionDemo spec={demo} />;
    case "train-test-split": return <TrainTestSplitDemo spec={demo} />;
    case "binning": return <BinningDemo spec={demo} />;
    case "target-encoding": return <TargetEncodingDemo spec={demo} />;
    case "missing-values": return <MissingValuesDemo spec={demo} />;
    case "duplicates": return <DuplicatesDemo spec={demo} />;
    case "dtypes": return <DtypesDemo />;
    case "value-counts": return <ValueCountsDemo spec={demo} />;
    case "shape-info": return <ShapeInfoDemo spec={demo} />;
    default: return null;
  }
}
