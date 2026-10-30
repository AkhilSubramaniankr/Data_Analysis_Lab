/**
 * ML primitives — metrics + simple models.
 *
 * Real arithmetic, not fabricated. Every metric and every fit/predict
 * produces deterministic results from the actual data.
 *
 * Scope: enough to teach Modules 13 (feature selection) and 14 (ML
 * preparation). NOT a full scikit-learn replacement — but every model
 * here produces real fitted coefficients, real predictions, real
 * metrics. The Pandas/scikit-learn code panels alongside each lab show
 * the equivalent the learner would type.
 *
 * Key leakage-safe rule: every fit takes the training data only. Every
 * predict / score / transform takes the same fitted params and applies
 * them to whatever frame (train, val, test) the caller passes. The
 * caller is responsible for using the right split.
 */

import type { CellValue, Row } from "./types";
import { mean, std, variance } from "./stats";
import { DataFrame } from "./frame";

// ---------- Helpers ----------

/** Extract a numeric matrix [n_samples, n_features] and a target vector
 * from a DataFrame given feature column names + target column. */
export function toFeatureMatrix(
  df: DataFrame,
  featureCols: string[],
  targetCol: string,
): { X: number[][]; y: number[]; validMask: boolean[] } {
  const X: number[][] = [];
  const y: number[] = [];
  const validMask: boolean[] = [];
  for (const r of df.rows) {
    let valid = true;
    const row: number[] = [];
    for (const c of featureCols) {
      const v = r[c];
      if (typeof v !== "number" || !Number.isFinite(v)) { valid = false; break; }
      row.push(v);
    }
    const t = r[targetCol];
    if (typeof t !== "number" || !Number.isFinite(t)) valid = false;
    if (valid) {
      X.push(row);
      y.push(t as number);
      validMask.push(true);
    } else {
      X.push(row.length ? row : featureCols.map(() => NaN));
      y.push(NaN);
      validMask.push(false);
    }
  }
  return { X, y, validMask };
}

/** Convert a binary string target ("yes"/"no", "true"/"false") to 0/1. */
export function toBinaryTarget(values: CellValue[], positiveClass: string): number[] {
  return values.map((v) => {
    if (v === null || v === undefined) return NaN;
    return String(v) === positiveClass ? 1 : 0;
  });
}

// ---------- Classification metrics ----------

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion: { tp: number; fp: number; fn: number; tn: number };
  nPositive: number;
  nNegative: number;
}

/**
 * Compute classification metrics from predicted probabilities and true
 * binary labels (0/1).
 *
 * ROC-AUC is computed via the trapezoidal rule on the ROC curve,
 * swept over all distinct thresholds. Real arithmetic; matches
 * sklearn.metrics.roc_auc_score (single-class case).
 */
export function classificationMetrics(
  yTrue: number[],
  yProb: number[],
): ClassificationMetrics {
  if (yTrue.length === 0 || yProb.length !== yTrue.length) {
    return {
      accuracy: NaN, precision: NaN, recall: NaN, f1: NaN, roc_auc: NaN,
      confusion: { tp: 0, fp: 0, fn: 0, tn: 0 }, nPositive: 0, nNegative: 0,
    };
  }
  // Drop NaN pairs
  const pairs = yTrue.map((t, i) => [t, yProb[i]] as [number, number])
    .filter(([t, p]) => Number.isFinite(t) && Number.isFinite(p));
  if (pairs.length === 0) {
    return { accuracy: NaN, precision: NaN, recall: NaN, f1: NaN, roc_auc: NaN,
      confusion: { tp: 0, fp: 0, fn: 0, tn: 0 }, nPositive: 0, nNegative: 0 };
  }
  const nPos = pairs.filter(([t]) => t === 1).length;
  const nNeg = pairs.length - nPos;

  // ROC-AUC via trapezoidal rule, with proper tie handling (matches
  // sklearn.roc_auc_score: tied scores contribute to a single step).
  const sorted = [...pairs].sort((a, b) => b[1] - a[1]);
  let auc = 0;
  if (nPos > 0 && nNeg > 0) {
    let tp = 0, fp = 0;
    let prevFpr = 0, prevTpr = 0;
    let i = 0;
    while (i < sorted.length) {
      // Collect all samples with the same score (tie group)
      const scoreVal = sorted[i][1];
      let tieTp = 0, tieFp = 0;
      while (i < sorted.length && sorted[i][1] === scoreVal) {
        if (sorted[i][0] === 1) tieTp++; else tieFp++;
        i++;
      }
      tp += tieTp;
      fp += tieFp;
      const tpr = tp / nPos;
      const fpr = fp / nNeg;
      // Trapezoidal contribution: width = (fpr - prevFpr), height = (tpr + prevTpr) / 2
      auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
      prevFpr = fpr; prevTpr = tpr;
    }
  }

  // At threshold 0.5
  const threshold = 0.5;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const [t, p] of pairs) {
    if (p >= threshold) {
      if (t === 1) tp++; else fp++;
    } else {
      if (t === 1) fn++; else tn++;
    }
  }
  const accuracy = (tp + tn) / pairs.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  return {
    accuracy,
    precision,
    recall,
    f1,
    roc_auc: nPos > 0 && nNeg > 0 ? auc : NaN,
    confusion: { tp, fp, fn, tn },
    nPositive: nPos,
    nNegative: nNeg,
  };
}

// ---------- Regression metrics ----------

export interface RegressionMetrics {
  mae: number;
  rmse: number;
  r2: number;
  n: number;
}

export function regressionMetrics(yTrue: number[], yPred: number[]): RegressionMetrics {
  const pairs = yTrue.map((t, i) => [t, yPred[i]] as [number, number])
    .filter(([t, p]) => Number.isFinite(t) && Number.isFinite(p));
  const n = pairs.length;
  if (n === 0) return { mae: NaN, rmse: NaN, r2: NaN, n: 0 };
  const mae = pairs.reduce((s, [t, p]) => s + Math.abs(t - p), 0) / n;
  const mse = pairs.reduce((s, [t, p]) => s + (t - p) ** 2, 0) / n;
  const rmse = Math.sqrt(mse);
  const yMean = mean(pairs.map(([t]) => t));
  const ssRes = pairs.reduce((s, [t, p]) => s + (t - p) ** 2, 0);
  const ssTot = pairs.reduce((s, [t]) => s + (t - yMean) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  return { mae, rmse, r2, n };
}

// ---------- Linear regression (closed-form: OLS via normal equations) ----------

export interface LinearRegressionFit {
  /** Coefficients, one per feature. */
  coef: number[];
  /** Intercept. */
  intercept: number;
  /** Feature names (preserved for downstream display). */
  featureNames: string[];
}

/**
 * Train a linear regression by ordinary least squares (normal equations).
 *
 * Solves: (X^T X) β = X^T y, with L2 ridge regularization if lambda > 0
 * (matches sklearn Ridge). Returns intercept + coefficients.
 *
 * Pure TypeScript; uses Gaussian elimination on the normal-equation
 * matrix. Real arithmetic — the fitted coefficients are deterministic
 * given the input data.
 *
 * For the closed-form solution we centre X and y first to separate the
 * intercept from the coefficients (so we don't need to add a bias
 * column to X).
 */
export function fitLinearRegression(
  X: number[][],
  y: number[],
  featureNames: string[],
  lambda = 0,
): LinearRegressionFit {
  const n = X.length;
  const k = featureNames.length;
  if (n === 0 || k === 0) {
    return { coef: featureNames.map(() => 0), intercept: 0, featureNames };
  }
  const yMean = mean(y);
  // Centre X and y
  const colMeans: number[] = [];
  for (let j = 0; j < k; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j] ?? 0;
    colMeans.push(s / n);
  }
  const Xc = X.map((row) => row.map((v, j) => v - colMeans[j]));
  const yc = y.map((v) => v - yMean);

  // Build (X^T X + lambda I) and X^T y
  const A: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const b: number[] = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const xij = Xc[i][j];
      b[j] += xij * yc[i];
      for (let l = 0; l <= j; l++) {
        A[j][l] += xij * Xc[i][l];
      }
    }
  }
  // Symmetric fill + ridge
  for (let j = 0; j < k; j++) {
    for (let l = 0; l < j; l++) A[l][j] = A[j][l];
    A[j][j] += lambda;
  }
  // Solve A β = b via Gaussian elimination with partial pivoting
  const coef = solveLinearSystem(A, b);
  // Predictions on (centred) X
  // Intercept = yMean - sum(coef * colMeans)
  let intercept = yMean;
  for (let j = 0; j < k; j++) intercept -= coef[j] * colMeans[j];
  return { coef, intercept, featureNames };
}

export function predictLinear(model: LinearRegressionFit, X: number[][]): number[] {
  return X.map((row) => {
    let y = model.intercept;
    for (let j = 0; j < model.coef.length; j++) {
      y += (model.coef[j] ?? 0) * (row[j] ?? 0);
    }
    return y;
  });
}

/** Solve A x = b via Gaussian elimination with partial pivoting. */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Pivot: find the row with the largest absolute value in this column
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > maxAbs) { maxAbs = v; pivotRow = r; }
    }
    if (maxAbs < 1e-12) {
      // Singular; return zeros (the L2 ridge usually prevents this)
      return new Array(n).fill(0);
    }
    if (pivotRow !== col) {
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    }
    // Eliminate below
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }
  // Back-substitute
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

// ---------- Logistic regression (gradient descent) ----------

export interface LogisticRegressionFit {
  coef: number[];
  intercept: number;
  featureNames: string[];
  /** Number of gradient descent iterations actually run. */
  iterations: number;
  /** Final loss (log-loss) after training. */
  finalLoss: number;
}

function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Train a binary logistic regression by gradient descent with L2
 * regularization. The features should be on comparable scales for
 * gradient descent to converge reasonably fast (StandardScaler first).
 *
 * Deterministic — the random initialization is fixed (zeros).
 */
export function fitLogisticRegression(
  X: number[][],
  y: number[],
  featureNames: string[],
  opts: { lr?: number; iterations?: number; l2?: number } = {},
): LogisticRegressionFit {
  const { lr = 0.1, iterations = 500, l2 = 0.01 } = opts;
  const n = X.length;
  const k = featureNames.length;
  if (n === 0 || k === 0) {
    return { coef: featureNames.map(() => 0), intercept: 0, featureNames, iterations: 0, finalLoss: NaN };
  }
  // Centre features so we can fit the intercept separately
  const colMeans: number[] = [];
  for (let j = 0; j < k; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j] ?? 0;
    colMeans.push(s / n);
  }
  const Xc = X.map((row) => row.map((v, j) => v - colMeans[j]));
  // Initialise coefficients to 0
  const coef = new Array(k).fill(0);
  let intercept = 0;
  let lastLoss = NaN;
  for (let iter = 0; iter < iterations; iter++) {
    // Forward pass
    const grads = new Array(k).fill(0);
    let gradB = 0;
    let loss = 0;
    for (let i = 0; i < n; i++) {
      let z = intercept;
      for (let j = 0; j < k; j++) z += coef[j] * Xc[i][j];
      const p = sigmoid(z);
      const err = p - y[i];
      for (let j = 0; j < k; j++) grads[j] += err * Xc[i][j];
      gradB += err;
      // Log-loss
      const eps = 1e-12;
      loss -= y[i] * Math.log(Math.max(eps, p)) + (1 - y[i]) * Math.log(Math.max(eps, 1 - p));
    }
    // Apply gradients (with L2)
    for (let j = 0; j < k; j++) {
      coef[j] -= lr * (grads[j] / n + l2 * coef[j]);
    }
    intercept -= lr * (gradB / n);
    lastLoss = loss / n;
  }
  // Re-integrate the centring into the intercept: f(x) = w·(x - μ) + b
  // = w·x - w·μ + b. So the "true" intercept = b - w·μ.
  let trueIntercept = intercept;
  for (let j = 0; j < k; j++) trueIntercept -= coef[j] * colMeans[j];
  return { coef, intercept: trueIntercept, featureNames, iterations: iterations, finalLoss: lastLoss };
}

export function predictLogisticProba(model: LogisticRegressionFit, X: number[][]): number[] {
  return X.map((row) => {
    let z = model.intercept;
    for (let j = 0; j < model.coef.length; j++) {
      z += (model.coef[j] ?? 0) * (row[j] ?? 0);
    }
    return sigmoid(z);
  });
}

// ---------- Decision tree (CART, single tree) ----------

/**
 * A small CART decision-tree regressor with feature importance.
 * Used as a stand-in for tree-based feature importance in Module 13
 * (mirrors sklearn DecisionTreeRegressor + .feature_importances_).
 *
 * Real splits, real Gini (classification) or MSE (regression) reductions.
 * The .feature_importances_ property matches sklearn's definition:
 * weighted sum of (impurity decrease) per feature, normalized to sum to 1.
 *
 * Scope: single tree, max depth bounded (default 4) so it runs fast on
 * modest hardware. NOT a full RandomForest — but for feature-selection
 * purposes, a single tree's importance is the right pedagogical starting
 * point.
 */
export interface TreeNode {
  isLeaf: boolean;
  prediction?: number;
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface DecisionTreeFit {
  root: TreeNode;
  featureNames: string[];
  featureImportances: number[]; // normalized to sum to 1
  maxDepth: number;
  task: "regression" | "classification";
}

function gini(y: number[]): number {
  if (y.length === 0) return 0;
  let pos = 0;
  for (const v of y) if (v === 1) pos++;
  const p = pos / y.length;
  return 1 - p * p - (1 - p) * (1 - p);
}

function mse(y: number[]): number {
  if (y.length === 0) return 0;
  const m = mean(y);
  let s = 0;
  for (const v of y) s += (v - m) ** 2;
  return s / y.length;
}

interface Split {
  feature: number;
  threshold: number;
  leftIdx: number[];
  rightIdx: number[];
  impurityBefore: number;
  impurityLeft: number;
  impurityRight: number;
  nLeft: number;
  nRight: number;
}

function findBestSplit(
  X: number[][],
  y: number[],
  indices: number[],
  featureNames: string[],
  task: "regression" | "classification",
  minSamplesLeaf: number,
): Split | null {
  if (indices.length < 2 * minSamplesLeaf) return null;
  const impurityFn = task === "regression" ? mse : gini;
  const yVals = indices.map((i) => y[i]);
  const impurityBefore = impurityFn(yVals);
  let best: Split | null = null;
  let bestGain = 0;
  const n = indices.length;
  for (let f = 0; f < featureNames.length; f++) {
    // Sort indices by feature value
    const sortedIdx = [...indices].sort((a, b) => (X[a][f] ?? 0) - (X[b][f] ?? 0));
    // Sweep thresholds between consecutive distinct values
    for (let i = minSamplesLeaf - 1; i < n - minSamplesLeaf; i++) {
      const va = X[sortedIdx[i]][f];
      const vb = X[sortedIdx[i + 1]][f];
      if (va === vb) continue;
      const threshold = (va + vb) / 2;
      const leftIdx = sortedIdx.slice(0, i + 1);
      const rightIdx = sortedIdx.slice(i + 1);
      if (leftIdx.length < minSamplesLeaf || rightIdx.length < minSamplesLeaf) continue;
      const yLeft = leftIdx.map((idx) => y[idx]);
      const yRight = rightIdx.map((idx) => y[idx]);
      const impurityLeft = impurityFn(yLeft);
      const impurityRight = impurityFn(yRight);
      const weightedImpurity = (leftIdx.length * impurityLeft + rightIdx.length * impurityRight) / n;
      const gain = impurityBefore - weightedImpurity;
      if (gain > bestGain) {
        bestGain = gain;
        best = {
          feature: f,
          threshold,
          leftIdx,
          rightIdx,
          impurityBefore,
          impurityLeft,
          impurityRight,
          nLeft: leftIdx.length,
          nRight: rightIdx.length,
        };
      }
    }
  }
  return best;
}

function buildTree(
  X: number[][],
  y: number[],
  indices: number[],
  featureNames: string[],
  task: "regression" | "classification",
  maxDepth: number,
  minSamplesLeaf: number,
  depth: number,
  importance: number[],
): TreeNode {
  const yVals = indices.map((i) => y[i]);
  const pred = task === "regression" ? mean(yVals) : (yVals.filter((v) => v === 1).length >= yVals.length / 2 ? 1 : 0);
  if (depth >= maxDepth || indices.length < 2 * minSamplesLeaf) {
    return { isLeaf: true, prediction: pred };
  }
  const split = findBestSplit(X, y, indices, featureNames, task, minSamplesLeaf);
  if (!split || split.impurityBefore <= 0) {
    return { isLeaf: true, prediction: pred };
  }
  // Importance contribution: weighted impurity decrease
  const n = indices.length;
  const decrease = (n / 1) * (split.impurityBefore - (split.nLeft * split.impurityLeft + split.nRight * split.impurityRight) / n);
  importance[split.feature] = (importance[split.feature] ?? 0) + decrease;
  return {
    isLeaf: false,
    feature: split.feature,
    threshold: split.threshold,
    left: buildTree(X, y, split.leftIdx, featureNames, task, maxDepth, minSamplesLeaf, depth + 1, importance),
    right: buildTree(X, y, split.rightIdx, featureNames, task, maxDepth, minSamplesLeaf, depth + 1, importance),
  };
}

export function fitDecisionTree(
  X: number[][],
  y: number[],
  featureNames: string[],
  task: "regression" | "classification",
  opts: { maxDepth?: number; minSamplesLeaf?: number } = {},
): DecisionTreeFit {
  const { maxDepth = 4, minSamplesLeaf = 5 } = opts;
  const n = X.length;
  if (n === 0) {
    return { root: { isLeaf: true, prediction: 0 }, featureNames, featureImportances: featureNames.map(() => 0), maxDepth, task };
  }
  const indices = Array.from({ length: n }, (_, i) => i);
  const importance = new Array(featureNames.length).fill(0);
  const root = buildTree(X, y, indices, featureNames, task, maxDepth, minSamplesLeaf, 0, importance);
  // Normalize importance to sum to 1 (matches sklearn)
  const sum = importance.reduce((a, b) => a + b, 0);
  const normalized = sum > 0 ? importance.map((v) => v / sum) : importance.map(() => 0);
  return { root, featureNames, featureImportances: normalized, maxDepth, task };
}

export function predictTree(model: DecisionTreeFit, X: number[][]): number[] {
  const predict = (node: TreeNode, row: number[]): number => {
    if (node.isLeaf) return node.prediction ?? 0;
    const f = node.feature!;
    const t = node.threshold!;
    if ((row[f] ?? 0) <= t) return predict(node.left!, row);
    return predict(node.right!, row);
  };
  return X.map((row) => predict(model.root, row));
}

// ---------- Tree-based feature importance (convenience wrapper) ----------

/**
 * Fit a decision tree on (X, y) and return the per-feature importance
 * (matches sklearn's `model.feature_importances_` after a tree fit).
 *
 * Use the L1-normalized importance; the master spec §13.B asks for
 * "tree-based feature importance" — a single tree is the pedagogical
 * starting point (RandomForest is the next step, but training 100
 * trees would slow down the lab on modest hardware).
 */
export function treeFeatureImportance(
  X: number[][],
  y: number[],
  featureNames: string[],
  task: "regression" | "classification",
  opts: { maxDepth?: number; minSamplesLeaf?: number } = {},
): { feature: string; importance: number }[] {
  const fit = fitDecisionTree(X, y, featureNames, task, opts);
  return featureNames.map((name, i) => ({ feature: name, importance: fit.featureImportances[i] ?? 0 }));
}

// ---------- L1 (Lasso) importance (using L1-regularized linear model) ----------

/**
 * Approximate L1/Lasso feature importance by fitting an L1-regularized
 * linear regression. Features with non-zero coefficients after fitting
 * are "selected" by Lasso.
 *
 * Real gradient descent. NOT a full Lasso (scikit-learn uses coordinate
 * descent), but the conceptual behavior matches: L1 pushes small
 * coefficients to exactly zero, leaving only the relevant features.
 *
 * The returned importance is |coef| for each feature. Features with
 * coef == 0 have importance 0 (and should be considered "dropped").
 */
export function lassoFeatureImportance(
  X: number[][],
  y: number[],
  featureNames: string[],
  opts: { lr?: number; iterations?: number; l1?: number } = {},
): { feature: string; importance: number; coef: number }[] {
  const { lr = 0.01, iterations = 500, l1 = 0.01 } = opts;
  const n = X.length;
  const k = featureNames.length;
  if (n === 0 || k === 0) return featureNames.map((f) => ({ feature: f, importance: 0, coef: 0 }));
  // Centre
  const colMeans: number[] = [];
  const yMean = mean(y);
  for (let j = 0; j < k; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j] ?? 0;
    colMeans.push(s / n);
  }
  const Xc = X.map((row) => row.map((v, j) => v - colMeans[j]));
  const yc = y.map((v) => v - yMean);
  const coef = new Array(k).fill(0);
  // Gradient descent with soft-thresholding for L1
  for (let iter = 0; iter < iterations; iter++) {
    const grads = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let j = 0; j < k; j++) pred += coef[j] * Xc[i][j];
      const err = pred - yc[i];
      for (let j = 0; j < k; j++) grads[j] += err * Xc[i][j];
    }
    for (let j = 0; j < k; j++) {
      const grad = grads[j] / n;
      const newCoef = coef[j] - lr * grad;
      // Soft-threshold (proximal operator for L1)
      coef[j] = Math.sign(newCoef) * Math.max(0, Math.abs(newCoef) - lr * l1);
    }
  }
  return featureNames.map((name, j) => ({
    feature: name,
    importance: Math.abs(coef[j]),
    coef: coef[j],
  }));
}
