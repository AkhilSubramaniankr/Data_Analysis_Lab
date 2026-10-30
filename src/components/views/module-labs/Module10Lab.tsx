"use client";

/**
 * Module 10 Lab — Categorical Variable Representation.
 *
 * Master spec §15. Interactive encoding lab: pick a categorical column,
 * pick an encoding method (one-hot / dummy / ordinal / label / frequency /
 * target), see the original vs encoded table + column count + memory +
 * interpretability + risk (especially target encoding leakage).
 *
 * The lab EXPLICITLY enforces target-encoding train-only fitting — the
 * UI shows the leakage if the learner tries to target-encode the full
 * dataset without splitting first.
 */

import * as React from "react";
import { Tags, BookOpen, AlertTriangle, ShieldCheck } from "lucide-react";
import { buildEmployeeAnalytics, buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE10_EXERCISES } from "@/lib/content/exercises/module10";

type EncodingMethod = "onehot" | "dummy" | "ordinal" | "label" | "frequency" | "target";
type Dataset = "employees" | "retail";

export function Module10Lab() {
  const employees = React.useMemo(() => DataFrame.fromRows(buildEmployeeAnalytics().rows), []);
  const retail = React.useMemo(() => DataFrame.fromRows(buildRetailSales().rows), []);

  const [dataset, setDataset] = React.useState<Dataset>("employees");
  const [col, setCol] = React.useState("department");
  const [method, setMethod] = React.useState<EncodingMethod>("onehot");

  const activeDf = dataset === "employees" ? employees : retail;

  // Available categorical columns
  const categoricalCols = activeDf.columns.filter((c) => activeDf.dtype(c) === "object" && !["order_id", "customer_id", "employee_id", "order_date"].includes(c));
  const safeCol = categoricalCols.includes(col) ? col : categoricalCols[0];

  // Target column for target encoding
  const targetCols = dataset === "employees"
    ? ["salary", "performance_rating", "training_hours"]
    : ["revenue", "profit", "quantity"];
  const [targetCol, setTargetCol] = React.useState(dataset === "employees" ? "salary" : "revenue");
  const safeTarget = targetCols.includes(targetCol) ? targetCol : targetCols[0];

  // Split the data for target encoding (leakage-safe)
  // Use a 70/30 train/test split with seed=42.
  const { train: trainDf, test: testDf } = (() => {
    const split = activeDf.randomSplit(42, 0, 0.3);
    return { train: split.train, test: split.test };
  })();
  // Build the train mask aligned with the original DataFrame's row order
  const trainIds = (() => new Set(trainDf.rows.map((r) => {
    // The split preserves row identity by reference; use the first column as a tiebreaker.
    return JSON.stringify(r);
  })))();

  // Apply the chosen encoding
  const encodedDf = (() => {
    try {
      switch (method) {
        case "onehot":
          return activeDf.getDummies(safeCol);
        case "dummy":
          return activeDf.getDummies(safeCol, { dropFirst: true });
        case "ordinal":
          return activeDf.factorize(safeCol).df;
        case "label":
          // Label encoding here is the same as factorize (Pandas has no separate "label encoding";
          // scikit-learn's LabelEncoder is for the target, not features).
          return activeDf.factorize(safeCol).df;
        case "frequency":
          return activeDf.frequencyEncode(safeCol);
        case "target": {
          // Build the train mask
          const mask = activeDf.rows.map((r) => trainIds.has(JSON.stringify(r)));
          return activeDf.targetEncode(safeCol, safeTarget, mask);
        }
      }
    } catch (e) {
      console.error("Encoding failed", e);
      return activeDf;
    }
  })();

  const newColName = method === "onehot" || method === "dummy"
    ? `${safeCol}_* (multiple)`
    : method === "ordinal" || method === "label"
      ? `${safeCol}_code`
      : method === "frequency" ? `${safeCol}_freq` : `${safeCol}_target_enc`;

  // Memory + cardinality metrics
  const cardinality = activeDf.nunique(safeCol);
  const originalBytes = activeDf.memoryUsage().find((m) => m.column === safeCol)?.bytes ?? 0;
  const encodedBytes = (method === "onehot" || method === "dummy")
    ? encodedDf.columns
        .filter((c) => c.startsWith(`${safeCol}_`))
        .reduce((s, c) => s + (encodedDf.memoryUsage().find((m) => m.column === c)?.bytes ?? 0), 0)
    : encodedDf.memoryUsage().find((m) => m.column === newColName.split(" ")[0])?.bytes ?? 0;
  const newColCount = (method === "onehot" || method === "dummy")
    ? encodedDf.columns.filter((c) => c.startsWith(`${safeCol}_`)).length
    : 1;

  // Risk assessment
  const risks: { risk: string; severity: "low" | "medium" | "high" }[] = [];
  if (method === "onehot") {
    risks.push({ risk: "High-cardinality columns produce k columns. Memory grows linearly.", severity: cardinality > 20 ? "medium" : "low" });
  }
  if (method === "dummy") {
    risks.push({ risk: "Drops the first category as reference. Coefficients are relative to that reference.", severity: "low" });
  }
  if (method === "ordinal" || method === "label") {
    risks.push({ risk: "Arbitrary integer codes imply false ordering for linear/distance-based models. Tree-based models tolerate them.", severity: "high" });
  }
  if (method === "frequency") {
    risks.push({ risk: "Ties between categories produce identical codes — loses information. Re-fit on train only at inference.", severity: "medium" });
  }
  if (method === "target") {
    risks.push({ risk: "LEAKAGE: target encoding on the full dataset leaks the target into features. We enforce train-only fitting here.", severity: "high" });
    risks.push({ risk: "Rare categories get noisy estimates; consider smoothing (add global mean with a prior).", severity: "medium" });
  }

  const codeForMethod = (() => {
    switch (method) {
      case "onehot":
        return `# Pandas one-hot encoding
df_encoded = pd.get_dummies(df, columns=["${safeCol}"], prefix="${safeCol}")
# scikit-learn equivalent (pipeline-friendly, handles unseen categories):
from sklearn.preprocessing import OneHotEncoder
enc = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
enc.fit(df_train[["${safeCol}"]])
encoded_train = enc.transform(df_train[["${safeCol}"]])
encoded_test = enc.transform(df_test[["${safeCol}"]])`;
      case "dummy":
        return `# Dummy encoding (k-1 columns, drop the first)
df_encoded = pd.get_dummies(df, columns=["${safeCol}"], drop_first=True)`;
      case "ordinal":
      case "label":
        return `# Ordinal / label encoding (Pandas factorize)
codes, categories = pd.factorize(df["${safeCol}"])
df["${safeCol}_code"] = codes
# WARNING: arbitrary integer codes imply false ordering. Tree models OK;
# for linear/distance-based models, use one-hot instead.`;
      case "frequency":
        return `# Frequency encoding
freq = df["${safeCol}"].value_counts(normalize=True)
df["${safeCol}_freq"] = df["${safeCol}"].map(freq)
# At inference: store the freq mapping; reuse, don't re-compute.`;
      case "target":
        return `# Target encoding — LEAKAGE-SAFE form
from sklearn.model_selection import train_test_split
df_train, df_test = train_test_split(df, test_size=0.3, random_state=42)

# 1. Compute category means on TRAIN ONLY
means = df_train.groupby("${safeCol}")["${safeTarget}"].mean()
global_mean = df_train["${safeTarget}"].mean()

# 2. Apply to BOTH train and test (use train mapping + global fallback)
df_train["${safeCol}_target_enc"] = df_train["${safeCol}"].map(means).fillna(global_mean)
df_test["${safeCol}_target_enc"] = df_test["${safeCol}"].map(means).fillna(global_mean)
# (scikit-learn's TargetEncoder in version 1.4+ does this for you.)`;
    }
  })();

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Tags className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a categorical column, pick an encoding method, and see the encoded table + column count + memory + risks. Target encoding enforces train-only fitting — the lab shows you the leakage-safe code path.
      </p>

      <div className="role-warning border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-role">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Critical: target encoding leakage
        </p>
        <p className="mt-1 text-foreground/80">
          Target encoding computes the per-category mean of the TARGET. If you compute it on the full dataset (train + test), the test target leaks into the features. The lab's target-encoding path uses a 70/30 train/test split (seed=42) — category means are computed on TRAIN ONLY and applied to both splits with the global-mean fallback for unseen categories.
        </p>
      </div>

      {/* Controls */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Encoding controls</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Dataset</Label>
            <Select value={dataset} onValueChange={(v) => {
              setDataset(v as Dataset);
              setCol(v === "employees" ? "department" : "category");
              setTargetCol(v === "employees" ? "salary" : "revenue");
            }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employees">Employee Analytics</SelectItem>
                <SelectItem value="retail">Retail Sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Categorical column</Label>
            <Select value={safeCol} onValueChange={setCol}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoricalCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Encoding method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as EncodingMethod)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="onehot">One-hot (k columns)</SelectItem>
                <SelectItem value="dummy">Dummy (k-1 columns)</SelectItem>
                <SelectItem value="ordinal">Ordinal / Label (factorize)</SelectItem>
                <SelectItem value="frequency">Frequency encode</SelectItem>
                <SelectItem value="target">Target encode (leakage-safe)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method === "target" && (
            <div>
              <Label className="text-xs">Target column</Label>
              <Select value={safeTarget} onValueChange={setTargetCol}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {targetCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Quick metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Cardinality (k)" value={String(cardinality)} tone="data" />
          <Stat label="New columns" value={String(newColCount)} tone="data" />
          <Stat label="Original bytes" value={originalBytes.toLocaleString()} tone="data" />
          <Stat label="Encoded bytes" value={encodedBytes.toLocaleString()} tone={encodedBytes > originalBytes * 1.5 ? "warning" : "data"} />
          <Stat label="Train rows used" value={String(trainDf.rows.length)} tone={method === "target" ? "validated" : "data"} />
        </div>
      </div>

      {/* Code + result */}
      <div className="mt-5">
        <CodeAndResult
          code={codeForMethod}
          caption={`${method} encoding of ${safeCol}${method === "target" ? ` (target: ${safeTarget})` : ""} — Pandas / scikit-learn equivalent`}
          note={
            method === "target"
              ? "Notice the leakage-safe form: fit on TRAIN ONLY, apply to BOTH splits. The global_mean fallback handles unseen categories in test."
              : method === "ordinal" || method === "label"
                ? "WARNING: arbitrary integer codes imply false ordering for linear/distance-based models (k-NN, k-means, linear regression). Tree models tolerate them."
                : method === "onehot"
                  ? "For high-cardinality columns (k > ~20), one-hot creates many sparse columns. Consider frequency or target encoding instead."
                  : undefined
          }
        >
          <DatasetTable df={encodedDf.head(15)} pageSize={15} />
        </CodeAndResult>
      </div>

      {/* Risks */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-[var(--color-ai-blue)]" aria-hidden />
          Risks &amp; considerations for {method}
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {risks.length === 0 ? (
            <li className="text-xs text-muted-foreground">No specific risks — see the master spec for general guidance.</li>
          ) : risks.map((r, i) => (
            <li key={i} className={`flex items-start gap-2 rounded-md border border-border bg-background p-2 text-xs role-${r.severity === "high" ? "error" : r.severity === "medium" ? "warning" : "validated"}`}>
              <AlertTriangle
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${r.severity === "high" ? "text-[var(--color-role-error)]" : r.severity === "medium" ? "text-[var(--color-role-warning)]" : "text-[var(--color-role-validated)]"}`}
                aria-hidden
              />
              <span className="text-foreground/80">{r.risk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE10_EXERCISES.map((ex) => (
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
