/**
 * Pure statistical functions — no React, no DOM.
 *
 * Every function takes a sample of numbers (already cleaned of `null`)
 * and returns the statistic. Sample variance/std use n-1 (Pandas default).
 * Population variants are provided for educational comparison.
 *
 * Numbers are real JS numbers. No rounding inside the functions — the
 * caller rounds for display.
 */

import type { CellValue } from "./types";

/** Coerce a column of cells into a clean numeric array (drops null/NaN). */
export function toNumericArray(values: CellValue[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (v === null || v === undefined || typeof v === "boolean") continue;
    if (typeof v === "number") {
      if (Number.isFinite(v)) out.push(v);
      continue;
    }
    // string → parse
    const n = Number(v);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

export function sum(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return sum(xs) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function mode(xs: number[]): number[] {
  if (xs.length === 0) return [];
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  let max = 0;
  for (const c of counts.values()) if (c > max) max = c;
  if (max === 0) return [];
  const out: number[] = [];
  for (const [v, c] of counts.entries()) if (c === max) out.push(v);
  return out.sort((a, b) => a - b);
}

export function min(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let m = xs[0];
  for (const x of xs) if (x < m) m = x;
  return m;
}

export function max(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let m = xs[0];
  for (const x of xs) if (x > m) m = x;
  return m;
}

export function range(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return max(xs) - min(xs);
}

/** Sample variance (denominator n-1), matches Pandas .var(). */
export function variance(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (n - 1);
}

/** Population variance (denominator n). */
export function variancePop(xs: number[]): number {
  const n = xs.length;
  if (n === 0) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / n;
}

/** Sample std (denominator n-1), matches Pandas .std(). */
export function std(xs: number[]): number {
  const v = variance(xs);
  return Number.isNaN(v) ? NaN : Math.sqrt(v);
}

export function stdPop(xs: number[]): number {
  const v = variancePop(xs);
  return Number.isNaN(v) ? NaN : Math.sqrt(v);
}

/** Quantile via linear interpolation (Pandas default, `interpolation='linear'`). */
export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return NaN;
  if (q <= 0) return min(xs);
  if (q >= 1) return max(xs);
  const sorted = [...xs].sort((a, b) => a - b);
  const n = sorted.length;
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

export function quartiles(xs: number[]): { q1: number; q2: number; q3: number } {
  return { q1: quantile(xs, 0.25), q2: quantile(xs, 0.5), q3: quantile(xs, 0.75) };
}

export function iqr(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const { q1, q3 } = quartiles(xs);
  return q3 - q1;
}

/** Outlier fence (Tukey, 1.5 * IQR). Returns bounds and the indices of flagged outliers. */
export function tukeyFence(xs: number[]): {
  lower: number;
  upper: number;
  outliers: { index: number; value: number }[];
} {
  if (xs.length === 0) return { lower: NaN, upper: NaN, outliers: [] };
  const { q1, q3 } = quartiles(xs);
  const step = (q3 - q1) * 1.5;
  const lower = q1 - step;
  const upper = q3 + step;
  const outliers: { index: number; value: number }[] = [];
  xs.forEach((v, i) => {
    if (v < lower || v > upper) outliers.push({ index: i, value: v });
  });
  return { lower, upper, outliers };
}

/** Skewness (Fisher-Pearson, sample-adjusted) — matches scipy.stats.skew(bias=False) approximately. */
export function skewness(xs: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const m = mean(xs);
  const s = std(xs);
  if (s === 0 || !Number.isFinite(s)) return 0;
  let acc = 0;
  for (const x of xs) acc += ((x - m) / s) ** 3;
  // Sample-adjustment (matches Pandas .skew())
  const factor = Math.sqrt(n * (n - 1)) / (n - 2);
  return factor * (acc / n);
}

/** Excess kurtosis (Fisher, g−2 form, sample-adjusted) — matches Pandas .kurt(). */
export function kurtosis(xs: number[]): number {
  const n = xs.length;
  if (n < 4) return NaN;
  const m = mean(xs);
  const s = std(xs);
  if (s === 0 || !Number.isFinite(s)) return 0;
  let acc = 0;
  for (const x of xs) acc += ((x - m) / s) ** 4;
  const g2 = (acc / n) - 3;
  // Sample adjustment (matches Pandas .kurt())
  const factor = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
  return factor;
}

/** Count of values that are not null/undefined. */
export function count(xs: CellValue[]): number {
  let c = 0;
  for (const v of xs) if (v !== null && v !== undefined) c++;
  return c;
}

/** Number of distinct non-null values. */
export function nunique(xs: CellValue[]): number {
  const set = new Set<string>();
  for (const v of xs) {
    if (v === null || v === undefined) continue;
    set.add(String(v));
  }
  return set.size;
}

/** Frequency table of distinct values (sorted by count desc, then value asc). */
export function valueCounts(xs: CellValue[]): { value: CellValue; count: number }[] {
  const map = new Map<string, { value: CellValue; count: number }>();
  for (const v of xs) {
    if (v === null || v === undefined) continue;
    const key = String(v);
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { value: v, count: 1 });
  }
  return [...map.values()].sort((a, b) =>
    b.count === a.count
      ? String(a.value).localeCompare(String(b.value))
      : b.count - a.count
  );
}

/** Approximate memory usage in bytes for a column of cells. */
export function memoryUsage(values: CellValue[]): number {
  // Mirror Pandas default per-dtype: int64/float64 = 8 bytes; bool = 1;
  // datetime64 = 8; object = 8 (pointer) + heap string length.
  let bytes = 0;
  for (const v of values) {
    if (v === null || v === undefined) {
      bytes += 8; // NaN floats in numeric cols
    } else if (typeof v === "number") {
      bytes += 8;
    } else if (typeof v === "boolean") {
      bytes += 1;
    } else if (typeof v === "string") {
      bytes += 8 + v.length; // object pointer + chars (approximation)
    } else {
      bytes += 8;
    }
  }
  return bytes;
}
