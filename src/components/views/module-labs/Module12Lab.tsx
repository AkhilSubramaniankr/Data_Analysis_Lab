"use client";

/**
 * Module 12 Lab — Feature Scaling & Numerical Transformation.
 *
 * Master spec §17. Interactive scaling lab: pick a numerical feature,
 * apply each scaler (Standard / MinMax / Robust / MaxAbs), see original vs
 * transformed values + mean/std/min/max + outlier sensitivity + per-model-
 * family recommendation.
 *
 * Critical: train-only-fitting is enforced. The lab uses a 70/30 split
 * (seed=42), fits the scaler on TRAIN ONLY, and applies the SAME fitted
 * parameters to BOTH train and test. The "leakage check" panel proves the
 * scaler params came from training rows.
 */

import * as React from "react";
import { Gauge, BookOpen, AlertTriangle, ShieldCheck, TreePine, Ruler, TrendingUp } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { mean, std, min, max, quantile, quartiles, iqr as iqrStat, toNumericArray } from "@/lib/data/stats";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ChartShell } from "@/components/charts/ChartShell";
import { Histogram } from "@/components/charts/Histogram";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE12_EXERCISES } from "@/lib/content/exercises/module12";

type Scaler = "standard" | "minmax" | "robust" | "maxabs";

export function Module12Lab() {
  const retail = React.useMemo(() => DataFrame.fromRows(buildRetailSales().rows), []);

  const numericCols = retail.columns.filter((c) => {
    const dt = retail.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const [col, setCol] = React.useState("revenue");
  const safeCol = numericCols.includes(col) ? col : numericCols[0];

  // 70/30 train/test split (seed=42)
  const { train, test } = (() => {
    const split = retail.randomSplit(42, 0, 0.3);
    return { train: split.train, test: split.test };
  })();

  // Fit parameters ON TRAIN ONLY
  const fitParams = (() => {
    const trainVals = train.column(safeCol).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (trainVals.length === 0) {
      return { standard: { m: 0, s: 1 }, minmax: { lo: 0, hi: 1 }, robust: { med: 0, iqr: 1 }, maxabs: { maxAbs: 1 } };
    }
    const xs = toNumericArray(trainVals.map((v) => v as never));
    const m = mean(xs);
    const s = std(xs);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const { q1, q3 } = quartiles(xs);
    const iqrV = q3 - q1;
    const med = quantile(xs, 0.5);
    const maxAbs = Math.max(...xs.map(Math.abs));
    return { standard: { m, s }, minmax: { lo, hi }, robust: { med, iqr: iqrV }, maxabs: { maxAbs } };
  })();

  const [scaler, setScaler] = React.useState<Scaler>("standard");

  // Apply the chosen scaler to BOTH train and test using the train-fit parameters
  const trainScaled = (() => {
    return train.standardizeWith(safeCol, fitParams.standard.m, fitParams.standard.s, `${safeCol}_scaled`);
  })();
  const testScaled = (() => {
    return test.standardizeWith(safeCol, fitParams.standard.m, fitParams.standard.s, `${safeCol}_scaled`);
  })();

  // Apply each scaler on train (for the "compare all scalers" chart)
  const trainAllScaled = (() => {
    return train
      .standardize(safeCol, "standard")
      .minMaxScale(safeCol, "minmax")
      .robustScale(safeCol, "robust")
      .maxAbsScale(safeCol, "maxabs");
  })();

  // Statistics per scaler
  const scalerStats = (() => {
    const cols: { scaler: Scaler; col: string }[] = [
      { scaler: "standard", col: "standard" },
      { scaler: "minmax", col: "minmax" },
      { scaler: "robust", col: "robust" },
      { scaler: "maxabs", col: "maxabs" },
    ];
    return cols.map(({ scaler: s, col: c }) => {
      const vals = trainAllScaled.column(c).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      return {
        scaler: s,
        mean: vals.length > 0 ? mean(vals) : NaN,
        std: vals.length > 0 ? std(vals) : NaN,
        min: vals.length > 0 ? min(vals) : NaN,
        max: vals.length > 0 ? max(vals) : NaN,
      };
    });
  })();

  const activeScaled = scaler === "standard" ? trainAllScaled.select([safeCol, "standard"]) :
                       scaler === "minmax" ? trainAllScaled.select([safeCol, "minmax"]) :
                       scaler === "robust" ? trainAllScaled.select([safeCol, "robust"]) :
                                              trainAllScaled.select([safeCol, "maxabs"]);
  const scaledColName = scaler;

  const trainValues = train.column(safeCol).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const scaledValues = activeScaled.column(scaledColName).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const code = (() => {
    const params = scaler === "standard"
      ? `mean=${fmt(fitParams.standard.m, 4)}, std=${fmt(fitParams.standard.s, 4)}`
      : scaler === "minmax"
        ? `min=${fmt(fitParams.minmax.lo, 4)}, max=${fmt(fitParams.minmax.hi, 4)}`
        : scaler === "robust"
          ? `median=${fmt(fitParams.robust.med, 4)}, IQR=${fmt(fitParams.robust.iqr, 4)}`
          : `max_abs=${fmt(fitParams.maxabs.maxAbs, 4)}`;
    const sklearnClass = scaler === "standard" ? "StandardScaler" :
                         scaler === "minmax" ? "MinMaxScaler" :
                         scaler === "robust" ? "RobustScaler" :
                                                "MaxAbsScaler";
    return `# Leakage-safe scaling: fit on TRAIN, apply to both splits
from sklearn.preprocessing import ${sklearnClass}
scaler = ${sklearnClass}()
scaler.fit(df_train[["${safeCol}"]])  # fit ONLY on train

df_train["${safeCol}_scaled"] = scaler.transform(df_train[["${safeCol}"]])
df_test["${safeCol}_scaled"]  = scaler.transform(df_test[["${safeCol}"]])

# Fitted params (from train): ${params}`;
  })();

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Gauge className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a numerical feature, pick a scaler, see the scaled distribution + summary statistics + outlier sensitivity + per-model-family recommendation. Train-only fitting is enforced — the lab proves the scaler params came from training rows only.
      </p>

      <div className="role-validated border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-role">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Leakage-safe by design
        </p>
        <p className="mt-1 text-foreground/80">
          The dataset is split 70/30 (seed=42) into train and test. Every scaler is fit on TRAIN ONLY; the same fitted parameters are applied to BOTH train and test. The fitted params panel below shows the values came from training rows — verify them yourself.
        </p>
      </div>

      {/* Controls */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Scaling controls</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
            <Label className="text-xs">Scaler</Label>
            <Select value={scaler} onValueChange={(v) => setScaler(v as Scaler)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (Z-score)</SelectItem>
                <SelectItem value="minmax">Min-Max [0, 1]</SelectItem>
                <SelectItem value="robust">Robust (median + IQR)</SelectItem>
                <SelectItem value="maxabs">Max-Abs [-1, 1]</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fitted params */}
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fitted parameters (from TRAIN ONLY — {train.rows.length} rows)</p>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Param label="Standard: mean / std" value={`${fmt(fitParams.standard.m, 3)} / ${fmt(fitParams.standard.s, 3)}`} />
            <Param label="MinMax: min / max" value={`${fmt(fitParams.minmax.lo, 2)} / ${fmt(fitParams.minmax.hi, 2)}`} />
            <Param label="Robust: median / IQR" value={`${fmt(fitParams.robust.med, 2)} / ${fmt(fitParams.robust.iqr, 2)}`} />
            <Param label="MaxAbs: max(|x|)" value={fmt(fitParams.maxabs.maxAbs, 2)} />
          </div>
        </div>
      </div>

      {/* Per-scaler stats comparison */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">All four scalers — train-set statistics</h3>
        <p className="mt-1 text-xs text-foreground/80">After applying each scaler to the train set, what do the transformed values look like?</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">Scaler</th>
                <th className="px-2 py-1 text-right">Mean</th>
                <th className="px-2 py-1 text-right">Std</th>
                <th className="px-2 py-1 text-right">Min</th>
                <th className="px-2 py-1 text-right">Max</th>
                <th className="px-2 py-1 text-left">Sensitivity to outliers</th>
              </tr>
            </thead>
            <tbody>
              {scalerStats.map((s) => (
                <tr key={s.scaler} className="border-t border-border/50">
                  <td className="px-2 py-1 font-medium">{s.scaler}</td>
                  <td className="text-mono px-2 py-1 text-right">{fmt(s.mean, 3)}</td>
                  <td className="text-mono px-2 py-1 text-right">{fmt(s.std, 3)}</td>
                  <td className="text-mono px-2 py-1 text-right">{fmt(s.min, 3)}</td>
                  <td className="text-mono px-2 py-1 text-right">{fmt(s.max, 3)}</td>
                  <td className="px-2 py-1">
                    {s.scaler === "standard" ? "High — mean + std both inflate." :
                     s.scaler === "minmax" ? "High — min + max are direct outliers." :
                     s.scaler === "robust" ? "Low — uses median + IQR." :
                                              "Medium — max(|x|) is bounded by the largest outlier."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code + result */}
      <div className="mt-5">
        <CodeAndResult
          code={code}
          caption={`${scaler} scaler applied to ${safeCol} (Pandas / scikit-learn equivalent)`}
          note="Standard and MinMax are sensitive to outliers; Robust and MaxAbs are more tolerant. Tree models (RandomForest, XGBoost) don't need scaling; distance/gradient-based models (k-NN, k-means, logistic regression, neural nets) usually do."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartShell
              title={`Original: ${safeCol} (train set)`}
              subtitle="Raw values from the training rows."
              annotation={{
                question: `What does the raw ${safeCol} distribution look like?`,
                whyThisChart: "Histogram reveals the shape before scaling — long-tail, normal, or bimodal.",
                shows: `${trainValues.length} training rows' raw ${safeCol} values.`,
                doesNotEstablish: "The raw distribution does not establish that scaling is needed — only the model family decides that.",
                nextStep: "Apply the chosen scaler and compare to the chart on the right.",
              }}
            >
              <Histogram values={trainValues} bins={12} xLabel={safeCol} yLabel="Frequency" altText={`Histogram of raw ${safeCol} on train set`} />
            </ChartShell>

            <ChartShell
              title={`${scaler} scaled: ${safeCol} (train set)`}
              subtitle={`After applying ${scaler} with train-fit parameters.`}
              annotation={{
                question: `How does ${scaler} change the distribution?`,
                whyThisChart: "Histogram after scaling. The shape is preserved (scaling is linear), but the location and spread change.",
                shows: `Scaled values from ${trainValues.length} training rows. Mean = ${fmt(scalerStats.find((s) => s.scaler === scaler)?.mean ?? NaN, 3)}, std = ${fmt(scalerStats.find((s) => s.scaler === scaler)?.std ?? NaN, 3)}.`,
                doesNotEstablish: "Scaling does NOT establish that the model will perform better. It establishes only that the feature values are on a comparable scale with other features.",
                nextStep: "Verify the same scaler applied to the TEST set produces sensible values (no Inf or NaN). Then add the scaled feature to a model and compare CV scores with the raw feature.",
              }}
            >
              <Histogram values={scaledValues} bins={12} xLabel={`${safeCol}_${scaler}`} yLabel="Frequency" altText={`Histogram of ${safeCol} after ${scaler} scaling on train set`} />
            </ChartShell>
          </div>
        </CodeAndResult>
      </div>

      {/* Leakage proof panel */}
      <div className="mt-5 rounded-lg border border-[var(--color-role-validated)]/40 bg-[color-mix(in_oklch,var(--color-role-validated)_8%,transparent)] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-role-validated)]">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Leakage proof: same scaler, same params on train AND test
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          The table below shows the scaled values on both train (rows 0–{train.rows.length - 1}) and test (rows {train.rows.length}–{train.rows.length + test.rows.length - 1}). Both use the SAME fitted mean and std from training rows. The test set was NOT used to fit the scaler — that's the leakage-safe guarantee.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Train (first 5 rows, scaled)</p>
            <DatasetTable df={trainScaled.head(5)} pageSize={5} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test (first 5 rows, scaled with TRAIN params)</p>
            <DatasetTable df={testScaled.head(5)} pageSize={5} />
          </div>
        </div>
      </div>

      {/* Model recommendation */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Per-model-family recommendation</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <ModelRec icon={TreePine} name="Tree-based (RandomForest, XGBoost, LightGBM)" scaling="Not required" explanation="Tree splits are invariant under monotonic transforms — scaling does nothing. Skip it." />
          <ModelRec icon={Ruler} name="Distance-based (k-NN, k-means, SVM with RBF)" scaling="Required" explanation="Distances depend on feature scales; large-scale features dominate. Standardize or MinMax." />
          <ModelRec icon={TrendingUp} name="Gradient-based (logistic regression, neural nets)" scaling="Usually required" explanation="Gradient descent converges faster when features are on similar scales. Standardize is the default." />
        </div>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE12_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

function Param({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ModelRec({ icon: Icon, name, scaling, explanation }: { icon: React.ElementType; name: string; scaling: "Not required" | "Required" | "Usually required"; explanation: string }) {
  const tone = scaling === "Not required" ? "validated" : scaling === "Required" ? "warning" : "data";
  return (
    <div className={`rounded-md border border-border bg-background p-3 role-${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-xs font-semibold">{name}</p>
      </div>
      <p className={`mt-1 text-xs font-semibold uppercase tracking-wider text-role`}>Scaling: {scaling}</p>
      <p className="mt-1 text-xs text-foreground/80">{explanation}</p>
    </div>
  );
}
