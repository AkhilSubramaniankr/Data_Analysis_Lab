/**
 * Feature selection methods.
 *
 * Three families, mirroring scikit-learn's structure:
 *   A. Filter methods — varianceThreshold, selectKBest (chi2, ANOVA F, mutual info)
 *   B. Model-based — tree importance, L1/Lasso importance, permutation importance
 *   C. Wrapper methods — RFE (Recursive Feature Elimination), RFECV, sequential forward/backward
 *
 * All methods return a typed result object with selected features, ranking,
 * and per-method metadata. Every computation is real; nothing fabricated.
 *
 * Leakage-safe contract: feature selection MUST be done on the TRAINING
 * fold only. The caller is responsible for passing trainX, trainY (not the
 * full dataset). The wrapper methods (RFE, RFECV, SFS, SBS) take a
 * valX/valY for scoring and never touch test data.
 */

import type { DataFrame } from "./frame";
import { toFeatureMatrix, treeFeatureImportance } from "./ml";
import { variance, mean, std } from "./stats";

// ---------- A. Filter methods ----------

/** Variance threshold: keep features with sample variance > threshold. */
export function varianceThreshold(
  trainDf: DataFrame,
  featureCols: string[],
  threshold: number,
): { feature: string; variance: number; selected: boolean }[] {
  return featureCols.map((col) => {
    const xs = trainDf.column(col).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const v = variance(xs);
    return { feature: col, variance: v, selected: v > threshold };
  });
}

/** Chi-square statistic per feature (categorical X × categorical target). */
function chi2Score(xCol: number[], y: number[]): number {
  // Build a 2x2 contingency: feature == 0/1 (binary case), target == 0/1.
  // For multi-valued features we binarize at the median (a reasonable
  // approximation for the lab; scikit-learn chi2 expects non-negative
  // features and computes chi2 per feature).
  const med = xCol.length > 0 ? xCol.sort((a, b) => a - b)[Math.floor(xCol.length / 2)] : 0;
  let a = 0, b = 0, c = 0, d = 0; // [feat=1,y=1], [feat=1,y=0], [feat=0,y=1], [feat=0,y=0]
  for (let i = 0; i < xCol.length; i++) {
    if (xCol[i] > med) {
      if (y[i] === 1) a++; else b++;
    } else {
      if (y[i] === 1) c++; else d++;
    }
  }
  const n = a + b + c + d;
  if (n === 0) return 0;
  // Chi2 = sum((O - E)^2 / E)
  const rowTotals = [a + b, c + d]; // feat=1, feat=0
  const colTotals = [a + c, b + d]; // y=1, y=0
  const observed = [[a, b], [c, d]];
  let chi2 = 0;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / n;
      if (expected > 0) chi2 += (observed[i][j] - expected) ** 2 / expected;
    }
  }
  return chi2;
}

/** ANOVA F-statistic per feature (numeric X × categorical target). */
function anovaF(xCol: number[], y: number[]): number {
  // Group x values by y class
  const groups = new Map<number, number[]>();
  for (let i = 0; i < xCol.length; i++) {
    const arr = groups.get(y[i]) ?? [];
    arr.push(xCol[i]);
    groups.set(y[i], arr);
  }
  if (groups.size < 2) return 0;
  const grandMean = mean(xCol);
  let ssBetween = 0; // explained variance
  let ssWithin = 0;  // residual variance
  const k = groups.size;
  const n = xCol.length;
  for (const [, vals] of groups) {
    const gMean = mean(vals);
    ssBetween += vals.length * (gMean - grandMean) ** 2;
    for (const v of vals) ssWithin += (v - gMean) ** 2;
  }
  const dfBetween = k - 1;
  const dfWithin = n - k;
  if (dfWithin <= 0 || ssWithin === 0) return ssBetween > 0 ? Infinity : 0;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  return msBetween / msWithin;
}

/** Mutual information (numeric X × binary Y, simplified estimator). */
function mutualInformation(xCol: number[], y: number[]): number {
  // Discretize X into 5 equal-frequency bins, then compute MI(X_binned; Y).
  const sorted = [...xCol].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  const edges: number[] = [];
  for (let i = 1; i <= 4; i++) edges.push(sorted[Math.floor((i * n) / 5)]);
  const xBins = xCol.map((v) => {
    let bin = 0;
    for (let i = 0; i < edges.length; i++) {
      if (v > edges[i]) bin = i + 1; else break;
    }
    return bin;
  });
  // Joint counts
  const joint = new Map<string, number>();
  const xCounts = new Map<number, number>();
  const yCounts = new Map<number, number>();
  for (let i = 0; i < xCol.length; i++) {
    const key = `${xBins[i]}|${y[i]}`;
    joint.set(key, (joint.get(key) ?? 0) + 1);
    xCounts.set(xBins[i], (xCounts.get(xBins[i]) ?? 0) + 1);
    yCounts.set(y[i], (yCounts.get(y[i]) ?? 0) + 1);
  }
  const total = xCol.length;
  let mi = 0;
  for (const [key, count] of joint) {
    const [xb, yb] = key.split("|").map(Number);
    const pxy = count / total;
    const px = (xCounts.get(xb) ?? 0) / total;
    const py = (yCounts.get(yb) ?? 0) / total;
    if (pxy > 0 && px > 0 && py > 0) mi += pxy * Math.log2(pxy / (px * py));
  }
  return Math.max(0, mi);
}

export type FilterScore = "chi2" | "anova_f" | "mutual_info";

/**
 * Select the top-k features by a filter score.
 *
 * - chi2: categorical × categorical (binarized at the median).
 * - anova_f: numeric × categorical target (binary or multi-class).
 * - mutual_info: any × any (binarized).
 *
 * Returns the score per feature (selected features flagged).
 */
export function selectKBest(
  trainDf: DataFrame,
  featureCols: string[],
  targetCol: string,
  k: number,
  score: FilterScore,
): {
  feature: string;
  score: number;
  selected: boolean;
  rank: number;
}[] {
  const { X, y } = toFeatureMatrix(trainDf, featureCols, targetCol);
  const scores = featureCols.map((name, j) => {
    const col = X.map((row) => row[j]);
    const s = score === "chi2" ? chi2Score(col, y)
            : score === "anova_f" ? anovaF(col, y)
            : mutualInformation(col, y);
    return { feature: name, score: s, selected: false, rank: 0 };
  });
  // Rank by score descending; select top k
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  sorted.forEach((s, i) => {
    s.rank = i + 1;
    s.selected = i < k;
  });
  // Return in original order
  return featureCols.map((name) => sorted.find((s) => s.feature === name)!);
}

/** Correlation-based filter: drop features with |corr(xi, y)| below threshold. */
export function correlationSelect(
  trainDf: DataFrame,
  featureCols: string[],
  targetCol: string,
  threshold: number,
): { feature: string; corr: number; selected: boolean }[] {
  const { X, y } = toFeatureMatrix(trainDf, featureCols, targetCol);
  const yMean = mean(y);
  const yStd = std(y);
  return featureCols.map((name, j) => {
    const col = X.map((row) => row[j]);
    const xMean = mean(col);
    const xStd = std(col);
    if (xStd === 0 || yStd === 0) {
      return { feature: name, corr: 0, selected: false };
    }
    let cov = 0;
    for (let i = 0; i < col.length; i++) {
      cov += (col[i] - xMean) * (y[i] - yMean);
    }
    cov /= col.length - 1;
    const corr = cov / (xStd * yStd);
    return { feature: name, corr, selected: Math.abs(corr) >= threshold };
  });
}

// ---------- B. Model-based methods ----------

export { treeFeatureImportance, lassoFeatureImportance } from "./ml";

/**
 * Permutation importance — measure the drop in a model's score when
 * each feature is randomly shuffled. Matches sklearn's permutation_importance.
 *
 * Real computation: fit the model once, score it; then for each feature,
 * shuffle that column's values across rows, re-score, and record the
 * drop. Higher drop = more important feature.
 *
 * Determinism: shuffles use a seeded PRNG so results are reproducible.
 *
 * @param fitModel  fit the model on (trainX, trainY), return predict(X)
 * @param scoreFn   score(y_true, y_pred) → number (higher is better)
 */
export function permutationImportance(
  trainX: number[][],
  trainY: number[],
  valX: number[][],
  valY: number[],
  featureNames: string[],
  fitAndPredict: (trainX: number[][], trainY: number[], valX: number[][]) => number[],
  scoreFn: (yTrue: number[], yPred: number[]) => number,
  seed = 42,
): { feature: string; importance: number; baselineScore: number; permutedScore: number }[] {
  // Baseline score
  const baselinePred = fitAndPredict(trainX, trainY, valX);
  const baselineScore = scoreFn(valY, baselinePred);
  const n = valX.length;
  const k = featureNames.length;
  const result: { feature: string; importance: number; baselineScore: number; permutedScore: number }[] = [];
  for (let f = 0; f < k; f++) {
    // Permute column f in valX (deterministic seeded shuffle)
    const colIndices = Array.from({ length: n }, (_, i) => i);
    let s = (seed + f) >>> 0;
    for (let i = n - 1; i > 0; i--) {
      s = (s + 0x6d2b79f5) >>> 0;
      const r = (s >>> 0) / 4294967296;
      const j = Math.floor(r * (i + 1));
      [colIndices[i], colIndices[j]] = [colIndices[j], colIndices[i]];
    }
    const permutedValX = valX.map((row, i) => {
      const newRow = [...row];
      newRow[f] = valX[colIndices[i]][f];
      return newRow;
    });
    const permutedPred = fitAndPredict(trainX, trainY, permutedValX);
    const permutedScore = scoreFn(valY, permutedPred);
    result.push({
      feature: featureNames[f],
      importance: baselineScore - permutedScore,
      baselineScore,
      permutedScore,
    });
  }
  return result;
}

// ---------- C. Wrapper methods ----------

/**
 * Recursive Feature Elimination (RFE).
 *
 * Algorithm: fit a model with importance; rank features by importance;
 * drop the lowest-importance feature; refit; repeat until nFeaturesToSelect
 * remain. Mirrors sklearn.feature_selection.RFE.
 *
 * @param fitAndImportance  fit a model on (X, y) and return per-feature importance (real)
 * @param nFeaturesToSelect target number of features
 * @returns ranking (1 = selected first; lower = better), selected features
 */
export function rfe(
  trainX: number[][],
  trainY: number[],
  featureNames: string[],
  fitAndImportance: (X: number[][], y: number[], featureNames: string[]) => { feature: string; importance: number }[],
  nFeaturesToSelect: number,
): { feature: string; rank: number; selected: boolean; finalImportance: number }[] {
  const k = featureNames.length;
  if (k <= nFeaturesToSelect) {
    // All selected
    return featureNames.map((name) => ({ feature: name, rank: 1, selected: true, finalImportance: 0 }));
  }
  let remaining = [...featureNames];
  const eliminated: { feature: string; rank: number }[] = [];
  let rankCounter = k;
  while (remaining.length > nFeaturesToSelect) {
    // Subset to remaining features
    const remainingIdx = remaining.map((name) => featureNames.indexOf(name));
    const subX = trainX.map((row) => remainingIdx.map((i) => row[i]));
    const importance = fitAndImportance(subX, trainY, remaining);
    // Find the lowest-importance feature
    let min = Infinity; let minFeature = "";
    for (const { feature, importance: imp } of importance) {
      if (imp < min) { min = imp; minFeature = feature; }
    }
    eliminated.push({ feature: minFeature, rank: rankCounter-- });
    remaining = remaining.filter((f) => f !== minFeature);
  }
  // Final fit on the selected set
  const finalIdx = remaining.map((name) => featureNames.indexOf(name));
  const subX = trainX.map((row) => finalIdx.map((i) => row[i]));
  const finalImportance = fitAndImportance(subX, trainY, remaining);
  const importanceMap = new Map(finalImportance.map((f) => [f.feature, f.importance]));
  return featureNames.map((name) => {
    const elim = eliminated.find((e) => e.feature === name);
    if (elim) return { feature: name, rank: elim.rank, selected: false, finalImportance: 0 };
    return { feature: name, rank: 1, selected: true, finalImportance: importanceMap.get(name) ?? 0 };
  });
}

/**
 * Sequential Forward Selection (SFS).
 *
 * Greedy: start with no features; iteratively add the feature that most
 * improves the score on a validation set; stop at nFeaturesToSelect.
 *
 * Slower than RFE (k² fits) but pedagogically clearer.
 */
export function sequentialForwardSelection(
  trainX: number[][],
  trainY: number[],
  valX: number[][],
  valY: number[],
  featureNames: string[],
  fitAndPredict: (trainX: number[][], trainY: number[], valX: number[][]) => number[],
  scoreFn: (yTrue: number[], yPred: number[]) => number,
  nFeaturesToSelect: number,
): { feature: string; selected: boolean; addedOrder: number; scoreWhenAdded: number }[] {
  const selected: string[] = [];
  const scoresWhenAdded = new Map<string, number>();
  const remaining = [...featureNames];
  while (selected.length < nFeaturesToSelect && remaining.length > 0) {
    let bestFeature = "";
    let bestScore = -Infinity;
    for (const candidate of remaining) {
      const tryFeatures = [...selected, candidate];
      const tryIdx = tryFeatures.map((f) => featureNames.indexOf(f));
      const subTrainX = trainX.map((row) => tryIdx.map((i) => row[i]));
      const subValX = valX.map((row) => tryIdx.map((i) => row[i]));
      const pred = fitAndPredict(subTrainX, trainY, subValX);
      const score = scoreFn(valY, pred);
      if (score > bestScore) { bestScore = score; bestFeature = candidate; }
    }
    selected.push(bestFeature);
    scoresWhenAdded.set(bestFeature, bestScore);
    remaining.splice(remaining.indexOf(bestFeature), 1);
  }
  return featureNames.map((name) => {
    const idx = selected.indexOf(name);
    return {
      feature: name,
      selected: idx >= 0,
      addedOrder: idx >= 0 ? idx + 1 : 0,
      scoreWhenAdded: scoresWhenAdded.get(name) ?? 0,
    };
  });
}

/**
 * RFECV — Recursive Feature Elimination with cross-validation.
 *
 * Runs RFE for each subset size from k down to 1, scoring each on the
 * validation set; picks the subset size with the best score.
 *
 * Returns the selected features and the score curve.
 */
export function rfecv(
  trainX: number[][],
  trainY: number[],
  valX: number[][],
  valY: number[],
  featureNames: string[],
  fitAndPredict: (trainX: number[][], trainY: number[], valX: number[][]) => number[],
  scoreFn: (yTrue: number[], yPred: number[]) => number,
): {
  selected: { feature: string; selected: boolean }[];
  scoreCurve: { nFeatures: number; score: number }[];
  bestNFeatures: number;
} {
  const k = featureNames.length;
  const scoreCurve: { nFeatures: number; score: number }[] = [];
  for (let n = 1; n <= k; n++) {
    // Use RFE to pick n features, then score on validation
    const rfeResult = rfe(
      trainX,
      trainY,
      featureNames,
      (X: number[][], y: number[], names: string[]) =>
        treeFeatureImportance(X, y, names, "regression"),
      n,
    );
    const selectedFeatures = rfeResult.filter((r) => r.selected).map((r) => r.feature);
    const tryIdx = selectedFeatures.map((f) => featureNames.indexOf(f));
    const subTrainX = trainX.map((row) => tryIdx.map((i) => row[i]));
    const subValX = valX.map((row) => tryIdx.map((i) => row[i]));
    const pred = fitAndPredict(subTrainX, trainY, subValX);
    const score = scoreFn(valY, pred);
    scoreCurve.push({ nFeatures: n, score });
  }
  // Find the best nFeatures
  let bestNFeatures = 1;
  let bestScore = -Infinity;
  for (const { nFeatures, score } of scoreCurve) {
    if (score > bestScore) { bestScore = score; bestNFeatures = nFeatures; }
  }
  // Get the selected features at that n
  const rfeBest = rfe(
    trainX,
    trainY,
    featureNames,
    (X: number[][], y: number[], names: string[]) =>
      treeFeatureImportance(X, y, names, "regression"),
    bestNFeatures,
  );
  return {
    selected: featureNames.map((name) => ({
      feature: name,
      selected: rfeBest.find((r) => r.feature === name)?.selected ?? false,
    })),
    scoreCurve,
    bestNFeatures,
  };
}
