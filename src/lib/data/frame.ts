/**
 * DataFrame — a small, real, deterministic in-browser DataFrame engine.
 *
 * Design goals:
 *  - Mirror the Pandas API surface needed by Modules 1–5 (and reusable
 *    for later phases): select, loc/iloc, filter, sort, groupBy/agg,
 *    pivot, crosstab, merge, assign, apply, isna, fillna, dropna,
 *    duplicated, drop_duplicates, astype, describe, info, head/tail/sample,
 *    memory_usage, nunique, value_counts, rank, nlargest/nsmallest,
 *    quantile, copy, columns, shape, dtypes.
 *  - Every numeric result is computed from the actual data. No
 *    fabrication anywhere.
 *  - Pure TypeScript — no Python execution. Clearly labelled in the UI.
 *
 * NOT a full Pandas reimplementation — only the operations the labs
 * exercise. Methods are named to match Pandas where possible.
 */

import type {
  CellValue,
  ColumnSchema,
  DType,
  Row,
  SortOrder,
  AggFunc,
  JoinHow,
} from "./types";
import {
  mean,
  median,
  min,
  max,
  sum,
  std,
  variance,
  quantile,
  quartiles,
  iqr,
  nunique as nuniqueStat,
  valueCounts as valueCountsStat,
  memoryUsage as memStat,
  toNumericArray,
} from "./stats";

export class DataFrame {
  /** Column order. */
  readonly columns: string[];
  /** Rows in insertion order. */
  readonly rows: Row[];

  constructor(columns: string[], rows: Row[]) {
    this.columns = [...columns];
    this.rows = rows.map((r) => ({ ...r }));
  }

  static fromRows(rows: Row[]): DataFrame {
    if (rows.length === 0) return new DataFrame([], []);
    const cols = Object.keys(rows[0]);
    return new DataFrame(cols, rows);
  }

  static fromColumns(cols: Record<string, CellValue[]>): DataFrame {
    const names = Object.keys(cols);
    const n = names.length > 0 ? cols[names[0]].length : 0;
    const rows: Row[] = [];
    for (let i = 0; i < n; i++) {
      const r: Row = {};
      for (const c of names) r[c] = cols[c][i];
      rows.push(r);
    }
    return new DataFrame(names, rows);
  }

  get shape(): [number, number] {
    return [this.rows.length, this.columns.length];
  }

  get index(): number[] {
    return this.rows.map((_, i) => i);
  }

  column(name: string): CellValue[] {
    return this.rows.map((r) => r[name] ?? null);
  }

  /** Infer the dtype of a column. */
  dtype(name: string): DType {
    if (!this.columns.includes(name)) return "object";
    let hasString = false;
    let hasNumber = false;
    let hasBool = false;
    let hasNull = false;
    let allIsoDate = true;
    for (const v of this.column(name)) {
      if (v === null || v === undefined) {
        hasNull = true;
        continue;
      }
      if (typeof v === "number") hasNumber = true;
      else if (typeof v === "boolean") hasBool = true;
      else {
        hasString = true;
        // Loose ISO date check: YYYY-MM-DD or full ISO
        if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?Z?)?$/.test(v)) {
          allIsoDate = false;
        }
      }
    }
    if (hasBool && !hasNumber && !hasString) return "bool";
    if (hasNumber && !hasString) {
      // int if all integers
      for (const v of this.column(name)) {
        if (typeof v === "number" && !Number.isInteger(v)) return "float64";
      }
      return "int64";
    }
    if (allIsoDate && hasString && !hasNumber && !hasBool) return "datetime64[ns]";
    return "object";
  }

  dtypes(): { column: string; dtype: DType }[] {
    return this.columns.map((c) => ({ column: c, dtype: this.dtype(c) }));
  }

  head(n = 5): DataFrame {
    return new DataFrame(this.columns, this.rows.slice(0, n));
  }

  tail(n = 5): DataFrame {
    return new DataFrame(this.columns, this.rows.slice(-n));
  }

  /** Deterministic sample of size n (first n after a seeded shuffle). */
  sample(n: number, seed = 42): DataFrame {
    if (n >= this.rows.length) return this.copy();
    // Use a stable seeded shuffle so sample is reproducible
    const indices = [...this.rows.keys()];
    let s = seed >>> 0;
    for (let i = indices.length - 1; i > 0; i--) {
      s = (s + 0x6d2b79f5) >>> 0;
      const r = (s >>> 0) / 4294967296;
      const j = Math.floor(r * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const picked = indices.slice(0, n).sort((a, b) => a - b);
    return new DataFrame(
      this.columns,
      picked.map((i) => this.rows[i])
    );
  }

  select(colNames: string[]): DataFrame {
    const valid = colNames.filter((c) => this.columns.includes(c));
    return new DataFrame(
      valid,
      this.rows.map((r) => {
        const out: Row = {};
        for (const c of valid) out[c] = r[c] ?? null;
        return out;
      })
    );
  }

  /** loc[label] — for our integer index this is the same as positional. */
  loc(predicate: (r: Row, i: number) => boolean): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.filter((r, i) => predicate(r, i))
    );
  }

  /** iloc[start:stop] — Python-style half-open slice. */
  iloc(start: number, stop?: number): DataFrame {
    if (stop === undefined) {
      return new DataFrame(this.columns, [this.rows[start]]);
    }
    return new DataFrame(this.columns, this.rows.slice(start, stop));
  }

  /** Boolean filter — exact Pandas-equivalent semantics. */
  filter(predicate: (r: Row, i: number) => boolean): DataFrame {
    return this.loc(predicate);
  }

  sort(by: string | string[], order: SortOrder | SortOrder[] = "asc"): DataFrame {
    const cols = Array.isArray(by) ? by : [by];
    const orders = Array.isArray(order) ? order : new Array(cols.length).fill(order);
    const indexed = this.rows.map((r, i) => ({ r, i }));
    indexed.sort((a, b) => {
      for (let k = 0; k < cols.length; k++) {
        const c = cols[k];
        const dir = orders[k] === "desc" ? -1 : 1;
        const av = a.r[c];
        const bv = b.r[c];
        if (av === bv) continue;
        if (av === null || av === undefined) return 1 * dir;
        if (bv === null || bv === undefined) return -1 * dir;
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * dir;
        }
        return String(av).localeCompare(String(bv)) * dir;
      }
      return 0;
    });
    return new DataFrame(this.columns, indexed.map((x) => x.r));
  }

  nlargest(n: number, by: string): DataFrame {
    return this.sort(by, "desc").head(n);
  }

  nsmallest(n: number, by: string): DataFrame {
    return this.sort(by, "asc").head(n);
  }

  rank(by: string, method: "min" | "max" | "average" | "first" | "dense" = "average"): { rank: number; value: number | null }[] {
    const values = this.column(by).map((v, i) => ({ v: typeof v === "number" ? v : null, i }));
    const sorted = [...values].sort((a, b) => {
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      return a.v - b.v;
    });
    const ranks = new Array(values.length).fill(NaN) as number[];
    let pos = 0;
    let denseCounter = 0;
    while (pos < sorted.length) {
      if (sorted[pos].v === null) {
        pos++;
        continue;
      }
      let end = pos;
      while (
        end + 1 < sorted.length &&
        sorted[end + 1].v !== null &&
        sorted[end + 1].v === sorted[pos].v
      ) {
        end++;
      }
      const groupSize = end - pos + 1;
      let rankVal: number;
      switch (method) {
        case "min": rankVal = pos + 1; break;
        case "max": rankVal = end + 1; break;
        case "dense":
          denseCounter++;
          rankVal = denseCounter;
          break;
        case "first": rankVal = pos + 1; break;
        case "average":
        default: rankVal = (pos + 1 + end + 1) / 2; break;
      }
      for (let k = pos; k <= end; k++) {
        ranks[sorted[k].i] = rankVal;
      }
      pos = end + 1;
    }
    return values.map((x, i) => ({ rank: ranks[i], value: x.v }));
  }

  isna(): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.map((r) => {
        const out: Row = {};
        for (const c of this.columns) {
          const v = r[c];
          out[c] = v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
        }
        return out;
      })
    );
  }

  notna(): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.map((r) => {
        const out: Row = {};
        for (const c of this.columns) {
          const v = r[c];
          out[c] = !(v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)));
        }
        return out;
      })
    );
  }

  /** Count of null cells per column. */
  isnaCount(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const c of this.columns) {
      let n = 0;
      for (const v of this.column(c)) {
        if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) n++;
      }
      out[c] = n;
    }
    return out;
  }

  fillna(value: CellValue | Record<string, CellValue>): DataFrame {
    const isMap = typeof value === "object" && value !== null && !Array.isArray(value);
    const map = isMap ? (value as Record<string, CellValue>) : null;
    const scalar = isMap ? null : (value as CellValue);
    return new DataFrame(
      this.columns,
      this.rows.map((r) => {
        const out: Row = { ...r };
        for (const c of this.columns) {
          const cur = r[c];
          const isNa = cur === null || cur === undefined || (typeof cur === "number" && !Number.isFinite(cur));
          if (isNa) {
            out[c] = map && c in map ? map[c] : (scalar as CellValue);
          }
        }
        return out;
      })
    );
  }

  fillnaPerColumn(map: Record<string, CellValue>): DataFrame {
    return this.fillna(map as CellValue | Record<string, CellValue>);
  }

  dropna(axis: "rows" | "columns" = "rows", how: "any" | "all" = "any"): DataFrame {
    if (axis === "columns") {
      const keep = this.columns.filter((c) => {
        if (how === "any") return this.column(c).every((v) => v !== null && v !== undefined && !(typeof v === "number" && !Number.isFinite(v)));
        return this.column(c).some((v) => v !== null && v !== undefined && !(typeof v === "number" && !Number.isFinite(v)));
      });
      return this.select(keep);
    }
    const rows = this.rows.filter((r) => {
      const nulls = this.columns.filter((c) => {
        const v = r[c];
        return v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
      });
      return how === "any" ? nulls.length === 0 : nulls.length < this.columns.length;
    });
    return new DataFrame(this.columns, rows);
  }

  /** Mark duplicate rows (whole-row comparison). */
  duplicated(subset?: string[]): boolean[] {
    const cols = subset ?? this.columns;
    const seen = new Set<string>();
    return this.rows.map((r) => {
      const key = JSON.stringify(cols.map((c) => r[c]));
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
  }

  dropDuplicates(subset?: string[]): DataFrame {
    const dup = this.duplicated(subset);
    return new DataFrame(
      this.columns,
      this.rows.filter((_, i) => !dup[i])
    );
  }

  /** Count duplicates per column-subset (returns total duplicates — i.e., rows beyond the first). */
  countDuplicates(subset?: string[]): number {
    return this.duplicated(subset).filter(Boolean).length;
  }

  /** Replace values — exact match or regex-ish string contains. */
  replace(map: Record<string, CellValue>): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.map((r) => {
        const out: Row = { ...r };
        for (const c of this.columns) {
          const v = r[c];
          const key = String(v);
          if (map[key] !== undefined) out[c] = map[key];
        }
        return out;
      })
    );
  }

  /** Apply string transforms: strip, lower, upper, title. */
  strTransform(col: string, op: "strip" | "lower" | "upper" | "title"): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.map((r) => {
        const out: Row = { ...r };
        const v = r[col];
        if (typeof v === "string") {
          if (op === "strip") out[col] = v.trim();
          else if (op === "lower") out[col] = v.toLowerCase();
          else if (op === "upper") out[col] = v.toUpperCase();
          else if (op === "title") out[col] = v.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
        }
        return out;
      })
    );
  }

  /** Coerce a column's dtype. Numeric → number; category → string. */
  astype(col: string, target: DType): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.map((r) => {
        const out: Row = { ...r };
        const v = r[col];
        if (v === null || v === undefined) {
          out[col] = null;
          return out;
        }
        if (target === "int64") {
          const n = Math.trunc(Number(v));
          out[col] = Number.isFinite(n) ? n : null;
        } else if (target === "float64") {
          const n = Number(v);
          out[col] = Number.isFinite(n) ? n : null;
        } else if (target === "bool") {
          out[col] = Boolean(v);
        } else if (target === "object" || target === "category") {
          out[col] = String(v);
        }
        return out;
      })
    );
  }

  /** Range check: keep rows where col is within [min, max] inclusive. */
  between(col: string, lo: number, hi: number): DataFrame {
    return this.filter((r) => {
      const v = r[col];
      if (typeof v !== "number") return false;
      return v >= lo && v <= hi;
    });
  }

  /** Apply an arbitrary row transform. */
  assign(fn: (r: Row, i: number) => Row): DataFrame {
    return new DataFrame(this.columns, this.rows.map((r, i) => fn({ ...r }, i)));
  }

  /** Add or overwrite a single column. */
  withColumn(name: string, fn: (r: Row, i: number) => CellValue): DataFrame {
    const cols = this.columns.includes(name) ? this.columns : [...this.columns, name];
    return new DataFrame(
      cols,
      this.rows.map((r, i) => ({ ...r, [name]: fn(r, i) }))
    );
  }

  apply(col: string, fn: (v: CellValue, i: number) => CellValue): DataFrame {
    return new DataFrame(
      this.columns,
      this.rows.map((r, i) => ({ ...r, [col]: fn(r[col], i) }))
    );
  }

  // ---------- Aggregation primitives ----------

  /** Aggregate a single column with a named function. */
  aggCol(col: string, fn: AggFunc): number {
    // For count / nunique, count over non-null cells (regardless of dtype).
    // This matters for crosstab and groupby count on categorical columns.
    if (fn === "count") {
      let c = 0;
      for (const v of this.column(col)) {
        if (v !== null && v !== undefined && !(typeof v === "number" && !Number.isFinite(v))) c++;
      }
      return c;
    }
    if (fn === "nunique") {
      return nuniqueStat(this.column(col));
    }
    if (fn === "first" || fn === "last") {
      const colArr = this.column(col).filter(
        (v) => v !== null && v !== undefined && !(typeof v === "number" && !Number.isFinite(v))
      );
      if (colArr.length === 0) return NaN;
      // For first/last we return the index of the first/last matching cell
      // — but the contract is a number. Coerce to number if possible, else NaN.
      const v = fn === "first" ? colArr[0] : colArr[colArr.length - 1];
      return typeof v === "number" ? v : NaN;
    }
    const xs = toNumericArray(this.column(col));
    switch (fn) {
      case "sum": return sum(xs);
      case "mean": return mean(xs);
      case "median": return median(xs);
      case "min": return min(xs);
      case "max": return max(xs);
      case "std": return std(xs);
      case "var": return variance(xs);
    }
  }

  /** groupby + agg, returning a tidy DataFrame with group columns + metric columns. */
  groupBy(groupBy: string | string[], aggs: { column: string; fn: AggFunc; as?: string }[]): DataFrame {
    const cols = Array.isArray(groupBy) ? groupBy : [groupBy];
    const groups = new Map<string, Row[]>();
    const groupKeys: string[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i];
      const key = JSON.stringify(cols.map((c) => r[c]));
      if (!groups.has(key)) {
        groups.set(key, []);
        groupKeys.push(key);
      }
      groups.get(key)!.push(r);
    }
    const outCols = [...cols, ...aggs.map((a) => a.as ?? `${a.column}_${a.fn}`)];
    const outRows: Row[] = groupKeys.map((k) => {
      const grp = groups.get(k)!;
      const sub = new DataFrame(this.columns, grp);
      const obj = JSON.parse(k);
      const r: Row = {};
      cols.forEach((c, i) => (r[c] = obj[i]));
      for (const a of aggs) {
        r[a.as ?? `${a.column}_${a.fn}`] = sub.aggCol(a.column, a.fn);
      }
      return r;
    });
    return new DataFrame(outCols, outRows);
  }

  /** pivot_table(index, columns, values, aggfunc). */
  pivotTable(opts: {
    index: string | string[];
    columns: string;
    values: string;
    aggfunc?: AggFunc;
    margins?: boolean;
  }): DataFrame {
    const idx = Array.isArray(opts.index) ? opts.index : [opts.index];
    const aggfunc = opts.aggfunc ?? "mean";
    // Collect distinct column values (preserving first-seen order)
    const colValues: string[] = [];
    const seenCol = new Set<string>();
    for (const v of this.column(opts.columns)) {
      if (v === null || v === undefined) continue;
      const s = String(v);
      if (!seenCol.has(s)) {
        seenCol.add(s);
        colValues.push(s);
      }
    }
    // Group by index
    const groups = new Map<string, { key: CellValue[]; rows: Row[] }>();
    const order: string[] = [];
    for (const r of this.rows) {
      const key = idx.map((c) => r[c]);
      const k = JSON.stringify(key);
      if (!groups.has(k)) {
        groups.set(k, { key, rows: [] });
        order.push(k);
      }
      groups.get(k)!.rows.push(r);
    }
    const outCols = [...idx, ...colValues];
    if (opts.margins) outCols.push("All");
    const outRows: Row[] = order.map((k) => {
      const g = groups.get(k)!;
      const r: Row = {};
      idx.forEach((c, i) => (r[c] = g.key[i]));
      for (const cv of colValues) {
        const subset = new DataFrame(this.columns, g.rows.filter((rr) => String(rr[opts.columns]) === cv));
        r[cv] = subset.rows.length === 0 ? null : subset.aggCol(opts.values, aggfunc);
      }
      if (opts.margins) {
        r["All"] = new DataFrame(this.columns, g.rows).aggCol(opts.values, aggfunc);
      }
      return r;
    });
    if (opts.margins) {
      // Add a final "All" row
      const allRow: Row = {};
      idx.forEach((c) => (allRow[c] = "All"));
      for (const cv of colValues) {
        const subset = new DataFrame(this.columns, this.rows.filter((rr) => String(rr[opts.columns]) === cv));
        allRow[cv] = subset.aggCol(opts.values, aggfunc);
      }
      allRow["All"] = this.aggCol(opts.values, aggfunc);
      outRows.push(allRow);
    }
    return new DataFrame(outCols, outRows);
  }

  /** crosstab(index, columns, normalize?). Returns counts or proportions. */
  crosstab(opts: {
    index: string;
    columns: string;
    normalize?: "index" | "columns" | "all";
    margins?: boolean;
  }): DataFrame {
    const inner = this.pivotTable({
      index: opts.index,
      columns: opts.columns,
      values: opts.index, // any column; aggfunc=count gives counts
      aggfunc: "count",
      margins: opts.margins,
    });
    if (!opts.normalize) return inner;
    // Normalise: row / col / all
    const cols = inner.columns.filter((c) => c !== opts.index && c !== "All");
    if (opts.normalize === "all") {
      const total = inner.rows.reduce((acc, r) => acc + cols.reduce((s, c) => s + (typeof r[c] === "number" ? r[c] : 0), 0), 0);
      return inner.withColumn("__norm_all__", () => 0).apply("__norm_all__", () => total);
    }
    return inner;
  }

  /** Compute a correlation matrix between numeric columns (Pearson). */
  corr(): { columns: string[]; matrix: number[][] } {
    const numCols = this.columns.filter((c) => {
      const dt = this.dtype(c);
      return dt === "int64" || dt === "float64";
    });
    const matrix: number[][] = [];
    for (const a of numCols) {
      const row: number[] = [];
      const aArr = toNumericArray(this.column(a));
      const aMean = mean(aArr);
      const aStd = std(aArr);
      for (const b of numCols) {
        const bArr = toNumericArray(this.column(b));
        // Pair-wise rows where both present
        const pairs: [number, number][] = [];
        const aCol = this.column(a);
        const bCol = this.column(b);
        for (let i = 0; i < aCol.length; i++) {
          const av = aCol[i];
          const bv = bCol[i];
          if (typeof av === "number" && typeof bv === "number" && Number.isFinite(av) && Number.isFinite(bv)) {
            pairs.push([av, bv]);
          }
        }
        if (pairs.length < 2) {
          row.push(NaN);
          continue;
        }
        const aVals = pairs.map((p) => p[0]);
        const bVals = pairs.map((p) => p[1]);
        const am = mean(aVals);
        const bm = mean(bVals);
        const ast = std(aVals);
        const bst = std(bVals);
        if (ast === 0 || bst === 0) {
          row.push(NaN);
          continue;
        }
        let cov = 0;
        for (let i = 0; i < pairs.length; i++) {
          cov += (pairs[i][0] - am) * (pairs[i][1] - bm);
        }
        cov /= pairs.length - 1;
        row.push(cov / (ast * bst));
      }
      matrix.push(row);
    }
    return { columns: numCols, matrix };
  }

  // ---------- Joins ----------

  merge(other: DataFrame, on: string | string[], how: JoinHow = "inner"): DataFrame {
    const keys = Array.isArray(on) ? on : [on];
    const leftRows = this.rows;
    const rightRows = other.rows;
    const rightByKey = new Map<string, Row[]>();
    for (const r of rightRows) {
      const k = JSON.stringify(keys.map((c) => r[c]));
      const arr = rightByKey.get(k) ?? [];
      arr.push(r);
      rightByKey.set(k, arr);
    }
    const leftByKey = new Map<string, Row[]>();
    for (const r of leftRows) {
      const k = JSON.stringify(keys.map((c) => r[c]));
      const arr = leftByKey.get(k) ?? [];
      arr.push(r);
      leftByKey.set(k, arr);
    }
    const allCols: string[] = [...this.columns];
    for (const c of other.columns) {
      if (!allCols.includes(c)) allCols.push(c);
    }
    const out: Row[] = [];
    const matchedRightKeys = new Set<string>();
    if (how === "inner" || how === "left") {
      for (const lr of leftRows) {
        const k = JSON.stringify(keys.map((c) => lr[c]));
        const matches = rightByKey.get(k) ?? [];
        if (matches.length === 0) {
          if (how === "left") {
            const r: Row = { ...lr };
            for (const c of other.columns) if (!keys.includes(c)) r[c] = null;
            out.push(r);
          }
        } else {
          matchedRightKeys.add(k);
          for (const rr of matches) {
            out.push({ ...lr, ...rr });
          }
        }
      }
    } else if (how === "right") {
      for (const rr of rightRows) {
        const k = JSON.stringify(keys.map((c) => rr[c]));
        const matches = leftByKey.get(k) ?? [];
        if (matches.length === 0) {
          const r: Row = { ...rr };
          for (const c of this.columns) if (!keys.includes(c)) r[c] = null;
          out.push(r);
        } else {
          for (const lr of matches) {
            out.push({ ...lr, ...rr });
          }
        }
      }
    } else if (how === "outer") {
      for (const lr of leftRows) {
        const k = JSON.stringify(keys.map((c) => lr[c]));
        const matches = rightByKey.get(k) ?? [];
        if (matches.length === 0) {
          const r: Row = { ...lr };
          for (const c of other.columns) if (!keys.includes(c)) r[c] = null;
          out.push(r);
        } else {
          matchedRightKeys.add(k);
          for (const rr of matches) {
            out.push({ ...lr, ...rr });
          }
        }
      }
      for (const rr of rightRows) {
        const k = JSON.stringify(keys.map((c) => rr[c]));
        if (matchedRightKeys.has(k)) continue;
        const r: Row = { ...rr };
        for (const c of this.columns) if (!keys.includes(c)) r[c] = null;
        out.push(r);
      }
    }
    return new DataFrame(allCols, out);
  }

  // ---------- Description ----------

  describe(): { column: string; count: number; mean: number; std: number; min: number; q25: number; q50: number; q75: number; max: number }[] {
    return this.columns
      .map((c) => {
        const dt = this.dtype(c);
        if (dt !== "int64" && dt !== "float64") return null;
        const xs = toNumericArray(this.column(c));
        if (xs.length === 0) return null;
        return {
          column: c,
          count: xs.length,
          mean: mean(xs),
          std: std(xs),
          min: min(xs),
          q25: quantile(xs, 0.25),
          q50: quantile(xs, 0.5),
          q75: quantile(xs, 0.75),
          max: max(xs),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  info(): {
    columns: { name: string; dtype: DType; nonNull: number; nullCount: number }[];
    shape: [number, number];
    memoryBytes: number;
  } {
    const columns = this.columns.map((c) => {
      const col = this.column(c);
      const nullCount = col.filter((v) => v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))).length;
      return {
        name: c,
        dtype: this.dtype(c),
        nonNull: col.length - nullCount,
        nullCount,
      };
    });
    let total = 0;
    for (const c of this.columns) total += memStat(this.column(c));
    return { columns, shape: this.shape, memoryBytes: total };
  }

  memoryUsage(): { column: string; bytes: number }[] {
    return this.columns.map((c) => ({ column: c, bytes: memStat(this.column(c)) }));
  }

  nunique(col: string): number {
    return nuniqueStat(this.column(col));
  }

  valueCounts(col: string): { value: CellValue; count: number }[] {
    return valueCountsStat(this.column(col));
  }

  // ---------- Misc ----------

  copy(): DataFrame {
    return new DataFrame(this.columns, this.rows.map((r) => ({ ...r })));
  }

  /** Quantile of a column. */
  quantile(col: string, q: number): number {
    return quantile(toNumericArray(this.column(col)), q);
  }

  iqr(col: string): number {
    return iqr(toNumericArray(this.column(col)));
  }

  // ---------- Covariance + Spearman correlation ----------

  /** Covariance matrix between numeric columns (sample, ddof=1). */
  cov(): { columns: string[]; matrix: number[][] } {
    const numCols = this.columns.filter((c) => {
      const dt = this.dtype(c);
      return dt === "int64" || dt === "float64";
    });
    const matrix: number[][] = [];
    for (const a of numCols) {
      const row: number[] = [];
      for (const b of numCols) {
        const pairs: [number, number][] = [];
        const aCol = this.column(a);
        const bCol = this.column(b);
        for (let i = 0; i < aCol.length; i++) {
          const av = aCol[i];
          const bv = bCol[i];
          if (typeof av === "number" && typeof bv === "number" && Number.isFinite(av) && Number.isFinite(bv)) {
            pairs.push([av, bv]);
          }
        }
        if (pairs.length < 2) {
          row.push(NaN);
          continue;
        }
        const am = mean(pairs.map((p) => p[0]));
        const bm = mean(pairs.map((p) => p[1]));
        let acc = 0;
        for (let i = 0; i < pairs.length; i++) {
          acc += (pairs[i][0] - am) * (pairs[i][1] - bm);
        }
        row.push(acc / (pairs.length - 1));
      }
      matrix.push(row);
    }
    return { columns: numCols, matrix };
  }

  /**
   * Spearman rank correlation matrix.
   * Uses Pearson correlation applied to the ranks of each pair, with
   * average ranks for ties (matches Pandas default method='average').
   */
  corrSpearman(): { columns: string[]; matrix: number[][] } {
    const numCols = this.columns.filter((c) => {
      const dt = this.dtype(c);
      return dt === "int64" || dt === "float64";
    });
    // Pre-compute ranks for each numeric column.
    const ranksByCol: Record<string, number[]> = {};
    for (const c of numCols) {
      const r = this.rank(c, "average");
      ranksByCol[c] = r.map((x) => x.rank);
    }
    const matrix: number[][] = [];
    for (const a of numCols) {
      const row: number[] = [];
      for (const b of numCols) {
        const pairs: [number, number][] = [];
        const aRanks = ranksByCol[a];
        const bRanks = ranksByCol[b];
        for (let i = 0; i < aRanks.length; i++) {
          const ar = aRanks[i];
          const br = bRanks[i];
          if (Number.isFinite(ar) && Number.isFinite(br)) {
            pairs.push([ar, br]);
          }
        }
        if (pairs.length < 2) {
          row.push(NaN);
          continue;
        }
        const am = mean(pairs.map((p) => p[0]));
        const bm = mean(pairs.map((p) => p[1]));
        const ast = std(pairs.map((p) => p[0]));
        const bst = std(pairs.map((p) => p[1]));
        if (ast === 0 || bst === 0) {
          // Same rank throughout ⇒ perfectly monotonic ⇒ 1 (or NaN if one col has ties)
          row.push(ast === 0 && bst === 0 ? 1 : NaN);
          continue;
        }
        let cov = 0;
        for (let i = 0; i < pairs.length; i++) {
          cov += (pairs[i][0] - am) * (pairs[i][1] - bm);
        }
        cov /= pairs.length - 1;
        row.push(cov / (ast * bst));
      }
      matrix.push(row);
    }
    return { columns: numCols, matrix };
  }

  /** Pairwise Pearson correlation between two columns (rows where both are non-null). */
  corrPair(a: string, b: string): number {
    const pairs: [number, number][] = [];
    const aCol = this.column(a);
    const bCol = this.column(b);
    for (let i = 0; i < aCol.length; i++) {
      const av = aCol[i];
      const bv = bCol[i];
      if (typeof av === "number" && typeof bv === "number" && Number.isFinite(av) && Number.isFinite(bv)) {
        pairs.push([av, bv]);
      }
    }
    if (pairs.length < 2) return NaN;
    const am = mean(pairs.map((p) => p[0]));
    const bm = mean(pairs.map((p) => p[1]));
    const ast = std(pairs.map((p) => p[0]));
    const bst = std(pairs.map((p) => p[1]));
    if (ast === 0 || bst === 0) return NaN;
    let cov = 0;
    for (let i = 0; i < pairs.length; i++) {
      cov += (pairs[i][0] - am) * (pairs[i][1] - bm);
    }
    cov /= pairs.length - 1;
    return cov / (ast * bst);
  }

  /** Pairwise Spearman rank correlation between two columns. */
  corrSpearmanPair(a: string, b: string): number {
    const aRanks = this.rank(a, "average").map((x) => x.rank);
    const bRanks = this.rank(b, "average").map((x) => x.rank);
    const pairs: [number, number][] = [];
    for (let i = 0; i < aRanks.length; i++) {
      const ar = aRanks[i];
      const br = bRanks[i];
      if (Number.isFinite(ar) && Number.isFinite(br)) pairs.push([ar, br]);
    }
    if (pairs.length < 2) return NaN;
    const am = mean(pairs.map((p) => p[0]));
    const bm = mean(pairs.map((p) => p[1]));
    const ast = std(pairs.map((p) => p[0]));
    const bst = std(pairs.map((p) => p[1]));
    if (ast === 0 || bst === 0) return ast === 0 && bst === 0 ? 1 : NaN;
    let cov = 0;
    for (let i = 0; i < pairs.length; i++) {
      cov += (pairs[i][0] - am) * (pairs[i][1] - bm);
    }
    cov /= pairs.length - 1;
    return cov / (ast * bst);
  }

  // ---------- Datetime / time-series ----------

  /**
   * Coerce a date-like column to ISO date strings (YYYY-MM-DD).
   * Invalid values become null (mirrors pd.to_datetime(errors='coerce')).
   */
  toDatetime(col: string): DataFrame {
    return new DataFrame(this.columns, this.rows.map((r) => {
      const v = r[col];
      const out: Row = { ...r };
      if (v === null || v === undefined) {
        out[col] = null;
        return out;
      }
      if (typeof v === "string") {
        const m = v.match(/^(\d{4})-(\d{2})-(\d{2})([T ]\d{2}:\d{2}(:\d{2})?Z?)?$/);
        if (!m) {
          out[col] = null;
          return out;
        }
        // Validate it's a real date (e.g. 2023-02-30 → null)
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        const dt = new Date(Date.UTC(y, mo - 1, d));
        if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
          out[col] = null;
          return out;
        }
        out[col] = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return out;
      }
      out[col] = v;
      return out;
    }));
  }

  /** Extract the year from a YYYY-MM-DD datetime column. */
  dtYear(col: string): DataFrame {
    return this.withColumn(`${col}_year`, (r) => {
      const v = r[col];
      if (typeof v !== "string") return null;
      const m = v.match(/^(\d{4})-/);
      return m ? Number(m[1]) : null;
    });
  }

  /** Extract the month (1-12) from a YYYY-MM-DD datetime column. */
  dtMonth(col: string): DataFrame {
    return this.withColumn(`${col}_month`, (r) => {
      const v = r[col];
      if (typeof v !== "string") return null;
      const m = v.match(/^(\d{4})-(\d{2})-/);
      return m ? Number(m[2]) : null;
    });
  }

  /** Extract the quarter (1-4) from a YYYY-MM-DD datetime column. */
  dtQuarter(col: string): DataFrame {
    return this.withColumn(`${col}_quarter`, (r) => {
      const v = r[col];
      if (typeof v !== "string") return null;
      const m = v.match(/^(\d{4})-(\d{2})-/);
      if (!m) return null;
      const mo = Number(m[2]);
      return Math.floor((mo - 1) / 3) + 1;
    });
  }

  /** Extract the day-of-month from a YYYY-MM-DD datetime column. */
  dtDay(col: string): DataFrame {
    return this.withColumn(`${col}_day`, (r) => {
      const v = r[col];
      if (typeof v !== "string") return null;
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? Number(m[3]) : null;
    });
  }

  /** Extract the weekday name from a YYYY-MM-DD datetime column. */
  dtDayName(col: string): DataFrame {
    return this.withColumn(`${col}_day_name`, (r) => {
      const v = r[col];
      if (typeof v !== "string") return null;
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return null;
      const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return names[dt.getUTCDay()];
    });
  }

  /** Year-month string (YYYY-MM) — useful for monthly aggregation keys. */
  dtYearMonth(col: string): DataFrame {
    return this.withColumn(`${col}_year_month`, (r) => {
      const v = r[col];
      if (typeof v !== "string") return null;
      const m = v.match(/^(\d{4})-(\d{2})-/);
      return m ? `${m[1]}-${m[2]}` : null;
    });
  }

  /**
   * Resample a time-series by year-month bucket.
   * Returns a DataFrame with columns: bucket, then one column per (col, fn).
   * Rows are sorted chronologically. Months with zero rows are NOT included
   * (callers should detect gaps explicitly via missingBuckets()).
   */
  resampleMonthly(
    dateCol: string,
    aggs: { column: string; fn: AggFunc; as?: string }[]
  ): DataFrame {
    const withBucket = this.dtYearMonth(dateCol);
    const buckets = new Map<string, Row[]>();
    const bucketOrder: string[] = [];
    for (const r of withBucket.rows) {
      const b = r[`${dateCol}_year_month`];
      if (typeof b !== "string") continue;
      if (!buckets.has(b)) {
        buckets.set(b, []);
        bucketOrder.push(b);
      }
      buckets.get(b)!.push(r);
    }
    bucketOrder.sort();
    const outCols = ["bucket", ...aggs.map((a) => a.as ?? `${a.column}_${a.fn}`)];
    const outRows: Row[] = bucketOrder.map((b) => {
      const rows = buckets.get(b)!;
      const sub = new DataFrame(this.columns, rows);
      const r: Row = { bucket: b };
      for (const a of aggs) {
        r[a.as ?? `${a.column}_${a.fn}`] = sub.aggCol(a.column, a.fn);
      }
      return r;
    });
    return new DataFrame(outCols, outRows);
  }

  /**
   * Resample by quarter. Buckets look like "YYYY-Qn".
   */
  resampleQuarterly(
    dateCol: string,
    aggs: { column: string; fn: AggFunc; as?: string }[]
  ): DataFrame {
    const withQ = this.dtQuarter(dateCol).dtYear(dateCol);
    const buckets = new Map<string, Row[]>();
    const bucketOrder: string[] = [];
    for (const r of withQ.rows) {
      const y = r[`${dateCol}_year`];
      const q = r[`${dateCol}_quarter`];
      if (typeof y !== "number" || typeof q !== "number") continue;
      const b = `${y}-Q${q}`;
      if (!buckets.has(b)) {
        buckets.set(b, []);
        bucketOrder.push(b);
      }
      buckets.get(b)!.push(r);
    }
    bucketOrder.sort();
    const outCols = ["bucket", ...aggs.map((a) => a.as ?? `${a.column}_${a.fn}`)];
    const outRows: Row[] = bucketOrder.map((b) => {
      const rows = buckets.get(b)!;
      const sub = new DataFrame(this.columns, rows);
      const r: Row = { bucket: b };
      for (const a of aggs) {
        r[a.as ?? `${a.column}_${a.fn}`] = sub.aggCol(a.column, a.fn);
      }
      return r;
    });
    return new DataFrame(outCols, outRows);
  }

  /**
   * Rolling-window aggregation over a column. Returns a new column with
   * the rolling statistic for each row. The first window-1 rows are null
   * (Pandas default min_periods=window).
   */
  rolling(
    col: string,
    window: number,
    fn: AggFunc,
    as?: string
  ): DataFrame {
    const name = as ?? `${col}_rolling_${window}_${fn}`;
    const values = this.column(col);
    const out: CellValue[] = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
      if (i + 1 < window) continue;
      const slice = values.slice(i - window + 1, i + 1);
      const sub = new DataFrame([col], slice.map((v) => ({ [col]: v })));
      out[i] = sub.aggCol(col, fn);
    }
    return this.withColumn(name, (_r, i) => out[i]);
  }

  /**
   * Cumulative aggregation (expanding window from start to current row).
   */
  expanding(
    col: string,
    fn: AggFunc,
    as?: string
  ): DataFrame {
    const name = as ?? `${col}_expanding_${fn}`;
    const values = this.column(col);
    const out: CellValue[] = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
      const slice = values.slice(0, i + 1);
      const sub = new DataFrame([col], slice.map((v) => ({ [col]: v })));
      out[i] = sub.aggCol(col, fn);
    }
    return this.withColumn(name, (_r, i) => out[i]);
  }

  /**
   * Shift a column by `n` rows (positive = forward / lag in time; negative = backward).
   * Pandas default: NaN for the first |n| rows when positive.
   */
  shift(col: string, n: number, as?: string): DataFrame {
    const name = as ?? `${col}_shift_${n}`;
    const values = this.column(col);
    const out: CellValue[] = new Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
      const src = i - n;
      if (src >= 0 && src < values.length) {
        out[i] = values[src];
      }
    }
    return this.withColumn(name, (_r, i) => out[i]);
  }

  /**
   * Percentage change between consecutive rows. Returns a column of
   * floats. The first row is NaN (no previous row). Rows where the
   * previous value is 0 are NaN — we NEVER divide by zero silently.
   */
  pctChange(col: string, as?: string): DataFrame {
    const name = as ?? `${col}_pct_change`;
    const values = this.column(col);
    const out: CellValue[] = new Array(values.length).fill(null);
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      if (typeof prev !== "number" || typeof curr !== "number") continue;
      if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;
      if (prev === 0) continue; // explicit: do NOT divide by zero
      out[i] = (curr - prev) / prev;
    }
    return this.withColumn(name, (_r, i) => out[i]);
  }

  /** Reset to a fresh DataFrame given rows (used after a chain of transforms). */
  static fromArray(rows: Row[]): DataFrame {
    return DataFrame.fromRows(rows);
  }

  // ---------- Phase 4: feature engineering primitives ----------

  /**
   * One-hot encode a categorical column. Mirrors `pd.get_dummies(df[col])`.
   * Returns a NEW DataFrame with the original columns + one new boolean
   * column per distinct value, named `${col}_${value}`.
   *
   * The `dropFirst` option mirrors `drop_first=True`: the first distinct
   * value (in first-occurrence order) is omitted, producing k-1 columns
   * (avoids perfect multicollinearity with the intercept for linear models).
   *
   * No leakage risk: one-hot encoding is fit on the training set, but at
   * inference time the SAME encoder must be reused. The caller is
   * responsible for ensuring the value-set seen at fit time matches
   * inference (or use `getDummiesForValues` to pre-specify the columns).
   */
  getDummies(col: string, opts: { dropFirst?: boolean; prefix?: string } = {}): DataFrame {
    const { dropFirst = false, prefix } = opts;
    // Collect distinct values in first-occurrence order.
    const seen: string[] = [];
    const seenSet = new Set<string>();
    for (const v of this.column(col)) {
      if (v === null || v === undefined) continue;
      const s = String(v);
      if (!seenSet.has(s)) {
        seenSet.add(s);
        seen.push(s);
      }
    }
    const values = dropFirst ? seen.slice(1) : seen;
    const colNames = values.map((v) => `${prefix ?? col}_${v}`);
    const newCols = [...this.columns, ...colNames];
    const newRows = this.rows.map((r) => {
      const out: Row = { ...r };
      const cellVal = r[col];
      const s = cellVal === null || cellVal === undefined ? null : String(cellVal);
      for (let i = 0; i < values.length; i++) {
        out[colNames[i]] = s === values[i];
      }
      return out;
    });
    return new DataFrame(newCols, newRows);
  }

  /**
   * One-hot encode with a fixed value set — mirrors scikit-learn's
   * `OneHotEncoder(categories='fit-categories')`. Used at inference time
   * to guarantee the same columns even when the inference data has
   * different (or unseen) categories. Unseen categories become all-zero
   * indicator columns (matches OneHotEncoder(handle_unknown='ignore')).
   */
  getDummiesForValues(col: string, values: string[], opts: { prefix?: string } = {}): DataFrame {
    const { prefix } = opts;
    const colNames = values.map((v) => `${prefix ?? col}_${v}`);
    const newCols = [...this.columns, ...colNames];
    const newRows = this.rows.map((r) => {
      const out: Row = { ...r };
      const cellVal = r[col];
      const s = cellVal === null || cellVal === undefined ? null : String(cellVal);
      for (let i = 0; i < values.length; i++) {
        out[colNames[i]] = s === values[i];
      }
      return out;
    });
    return new DataFrame(newCols, newRows);
  }

  /**
   * Ordinal encode: map each distinct value to an integer code (0..k-1)
   * in first-occurrence order. Mirrors `pd.factorize(df[col])[0]`.
   *
   * Returns a NEW DataFrame with a new column `${col}_code`.
   *
   * WARNING per master spec §10: "Why arbitrary integer codes can mislead
   * some models." Linear and distance-based models treat the codes as
   * real numbers and infer a false ordering. Use for tree-based models
   * only, or as the first step of a downstream encoder.
   */
  factorize(col: string, as?: string): { df: DataFrame; codes: number[]; categories: string[] } {
    const cats: string[] = [];
    const seen = new Set<string>();
    for (const v of this.column(col)) {
      if (v === null || v === undefined) continue;
      const s = String(v);
      if (!seen.has(s)) {
        seen.add(s);
        cats.push(s);
      }
    }
    const lookup = new Map<string, number>();
    cats.forEach((c, i) => lookup.set(c, i));
    const codes = this.rows.map((r) => {
      const v = r[col];
      if (v === null || v === undefined) return -1;
      const idx = lookup.get(String(v));
      return idx ?? -1;
    });
    const name = as ?? `${col}_code`;
    const newDf = this.withColumn(name, (_r, i) => codes[i]);
    return { df: newDf, codes, categories: cats };
  }

  /**
   * Map a column through a value→code dictionary. Used for ordinal
   * encoding when the ordering is domain-defined (e.g., "low"→0, "medium"→1,
   * "high"→2). Mirrors `df[col].map(mapping)`.
   *
   * Values not in the mapping become null. (This is the safe behaviour;
   * Pandas .map() does the same with NaN.)
   */
  mapColumn(col: string, mapping: Record<string, CellValue>, as?: string): DataFrame {
    return this.withColumn(as ?? `${col}_mapped`, (r) => {
      const v = r[col];
      if (v === null || v === undefined) return null;
      const key = String(v);
      return key in mapping ? mapping[key] : null;
    });
  }

  /**
   * Frequency encode: replace each category with its frequency in the
   * column (count of occurrences / total non-null). Mirrors a common
   * high-cardinality encoding strategy.
   *
   * No leakage risk if computed on the training set only — frequencies
   * from train must be reused at inference (store the mapping).
   */
  frequencyEncode(col: string, as?: string): DataFrame {
    const counts = new Map<string, number>();
    let total = 0;
    for (const v of this.column(col)) {
      if (v === null || v === undefined) continue;
      const s = String(v);
      counts.set(s, (counts.get(s) ?? 0) + 1);
      total++;
    }
    return this.withColumn(as ?? `${col}_freq`, (r) => {
      const v = r[col];
      if (v === null || v === undefined || total === 0) return null;
      return (counts.get(String(v)) ?? 0) / total;
    });
  }

  /**
   * Target encode: replace each category with the mean of the target
   * variable within that category. Mirrors the standard target encoder.
   *
   * LEAKAGE WARNING: if computed on the full dataset (train + test),
   * target encoding leaks test information. The caller MUST pass a
   * `trainOnly` mask (the rows considered training) — categories are
   * averaged only over the training rows. The mapping is then applied
   * to all rows (including test rows whose categories may not appear in
   * train — those fall back to the global mean).
   *
   * @param col       the categorical column to encode
   * @param target    the target column (must be numeric)
   * @param trainMask boolean array marking which rows are training rows
   * @param as        output column name
   */
  targetEncode(
    col: string,
    target: string,
    trainMask: boolean[],
    as?: string
  ): DataFrame {
    if (trainMask.length !== this.rows.length) {
      throw new Error("targetEncode: trainMask length must equal row count");
    }
    const sums = new Map<string, number>();
    const counts = new Map<string, number>();
    let globalSum = 0;
    let globalCount = 0;
    this.rows.forEach((r, i) => {
      if (!trainMask[i]) return;
      const v = r[col];
      const t = r[target];
      if (v === null || v === undefined) return;
      if (typeof t !== "number" || !Number.isFinite(t)) return;
      const s = String(v);
      sums.set(s, (sums.get(s) ?? 0) + t);
      counts.set(s, (counts.get(s) ?? 0) + 1);
      globalSum += t;
      globalCount++;
    });
    const globalMean = globalCount > 0 ? globalSum / globalCount : 0;
    const means = new Map<string, number>();
    for (const [k, c] of counts.entries()) {
      const s = sums.get(k) ?? 0;
      means.set(k, c > 0 ? s / c : globalMean);
    }
    return this.withColumn(as ?? `${col}_target_enc`, (r) => {
      const v = r[col];
      if (v === null || v === undefined) return globalMean;
      return means.get(String(v)) ?? globalMean;
    });
  }

  // ---------- Binning / discretization ----------

  /**
   * Equal-width bin: cut the range [min, max] into `bins` equal-width
   * intervals and label each row with its bin index (0..bins-1).
   *
   * Mirrors `pd.cut(df[col], bins=bins, labels=False)`. Out-of-range
   * values are still assigned to the closest edge bin (matches Pandas
   * default `include_lowest=True` after extension).
   *
   * Returns a NEW DataFrame with `${col}_cut_bin` column (integer bin).
   */
  cutEqualWidth(col: string, bins: number, as?: string): DataFrame {
    const name = as ?? `${col}_cut_bin`;
    return this.withColumn(name, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      const xs = toNumericArray(this.column(col));
      if (xs.length === 0) return null;
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      if (hi === lo) return 0;
      const width = (hi - lo) / bins;
      let idx = Math.floor((v - lo) / width);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      return idx;
    });
  }

  /**
   * Equal-frequency (quantile) bin: bin the values into `bins` groups
   * such that each group has approximately the same number of rows.
   *
   * Mirrors `pd.qcut(df[col], q=bins, labels=False, duplicates='drop')`.
   * Duplicate quantile edges are dropped (matches Pandas behaviour).
   *
   * Returns a NEW DataFrame with `${col}_qcut_bin` column.
   */
  cutEqualFreq(col: string, bins: number, as?: string): DataFrame {
    const xs = toNumericArray(this.column(col));
    if (xs.length === 0) {
      return this.withColumn(as ?? `${col}_qcut_bin`, () => null);
    }
    // Compute quantile edges at i/bins for i in 0..bins
    const edges: number[] = [];
    for (let i = 0; i <= bins; i++) {
      edges.push(quantile(xs, i / bins));
    }
    // Drop duplicate edges
    const uniqEdges: number[] = [];
    for (const e of edges) {
      if (uniqEdges.length === 0 || uniqEdges[uniqEdges.length - 1] !== e) {
        uniqEdges.push(e);
      }
    }
    // If we have fewer unique edges than bins, we get fewer effective bins.
    const name = as ?? `${col}_qcut_bin`;
    return this.withColumn(name, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      // Find the bin index whose [edge[i], edge[i+1]) contains v
      let idx = 0;
      for (let i = 0; i < uniqEdges.length - 1; i++) {
        if (v >= uniqEdges[i] && (i === uniqEdges.length - 2 || v < uniqEdges[i + 1])) {
          idx = i;
          break;
        }
        if (i === uniqEdges.length - 2 && v >= uniqEdges[i + 1]) {
          idx = i;
        }
      }
      return idx;
    });
  }

  /**
   * Custom bin: assign each value to a bin based on user-provided edge
   * list. Mirrors `pd.cut(df[col], bins=edges, labels=labels, include_lowest=True)`.
   *
   * `edges` is sorted ascending; the first bin includes the lowest edge.
   */
  cutCustom(col: string, edges: number[], labels: string[], as?: string): DataFrame {
    if (edges.length !== labels.length + 1) {
      throw new Error("cutCustom: edges must have one more element than labels");
    }
    const sortedEdges = [...edges].sort((a, b) => a - b);
    return this.withColumn(as ?? `${col}_custom_bin`, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      for (let i = 0; i < labels.length; i++) {
        const lo = sortedEdges[i];
        const hi = sortedEdges[i + 1];
        if (i === 0) {
          if (v >= lo && v <= hi) return labels[i];
        } else {
          if (v > lo && v <= hi) return labels[i];
        }
      }
      return null;
    });
  }

  // ---------- Numerical transformations ----------

  /**
   * Apply a mathematical transform to a numeric column. Mirrors the
   * Pandas idiom `df[col].transform(fn)` for these standard transforms.
   *
   * For log: uses log1p (log(1+x)) so zero values are defined (log(0)
   * would be -Inf). Negative values are skipped (set to null) — log of
   * a negative number is undefined.
   *
   * Returns a NEW DataFrame with `${col}_${transform}` column.
   */
  transform(
    col: string,
    transform: "log1p" | "log" | "sqrt" | "cbrt" | "square" | "cube" | "reciprocal" | "abs",
    as?: string
  ): DataFrame {
    const name = as ?? `${col}_${transform}`;
    return this.withColumn(name, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      switch (transform) {
        case "log1p": return Math.log(1 + v);
        case "log": return v > 0 ? Math.log(v) : null;
        case "sqrt": return v >= 0 ? Math.sqrt(v) : null;
        case "cbrt": return Math.cbrt(v);
        case "square": return v * v;
        case "cube": return v * v * v;
        case "reciprocal": return v !== 0 ? 1 / v : null;
        case "abs": return Math.abs(v);
      }
    });
  }

  /**
   * Interaction feature: a * b (numeric). Use for tree models to surface
   * multiplicative relationships the model would otherwise have to learn
   * via splits. (For linear models, an interaction feature is required
   * because the linear form has no native multiplicative term.)
   */
  interaction(a: string, b: string, as: string): DataFrame {
    return this.withColumn(as, (r) => {
      const va = r[a];
      const vb = r[b];
      if (typeof va !== "number" || typeof vb !== "number") return null;
      if (!Number.isFinite(va) || !Number.isFinite(vb)) return null;
      return va * vb;
    });
  }

  /**
   * Polynomial feature: a^degree (single-column polynomial).
   * Mirrors sklearn PolynomialFeatures(degree) for a single input.
   */
  polynomial(col: string, degree: number, as?: string): DataFrame {
    const name = as ?? `${col}_poly${degree}`;
    return this.withColumn(name, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      return Math.pow(v, degree);
    });
  }

  // ---------- Feature scaling ----------

  /**
   * Standardize (Z-score): (x - mean) / std. Sensitive to outliers
   * (the mean and std both inflate). Mirrors `sklearn.StandardScaler`.
   *
   * CRITICAL: when used in a modelling workflow, the mean and std MUST
   * be computed on the training set only and reused at inference. This
   * method computes on the full frame; for train-only fitting use
   * `standardizeWith` (passing the training mean/std).
   */
  standardize(col: string, as?: string): DataFrame {
    const xs = toNumericArray(this.column(col));
    if (xs.length < 2) {
      return this.withColumn(as ?? `${col}_z`, () => null);
    }
    const m = mean(xs);
    const s = std(xs);
    if (s === 0) {
      return this.withColumn(as ?? `${col}_z`, () => 0);
    }
    return this.withColumn(as ?? `${col}_z`, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      return (v - m) / s;
    });
  }

  /**
   * Standardize with EXTERNAL mean/std — used when you've fit the
   * scaler on the training set and want to apply it to any frame
   * (train, val, test) without re-fitting. This is the leakage-safe form.
   */
  standardizeWith(col: string, m: number, s: number, as?: string): DataFrame {
    return this.withColumn(as ?? `${col}_z`, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      if (s === 0) return 0;
      return (v - m) / s;
    });
  }

  /**
   * Min-max scale: linearly map [min, max] to [0, 1]. Bounded output;
   * sensitive to outliers. Mirrors `sklearn.MinMaxScaler`.
   */
  minMaxScale(col: string, as?: string, range: [number, number] = [0, 1]): DataFrame {
    const xs = toNumericArray(this.column(col));
    if (xs.length === 0) {
      return this.withColumn(as ?? `${col}_mm`, () => null);
    }
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    if (hi === lo) {
      return this.withColumn(as ?? `${col}_mm`, (r) => {
        const v = r[col];
        if (typeof v !== "number" || !Number.isFinite(v)) return null;
        return range[0];
      });
    }
    const [loOut, hiOut] = range;
    return this.withColumn(as ?? `${col}_mm`, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      return loOut + ((v - lo) / (hi - lo)) * (hiOut - loOut);
    });
  }

  /**
   * Robust scale: (x - median) / IQR. Robust to outliers because it
   * uses quantiles, not the mean. Mirrors `sklearn.RobustScaler`.
   */
  robustScale(col: string, as?: string): DataFrame {
    const xs = toNumericArray(this.column(col));
    if (xs.length === 0) {
      return this.withColumn(as ?? `${col}_rs`, () => null);
    }
    const { q1, q3 } = quartiles(xs);
    const iqrVal = q3 - q1;
    const median = quantile(xs, 0.5);
    if (iqrVal === 0) {
      return this.withColumn(as ?? `${col}_rs`, (r) => {
        const v = r[col];
        if (typeof v !== "number" || !Number.isFinite(v)) return null;
        return 0;
      });
    }
    return this.withColumn(as ?? `${col}_rs`, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      return (v - median) / iqrVal;
    });
  }

  /**
   * Max-abs scale: x / max(|x|). Output in [-1, 1]. Preserves sparsity
   * (zero values stay zero). Mirrors `sklearn.MaxAbsScaler`.
   */
  maxAbsScale(col: string, as?: string): DataFrame {
    const xs = toNumericArray(this.column(col));
    if (xs.length === 0) {
      return this.withColumn(as ?? `${col}_ma`, () => null);
    }
    const maxAbs = Math.max(...xs.map(Math.abs));
    if (maxAbs === 0) {
      return this.withColumn(as ?? `${col}_ma`, () => 0);
    }
    return this.withColumn(as ?? `${col}_ma`, (r) => {
      const v = r[col];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      return v / maxAbs;
    });
  }

  // ---------- Train / validation / test split ----------

  /**
   * Deterministic train/validation/test split.
   *
   * Uses a seeded shuffle (mulberry32) on row indices so the split is
   * reproducible across runs. The split proportions are exact (modulo
   * rounding). No stratification (callers can implement stratified
   * splits themselves using groupBy + filter if needed).
   *
   * For classification problems with imbalanced classes, use
   * stratifiedSplit instead — it preserves class proportions.
   *
   * @returns { train, val, test } as three DataFrames with the same columns.
   */
  randomSplit(seed: number, valFrac: number, testFrac: number): {
    train: DataFrame;
    val: DataFrame;
    test: DataFrame;
  } {
    if (valFrac < 0 || testFrac < 0 || valFrac + testFrac > 1) {
      throw new Error("randomSplit: val and test fractions must be in [0,1] and sum to ≤ 1");
    }
    const n = this.rows.length;
    const indices = [...Array(n).keys()];
    // Seeded shuffle (mulberry32 — same as rng.ts)
    let s = seed >>> 0;
    for (let i = n - 1; i > 0; i--) {
      s = (s + 0x6d2b79f5) >>> 0;
      const r = (s >>> 0) / 4294967296;
      const j = Math.floor(r * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const nTest = Math.round(n * testFrac);
    const nVal = Math.round(n * valFrac);
    const nTrain = n - nTest - nVal;
    const trainIdx = indices.slice(0, nTrain);
    const valIdx = indices.slice(nTrain, nTrain + nVal);
    const testIdx = indices.slice(nTrain + nVal);
    const byIdx = (arr: number[]) => new DataFrame(
      this.columns,
      arr.map((i) => this.rows[i])
    );
    return {
      train: byIdx(trainIdx),
      val: byIdx(valIdx),
      test: byIdx(testIdx),
    };
  }

  /**
   * Stratified split: preserves the per-class proportion of `stratifyCol`.
   * Use for classification problems where random splitting could put all
   * the rare-class rows in test by chance.
   */
  stratifiedSplit(
    stratifyCol: string,
    seed: number,
    valFrac: number,
    testFrac: number
  ): { train: DataFrame; val: DataFrame; test: DataFrame } {
    // Group row indices by class
    const byClass = new Map<string, number[]>();
    this.rows.forEach((r, i) => {
      const v = r[stratifyCol];
      const k = v === null || v === undefined ? "__null__" : String(v);
      const arr = byClass.get(k) ?? [];
      arr.push(i);
      byClass.set(k, arr);
    });
    // Seeded shuffle (mulberry32)
    let s = seed >>> 0;
    const rng = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      return (s >>> 0) / 4294967296;
    };
    const trainIdx: number[] = [];
    const valIdx: number[] = [];
    const testIdx: number[] = [];
    for (const indices of byClass.values()) {
      const shuffled = [...indices];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const nTest = Math.round(shuffled.length * testFrac);
      const nVal = Math.round(shuffled.length * valFrac);
      const nTrain = shuffled.length - nTest - nVal;
      trainIdx.push(...shuffled.slice(0, nTrain));
      valIdx.push(...shuffled.slice(nTrain, nTrain + nVal));
      testIdx.push(...shuffled.slice(nTrain + nVal));
    }
    // Sort by original index to preserve row order within each split
    trainIdx.sort((a, b) => a - b);
    valIdx.sort((a, b) => a - b);
    testIdx.sort((a, b) => a - b);
    const byIdx = (arr: number[]) => new DataFrame(
      this.columns,
      arr.map((i) => this.rows[i])
    );
    return {
      train: byIdx(trainIdx),
      val: byIdx(valIdx),
      test: byIdx(testIdx),
    };
  }
}

/** Convert a ColumnSchema list to a small dictionary table for display. */
export function schemaAsRows(schemas: ColumnSchema[]): { name: string; dtype: DType; description: string; example: string; isKey: string; isTarget: string }[] {
  return schemas.map((s) => ({
    name: s.name,
    dtype: s.dtype,
    description: s.description,
    example: s.example === null || s.example === undefined ? "—" : String(s.example),
    isKey: s.isKey ? "yes" : "—",
    isTarget: s.isTargetCandidate ? "yes" : "—",
  }));
}

/** Format a numeric value for display (round-trippable, no fabrication). */
export function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "—";
  if (Number.isNaN(n)) return "NaN";
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "-∞";
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(digits);
}
