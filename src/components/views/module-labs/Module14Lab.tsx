"use client";

/**
 * Module 14 Lab — Preparing Analytical Datasets for Predictive Modelling.
 *
 * Master spec §19. A visual pipeline builder: raw → split → impute →
 * encode → scale → select → train → evaluate. Every stage shows the
 * generated Pandas/sklearn code. The UI enforces leakage-safe behaviour
 * (every transformer fits on TRAIN ONLY; the test fold sees the same
 * fitted params).
 */

import * as React from "react";
import { Workflow, BookOpen, ShieldCheck, AlertTriangle, CheckCircle2, Play, RotateCcw } from "lucide-react";
import { buildEmployeeAnalytics, buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import {
  makeImputer,
  makeOneHotEncoder,
  makeStandardScaler,
  makeMinMaxScaler,
  makePipeline,
  fitPipeline,
  transformPipeline,
  validateModelReady,
  makeLogisticRegressionEstimator,
  makeLinearRegressionEstimator,
  type Pipeline,
} from "@/lib/data/pipeline";
import { classificationMetrics, regressionMetrics } from "@/lib/data/ml";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ChartShell } from "@/components/charts/ChartShell";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE14_EXERCISES } from "@/lib/content/exercises/module14";

type Dataset = "employees" | "retail";
type EstimatorType = "logistic" | "linear";

interface Stage {
  id: string;
  name: string;
  enabled: boolean;
  pandasCode: string;
  apply: (df: DataFrame) => Pipeline | DataFrame;
}

export function Module14Lab() {
  const employees = DataFrame.fromRows(buildEmployeeAnalytics().rows);
  const retail = DataFrame.fromRows(buildRetailSales().rows);

  const [dataset, setDataset] = React.useState<Dataset>("employees");
  const activeDf = dataset === "employees" ? employees : retail;
  const target = dataset === "employees" ? "attrition" : "revenue";
  const task: "classification" | "regression" = dataset === "employees" ? "classification" : "regression";

  // Numeric and categorical feature candidates
  const numericFeatures = activeDf.columns.filter((c) => {
    if (c === target) return false;
    if (c.endsWith("_id")) return false;
    const dt = activeDf.dtype(c);
    return dt === "int64" || dt === "float64";
  });
  const categoricalFeatures = activeDf.columns.filter((c) => {
    if (c === target) return false;
    if (c.endsWith("_id")) return false;
    return activeDf.dtype(c) === "object";
  });

  // Stage toggles
  const [impute, setImpute] = React.useState(true);
  const [encode, setEncode] = React.useState(true);
  const [scale, setScale] = React.useState(true);
  const [scalerType, setScalerType] = React.useState<"standard" | "minmax">("standard");
  const [estimatorType, setEstimatorType] = React.useState<EstimatorType>("logistic");

  // Reset estimator when dataset changes
  React.useEffect(() => {
    if (dataset === "employees") setEstimatorType("logistic");
    else setEstimatorType("linear");
  }, [dataset]);

  // 70/30 train/test split (seed=42)
  const { trainDf, testDf } = (() => {
    if (task === "classification") {
      const split = activeDf.stratifiedSplit(target, 42, 0.3, 0);
      return { trainDf: split.train, testDf: split.val };
    }
    const split = activeDf.randomSplit(42, 0.3, 0);
    return { trainDf: split.train, testDf: split.val };
  })();

  // Build y arrays
  const buildY = (df: DataFrame) => {
    if (task === "classification") {
      return df.column(target).map((v) => (v === "yes" ? 1 : 0));
    }
    return df.column(target).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  };
  const yTrain = buildY(trainDf);
  const yTest = buildY(testDf);

  // Build the pipeline steps
  const pipelineSteps = React.useMemo(() => {
    const steps = [] as ReturnType<typeof makeImputer>[];
    if (impute) {
      // Impute numeric with median, categorical with most_frequent
      if (numericFeatures.length > 0) {
        steps.push(makeImputer("median", numericFeatures) as ReturnType<typeof makeImputer>);
      }
      if (categoricalFeatures.length > 0) {
        steps.push(makeImputer("most_frequent", categoricalFeatures) as ReturnType<typeof makeImputer>);
      }
    }
    if (encode) {
      for (const c of categoricalFeatures) {
        steps.push(makeOneHotEncoder(c) as ReturnType<typeof makeImputer>);
      }
    }
    if (scale) {
      // Scale numeric features (post-encoding, the one-hot booleans are 0/1 — no scaling needed)
      if (numericFeatures.length > 0) {
        if (scalerType === "standard") {
          steps.push(makeStandardScaler(numericFeatures) as ReturnType<typeof makeImputer>);
        } else {
          steps.push(makeMinMaxScaler(numericFeatures) as ReturnType<typeof makeImputer>);
        }
      }
    }
    return steps;
  }, [impute, encode, scale, scalerType, numericFeatures, categoricalFeatures]);

  // Estimator
  const estimator = React.useMemo(() => {
    if (task === "classification" && estimatorType === "logistic") {
      return makeLogisticRegressionEstimator({ lr: 0.1, iterations: 500, l2: 0.001 });
    }
    if (task === "regression" && estimatorType === "linear") {
      return makeLinearRegressionEstimator({ lambda: 0.001 });
    }
    // Mismatched estimator + task — fall back gracefully
    if (task === "classification") return makeLogisticRegressionEstimator({ lr: 0.1, iterations: 500, l2: 0.001 });
    return makeLinearRegressionEstimator({ lambda: 0.001 });
  }, [task, estimatorType]);

  // Determine the feature columns AFTER the pipeline (post-encoding column names)
  const postEncodeFeatures = React.useMemo(() => {
    const cols = [...numericFeatures];
    if (encode) {
      for (const c of categoricalFeatures) {
        // The OneHotEncoder creates `${c}_${value}` columns; we don't know values yet
        // so we approximate by listing the unique values in the train set
        const seen: string[] = [];
        const seenSet = new Set<string>();
        for (const v of trainDf.column(c)) {
          if (v === null || v === undefined) continue;
          const s = String(v);
          if (!seenSet.has(s)) { seenSet.add(s); seen.push(s); }
        }
        for (const val of seen) cols.push(`${c}_${val}`);
      }
    }
    // After scaling, the standardized column names are `${orig}_z` or `${orig}_mm`
    // We use the standardized names if scaling is enabled
    if (scale) {
      return cols.map((c) => {
        if (numericFeatures.includes(c)) {
          return scalerType === "standard" ? `${c}_z` : `${c}_mm`;
        }
        return c;
      });
    }
    return cols;
  }, [encode, scale, scalerType, numericFeatures, categoricalFeatures, trainDf]);

  // Build + fit the pipeline
  const pipeline = React.useMemo(() => {
    const pipe = makePipeline(pipelineSteps, estimator);
    return pipe;
  }, [pipelineSteps, estimator]);

  const fitResult = React.useMemo(() => {
    try {
      return fitPipeline(pipeline, trainDf, yTrain, postEncodeFeatures, target);
    } catch (e) {
      return { error: (e as Error).message, dfTrainTransformed: trainDf, featureColsAfter: postEncodeFeatures };
    }
  }, [pipeline, trainDf, yTrain, postEncodeFeatures, target]);

  const transformResult = React.useMemo(() => {
    if (fitResult && "error" in fitResult) return { error: fitResult.error };
    try {
      return transformPipeline(pipeline, testDf, postEncodeFeatures, yTest);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [pipeline, testDf, yTest, postEncodeFeatures, fitResult]);

  // Compute final test metrics
  const testMetrics = React.useMemo(() => {
    if (!transformResult || "error" in transformResult || !transformResult.predictions) {
      return null;
    }
    if (task === "classification") {
      return classificationMetrics(yTest, transformResult.predictions);
    }
    return regressionMetrics(yTest, transformResult.predictions);
  }, [transformResult, yTest, task]);

  // Validate the transformed train df is model-ready
  const validationIssues = React.useMemo(() => {
    if (!fitResult || "error" in fitResult) return [];
    return validateModelReady(fitResult.dfTrainTransformed, fitResult.dfTrainTransformed, postEncodeFeatures);
  }, [fitResult, postEncodeFeatures]);

  // Code panel
  const pipelineCode = React.useMemo(() => {
    const stepsCode: string[] = [];
    if (impute) {
      stepsCode.push(`    ("imputer_num", SimpleImputer(strategy="median"), ${JSON.stringify(numericFeatures)}),`);
      if (categoricalFeatures.length > 0) {
        stepsCode.push(`    ("imputer_cat", SimpleImputer(strategy="most_frequent"), ${JSON.stringify(categoricalFeatures)}),`);
      }
    }
    if (encode) {
      for (const c of categoricalFeatures) {
        stepsCode.push(`    ("onehot_${c}", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["${c}"]),`);
      }
    }
    if (scale) {
      const scalerClass = scalerType === "standard" ? "StandardScaler" : "MinMaxScaler";
      stepsCode.push(`    ("scaler", ${scalerClass}(), ${JSON.stringify(numericFeatures)}),`);
    }
    const estimatorClass = task === "classification" ? "LogisticRegression" : "LinearRegression";
    return `# Leakage-safe preprocessing pipeline (fit on TRAIN ONLY)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, ${scalerType === "standard" ? "StandardScaler" : "MinMaxScaler"}
from sklearn.${task === "classification" ? "linear_model.LogisticRegression" : "linear_model.LinearRegression"} import ${estimatorClass}
from sklearn.model_selection import train_test_split
from sklearn.metrics import ${task === "classification" ? "roc_auc_score" : "r2_score"}

# 1. Split FIRST (leakage-safe — every step fits on TRAIN ONLY)
X_train, X_test, y_train, y_test = train_test_split(
    df.drop(columns=["${target}"]),
    df["${target}"],
    test_size=0.3,
    random_state=42,
    ${task === "classification" ? `stratify=df["${target}"]` : ""},
)

# 2. Build the pipeline
pipe = Pipeline([
${stepsCode.join("\n") || "    # no transforms"},
    ("model", ${estimatorClass}()),
])

# 3. Fit on TRAIN ONLY
pipe.fit(X_train, y_train)

# 4. Predict on TEST (using train-fitted params)
y_pred = ${task === "classification" ? "pipe.predict_proba(X_test)[:, 1]" : "pipe.predict(X_test)"}
score = ${task === "classification" ? "roc_auc_score" : "r2_score"}(y_test, y_pred)`;
  }, [impute, encode, scale, scalerType, task, numericFeatures, categoricalFeatures, target]);

  // Stages list (for the visual pipeline diagram)
  const stages = [
    { id: "raw", name: "Raw dataset", enabled: true, code: `df = pd.read_csv("${dataset}.csv")` },
    { id: "split", name: "Train/test split", enabled: true, code: `X_train, X_test, y_train, y_test = train_test_split(..., test_size=0.3, random_state=42${task === "classification" ? ", stratify=df['" + target + "']" : ""})` },
    { id: "impute", name: "Imputation", enabled: impute, code: `SimpleImputer(strategy="median" or "most_frequent")` },
    { id: "encode", name: "Categorical encoding", enabled: encode, code: `OneHotEncoder(handle_unknown="ignore")` },
    { id: "scale", name: "Scaling", enabled: scale, code: `${scalerType === "standard" ? "StandardScaler" : "MinMaxScaler"}()` },
    { id: "model", name: "Model fit + predict", enabled: true, code: `${task === "classification" ? "LogisticRegression" : "LinearRegression"}.fit(X_train, y_train)` },
    { id: "eval", name: "Evaluate on test", enabled: true, code: `${task === "classification" ? "roc_auc_score(y_test, y_pred)" : "r2_score(y_test, y_pred)"}` },
  ];

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Workflow className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Build a leakage-safe preprocessing pipeline on a real dataset. Every transformer fits on the TRAIN fold only; the same fitted params are applied to the test fold. The pipeline diagram shows each stage; the code panel shows the equivalent scikit-learn.
      </p>

      <div className="role-validated border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-role">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Leakage-safe by construction
        </p>
        <p className="mt-1 text-foreground/80">
          The dataset is split 70/30 (seed=42, stratified for classification). Every transformer (Imputer, OneHotEncoder, Scaler) fits on the training fold only; the resulting params are stored on the pipeline and reused for the test fold. The estimator (LogisticRegression or LinearRegression) fits on the transformed training data only.
        </p>
      </div>

      {/* Controls */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Pipeline controls</h3>
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
            <Label className="text-xs">Scaler (if scaling enabled)</Label>
            <Select value={scalerType} onValueChange={(v) => setScalerType(v as "standard" | "minmax")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">StandardScaler</SelectItem>
                <SelectItem value="minmax">MinMaxScaler</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Estimator</Label>
            <Select value={estimatorType} onValueChange={(v) => setEstimatorType(v as EstimatorType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logistic" disabled={task !== "classification"}>LogisticRegression (classification)</SelectItem>
                <SelectItem value="linear" disabled={task !== "regression"}>LinearRegression (regression)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stage toggles */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
            <Checkbox checked={impute} onCheckedChange={(v) => setImpute(Boolean(v))} id="stage-impute" />
            <Label htmlFor="stage-impute" className="cursor-pointer">Imputation</Label>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
            <Checkbox checked={encode} onCheckedChange={(v) => setEncode(Boolean(v))} id="stage-encode" />
            <Label htmlFor="stage-encode" className="cursor-pointer">One-hot encoding</Label>
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
            <Checkbox checked={scale} onCheckedChange={(v) => setScale(Boolean(v))} id="stage-scale" />
            <Label htmlFor="stage-scale" className="cursor-pointer">Scaling</Label>
          </label>
        </div>
      </div>

      {/* Visual pipeline diagram */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Pipeline diagram</h3>
        <ol className="mt-3 flex flex-wrap items-center gap-2">
          {stages.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${s.enabled ? "border-[var(--color-ai-blue)]/40 bg-[color-mix(in_oklch,var(--color-ai-blue)_8%,transparent)] text-foreground" : "border-dashed border-border bg-muted text-muted-foreground line-through"}`}>
                <span className="text-mono text-[10px] font-semibold uppercase tracking-wider">{i + 1}</span>
                {s.name}
              </div>
              {i < stages.length - 1 && <span className="text-muted-foreground" aria-hidden>→</span>}
            </li>
          ))}
        </ol>
      </div>

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Train rows" value={String(trainDf.rows.length)} tone="data" />
        <Stat label="Test rows" value={String(testDf.rows.length)} tone="data" />
        <Stat label="Pipeline steps" value={String(pipelineSteps.length)} tone="stats" />
        <Stat label="Stages enabled" value={String(stages.filter((s) => s.enabled).length)} tone="validated" />
        <Stat
          label={task === "classification" ? "Test AUC" : "Test R²"}
          value={testMetrics ? fmt(task === "classification" ? (testMetrics as { roc_auc: number }).roc_auc : (testMetrics as { r2: number }).r2, 4) : "—"}
          tone={testMetrics ? "validated" : "warning"}
        />
        {task === "classification" && testMetrics && (
          <>
            <Stat label="Test accuracy" value={fmt((testMetrics as { accuracy: number }).accuracy, 4)} tone="stats" />
            <Stat label="Test F1" value={fmt((testMetrics as { f1: number }).f1, 4)} tone="stats" />
          </>
        )}
        {task === "regression" && testMetrics && (
          <>
            <Stat label="Test MAE" value={fmt((testMetrics as { mae: number }).mae, 4)} tone="stats" />
            <Stat label="Test RMSE" value={fmt((testMetrics as { rmse: number }).rmse, 4)} tone="stats" />
          </>
        )}
        <Stat label="Validation issues" value={String(validationIssues.filter((i) => !i.passed).length)} tone={validationIssues.every((i) => i.passed) ? "validated" : "warning"} />
      </div>

      {/* Code panel */}
      <div className="mt-5">
        <CodeAndResult
          code={pipelineCode}
          caption="Full scikit-learn pipeline (leakage-safe)"
          note="Every transformer's fit() runs on X_train only. transform() applies the same fitted params to X_test. The estimator fits on the transformed training data only."
        >
          {transformResult && "error" in transformResult ? (
            <div className="rounded-md border border-[var(--color-role-error)]/40 bg-[color-mix(in_oklch,var(--color-role-error)_8%,transparent)] p-3 text-xs text-[var(--color-role-error)]">
              <p className="font-semibold">Pipeline error</p>
              <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-xs">{transformResult.error}</pre>
            </div>
          ) : transformResult && "predictions" in transformResult && transformResult.predictions ? (
            <div>
              <p className="text-xs text-muted-foreground">
                Test predictions (first 10): <span className="text-mono">{transformResult.predictions.slice(0, 10).map((p) => fmt(p, 3)).join(", ")}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Pipeline produced no predictions.</p>
          )}
        </CodeAndResult>
      </div>

      {/* Model-ready validation */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-[var(--color-role-validated)]" aria-hidden />
          Model-ready dataset validation
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          The master spec requires "model-ready data validation": confirm types, shapes, missing values, and train/test separation before modelling. The checks below run on the transformed train set; a green check means the dataset is ready to feed to the estimator.
        </p>
        <ul className="mt-3 flex flex-col gap-1">
          {validationIssues.map((issue, i) => (
            <li key={i} className={`flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs role-${issue.passed ? "validated" : "warning"}`}>
              <CheckCircle2
                className={`h-3.5 w-3.5 ${issue.passed ? "text-[var(--color-role-validated)]" : "text-[var(--color-role-warning)]"}`}
                aria-hidden
              />
              <span className="flex-1">{issue.check}</span>
              <span className="text-mono text-[10px] uppercase tracking-wider">{issue.passed ? "PASS" : "FAIL"}</span>
              {issue.detail && <span className="text-mono text-[10px] text-muted-foreground">({issue.detail})</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Transformed preview */}
      <div className="mt-5">
        <ChartShell
          title="Transformed training data (post-pipeline)"
          subtitle="First 10 rows after every enabled stage. The model sees this."
          annotation={{
            question: "What does the model actually see?",
            whyThisChart: "Inspecting the transformed training data makes the pipeline concrete — no abstraction, just the numbers the estimator fits on.",
            shows: "First 10 rows × all post-transform columns (imputed, encoded, scaled).",
            doesNotEstablish: "A clean-looking transformed dataset does NOT establish that the model is well-specified — only that the preprocessing pipeline ran without errors.",
            nextStep: "Cross-check that the column types are numeric (post-encoding, post-scaling). If a column is still object dtype, something's wrong with the pipeline.",
          }}
        >
          {fitResult && "dfTrainTransformed" in fitResult ? (
            <DatasetTable df={fitResult.dfTrainTransformed.head(10)} pageSize={10} />
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Pipeline didn't produce a transformed dataset.
            </div>
          )}
        </ChartShell>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE14_EXERCISES.map((ex) => (
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
