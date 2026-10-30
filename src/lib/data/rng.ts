/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * Used by every built-in dataset so the rows are 100% reproducible.
 * Identical seed ⇒ identical rows, every run, every browser.
 *
 * Also exports helpers built on top: int, float, pick, shuffle.
 */

/** Mulberry32 — small, fast, deterministic. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function rng(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** Pick one element from arr. */
  pick<T>(arr: readonly T[]): T;
  /** Pick n distinct elements (without replacement). */
  sample<T>(arr: readonly T[], n: number): T[];
  /** Shuffle a copy and return it. */
  shuffle<T>(arr: readonly T[]): T[];
  /** Boolean with given probability (default 0.5). */
  bool(p?: number): boolean;
  /** Gaussian via Box-Muller (mean=0, std=1 by default). */
  gauss(mean?: number, std?: number): number;
}

export function makeRngHelper(seed: number): Rng {
  const next = makeRng(seed);
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    sample: <T,>(arr: readonly T[], n: number): T[] => {
      const copy = [...arr];
      const out: T[] = [];
      const k = Math.min(n, copy.length);
      for (let i = 0; i < k; i++) {
        const idx = Math.floor(next() * copy.length);
        out.push(copy.splice(idx, 1)[0] as T);
      }
      return out;
    },
    shuffle: <T,>(arr: readonly T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    bool: (p = 0.5) => next() < p,
    gauss: (mean = 0, std = 1) => {
      const u1 = next() || 1e-12;
      const u2 = next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + std * z;
    },
  };
}
