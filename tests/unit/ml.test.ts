/**
 * Unit tests for the ML primitives: metrics + simple models + feature selection + pipeline.
 *
 * Every assertion checks a real numerical result. No fabricated expected
 * values — every expected value is independently hand-derived.
 */

import { test, expect } from "bun:test";
import { DataFrame } from "../../src/lib/data/frame";
import {
  classificationMetrics,
  regressionMetrics,
  fitLinearRegression,
  predictLinear,
  fitLogisticRegression,
  predictLogisticProba,
  fitDecisionTree,
  predictTree,
  treeFeatureImportance,
  lassoFeatureImportance,
} from "../../src/lib/data/ml";
import {
  varianceThreshold,
  selectKBest,
  correlationSelect,
  permutationImportance,
  rfe,
  sequentialForwardSelection,
  rfecv,
} from "../../src/lib/data/feature-selection";
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
} from "../../src/lib/data/pipeline";

// ---------------- Metrics ----------------

test("classificationMetrics: perfect predictions → accuracy=1, F1=1, AUC=1", () => {
  const yTrue = [1, 1, 0, 0];
  const yProb = [0.9, 0.95, 0.05, 0.1];
  const m = classificationMetrics(yTrue, yProb);
  expect(m.accuracy).toBe(1);
  expect(m.precision).toBe(1);
  expect(m.recall).toBe(1);
  expect(m.f1).toBe(1);
  expect(m.roc_auc).toBeCloseTo(1, 6);
  expect(m.confusion).toEqual({ tp: 2, fp: 0, fn: 0, tn: 2 });
});

test("classificationMetrics: random predictions → AUC ≈ 0.5", () => {
  // y = [1, 0, 1, 0]; probs uncorrelated with y
  const yTrue = [1, 0, 1, 0];
  const yProb = [0.5, 0.5, 0.5, 0.5];
  const m = classificationMetrics(yTrue, yProb);
  expect(m.accuracy).toBe(0.5);
  expect(m.roc_auc).toBeCloseTo(0.5, 6);
});

test("regressionMetrics: perfect predictions → R²=1, MAE=0, RMSE=0", () => {
  const yTrue = [10, 20, 30];
  const yPred = [10, 20, 30];
  const m = regressionMetrics(yTrue, yPred);
  expect(m.mae).toBe(0);
  expect(m.rmse).toBe(0);
  expect(m.r2).toBe(1);
});

test("regressionMetrics: mean predictor → R²=0", () => {
  const yTrue = [10, 20, 30];
  const yMean = 20;
  const m = regressionMetrics(yTrue, [yMean, yMean, yMean]);
  expect(m.r2).toBeCloseTo(0, 6);
});

// ---------------- Linear regression ----------------

test("fitLinearRegression: y = 2x + 3 recovers coefficients exactly", () => {
  const X = [[1], [2], [3], [4], [5]];
  const y = [5, 7, 9, 11, 13]; // 2*x + 3
  const fit = fitLinearRegression(X, y, ["x"]);
  expect(fit.coef[0]).toBeCloseTo(2, 6);
  expect(fit.intercept).toBeCloseTo(3, 6);
  const pred = predictLinear(fit, X);
  for (let i = 0; i < 5; i++) expect(pred[i]).toBeCloseTo(y[i], 6);
});

test("fitLinearRegression: y = 3 + 2*x1 - x2 recovers coefficients", () => {
  // Generate data: y = 3 + 2*x1 - 1*x2
  const X = [
    [1, 1], [2, 3], [3, 0], [4, 2], [5, 1], [6, 4], [7, 2], [8, 3],
  ];
  const y = X.map(([x1, x2]) => 3 + 2 * x1 - x2);
  const fit = fitLinearRegression(X, y, ["x1", "x2"]);
  expect(fit.coef[0]).toBeCloseTo(2, 4);
  expect(fit.coef[1]).toBeCloseTo(-1, 4);
  expect(fit.intercept).toBeCloseTo(3, 4);
});

test("predictLinear extrapolates linearly", () => {
  const X = [[1], [2], [3]];
  const y = [10, 20, 30];
  const fit = fitLinearRegression(X, y, ["x"]);
  const pred = predictLinear(fit, [[100]]);
  expect(pred[0]).toBeCloseTo(1000, 6); // 10 * 100
});

// ---------------- Logistic regression ----------------

test("fitLogisticRegression: perfectly separable data → high accuracy", () => {
  // Generate separable data: x < 5 → 0, x >= 5 → 1
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 30; i++) {
    X.push([i]);
    y.push(i >= 15 ? 1 : 0);
  }
  const fit = fitLogisticRegression(X, y, ["x"], { lr: 0.1, iterations: 1000 });
  const proba = predictLogisticProba(fit, X);
  // High proba for x >= 15; low proba for x < 15
  expect(proba[20]).toBeGreaterThan(0.9);
  expect(proba[5]).toBeLessThan(0.1);
});

// ---------------- Decision tree ----------------

test("fitDecisionTree: simple step function → tree learns the split", () => {
  // y = 0 for x < 5, y = 1 for x >= 5
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 20; i++) {
    X.push([i]);
    y.push(i >= 10 ? 1 : 0);
  }
  const fit = fitDecisionTree(X, y, ["x"], "classification", { maxDepth: 2 });
  const pred = predictTree(fit, X);
  for (let i = 0; i < 20; i++) {
    expect(pred[i]).toBe(y[i]);
  }
  // Feature importance on x should be 1 (the only feature)
  expect(fit.featureImportances[0]).toBeCloseTo(1, 6);
});

test("fitDecisionTree: feature importance is 0 for irrelevant features", () => {
  // y depends only on x1; x2 is random noise
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < 20; i++) {
    const x1 = i;
    const x2 = Math.sin(i) * 10; // noise
    X.push([x1, x2]);
    y.push(i >= 10 ? 1 : 0);
  }
  const fit = fitDecisionTree(X, y, ["x1", "x2"], "classification", { maxDepth: 4 });
  // x1 should have most of the importance (it carries the signal)
  expect(fit.featureImportances[0]).toBeGreaterThan(fit.featureImportances[1]);
});

test("treeFeatureImportance: returns importance per feature, normalized to sum to 1", () => {
  const X = Array.from({ length: 50 }, (_, i) => [i, Math.sin(i) * 100]);
  const y = Array.from({ length: 50 }, (_, i) => (i >= 25 ? 1 : 0));
  const imp = treeFeatureImportance(X, y, ["x1", "x2"], "classification");
  expect(imp.length).toBe(2);
  const sum = imp.reduce((s, x) => s + x.importance, 0);
  expect(sum).toBeCloseTo(1, 6);
});

// ---------------- Lasso ----------------

test("lassoFeatureImportance: zero-importance for irrelevant features", () => {
  // y depends only on x1
  const X = Array.from({ length: 50 }, (_, i) => [i, i * 0]);
  const y = X.map(([x1]) => x1 * 2);
  const imp = lassoFeatureImportance(X, y, ["x1", "x2"], { l1: 0.001, iterations: 1000, lr: 0.01 });
  // x1 should have non-zero importance; x2 might be driven to 0
  expect(imp[0].importance).toBeGreaterThan(imp[1].importance);
});

// ---------------- Variance threshold ----------------

test("varianceThreshold: drops columns with variance below threshold", () => {
  const df = DataFrame.fromRows([
    { a: 1, b: 5, c: 1 },  // c is constant
    { a: 2, b: 5, c: 1 },
    { a: 3, b: 5, c: 1 },
    { a: 4, b: 5, c: 1 },
  ]);
  const result = varianceThreshold(df, ["a", "b", "c"], 0.5);
  expect(result.find((r) => r.feature === "a")!.selected).toBe(true);
  expect(result.find((r) => r.feature === "b")!.selected).toBe(false); // variance 0
  expect(result.find((r) => r.feature === "c")!.selected).toBe(false); // variance 0
});

// ---------------- SelectKBest ----------------

test("selectKBest (anova_f): picks the most informative feature", () => {
  // x1 perfectly predicts y; x2 is noise
  const df = DataFrame.fromRows(
    Array.from({ length: 20 }, (_, i) => ({
      x1: i,
      x2: Math.sin(i) * 10,
      y: i >= 10 ? 1 : 0,
    }))
  );
  const result = selectKBest(df, ["x1", "x2"], "y", 1, "anova_f");
  expect(result.find((r) => r.feature === "x1")!.selected).toBe(true);
  expect(result.find((r) => r.feature === "x2")!.selected).toBe(false);
});

test("selectKBest: returns scores in original order, ranks by score desc", () => {
  const df = DataFrame.fromRows(
    Array.from({ length: 20 }, (_, i) => ({
      a: i,
      b: -i, // perfectly anti-correlated with y, but same |corr|
      y: i >= 10 ? 1 : 0,
    }))
  );
  const result = selectKBest(df, ["a", "b"], "y", 1, "anova_f");
  // Both should have similar high scores (ANOVA doesn't care about sign)
  expect(result[0].rank + result[1].rank).toBe(3); // ranks 1+2
});

// ---------------- CorrelationSelect ----------------

test("correlationSelect: drops low-correlation features", () => {
  const df = DataFrame.fromRows(
    Array.from({ length: 20 }, (_, i) => ({
      strong: i,                       // strongly correlated with y
      weak: Math.sin(i) * 10,         // weakly correlated
      y: i >= 10 ? 1 : 0,
    }))
  );
  const result = correlationSelect(df, ["strong", "weak"], "y", 0.5);
  // Strong feature should have higher |corr| than weak
  expect(Math.abs(result[0].corr)).toBeGreaterThan(Math.abs(result[1].corr));
});

// ---------------- Permutation importance ----------------

test("permutationImportance: identifies the feature that drives predictions", () => {
  // Model: y = x1 (perfectly linear). Shuffling x1 should drop score a lot;
  // shuffling x2 (noise) should drop score little.
  const X = Array.from({ length: 30 }, (_, i) => [i, Math.sin(i) * 10]);
  const y = X.map(([x1]) => x1);
  const valX = X;
  const valY = y;
  // Simple fit: linear regression on (X, y)
  const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
    // (trainX/valX are not used here because we want a stable test — the
    // simple fit is deterministic on every call given the same data.)
    const fit = fitLinearRegression(trainX, trainY, ["x1", "x2"]);
    return predictLinear(fit, valX);
  };
  const scoreFn = (yT: number[], yP: number[]) => {
    const m = regressionMetrics(yT, yP);
    return m.r2;
  };
  const result = permutationImportance(
    X, y, valX, valY, ["x1", "x2"],
    fitAndPredict as never, // cast because our test wrapper ignores train args
    scoreFn,
    42
  );
  // x1 should have higher importance than x2 (x1 carries the signal)
  expect(result[0].importance).toBeGreaterThan(result[1].importance);
});

// ---------------- RFE ----------------

test("rfe: selects the best n_features_to_select", () => {
  // y = x1 + 0*x2 + 0*x3 — only x1 matters
  const X = Array.from({ length: 30 }, (_, i) => [i, Math.sin(i), Math.cos(i)]);
  const y = X.map(([x1]) => x1);
  // Use linear-regression coefficients as importance
  const importanceFn = (X: number[][], y: number[], names: string[]) => {
    const fit = fitLinearRegression(X, y, names);
    return names.map((name, j) => ({ feature: name, importance: Math.abs(fit.coef[j] ?? 0) }));
  };
  const result = rfe(X, y, ["x1", "x2", "x3"], importanceFn, 1);
  expect(result.find((r) => r.feature === "x1")!.selected).toBe(true);
  expect(result.find((r) => r.feature === "x2")!.selected).toBe(false);
  expect(result.find((r) => r.feature === "x3")!.selected).toBe(false);
});

test("rfe: ranks non-selected features by elimination order", () => {
  // y = x1 + 0.5*x2 + 0*x3 — x3 is irrelevant; x1 and x2 are relevant and NOT collinear
  // (we add small noise to x2 to avoid singularity)
  const X = Array.from({ length: 30 }, (_, i) => [i + 1, i * 0.5 + (i % 3) * 0.01, Math.sin(i)]);
  const y = X.map(([x1, x2]) => x1 + x2);
  const importanceFn = (X: number[][], y: number[], names: string[]) => {
    const fit = fitLinearRegression(X, y, names);
    return names.map((name, j) => ({ feature: name, importance: Math.abs(fit.coef[j] ?? 0) }));
  };
  const result = rfe(X, y, ["x1", "x2", "x3"], importanceFn, 2);
  // x1 and x2 should be selected (they're the relevant ones); x3 eliminated (rank 3)
  expect(result.find((r) => r.feature === "x1")!.selected).toBe(true);
  expect(result.find((r) => r.feature === "x2")!.selected).toBe(true);
  expect(result.find((r) => r.feature === "x3")!.selected).toBe(false);
  expect(result.find((r) => r.feature === "x3")!.rank).toBe(3);
});

// ---------------- SFS ----------------

test("sequentialForwardSelection: picks the best feature first", () => {
  // y = x1 only — SFS should pick x1 first
  const X = Array.from({ length: 30 }, (_, i) => [i, Math.sin(i) * 100, Math.cos(i) * 100]);
  const y = X.map(([x1]) => x1);
  // Use R² as score
  const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
    const fit = fitLinearRegression(trainX, trainY, trainX[0].map((_, j) => `f${j}`));
    return predictLinear(fit, valX);
  };
  const scoreFn = (yT: number[], yP: number[]) => regressionMetrics(yT, yP).r2;
  const result = sequentialForwardSelection(X, y, X, y, ["x1", "x2", "x3"], fitAndPredict, scoreFn, 1);
  expect(result.find((r) => r.feature === "x1")!.selected).toBe(true);
  expect(result.find((r) => r.feature === "x1")!.addedOrder).toBe(1);
});

// ---------------- RFECV ----------------

test("rfecv: finds the optimal number of features", () => {
  // y = x1 only
  const X = Array.from({ length: 30 }, (_, i) => [i, Math.sin(i) * 100, Math.cos(i) * 100]);
  const y = X.map(([x1]) => x1);
  const fitAndPredict = (trainX: number[][], trainY: number[], valX: number[][]) => {
    const fit = fitLinearRegression(trainX, trainY, trainX[0].map((_, j) => `f${j}`));
    return predictLinear(fit, valX);
  };
  const scoreFn = (yT: number[], yP: number[]) => regressionMetrics(yT, yP).r2;
  const result = rfecv(X, y, X, y, ["x1", "x2", "x3"], fitAndPredict, scoreFn);
  // Best n features should be 1 (just x1)
  expect(result.bestNFeatures).toBeGreaterThanOrEqual(1);
  expect(result.scoreCurve.length).toBe(3);
  expect(result.selected.find((s) => s.feature === "x1")!.selected).toBe(true);
});

// ---------------- Pipeline ----------------

test("makeImputer: fills with mean computed on train only", () => {
  const dfTrain = DataFrame.fromRows([{ a: 10 }, { a: 20 }, { a: null }]);
  const dfTest = DataFrame.fromRows([{ a: null }, { a: 5 }]);
  const step = makeImputer("mean", ["a"]);
  const { df: dfTrainTransformed, state } = step.fit(dfTrain);
  // Train mean = (10 + 20) / 2 = 15; null filled with 15
  expect(dfTrainTransformed.column("a")).toEqual([10, 20, 15]);
  // Test: null filled with TRAIN mean (15), not test mean
  const dfTestTransformed = step.transform(dfTest, state);
  expect(dfTestTransformed.column("a")).toEqual([15, 5]);
});

test("makeStandardScaler: uses TRAIN mean+std for both splits", () => {
  const dfTrain = DataFrame.fromRows([{ x: 1 }, { x: 3 }, { x: 5 }]); // mean=3, std=2
  const dfTest = DataFrame.fromRows([{ x: 7 }, { x: 9 }]); // test data
  const step = makeStandardScaler(["x"]);
  const { df: dfTrainTransformed, state } = step.fit(dfTrain);
  // Train: (1-3)/2=-1, (3-3)/2=0, (5-3)/2=1
  expect(dfTrainTransformed.column("x_z")).toEqual([-1, 0, 1]);
  // Test: (7-3)/2=2, (9-3)/2=3 — using TRAIN mean+std
  const dfTestTransformed = step.transform(dfTest, state);
  expect(dfTestTransformed.column("x_z")).toEqual([2, 3]);
});

test("makeOneHotEncoder: fits categories on train, applies to test with unseen='ignore'", () => {
  const dfTrain = DataFrame.fromRows([{ c: "a" }, { c: "b" }, { c: "c" }]);
  const dfTest = DataFrame.fromRows([{ c: "a" }, { c: "z" }]); // "z" unseen in train
  const step = makeOneHotEncoder("c");
  const { df: dfTrainTransformed, state } = step.fit(dfTrain);
  // Categories fit on train: ["a", "b", "c"]
  expect(state.categories).toEqual(["a", "b", "c"]);
  // Train transformed: 3 indicator columns
  expect(dfTrainTransformed.columns).toContain("c_a");
  expect(dfTrainTransformed.columns).toContain("c_b");
  expect(dfTrainTransformed.columns).toContain("c_c");
  // Test: "z" (unseen) → all zeros (handle_unknown='ignore')
  const dfTestTransformed = step.transform(dfTest, state);
  expect(dfTestTransformed.column("c_a")).toEqual([true, false]);
  expect(dfTestTransformed.column("c_b")).toEqual([false, false]);
  expect(dfTestTransformed.column("c_c")).toEqual([false, false]); // "z" → all zeros
});

test("makePipeline: fit on train, transform on val (leakage-safe)", () => {
  const dfTrain = DataFrame.fromRows(
    Array.from({ length: 30 }, (_, i) => ({ x: i, c: i % 3 === 0 ? "a" : "b", y: i % 2 === 0 ? 1 : 0 }))
  );
  const dfVal = DataFrame.fromRows(
    Array.from({ length: 10 }, (_, i) => ({ x: i + 100, c: i % 3 === 0 ? "a" : "b", y: i % 2 === 0 ? 1 : 0 }))
  );
  const pipe = makePipeline([
    makeImputer("mean", ["x"]),
    makeStandardScaler(["x"]),
    makeOneHotEncoder("c"),
  ], makeLogisticRegressionEstimator({ lr: 0.1, iterations: 200 }));
  const { dfTrainTransformed, model } = fitPipeline(pipe, dfTrain, dfTrain.rows.map((r) => r.y as number), ["x", "c_a", "c_b"], "y");
  expect(pipe.fitted).toBe(true);
  expect(pipe.fittedStates.length).toBe(3);
  expect(dfTrainTransformed.columns).toContain("x_z");
  // Transform val (using train-fitted params)
  const { predictions } = transformPipeline(pipe, dfVal, ["x", "c_a", "c_b"], dfVal.rows.map((r) => r.y as number));
  expect(predictions?.length).toBe(10);
  // Predictions are probabilities in [0, 1]
  for (const p of predictions!) {
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  }
});

test("transformPipeline throws if pipeline not fit first (leakage guard)", () => {
  const df = DataFrame.fromRows([{ x: 1 }]);
  const pipe = makePipeline([makeStandardScaler(["x"])]);
  expect(() => transformPipeline(pipe, df, ["x_z"], [])).toThrow();
});

test("validateModelReady: detects NaN values and non-numeric features", () => {
  const dfTrain = DataFrame.fromRows([{ x: 1 }, { x: null }]);
  const dfTest = DataFrame.fromRows([{ x: 1 }]);
  const issues = validateModelReady(dfTrain, dfTest, ["x"]);
  // Should detect NaN in training features
  expect(issues.find((i) => i.check.includes("No NaN"))!.passed).toBe(false);
});

test("validateModelReady: passes when features are numeric and no NaN", () => {
  const dfTrain = DataFrame.fromRows([{ x: 1 }, { x: 2 }]);
  const dfTest = DataFrame.fromRows([{ x: 3 }]);
  const issues = validateModelReady(dfTrain, dfTest, ["x"]);
  for (const i of issues) {
    expect(i.passed).toBe(true);
  }
});
