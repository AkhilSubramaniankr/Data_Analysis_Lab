"use client";

/**
 * FeatureEngineeringLab — a quick sandbox for transforms (log1p / sqrt /
 * square / standardize / minmax / robust) on any dataset.
 *
 * This is the "quick try" version: pick a column + a transform, see the
 * original vs transformed side-by-side. For the full guided experience
 * (with leakage-safe train-only fitting, per-scaler stats comparison, and
 * per-model-family recommendations), open Module 12 — Scaling from the
 * Roadmap. The two are intentionally complementary: this lab is the
 * "sandbox", Module 12 is the "lesson".
 */

import * as React from "react";
import { Wrench, BookOpen } from "lucide-react";
import { BUILT_IN_DATASETS } from "@/lib/data/datasets";
import { DataFrame, fmt } from "@/lib/data/frame";
import { mean } from "@/lib/data/stats";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChartShell } from "@/components/charts/ChartShell";
import { Histogram } from "@/components/charts/Histogram";
import { useNavigation } from "@/lib/store/navigation";
import { Button } from "@/components/ui/button";

type TransformType = "log1p" | "sqrt" | "square" | "standardize" | "minmax" | "robust";

const TRANSFORMS: { id: TransformType; label: string; code: string }[] = [
  { id: "log1p", label: "log1p (log(1+x))", code: "np.log1p(df[col])" },
  { id: "sqrt", label: "sqrt", code: "np.sqrt(df[col])" },
  { id: "square", label: "square (x²)", code: "df[col] ** 2" },
  { id: "standardize", label: "StandardScaler (Z-score)", code: "StandardScaler().fit_transform(df[[col]])" },
  { id: "minmax", label: "MinMaxScaler [0,1]", code: "MinMaxScaler().fit_transform(df[[col]])" },
  { id: "robust", label: "RobustScaler (median+IQR)", code: "RobustScaler().fit_transform(df[[col]])" },
];

export function FeatureEngineeringLab() {
  const [datasetId, setDatasetId] = React.useState("retail");
  const [colName, setColName] = React.useState("revenue");
  const [transform, setTransform] = React.useState<TransformType>("log1p");
  const openModule = useNavigation((s) => s.openModule);

  const spec = BUILT_IN_DATASETS.find((d) => d.id === datasetId) ?? BUILT_IN_DATASETS[0];
  const df = DataFrame.fromRows(spec.rows);

  const numericCols = df.columns.filter((c) => {
    const dt = df.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const safeCol = numericCols.includes(colName) ? colName : numericCols[0] ?? "";

  const transformedDf = (() => {
    switch (transform) {
      case "log1p": return df.transform(safeCol, "log1p");
      case "sqrt": return df.transform(safeCol, "sqrt");
      case "square": return df.transform(safeCol, "square");
      case "standardize": return df.standardize(safeCol);
      case "minmax": return df.minMaxScale(safeCol);
      case "robust": return df.robustScale(safeCol);
    }
  })();

  const origVals = df.column(safeCol).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const transCol = transform === "standardize" ? `${safeCol}_z` : transform === "minmax" ? `${safeCol}_mm` : transform === "robust" ? `${safeCol}_rs` : `${safeCol}_${transform}`;
  const transVals = transformedDf.column(transCol).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const transformDef = TRANSFORMS.find((t) => t.id === transform)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="role-data border-role bg-role-soft rounded-md border p-2 text-xs">
        <p className="font-semibold text-role">Quick Transform Sandbox</p>
        <p className="mt-0.5 text-foreground/80">
          Try any transform on any column. For the full guided experience (leakage-safe train-only fitting, per-scaler comparison, model-family recommendations), open Module 12 — Scaling.
        </p>
        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => openModule("scaling")}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Open Module 12 — Scaling →
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Dataset</Label>
          <Select value={datasetId} onValueChange={(v) => {
            setDatasetId(v);
            const newSpec = BUILT_IN_DATASETS.find((d) => d.id === v)!;
            const newDf = DataFrame.fromRows(newSpec.rows);
            const newNumCols = newDf.columns.filter((c) => {
              const dt = newDf.dtype(c); return dt === "int64" || dt === "float64";
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
        <div>
          <Label className="text-xs">Transform</Label>
          <Select value={transform} onValueChange={(v) => setTransform(v as TransformType)}>
            <SelectTrigger className="mt-1 w-[16rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSFORMS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
          <code className="text-mono text-sm font-medium">df["{transCol}"] = {transformDef.code.replace("col", safeCol).replace("df", "df")}</code>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Original mean" value={fmt(origVals.length > 0 ? mean(origVals) : NaN, 2)} />
          <Stat label="Transformed mean" value={fmt(transVals.length > 0 ? mean(transVals) : NaN, 2)} />
          <Stat label="Original min" value={fmt(origVals.length > 0 ? Math.min(...origVals) : NaN, 2)} />
          <Stat label="Transformed min" value={fmt(transVals.length > 0 ? Math.min(...transVals) : NaN, 2)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartShell
          title={`Original: ${safeCol}`}
          subtitle="Raw distribution before transformation."
          annotation={{
            question: `What does ${safeCol} look like before?`,
            whyThisChart: "Histogram reveals the raw shape — long-tail, symmetric, bimodal.",
            shows: `${origVals.length} values.`,
            doesNotEstablish: "The original shape doesn't determine which transform is right — the model family does.",
            nextStep: "Apply a transform and compare to the chart on the right.",
          }}
        >
          <Histogram values={origVals} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of ${safeCol}`} />
        </ChartShell>
        <ChartShell
          title={`Transformed: ${transCol}`}
          subtitle={`After ${transformDef.label}.`}
          annotation={{
            question: `How does ${transform} change the distribution?`,
            whyThisChart: "Compare with the original. log1p compresses long tails; standardize centers at 0 ± 1; minmax maps to [0,1].",
            shows: `${transVals.length} transformed values.`,
            doesNotEstablish: "A better-looking distribution does NOT mean the model will perform better — verify with CV.",
            nextStep: "If the transform helps, add it to a Pipeline (Module 14) and compare model scores.",
          }}
        >
          <Histogram values={transVals} bins={12} xLabel={transCol} yLabel="Frequency" altText={`Histogram of ${transCol}`} />
        </ChartShell>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
