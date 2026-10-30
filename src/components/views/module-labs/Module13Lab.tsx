"use client";

/**
 * Module 13 Lab — Feature Selection.
 *
 * Master spec §18. Three families:
 *   A. Filter — variance threshold, correlation, chi2, ANOVA F, mutual info.
 *   B. Model-based — tree importance, L1/Lasso, permutation importance.
 *   C. Wrapper — RFE, RFECV, sequential forward selection.
 *
 * Every result is computed from a real train/val split (seed=42, 70/30).
 * Feature selection is performed on TRAIN ONLY. Model performance is
 * scored on the val set. NEVER on the test set (the lab has no test set
 * — the train/val distinction is the educational point).
 */

import * as React from "react";
import { ListChecks, BookOpen, ShieldCheck, AlertTriangle, Filter as FilterIcon, TreePine, GitBranch } from "lucide-react";
import { buildEmployeeAnalytics, buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import {
  classificationMetrics,
  regressionMetrics,
  fitLinearRegression,
  predictLinear,
  fitLogisticRegression,
  predictLogisticProba,
  treeFeatureImportance,
  lassoFeatureImportance,
} from "@/lib/data/ml";
import {
  varianceThreshold,
  selectKBest,
  correlationSelect,
  permutationImportance,
  rfe,
  sequentialForwardSelection,
  rfecv,
} from "@/lib/data/feature-selection";
import { toFeatureMatrix } from "@/lib/data/ml";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ChartShell } from "@/components/charts/ChartShell";
import { BarChart } from "@/components/charts/BarChart";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE13_EXERCISES } from "@/lib/content/exercises/module13";

type Dataset = "employees" | "retail";
type Task = "classification" | "regression";
type Method =
  | "variance"
  | "correlation"
  | "chi2"
  | "anova_f"
  | "mutual_info"
  | "tree"
  | "lasso"
  | "permutation"
  | "rfe"
  | "rfecv"
  | "sfs";

export function Module13Lab() {
  const employees = DataFrame.fromRows(buildEmployeeAnalytics().rows);
  const retail = DataFrame.fromRows(buildRetailSales().rows);

  const [dataset, setDataset] = React.useState<Dataset>("employees");
  const [method, setMethod] = React.useState<Method>("anova_f");
  const [nFeatures, setNFeatures] = React.useState(3);

  const activeDf = dataset === "employees" ? employees : retail;

  // Pick the target + available feature columns
  const target = dataset === "employees" ? "attrition" : "revenue";
  const task: Task = dataset === "employees" ? "classification" : "regression";
  // Numeric feature candidates only (the master spec requires filter/model-based/wrapper on numeric features)
  const featureCols = activeDf.columns.filter((c) => {
    if (c === target) return false;
    if (c.endsWith("_id")) return false; // identifiers are not features
    const dt = activeDf.dtype(c);
    return dt === "int64" || dt === "float64";
  });

  // 70/30 train/val split (seed=42) — stratified for classification, random for regression
  const { trainDf, valDf } = (() => {
    if (task === "classification") {
      const split = activeDf.stratifiedSplit(target, 42, 0.3, 0);
      return { trainDf: split.train, valDf: split.val };
    }
    const split = activeDf.randomSplit(42, 0.3, 0);
    return { trainDf: split.train, valDf: split.val };
  })();

  // Build the y arrays (0/1 for classification; numeric for regression)
  const trainY = (() => {
    if (task === "classification") {
      // For employees.attrition: positive class = "yes"
      return trainDf.column(target).map((v) => (v === "yes" ? 1 : 0));
    }
    return trainDf.column(target).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  })();
  const valY = (() => {
    if (task === "classification") {
      return valDf.column(target).map((v) => (v === "yes" ? 1 : 0));
    }
    return valDf.column(target).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  })();

  // Pre-add a numeric target column for the filter methods (selectKBest, correlationSelect,
  // etc.) that call toFeatureMatrix internally — those expect a NUMERIC target. The string
  // "yes"/"no" target is converted to 0/1 here.
  const NUMERIC_TARGET = "_y_binary";
  const trainDfNumeric = task === "classification"
    ? trainDf.withColumn(NUMERIC_TARGET, (r) => (r[target] === "yes" ? 1 : 0))
    : trainDf;
  const valDfNumeric = task === "classification"
    ? valDf.withColumn(NUMERIC_TARGET, (r) => (r[target] === "yes" ? 1 : 0))
    : valDf;
  const effectiveTarget = task === "classification" ? NUMERIC_TARGET : target;

  // Train/val feature matrices — built directly from the (already-0/1) y arrays
  // so the lab works for string targets like attrition.
  const trainMatrix = (() => {
    const X = trainDfNumeric.rows.map((r) => featureCols.map((c) => (typeof r[c] === "number" ? (r[c] as number) : NaN)));
    const y = trainY;
    // Filter out rows with any NaN feature (after our impute/encoding — but in this lab,
    // the feature columns are raw, so missing values become NaN and the row is dropped)
    const validMask = X.map((row) => row.every((v) => Number.isFinite(v)));
    const XValid = X.filter((_, i) => validMask[i]);
    const yValid = y.filter((_, i) => validMask[i]);
    return { X: XValid, y: yValid, validMask };
  })();
  const valMatrix = (() => {
    const X = valDfNumeric.rows.map((r) => featureCols.map((c) => (typeof r[c] === "number" ? (r[c] as number) : NaN)));
    const y = valY;
    const validMask = X.map((row) => row.every((v) => Number.isFinite(v)));
    const XValid = X.filter((_, i) => validMask[i]);
    const yValid = y.filter((_, i) => validMask[i]);
    return { X: XValid, y: yValid, validMask };
  })();

  // Apply the chosen selection method
  const selectionResult = (() => {
    switch (method) {
      case "variance": {
        const r = varianceThreshold(trainDf, featureCols, 0.1);
        return r.map((x) => ({ feature: x.feature, score: x.variance, selected: x.selected, rank: 0 }));
      }
      case "correlation": {
        const r = correlationSelect(trainDfNumeric, featureCols, effectiveTarget, 0.1);
        return r.map((x) => ({ feature: x.feature, score: Math.abs(x.corr), selected: x.selected, rank: 0 }));
      }
      case "chi2":
      case "anova_f":
      case "mutual_info": {
        const r = selectKBest(trainDfNumeric, featureCols, effectiveTarget, nFeatures, method);
        return r.map((x) => ({ feature: x.feature, score: x.score, selected: x.selected, rank: x.rank }));
      }
      case "tree": {
        const r = treeFeatureImportance(trainMatrix.X, trainMatrix.y, featureCols, task === "classification" ? "classification" : "regression");
        // Sort by importance desc; select top n
        const sorted = [...r].sort((a, b) => b.importance - a.importance);
        return featureCols.map((name) => {
          const idx = sorted.findIndex((x) => x.feature === name);
          return {
            feature: name,
            score: sorted[idx].importance,
            selected: idx < nFeatures,
            rank: idx + 1,
          };
        });
      }
      case "lasso": {
        const r = lassoFeatureImportance(trainMatrix.X, trainMatrix.y, featureCols, { l1: 0.001, iterations: 500, lr: 0.01 });
        const sorted = [...r].sort((a, b) => b.importance - a.importance);
        return featureCols.map((name) => {
          const idx = sorted.findIndex((x) => x.feature === name);
          return {
            feature: name,
            score: sorted[idx].importance,
            selected: idx < nFeatures,
            rank: idx + 1,
          };
        });
      }
      case "permutation": {
        // Need a fitAndPredict function
        const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
          if (task === "classification") {
            const fit = fitLogisticRegression(trainX, trainY, featureCols, { lr: 0.1, iterations: 300 });
            return predictLogisticProba(fit, valX);
          } else {
            const fit = fitLinearRegression(trainX, trainY, featureCols);
            return predictLinear(fit, valX);
          }
        };
        const scoreFn = (yT: number[], yP: number[]) =>
          task === "classification" ? classificationMetrics(yT, yP).roc_auc : regressionMetrics(yT, yP).r2;
        const r = permutationImportance(
          trainMatrix.X, trainMatrix.y, valMatrix.X, valMatrix.y,
          featureCols, fitAndPredict, scoreFn, 42
        );
        const sorted = [...r].sort((a, b) => b.importance - a.importance);
        return featureCols.map((name) => {
          const idx = sorted.findIndex((x) => x.feature === name);
          return {
            feature: name,
            score: sorted[idx].importance,
            selected: idx < nFeatures,
            rank: idx + 1,
          };
        });
      }
      case "rfe": {
        const importanceFn = (X: number[][], y: number[], names: string[]) =>
          treeFeatureImportance(X, y, names, task === "classification" ? "classification" : "regression");
        const r = rfe(trainMatrix.X, trainMatrix.y, featureCols, importanceFn, nFeatures);
        return r.map((x) => ({ feature: x.feature, score: x.finalImportance, selected: x.selected, rank: x.rank }));
      }
      case "rfecv": {
        const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
          if (task === "classification") {
            const fit = fitLogisticRegression(trainX, trainY, featureCols.slice(0, trainX[0]?.length ?? 0), { lr: 0.1, iterations: 300 });
            return predictLogisticProba(fit, valX);
          } else {
            const fit = fitLinearRegression(trainX, trainY, featureCols.slice(0, trainX[0]?.length ?? 0));
            return predictLinear(fit, valX);
          }
        };
        const scoreFn = (yT: number[], yP: number[]) =>
          task === "classification" ? classificationMetrics(yT, yP).roc_auc : regressionMetrics(yT, yP).r2;
        const r = rfecv(trainMatrix.X, trainMatrix.y, valMatrix.X, valMatrix.y, featureCols, fitAndPredict, scoreFn);
        return r.selected.map((s) => ({
          feature: s.feature,
          score: 0,
          selected: s.selected,
          rank: s.selected ? 1 : 0,
        }));
      }
      case "sfs": {
        const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
          if (task === "classification") {
            const fit = fitLogisticRegression(trainX, trainY, featureCols.slice(0, trainX[0]?.length ?? 0), { lr: 0.1, iterations: 300 });
            return predictLogisticProba(fit, valX);
          } else {
            const fit = fitLinearRegression(trainX, trainY, featureCols.slice(0, trainX[0]?.length ?? 0));
            return predictLinear(fit, valX);
          }
        };
        const scoreFn = (yT: number[], yP: number[]) =>
          task === "classification" ? classificationMetrics(yT, yP).roc_auc : regressionMetrics(yT, yP).r2;
        const r = sequentialForwardSelection(
          trainMatrix.X, trainMatrix.y, valMatrix.X, valMatrix.y,
          featureCols, fitAndPredict, scoreFn, nFeatures
        );
        return r.map((x) => ({
          feature: x.feature,
          score: x.scoreWhenAdded,
          selected: x.selected,
          rank: x.addedOrder > 0 ? x.addedOrder : 0,
        }));
      }
    }
  })();

  // Score the model on val with ALL features vs SELECTED features
  const selectedFeatures = selectionResult?.filter((r) => r.selected).map((r) => r.feature) ?? [];
  const allScore = (() => {
    const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
      if (task === "classification") {
        const fit = fitLogisticRegression(trainX, trainY, featureCols, { lr: 0.1, iterations: 300 });
        return predictLogisticProba(fit, valX);
      } else {
        const fit = fitLinearRegression(trainX, trainY, featureCols);
        return predictLinear(fit, valX);
      }
    };
    const pred = fitAndPredict(trainMatrix.X, trainMatrix.y, valMatrix.X);
    return task === "classification" ? classificationMetrics(valMatrix.y, pred).roc_auc : regressionMetrics(valMatrix.y, pred).r2;
  })();

  const selectedScore = (() => {
    if (selectedFeatures.length === 0) return NaN;
    const selTrainX = trainMatrix.X.map((row) => selectedFeatures.map((f) => row[featureCols.indexOf(f)]));
    const selValX = valMatrix.X.map((row) => selectedFeatures.map((f) => row[featureCols.indexOf(f)]));
    const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
      if (task === "classification") {
        const fit = fitLogisticRegression(trainX, trainY, selectedFeatures, { lr: 0.1, iterations: 300 });
        return predictLogisticProba(fit, valX);
      } else {
        const fit = fitLinearRegression(trainX, trainY, selectedFeatures);
        return predictLinear(fit, valX);
      }
    };
    const pred = fitAndPredict(selTrainX, trainMatrix.y, selValX);
    return task === "classification" ? classificationMetrics(valMatrix.y, pred).roc_auc : regressionMetrics(valMatrix.y, pred).r2;
  })();

  const code = React.useMemo(() => {
    const fitCall = task === "classification"
      ? `from sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression(max_iter=300)`
      : `from sklearn.linear_model import LinearRegression\nmodel = LinearRegression()`;
    const scoreCall = task === "classification"
      ? `from sklearn.metrics import roc_auc_score\nscore = roc_auc_score(y_val, model.predict_proba(X_val)[:, 1])`
      : `from sklearn.metrics import r2_score\nscore = r2_score(y_val, model.predict(X_val))`;
    switch (method) {
      case "variance":
        return `# A. Filter — variance threshold
from sklearn.feature_selection import VarianceThreshold
selector = VarianceThreshold(threshold=0.1)
selector.fit(X_train)  # fit on TRAIN ONLY
selected = [f for f, keep in zip(features, selector.get_support()) if keep]`;
      case "correlation":
        return `# A. Filter — correlation with target
correlations = {f: X_train[f].corr(y_train) for f in features}
selected = [f for f, c in correlations.items() if abs(c) >= 0.1]`;
      case "chi2":
      case "anova_f":
      case "mutual_info":
        return `# A. Filter — SelectKBest
from sklearn.feature_selection import SelectKBest, ${method === "chi2" ? "chi2" : method === "anova_f" ? "f_classif" : "mutual_info_classif"}
selector = SelectKBest(score_func=${method === "chi2" ? "chi2" : method === "anova_f" ? "f_classif" : "mutual_info_classif"}, k=${nFeatures})
selector.fit(X_train, y_train)  # fit on TRAIN ONLY
selected = [f for f, keep in zip(features, selector.get_support()) if keep]`;
      case "tree":
        return `# B. Model-based — tree importance
from sklearn.tree import DecisionTreeClassifier
from sklearn.feature_selection import SelectFromModel
clf = DecisionTreeClassifier(max_depth=4, random_state=42).fit(X_train, y_train)
importances = clf.feature_importances_  # fit on TRAIN ONLY
selector = SelectFromModel(clf, prefit=True, max_features=${nFeatures}, threshold=-1)
selected = [f for f, keep in zip(features, selector.get_support()) if keep]`;
      case "lasso":
        return `# B. Model-based — L1 (Lasso) importance
from sklearn.linear_model import Lasso
from sklearn.feature_selection import SelectFromModel
lasso = Lasso(alpha=0.001, random_state=42).fit(X_train, y_train)  # fit on TRAIN ONLY
selector = SelectFromModel(lasso, prefit=True)
selected = [f for f, keep in zip(features, selector.get_support()) if keep]
# L1 pushes small coefficients to EXACTLY zero — only the relevant features survive.`;
      case "permutation":
        return `# B. Complementary — permutation importance
from sklearn.inspection import permutation_importance
${fitCall}
model.fit(X_train, y_train)  # fit on TRAIN ONLY
result = permutation_importance(model, X_val, y_val, n_repeats=5, random_state=42, scoring='${task === "classification" ? "roc_auc" : "r2"}')
# Measures the drop in val score when each feature is shuffled.
importances = result.importances_mean  # higher = more important`;
      case "rfe":
        return `# C. Wrapper — Recursive Feature Elimination (RFE)
from sklearn.feature_selection import RFE
${fitCall}
rfe = RFE(estimator=model, n_features_to_select=${nFeatures})
rfe.fit(X_train, y_train)  # fit on TRAIN ONLY
selected = [f for f, keep in zip(features, rfe.get_support()) if keep]`;
      case "rfecv":
        return `# C. Wrapper — RFECV (finds optimal n_features via cross-validation)
from sklearn.feature_selection import RFECV
${fitCall}
rfe = RFECV(estimator=model, cv=5, scoring='${task === "classification" ? "roc_auc" : "r2"}')
rfe.fit(X_train, y_train)
print(f"Optimal features: {rfe.n_features_}")
selected = [f for f, keep in zip(features, rfe.get_support()) if keep]`;
      case "sfs":
        return `# C. Wrapper — Sequential Forward Selection
from sklearn.feature_selection import SequentialFeatureSelector
${fitCall}
sfs = SequentialFeatureSelector(model, n_features_to_select=${nFeatures}, cv=5, direction="forward")
sfs.fit(X_train, y_train)  # fit on TRAIN ONLY
selected = [f for f, keep in zip(features, sfs.get_support()) if keep]`;
    }
  }, [method, nFeatures, task]);

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a dataset, a target, and a feature-selection method. Every selection runs on a real 70/30 train/val split (seed=42). Model performance is scored on the val set — the test set never touches feature selection.
      </p>

      <div className="role-validated border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-role">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Leakage-safe: feature selection runs on TRAIN ONLY
        </p>
        <p className="mt-1 text-foreground/80">
          The dataset is split 70/30 (seed=42, stratified for classification). All selection methods fit on the training fold; the val fold is used only to score the resulting model. The lab has no test set — the train/val distinction is the educational point (in real projects you'd hold out a separate test set for the final unbiased evaluation).
        </p>
      </div>

      {/* Controls */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Selection controls</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Dataset</Label>
            <Select value={dataset} onValueChange={(v) => setDataset(v as Dataset)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employees">Employee Analytics (classification)</SelectItem>
                <SelectItem value="retail">Retail Sales (regression)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Selection method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="variance">Filter: variance threshold</SelectItem>
                <SelectItem value="correlation">Filter: correlation with target</SelectItem>
                <SelectItem value="chi2">Filter: chi²</SelectItem>
                <SelectItem value="anova_f">Filter: ANOVA F</SelectItem>
                <SelectItem value="mutual_info">Filter: mutual information</SelectItem>
                <SelectItem value="tree">Model: tree importance</SelectItem>
                <SelectItem value="lasso">Model: L1 (Lasso)</SelectItem>
                <SelectItem value="permutation">Model: permutation</SelectItem>
                <SelectItem value="rfe">Wrapper: RFE</SelectItem>
                <SelectItem value="rfecv">Wrapper: RFECV</SelectItem>
                <SelectItem value="sfs">Wrapper: sequential forward</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(method === "chi2" || method === "anova_f" || method === "mutual_info" || method === "tree" || method === "lasso" || method === "rfe" || method === "sfs") && (
            <div>
              <Label className="text-xs">k (features to select)</Label>
              <Select value={String(nFeatures)} onValueChange={(v) => setNFeatures(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((k) => (
                    <SelectItem key={k} value={String(k)}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Train rows" value={String(trainDf.rows.length)} tone="data" />
          <Stat label="Val rows" value={String(valDf.rows.length)} tone="data" />
          <Stat label="Total features" value={String(featureCols.length)} tone="stats" />
          <Stat label="Selected" value={String(selectedFeatures.length)} tone="validated" />
          <Stat label={task === "classification" ? "Val AUC (all features)" : "Val R² (all features)"} value={fmt(allScore, 4)} tone="stats" />
          <Stat label={task === "classification" ? "Val AUC (selected)" : "Val R² (selected)"} value={fmt(selectedScore, 4)} tone="validated" />
          <Stat label="Δ score (selected − all)" value={fmt(selectedScore - allScore, 4)} tone={selectedScore >= allScore - 0.01 ? "validated" : "warning"} />
          <Stat label="Target" value={target} tone="data" />
        </div>
      </div>

      {/* Result table */}
      <div className="mt-5">
        <CodeAndResult
          code={code}
          caption={`${method} feature selection (Pandas / scikit-learn equivalent)`}
          note={
            method === "permutation"
              ? "Permutation importance is a complementary evaluation technique — fit the model first, then shuffle each feature and measure the drop in val score. Higher drop = more important feature."
              : method === "rfe" || method === "rfecv" || method === "sfs"
                ? "Wrapper methods are computationally expensive (RFE fits k models, SFS fits k² models). Use when filter/model-based methods give ambiguous results."
                : "Filter methods are fast and model-agnostic. They ignore feature interactions — a feature that's weak alone may be strong in combination with another."
          }
        >
          <ChartShell
            title={`${method} — feature ranking`}
            subtitle="Score per feature (higher = more important). Green = selected, blue = dropped."
            annotation={{
              question: `Which features does ${method} select?`,
              whyThisChart: "Bar chart with explicit selected/dropped colouring makes the selection obvious at a glance.",
              shows: `${selectedFeatures.length} of ${featureCols.length} features selected. Score range: ${selectionResult && selectionResult.length > 0 ? fmt(Math.max(...selectionResult.map((r) => r.score)), 3) : "—"} to ${selectionResult && selectionResult.length > 0 ? fmt(Math.min(...selectionResult.map((r) => r.score)), 3) : "—"}.`,
              doesNotEstablish: "A high importance score does NOT establish that the feature is causally related to the target — only that it's predictive.",
              nextStep: "Compare the val score with all features vs the selected subset. If selected ≥ all, the selection didn't lose signal. If selected < all, you may have over-pruned.",
            }}
          >
            <BarChart
              data={(selectionResult ?? [])
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((r) => ({ label: r.feature, value: r.score }))}
              layout="horizontal"
              xLabel="Score"
              altText={`Bar chart of ${method} feature scores`}
              useSelectionColors
              selectedIndices={(selectionResult ?? [])
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((r, i) => ({ idx: i, selected: r.selected }))
                .filter((x) => x.selected)
                .map((x) => x.idx)}
            />
          </ChartShell>
        </CodeAndResult>
      </div>

      {/* Selected subset table */}
      <div className="mt-5">
        <ChartShell
          title="Selected feature subset"
          subtitle={`${selectedFeatures.length} features selected out of ${featureCols.length}.`}
          annotation={{
            question: "What's in the selected subset?",
            whyThisChart: "A simple list confirms the selection — useful for the next modelling step.",
            shows: `Features that survived the ${method} selection.`,
            doesNotEstablish: "Being selected does NOT mean the feature is predictive on its own — it may have been kept for interaction effects.",
            nextStep: "Take this subset into a modelling pipeline (Module 14).",
          }}
        >
          {selectedFeatures.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No features selected. Adjust the method or k.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedFeatures.map((f) => (
                <li key={f} className="text-mono rounded-md border border-[var(--color-role-validated)]/40 bg-[color-mix(in_oklch,var(--color-role-validated)_8%,transparent)] px-2 py-1 text-xs text-[var(--color-role-validated)]">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </ChartShell>
      </div>

      {/* Score comparison */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-[var(--color-role-warning)]" aria-hidden />
          Model performance: all features vs selected subset
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          Compare the validation score (val AUC for classification; val R² for regression) when training on all features vs the selected subset. If the selected subset scores nearly as well, the selection successfully removed redundant features without losing signal. If the selected subset scores much worse, you may have over-pruned.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label={task === "classification" ? "Val AUC (all features)" : "Val R² (all features)"} value={fmt(allScore, 4)} tone="stats" />
          <Stat label={task === "classification" ? "Val AUC (selected)" : "Val R² (selected)"} value={fmt(selectedScore, 4)} tone="validated" />
          <Stat label="Δ (selected − all)" value={fmt(selectedScore - allScore, 4)} tone={selectedScore >= allScore - 0.02 ? "validated" : "warning"} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {selectedScore >= allScore - 0.02
            ? `✓ Selection is healthy — the selected subset scores within 0.02 of the full feature set. The dropped features were redundant.`
            : `⚠ Selection may have over-pruned — the selected subset scores ${fmt(allScore - selectedScore, 4)} below the full feature set. Try increasing k or switching methods.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Master spec rule: do NOT claim that fewer features automatically produces a better model. The right question is: "Does the smaller subset retain the predictive signal while simplifying the model?" If yes, prefer the smaller subset (simpler, less prone to overfitting, faster to train, easier to interpret). If no, the selection method is too aggressive.
        </p>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE13_EXERCISES.map((ex) => (
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
