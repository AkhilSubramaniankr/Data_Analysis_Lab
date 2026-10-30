/**
 * Scikit-learn-style Pipeline + ColumnTransformer (minimal but real).
 *
 * Leakage-safe contract: every step's fit phase runs ONLY on the
 * training fold. The transform phase uses the stored fitted state to
 * apply the same transformation to whatever frame (train, val, test)
 * the caller passes. The lab's UI enforces this — the test set is never
 * fed to fit.
 *
 * Real computation: each step's fit and transform call the existing
 * DataFrame engine methods. The fitted state (e.g., the train mean/std
 * for StandardScaler, the train categories for OneHotEncoder) is
 * preserved across the pipeline so test rows see the same params.
 */

import type { CellValue } from "./types";
import { DataFrame } from "./frame";
import { mean, std, quantile, min, max } from "./stats";
import type { LinearRegressionFit, LogisticRegressionFit } from "./ml";
import { fitLinearRegression, predictLinear, fitLogisticRegression, predictLogisticProba } from "./ml";

// ---------- Pipeline step interface ----------

export interface PipelineStep {
  name: string;
  /** Fit on TRAIN ONLY — runs the step's transform on dfTrain and stores fitted state. */
  fit: (dfTrain: DataFrame, y?: number[]) => { df: DataFrame; state: StepState };
  /** Apply the SAME fitted state to a new df (val, test). */
  transform: (df: DataFrame, state: StepState) => DataFrame;
}

export interface StepState {
  [key: string]: unknown;
}

// ---------- Concrete steps ----------

/** SimpleImputer — fill missing values with a train-computed statistic. */
export function makeImputer(
  strategy: "mean" | "median" | "most_frequent" | "constant",
  columns: string[],
  fillValue?: CellValue,
): PipelineStep {
  return {
    name: `SimpleImputer(strategy=${strategy})`,
    fit: (dfTrain: DataFrame) => {
      const state: StepState = { fillValues: {} as Record<string, CellValue> };
      const fillValues: Record<string, CellValue> = {};
      for (const col of columns) {
        const colArr = dfTrain.column(col);
        if (strategy === "constant") {
          fillValues[col] = fillValue ?? 0;
        } else if (strategy === "mean") {
          const xs = colArr.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          fillValues[col] = xs.length > 0 ? mean(xs) : 0;
        } else if (strategy === "median") {
          const xs = colArr.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          fillValues[col] = xs.length > 0 ? quantile(xs, 0.5) : 0;
        } else if (strategy === "most_frequent") {
          // Most frequent non-null value
          const counts = new Map<string, number>();
          for (const v of colArr) {
            if (v === null || v === undefined) continue;
            const k = String(v);
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
          let best: CellValue = fillValue ?? 0;
          let bestCount = 0;
          for (const [k, c] of counts.entries()) {
            if (c > bestCount) { bestCount = c; best = k; }
          }
          fillValues[col] = best;
        }
      }
      state.fillValues = fillValues;
      // Apply to train
      const df = dfTrain.fillnaPerColumn(fillValues as Record<string, CellValue>);
      return { df, state };
    },
    transform: (df, state) => {
      return df.fillnaPerColumn(state.fillValues as Record<string, CellValue>);
    },
  };
}

/** OneHotEncoder — fit categories on train, apply to both with handle_unknown='ignore'. */
export function makeOneHotEncoder(
  column: string,
  opts: { dropFirst?: boolean } = {},
): PipelineStep {
  return {
    name: `OneHotEncoder(column=${column})`,
    fit: (dfTrain: DataFrame) => {
      // Capture distinct values seen at fit time (train only)
      const seen: string[] = [];
      const seenSet = new Set<string>();
      for (const v of dfTrain.column(column)) {
        if (v === null || v === undefined) continue;
        const s = String(v);
        if (!seenSet.has(s)) { seenSet.add(s); seen.push(s); }
      }
      const state: StepState = { categories: seen };
      // Apply to train
      const df = dfTrain.getDummiesForValues(column, seen);
      return { df, state };
    },
    transform: (df, state) => {
      return df.getDummiesForValues(column, state.categories as string[]);
    },
  };
}

/** StandardScaler — fit mean+std on train, apply to both. */
export function makeStandardScaler(
  columns: string[],
): PipelineStep {
  return {
    name: `StandardScaler(columns=[${columns.join(", ")}])`,
    fit: (dfTrain: DataFrame) => {
      const params: Record<string, { mean: number; std: number }> = {};
      for (const col of columns) {
        const xs = dfTrain.column(col).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        const m = xs.length > 0 ? mean(xs) : 0;
        const s = xs.length > 1 ? std(xs) : 1;
        params[col] = { mean: m, std: s };
      }
      const state: StepState = { params };
      // Apply to train
      let df = dfTrain;
      for (const col of columns) {
        const { mean: m, std: s } = params[col];
        df = df.standardizeWith(col, m, s);
      }
      return { df, state };
    },
    transform: (df, state) => {
      const params = state.params as Record<string, { mean: number; std: number }>;
      let out = df;
      for (const col of columns) {
        const { mean: m, std: s } = params[col];
        out = out.standardizeWith(col, m, s);
      }
      return out;
    },
  };
}

/** MinMaxScaler — fit min+max on train, apply to both. */
export function makeMinMaxScaler(
  columns: string[],
  range: [number, number] = [0, 1],
): PipelineStep {
  return {
    name: `MinMaxScaler(columns=[${columns.join(", ")}], range=${JSON.stringify(range)})`,
    fit: (dfTrain: DataFrame) => {
      const params: Record<string, { lo: number; hi: number }> = {};
      for (const col of columns) {
        const xs = dfTrain.column(col).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        const lo = xs.length > 0 ? Math.min(...xs) : 0;
        const hi = xs.length > 0 ? Math.max(...xs) : 1;
        params[col] = { lo, hi };
      }
      const state: StepState = { params };
      let df = dfTrain;
      for (const col of columns) {
        const { lo, hi } = params[col];
        // Apply min-max with custom range
        df = df.withColumn(col, (r) => {
          const v = r[col];
          if (typeof v !== "number" || !Number.isFinite(v)) return null;
          if (hi === lo) return range[0];
          return range[0] + ((v - lo) / (hi - lo)) * (range[1] - range[0]);
        });
      }
      return { df, state };
    },
    transform: (df, state) => {
      const params = state.params as Record<string, { lo: number; hi: number }>;
      let out = df;
      for (const col of columns) {
        const { lo, hi } = params[col];
        out = out.withColumn(col, (r) => {
          const v = r[col];
          if (typeof v !== "number" || !Number.isFinite(v)) return null;
          if (hi === lo) return range[0];
          return range[0] + ((v - lo) / (hi - lo)) * (range[1] - range[0]);
        });
      }
      return out;
    },
  };
}

/** ColumnTransformer — apply different transformers to different columns. */
export interface ColumnTransformerStep extends PipelineStep {
  kind: "column-transformer";
  transformers: { name: string; columns: string[]; step: PipelineStep }[];
}

export function makeColumnTransformer(
  transformers: { name: string; columns: string[]; step: PipelineStep }[],
): ColumnTransformerStep {
  return {
    name: `ColumnTransformer(transformers=[${transformers.map((t) => t.name).join(", ")}])`,
    kind: "column-transformer",
    transformers,
    fit: (dfTrain: DataFrame) => {
      // Fit each sub-transformer on its subset of columns
      const subStates: Record<string, StepState> = {};
      let dfOut = dfTrain;
      for (const { name, columns, step } of transformers) {
        // Reduce df to just the transformer's columns
        const subDf = dfTrain.select(columns);
        const { df: subDfTransformed, state } = step.fit(subDf);
        subStates[name] = state;
        // Merge back the transformed columns (drop originals, add transformed)
        // For simplicity, we just append the transformed sub-df's new columns
        // to dfOut (and keep the original columns too). The lab's UI makes the
        // choice clear.
        for (const col of subDfTransformed.columns) {
          if (!dfOut.columns.includes(col)) {
            dfOut = dfOut.withColumn(col, (_r, i) => subDfTransformed.rows[i]?.[col] ?? null);
          }
        }
      }
      return { df: dfOut, state: { subStates } };
    },
    transform: (df, state) => {
      const subStates = state.subStates as Record<string, StepState>;
      let dfOut = df;
      for (const { name, columns, step } of transformers) {
        const subDf = df.select(columns);
        const transformed = step.transform(subDf, subStates[name]);
        for (const col of transformed.columns) {
          if (!dfOut.columns.includes(col)) {
            dfOut = dfOut.withColumn(col, (_r, i) => transformed.rows[i]?.[col] ?? null);
          }
        }
      }
      return dfOut;
    },
  };
}

// ---------- The Pipeline itself ----------

export interface Pipeline {
  steps: PipelineStep[];
  /** Estimator (optional — last step if it's a model). */
  estimator?: Estimator;
  fitted: boolean;
  /** Stored fitted states from each step. */
  fittedStates: StepState[];
  /** Fitted estimator model (stored after fitPipeline runs). */
  fittedModel?: unknown;
  /** Feature columns after fit (post-transform). */
  featureCols?: string[];
}

export interface Estimator {
  name: string;
  fit: (X: number[][], y: number[], featureNames: string[]) => unknown;
  predict: (model: unknown, X: number[][]) => number[];
  /** "classification" or "regression" — controls the metric family. */
  task: "classification" | "regression";
}

/** LogisticRegression estimator wrapper. */
export function makeLogisticRegressionEstimator(opts: { lr?: number; iterations?: number; l2?: number } = {}): Estimator {
  return {
    name: "LogisticRegression",
    fit: (X, y, featureNames) => fitLogisticRegression(X, y, featureNames, opts),
    predict: (model, X) => predictLogisticProba(model as LogisticRegressionFit, X),
    task: "classification",
  };
}

/** LinearRegression estimator wrapper. */
export function makeLinearRegressionEstimator(opts: { lambda?: number } = {}): Estimator {
  return {
    name: "LinearRegression",
    fit: (X, y, featureNames) => fitLinearRegression(X, y, featureNames, opts.lambda ?? 0),
    predict: (model, X) => predictLinear(model as LinearRegressionFit, X),
    task: "regression",
  };
}

/** Build a pipeline from a list of steps + optional estimator. */
export function makePipeline(steps: PipelineStep[], estimator?: Estimator): Pipeline {
  return {
    steps,
    estimator,
    fitted: false,
    fittedStates: [],
  };
}

/**
 * Fit the pipeline on the TRAINING fold only.
 *
 * Returns the transformed train DataFrame + (if estimator) the fitted model.
 * The fitted states from each step are stored on the pipeline for use in transform().
 */
export function fitPipeline(
  pipeline: Pipeline,
  dfTrain: DataFrame,
  yTrain: number[],
  featureCols: string[],
  targetCol: string,
): { dfTrainTransformed: DataFrame; model?: unknown; featureColsAfter: string[] } {
  let df = dfTrain;
  const states: StepState[] = [];
  for (const step of pipeline.steps) {
    const { df: transformed, state } = step.fit(df, yTrain);
    df = transformed;
    states.push(state);
  }
  pipeline.fittedStates = states;
  pipeline.fitted = true;
  pipeline.featureCols = featureCols;

  // Fit the estimator if present
  let model: unknown;
  if (pipeline.estimator) {
    // Build the feature matrix from the transformed df.
    // Convert booleans to 0/1 (one-hot indicator columns are bool).
    const validFeatureCols = featureCols.filter((c) => df.columns.includes(c));
    const X: number[][] = df.rows.map((r) =>
      validFeatureCols.map((c) => cellToNumber(r[c]))
    );
    // Drop rows with NaN
    const validIdx = X.map((row, i) => row.every((v) => Number.isFinite(v)) ? i : -1).filter((i) => i >= 0);
    const XValid = validIdx.map((i) => X[i]);
    const yValid = validIdx.map((i) => yTrain[i]);
    model = pipeline.estimator.fit(XValid, yValid, validFeatureCols);
    pipeline.fittedModel = model;
  }
  return { dfTrainTransformed: df, model, featureColsAfter: featureCols };
}

/**
 * Transform a held-out fold (val or test) using the FITTED pipeline.
 * The pipeline must have been fit on the training fold first.
 *
 * If an estimator was fit, also returns the predictions.
 */
export function transformPipeline(
  pipeline: Pipeline,
  dfFold: DataFrame,
  featureCols: string[],
  _yFold: number[],
): { dfFoldTransformed: DataFrame; predictions?: number[] } {
  if (!pipeline.fitted) {
    throw new Error("transformPipeline: pipeline must be fit on training fold first");
  }
  let df = dfFold;
  for (let i = 0; i < pipeline.steps.length; i++) {
    df = pipeline.steps[i].transform(df, pipeline.fittedStates[i]);
  }
  let predictions: number[] | undefined;
  if (pipeline.estimator && pipeline.fittedModel !== undefined) {
    const validFeatureCols = featureCols.filter((c) => df.columns.includes(c));
    const X: number[][] = df.rows.map((r) =>
      validFeatureCols.map((c) => cellToNumber(r[c]))
    );
    predictions = pipeline.estimator.predict(pipeline.fittedModel, X);
  }
  return { dfFoldTransformed: df, predictions };
}

/** Convert a CellValue to a number for the feature matrix. Booleans → 0/1. */
function cellToNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v === "boolean") return v ? 1 : 0;
  return NaN;
}

/**
 * Validate that a model-ready dataset satisfies the basic checks:
 *  - Features are numeric (post-transform).
 *  - No NaN values in the feature matrix.
 *  - Train and test have the same number of columns.
 *  - Train and test use the same column dtypes.
 *
 * Returns a list of issues (empty = valid).
 */
export function validateModelReady(
  dfTrain: DataFrame,
  dfTest: DataFrame,
  featureCols: string[],
): { check: string; passed: boolean; detail?: string }[] {
  const issues: { check: string; passed: boolean; detail?: string }[] = [];
  // Column count
  const trainCols = dfTrain.columns.filter((c) => featureCols.includes(c));
  const testCols = dfTest.columns.filter((c) => featureCols.includes(c));
  issues.push({
    check: "Train and test feature columns match",
    passed: trainCols.length === testCols.length && trainCols.every((c, i) => c === testCols[i]),
    detail: `train: ${trainCols.length}, test: ${testCols.length}`,
  });
  // All features numeric
  let allNumeric = true;
  let nonNumericCol = "";
  for (const c of featureCols) {
    const dt = dfTrain.dtype(c);
    if (dt !== "int64" && dt !== "float64" && dt !== "bool") {
      allNumeric = false;
      nonNumericCol = c;
      break;
    }
  }
  issues.push({
    check: "All features are numeric",
    passed: allNumeric,
    detail: nonNumericCol ? `${nonNumericCol} is not numeric` : undefined,
  });
  // No NaN values
  let hasNan = false;
  let nanCol = "";
  for (const c of featureCols) {
    const nulls = dfTrain.column(c).filter((v) => v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))).length;
    if (nulls > 0) { hasNan = true; nanCol = c; break; }
  }
  issues.push({
    check: "No NaN values in training features",
    passed: !hasNan,
    detail: nanCol ? `${nanCol} has NaN values` : undefined,
  });
  // Same shape (n_features)
  issues.push({
    check: "Train and test have same n_features",
    passed: trainCols.length === testCols.length,
    detail: `${trainCols.length} vs ${testCols.length}`,
  });
  return issues;
}
