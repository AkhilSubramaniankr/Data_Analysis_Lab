"use client";

/**
 * FeatureSelectionLab — a sandbox for running multiple feature selection
 * methods side-by-side and comparing their rankings.
 *
 * Reuses the engine's feature-selection methods. Runs on a real 70/30
 * train/val split (seed=42). All selection on TRAIN ONLY.
 */

import * as React from "react";
import { ListChecks, ShieldCheck, BookOpen } from "lucide-react";
import { BUILT_IN_DATASETS } from "@/lib/data/datasets";
import { DataFrame, fmt } from "@/lib/data/frame";
import {
  varianceThreshold, selectKBest, correlationSelect,
} from "@/lib/data/feature-selection";
import { treeFeatureImportance, lassoFeatureImportance } from "@/lib/data/ml";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChartShell } from "@/components/charts/ChartShell";
import { BarChart } from "@/components/charts/BarChart";
import { useNavigation } from "@/lib/store/navigation";
import { Button } from "@/components/ui/button";

export function FeatureSelectionLab() {
  const [datasetId, setDatasetId] = React.useState("retail");
  const [targetCol, setTargetCol] = React.useState("revenue");
  const [k, setK] = React.useState(3);
  const openModule = useNavigation((s) => s.openModule);

  const spec = BUILT_IN_DATASETS.find((d) => d.id === datasetId) ?? BUILT_IN_DATASETS[0];
  const df = DataFrame.fromRows(spec.rows);

  // Pick numeric features (exclude target + identifiers)
  const featureCols = df.columns.filter((c) => {
    if (c === targetCol) return false;
    if (c.endsWith("_id") || c === "order_date") return false;
    const dt = df.dtype(c);
    return dt === "int64" || dt === "float64";
  });

  // Numeric target candidates
  const targetCols = df.columns.filter((c) => {
    const dt = df.dtype(c);
    return (dt === "int64" || dt === "float64") && !c.endsWith("_id");
  });
  const safeTarget = targetCols.includes(targetCol) ? targetCol : targetCols[0] ?? "";

  // 70/30 train split (seed=42)
  const split = df.randomSplit(42, 0.3, 0);
  const trainDf = split.train;

  // Run all methods
  const results = (() => {
    const methods: { name: string; scores: { feature: string; score: number; selected: boolean }[] }[] = [];

    // Variance threshold
    const vt = varianceThreshold(trainDf, featureCols, 0.1);
    methods.push({
      name: "Variance threshold",
      scores: vt.map((r) => ({ feature: r.feature, score: r.variance, selected: r.selected })),
    });

    // Correlation with target
    const cs = correlationSelect(trainDf, featureCols, safeTarget, 0.05);
    methods.push({
      name: "|Correlation| with target",
      scores: cs.map((r) => ({ feature: r.feature, score: Math.abs(r.corr), selected: r.selected })),
    });

    // ANOVA F
    const skb = selectKBest(trainDf, featureCols, safeTarget, k, "anova_f");
    methods.push({
      name: "ANOVA F (SelectKBest)",
      scores: skb.map((r) => ({ feature: r.feature, score: r.score, selected: r.selected })),
    });

    // Tree importance
    const trainX = trainDf.rows.map((r) => featureCols.map((c) => (typeof r[c] === "number" ? r[c] as number : NaN)));
    const trainY = trainDf.column(safeTarget).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const validIdx = trainX.map((row, i) => row.every((v) => Number.isFinite(v)) ? i : -1).filter((i) => i >= 0);
    const XValid = validIdx.map((i) => trainX[i]);
    const yValid = validIdx.map((i) => trainY[i]);
    if (XValid.length > 0 && yValid.length > 0) {
      const ti = treeFeatureImportance(XValid, yValid, featureCols, "regression");
      const sorted = [...ti].sort((a, b) => b.importance - a.importance);
      methods.push({
        name: "Tree importance",
        scores: featureCols.map((name) => {
          const idx = sorted.findIndex((x) => x.feature === name);
          return { feature: name, score: sorted[idx]?.importance ?? 0, selected: idx < k };
        }),
      });
    }

    // Lasso
    const li = lassoFeatureImportance(XValid, yValid, featureCols, { l1: 0.001, iterations: 500, lr: 0.01 });
    const sortedL = [...li].sort((a, b) => b.importance - a.importance);
    methods.push({
      name: "L1 (Lasso) importance",
      scores: featureCols.map((name) => {
        const idx = sortedL.findIndex((x) => x.feature === name);
        return { feature: name, score: sortedL[idx]?.importance ?? 0, selected: idx < k };
      }),
    });

    return methods;
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="role-data border-role bg-role-soft rounded-md border p-2 text-xs">
        <p className="font-semibold text-role">Feature Selection Sandbox</p>
        <p className="mt-0.5 text-foreground/80">
          Run multiple selection methods side-by-side and compare their rankings. This sandbox covers variance threshold, |corr|, ANOVA F, tree importance, and Lasso. For the full set (chi², mutual info, RFE, RFECV, SFS, permutation importance), open Module 13 — Feature Selection.
        </p>
        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => openModule("feature-selection")}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Open Module 13 — Feature Selection →
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Dataset</Label>
          <Select value={datasetId} onValueChange={(v) => {
            setDatasetId(v);
            const newSpec = BUILT_IN_DATASETS.find((d) => d.id === v)!;
            const newDf = DataFrame.fromRows(newSpec.rows);
            const newTargetCols = newDf.columns.filter((c) => {
              const dt = newDf.dtype(c);
              return (dt === "int64" || dt === "float64") && !c.endsWith("_id");
            });
            setTargetCol(newTargetCols[0] ?? "");
          }}>
            <SelectTrigger className="mt-1 w-[16rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUILT_IN_DATASETS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Target</Label>
          <Select value={safeTarget} onValueChange={setTargetCol}>
            <SelectTrigger className="mt-1 w-[16rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {targetCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono text-xs">{c}</code></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">k (top features)</Label>
          <Select value={String(k)} onValueChange={(v) => setK(Number(v))}>
            <SelectTrigger className="mt-1 w-[8rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="role-validated border-role bg-role-soft rounded-md border p-2 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-role">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Leakage-safe — all methods fit on the TRAIN fold only (70% split, seed=42).
        </p>
      </div>

      {/* Comparison table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
          Method comparison — {results.length} methods × {featureCols.length} features
        </h4>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">Feature</th>
                {results.map((m) => (
                  <th key={m.name} className="px-2 py-1 text-center">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureCols.map((f) => (
                <tr key={f} className="border-t border-border/50">
                  <td className="px-2 py-1 font-medium"><code className="text-mono text-[10px]">{f}</code></td>
                  {results.map((m) => {
                    const r = m.scores.find((s) => s.feature === f);
                    return (
                      <td key={m.name} className="text-mono px-2 py-1 text-center">
                        <span className={r?.selected ? "font-bold text-[var(--color-role-validated)]" : ""}>
                          {fmt(r?.score ?? 0, 3)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Bold green = selected (top-{k}). Compare which features survive across methods — those that survive most methods are the most robust selections.
        </p>
      </div>

      {/* Per-method bar charts */}
      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((m) => (
          <ChartShell
            key={m.name}
            title={m.name}
            subtitle={`Top ${k} of ${featureCols.length} features.`}
            annotation={{
              question: `Which features does ${m.name} select?`,
              whyThisChart: "Bar chart shows the score per feature. Higher = more important.",
              shows: `${m.scores.filter((s) => s.selected).length} features selected.`,
              doesNotEstablish: "A high score does NOT mean the feature is causally related to the target — only predictive.",
              nextStep: "Cross-check with other methods. Features that survive most methods are the most robust picks.",
            }}
          >
            <BarChart
              data={[...m.scores].sort((a, b) => b.score - a.score).map((s) => ({ label: s.feature, value: s.score }))}
              layout="horizontal"
              xLabel="Score"
              altText={`Bar chart of ${m.name}`}
              useSelectionColors
              selectedIndices={[...m.scores].sort((a, b) => b.score - a.score).map((s, i) => ({ idx: i, selected: s.selected })).filter((x) => x.selected).map((x) => x.idx)}
            />
          </ChartShell>
        ))}
      </div>
    </div>
  );
}
