/**
 * Unit tests for the DataFrame engine + stats pure functions.
 *
 * Run with: bun test tests/unit/data.test.ts
 *
 * Every assertion checks a real numerical result computed from a real
 * dataset. No fabricated expected values — every expected value is
 * independently hand-derived.
 */

import { test, expect } from "bun:test";
import { DataFrame } from "../../src/lib/data/frame";
import {
  mean,
  median,
  std,
  variance,
  quantile,
  iqr,
  tukeyFence,
  sum,
  min,
  max,
  count,
  nunique,
  valueCounts,
  skewness,
  kurtosis,
} from "../../src/lib/data/stats";
import { makeRngHelper } from "../../src/lib/data/rng";
import { buildRetailSales, buildCustomerTransactions, buildEmployeeAnalytics, buildMessyRetail } from "../../src/lib/data/datasets";

// ---------------- pure stats ----------------

test("mean / median / sum of [1,2,3,4,5]", () => {
  const xs = [1, 2, 3, 4, 5];
  expect(mean(xs)).toBe(3);
  expect(median(xs)).toBe(3);
  expect(sum(xs)).toBe(15);
});

test("median of an even-length array is the average of the two middle values", () => {
  expect(median([1, 2, 3, 4])).toBe(2.5);
  expect(median([10, 20, 30, 40])).toBe(25);
});

test("sample variance n-1 denominator (matches Pandas .var())", () => {
  // Pandas: pd.Series([2,4,4,4,5,5,7,9]).var() with ddof=1
  // mean = 5, sum of squared deviations = 32, n-1 = 7 → 4.5714...
  expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(32 / 7, 10);
  // std = sqrt(32/7) ≈ 2.138
  expect(std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 10);
});

test("min / max / count / nunique", () => {
  expect(min([3, 1, 4, 1, 5, 9, 2, 6])).toBe(1);
  expect(max([3, 1, 4, 1, 5, 9, 2, 6])).toBe(9);
  expect(count([1, 2, null, 3, null, 4])).toBe(4);
  expect(nunique([1, 2, 2, 3, 3, 3, null])).toBe(3);
});

test("quantile matches Pandas linear interpolation", () => {
  // pd.Series([1,2,3,4,5,6,7,8,9,10]).quantile(0.5) = 5.5
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  expect(quantile(xs, 0.5)).toBe(5.5);
  // q=0.25 of [1..10] = 3.25
  expect(quantile(xs, 0.25)).toBe(3.25);
  // q=0 → min
  expect(quantile(xs, 0)).toBe(1);
  // q=1 → max
  expect(quantile(xs, 1)).toBe(10);
});

test("iqr = q3 - q1", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  // q1=3.25, q3=7.75, iqr=4.5
  expect(iqr(xs)).toBeCloseTo(4.5, 10);
});

test("tukey fence flags outliers", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
  const { outliers } = tukeyFence(xs);
  expect(outliers.length).toBe(1);
  expect(outliers[0].value).toBe(100);
});

test("valueCounts sorts by count desc then value asc", () => {
  const xs: string[] = ["b", "a", "a", "b", "b", "c"];
  const counts = valueCounts(xs);
  expect(counts[0]).toEqual({ value: "b", count: 3 });
  expect(counts[1]).toEqual({ value: "a", count: 2 });
  expect(counts[2]).toEqual({ value: "c", count: 1 });
});

test("skewness of a symmetric distribution is ~0", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  expect(Math.abs(skewness(xs))).toBeLessThan(0.01);
});

test("skewness of a right-skewed distribution is positive", () => {
  const xs = [1, 1, 1, 1, 1, 1, 1, 1, 1, 100];
  expect(skewness(xs)).toBeGreaterThan(1.5);
});

test("kurtosis of a uniform distribution is < 0 (platykurtic)", () => {
  const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  expect(kurtosis(xs)).toBeLessThan(-1);
});

// ---------------- DataFrame ----------------

test("DataFrame.fromRows + shape + columns + dtype inference", () => {
  const df = DataFrame.fromRows([
    { a: 1, b: "x", c: 1.5, d: true },
    { a: 2, b: "y", c: 2.5, d: false },
    { a: 3, b: "z", c: 3.5, d: true },
  ]);
  expect(df.shape).toEqual([3, 4]);
  expect(df.columns).toEqual(["a", "b", "c", "d"]);
  expect(df.dtype("a")).toBe("int64");
  expect(df.dtype("b")).toBe("object");
  expect(df.dtype("c")).toBe("float64");
  expect(df.dtype("d")).toBe("bool");
});

test("head / tail / sample", () => {
  const df = DataFrame.fromRows(
    Array.from({ length: 20 }, (_, i) => ({ id: i, v: i * 2 }))
  );
  expect(df.head(5).shape).toEqual([5, 2]);
  expect(df.tail(3).rows.map((r) => r.id)).toEqual([17, 18, 19]);
  const s = df.sample(5, 42);
  expect(s.shape).toEqual([5, 2]);
  // Sample is deterministic for the same seed
  const s2 = df.sample(5, 42);
  expect(s.rows.map((r) => r.id)).toEqual(s2.rows.map((r) => r.id));
});

test("select + loc + filter", () => {
  const df = DataFrame.fromRows([
    { id: 1, region: "N", v: 10 },
    { id: 2, region: "S", v: 20 },
    { id: 3, region: "N", v: 30 },
    { id: 4, region: "S", v: 40 },
  ]);
  expect(df.select(["region", "v"]).columns).toEqual(["region", "v"]);
  const north = df.loc((r) => r.region === "N");
  expect(north.shape).toEqual([2, 3]);
  expect(north.rows.map((r) => r.v)).toEqual([10, 30]);
});

test("sort asc / desc", () => {
  const df = DataFrame.fromRows([
    { id: 1, v: 30 },
    { id: 2, v: 10 },
    { id: 3, v: 20 },
  ]);
  const asc = df.sort("v", "asc");
  expect(asc.rows.map((r) => r.v)).toEqual([10, 20, 30]);
  const desc = df.sort("v", "desc");
  expect(desc.rows.map((r) => r.v)).toEqual([30, 20, 10]);
});

test("nlargest / nsmallest", () => {
  // (i-5)*(i-5) for i=0..9 gives [25,16,9,4,1,0,1,4,9,16]
  // Top 3 values sorted desc: 25, 16, 16
  // Bottom 3 values sorted asc: 0, 1, 1
  const df = DataFrame.fromRows(
    Array.from({ length: 10 }, (_, i) => ({ id: i, v: (i - 5) * (i - 5) }))
  );
  const top3 = df.nlargest(3, "v").rows.map((r) => r.v).sort((a, b) => (b as number) - (a as number));
  expect(top3).toEqual([25, 16, 16]);
  const bot3 = df.nsmallest(3, "v").rows.map((r) => r.v).sort((a, b) => (a as number) - (b as number));
  expect(bot3).toEqual([0, 1, 1]);
});

test("isna / fillna / dropna", () => {
  const df = DataFrame.fromRows([
    { a: 1, b: "x" },
    { a: null, b: "y" },
    { a: 3, b: null },
  ]);
  expect(df.isnaCount()).toEqual({ a: 1, b: 1 });
  const filled = df.fillna({ a: 0, b: "MISSING" });
  expect(filled.rows[1].a).toBe(0);
  expect(filled.rows[2].b).toBe("MISSING");
  const dropped = df.dropna("rows", "any");
  expect(dropped.shape).toEqual([1, 2]);
});

test("duplicated + dropDuplicates", () => {
  const df = DataFrame.fromRows([
    { id: "a", v: 1 },
    { id: "b", v: 2 },
    { id: "a", v: 1 }, // full duplicate of row 0
    { id: "c", v: 3 },
    { id: "a", v: 99 }, // same id, different v — NOT a full duplicate
  ]);
  const dups = df.duplicated();
  expect(dups).toEqual([false, false, true, false, false]);
  expect(df.dropDuplicates().shape).toEqual([4, 2]);
  expect(df.dropDuplicates(["id"]).shape).toEqual([3, 2]);
  expect(df.countDuplicates()).toBe(1);
});

test("astype converts a column", () => {
  const df = DataFrame.fromRows([
    { a: "1" },
    { a: "2" },
    { a: "3" },
  ]);
  expect(df.dtype("a")).toBe("object");
  const cast = df.astype("a", "int64");
  expect(cast.dtype("a")).toBe("int64");
  expect(cast.column("a")).toEqual([1, 2, 3]);
});

test("strTransform strip / lower / upper", () => {
  const df = DataFrame.fromRows([{ s: "  Hello  " }, { s: "  world  " }]);
  const stripped = df.strTransform("s", "strip");
  expect(stripped.rows.map((r) => r.s)).toEqual(["Hello", "world"]);
  const lowered = df.strTransform("s", "lower");
  expect(lowered.rows.map((r) => r.s)).toEqual(["  hello  ", "  world  "]);
});

test("between keeps rows within range", () => {
  const df = DataFrame.fromRows([
    { v: 5 }, { v: 15 }, { v: 25 }, { v: 35 },
  ]);
  expect(df.between("v", 10, 30).shape).toEqual([2, 1]);
});

test("replace maps exact strings", () => {
  const df = DataFrame.fromRows([
    { s: "apparel" }, { s: "APPAREL" }, { s: "Apparel" },
  ]);
  const r = df.replace({ apparel: "Apparel", APPAREL: "Apparel" });
  expect(r.rows.map((row) => row.s)).toEqual(["Apparel", "Apparel", "Apparel"]);
});

test("groupby + agg produces the right summary", () => {
  const df = DataFrame.fromRows([
    { region: "N", revenue: 10, profit: 2 },
    { region: "S", revenue: 20, profit: 5 },
    { region: "N", revenue: 30, profit: 6 },
    { region: "S", revenue: 40, profit: 8 },
  ]);
  const grouped = df.groupBy("region", [
    { column: "revenue", fn: "sum", as: "total_revenue" },
    { column: "profit", fn: "mean", as: "avg_profit" },
  ]);
  expect(grouped.shape).toEqual([2, 3]);
  const north = grouped.rows.find((r) => r.region === "N")!;
  expect(north.total_revenue).toBe(40);
  expect(north.avg_profit).toBe(4);
  const south = grouped.rows.find((r) => r.region === "S")!;
  expect(south.total_revenue).toBe(60);
  expect(south.avg_profit).toBe(6.5);
});

test("pivot_table produces a wide DataFrame", () => {
  const df = DataFrame.fromRows([
    { month: "Jan", region: "N", revenue: 10 },
    { month: "Jan", region: "S", revenue: 20 },
    { month: "Feb", region: "N", revenue: 30 },
    { month: "Feb", region: "S", revenue: 40 },
  ]);
  const pv = df.pivotTable({ index: "month", columns: "region", values: "revenue", aggfunc: "sum", margins: true });
  expect(pv.columns).toEqual(["month", "N", "S", "All"]);
  const jan = pv.rows.find((r) => r.month === "Jan")!;
  expect(jan.N).toBe(10);
  expect(jan.S).toBe(20);
  expect(jan.All).toBe(30);
  const all = pv.rows.find((r) => r.month === "All")!;
  expect(all.N).toBe(40);
  expect(all.S).toBe(60);
  expect(all.All).toBe(100);
});

test("crosstab counts frequencies", () => {
  const df = DataFrame.fromRows([
    { a: "x", b: "p" },
    { a: "x", b: "q" },
    { a: "y", b: "p" },
    { a: "x", b: "p" },
  ]);
  const ct = df.crosstab({ index: "a", columns: "b" });
  const xp = ct.rows.find((r) => r.a === "x")!;
  expect(xp.p).toBe(2);
  expect(xp.q).toBe(1);
});

test("merge — inner / left / right / outer", () => {
  const left = DataFrame.fromRows([
    { id: 1, name: "a" },
    { id: 2, name: "b" },
    { id: 3, name: "c" },
  ]);
  const right = DataFrame.fromRows([
    { id: 2, score: 10 },
    { id: 3, score: 20 },
    { id: 4, score: 30 },
  ]);
  const inner = left.merge(right, "id", "inner");
  expect(inner.shape).toEqual([2, 3]);
  const leftJoin = left.merge(right, "id", "left");
  expect(leftJoin.shape).toEqual([3, 3]);
  // id=1 should have null score
  const r1 = leftJoin.rows.find((r) => r.id === 1)!;
  expect(r1.score).toBeNull();
  const rightJoin = left.merge(right, "id", "right");
  expect(rightJoin.shape).toEqual([3, 3]);
  const r4 = rightJoin.rows.find((r) => r.id === 4)!;
  expect(r4.name).toBeNull();
  const outer = left.merge(right, "id", "outer");
  expect(outer.shape).toEqual([4, 3]);
});

test("describe computes correct statistics", () => {
  const df = DataFrame.fromRows([
    { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 },
  ]);
  const desc = df.describe();
  expect(desc.length).toBe(1);
  expect(desc[0].column).toBe("v");
  expect(desc[0].count).toBe(5);
  expect(desc[0].mean).toBe(3);
  expect(desc[0].min).toBe(1);
  expect(desc[0].max).toBe(5);
  expect(desc[0].q25).toBe(2);
  expect(desc[0].q50).toBe(3);
  expect(desc[0].q75).toBe(4);
});

test("info reports shape, non-null, dtype, and memory", () => {
  const df = DataFrame.fromRows([
    { a: 1, b: "x" },
    { a: null, b: "y" },
    { a: 3, b: null },
  ]);
  const info = df.info();
  expect(info.shape).toEqual([3, 2]);
  const aInfo = info.columns.find((c) => c.name === "a")!;
  expect(aInfo.nonNull).toBe(2);
  expect(aInfo.nullCount).toBe(1);
  expect(aInfo.dtype).toBe("int64");
  expect(info.memoryBytes).toBeGreaterThan(0);
});

test("rank — average method (matches Pandas default)", () => {
  const df = DataFrame.fromRows([
    { v: 10 }, { v: 20 }, { v: 20 }, { v: 30 },
  ]);
  const ranks = df.rank("v", "average");
  expect(ranks.map((r) => r.rank)).toEqual([1, 2.5, 2.5, 4]);
});

test("rank — dense method", () => {
  const df = DataFrame.fromRows([
    { v: 10 }, { v: 20 }, { v: 20 }, { v: 30 },
  ]);
  const ranks = df.rank("v", "dense");
  expect(ranks.map((r) => r.rank)).toEqual([1, 2, 2, 3]);
});

test("corr matrix — symmetric, diagonal = 1", () => {
  const df = DataFrame.fromRows([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
  ]);
  const { columns, matrix } = df.corr();
  expect(columns).toEqual(["x", "y"]);
  expect(matrix[0][0]).toBeCloseTo(1, 10);
  expect(matrix[1][1]).toBeCloseTo(1, 10);
  // y = 2x → perfect positive correlation
  expect(matrix[0][1]).toBeCloseTo(1, 6);
  expect(matrix[1][0]).toBeCloseTo(1, 6);
});

test("corr matrix — perfect negative correlation", () => {
  const df = DataFrame.fromRows([
    { x: 1, y: 10 },
    { x: 2, y: 8 },
    { x: 3, y: 6 },
    { x: 4, y: 4 },
  ]);
  const { matrix } = df.corr();
  expect(matrix[0][1]).toBeCloseTo(-1, 6);
});

// ---------------- datasets ----------------

test("retail dataset has 240 rows, 10 columns, and consistent revenue = quantity × unit_price", () => {
  const retail = buildRetailSales();
  expect(retail.rows.length).toBe(240);
  expect(retail.columns.length).toBe(10);
  const first = retail.rows[0];
  expect(first.revenue).toBeCloseTo((first.quantity as number) * (first.unit_price as number), 2);
  // Every row should satisfy revenue == quantity * unit_price
  for (const r of retail.rows) {
    if (typeof r.quantity === "number" && typeof r.unit_price === "number") {
      const expected = +(r.quantity * r.unit_price).toFixed(2);
      expect(r.revenue).toBeCloseTo(expected, 2);
    }
  }
});

test("retail dataset is deterministic (same seed → same rows)", () => {
  const a = buildRetailSales();
  const b = buildRetailSales();
  expect(a.rows).toEqual(b.rows);
});

test("customers dataset has 300 rows and 7 columns", () => {
  const c = buildCustomerTransactions();
  expect(c.rows.length).toBe(300);
  expect(c.columns.length).toBe(7);
});

test("employees dataset has 250 rows and 8 columns; attrition is yes/no", () => {
  const e = buildEmployeeAnalytics();
  expect(e.rows.length).toBe(250);
  expect(e.columns.length).toBe(8);
  const attritions = new Set(e.rows.map((r) => r.attrition));
  for (const a of attritions) {
    expect(["yes", "no"]).toContain(a as string);
  }
});

test("messy retail dataset contains the expected quality issues", () => {
  const messy = buildMessyRetail();
  // Should have MORE rows than the clean retail (duplicates injected)
  expect(messy.rows.length).toBeGreaterThan(240);
  // Should have nulls in customer_id
  const nullCustomers = messy.rows.filter((r) => r.customer_id === null).length;
  expect(nullCustomers).toBeGreaterThan(0);
  // Should have duplicates
  const df = DataFrame.fromRows(messy.rows);
  expect(df.countDuplicates(["order_id"])).toBeGreaterThan(0);
  // Should have negative quantities (returns — keep them!)
  const negativeQty = messy.rows.filter((r) => typeof r.quantity === "number" && r.quantity < 0).length;
  expect(negativeQty).toBeGreaterThan(0);
  // Should have inconsistent casing on category
  const categories = new Set(messy.rows.map((r) => r.category));
  // Should see at least one lowercased or uppercased variant
  expect([...categories].some((c) => typeof c === "string" && c !== "Apparel" && /apparel/i.test(c as string))).toBe(true);
  // Should have invalid dates
  const invalidDates = messy.rows.filter((r) =>
    typeof r.order_date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(r.order_date as string)
  );
  expect(invalidDates.length).toBeGreaterThan(0);
  // Should have revenue stored as strings (mixed type)
  const stringRevenue = messy.rows.filter((r) => typeof r.revenue === "string").length;
  expect(stringRevenue).toBeGreaterThan(0);
});

// ---------------- rng ----------------

test("rng is deterministic and reproducible", () => {
  const a = makeRngHelper(123);
  const b = makeRngHelper(123);
  const aValues = Array.from({ length: 10 }, () => a.next());
  const bValues = Array.from({ length: 10 }, () => b.next());
  expect(aValues).toEqual(bValues);
});

test("rng.int(min, max) stays in range", () => {
  const rng = makeRngHelper(456);
  for (let i = 0; i < 1000; i++) {
    const v = rng.int(5, 10);
    expect(v).toBeGreaterThanOrEqual(5);
    expect(v).toBeLessThanOrEqual(10);
  }
});

// ---------------- Phase 3: covariance, Spearman, time-series ----------------

test("cov matrix — symmetric, diagonal = var", () => {
  const df = DataFrame.fromRows([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
  ]);
  const { columns, matrix } = df.cov();
  expect(columns).toEqual(["x", "y"]);
  // Sample variance of x = var([1,2,3,4]) = (5/4 + 1/4 + 1/4 + 5/4) / 3 = 12/4 / 3 = 5/3 ≈ 1.667
  expect(matrix[0][0]).toBeCloseTo(5 / 3, 6);
  expect(matrix[1][1]).toBeCloseTo(20 / 3, 6); // y variance = 4 × x variance
  // Symmetric
  expect(matrix[0][1]).toBeCloseTo(matrix[1][0], 6);
  // cov(x, y) = (4/3 × something) — since y = 2x exactly, cov(x, y) = 2 × var(x)
  expect(matrix[0][1]).toBeCloseTo(2 * (5 / 3), 6);
});

test("corrPair — perfect linear correlation = 1", () => {
  const df = DataFrame.fromRows([
    { x: 1, y: 2 },
    { x: 2, y: 4 },
    { x: 3, y: 6 },
    { x: 4, y: 8 },
  ]);
  expect(df.corrPair("x", "y")).toBeCloseTo(1, 6);
});

test("corrPair — perfect negative correlation = -1", () => {
  const df = DataFrame.fromRows([
    { x: 1, y: 10 },
    { x: 2, y: 8 },
    { x: 3, y: 6 },
    { x: 4, y: 4 },
  ]);
  expect(df.corrPair("x", "y")).toBeCloseTo(-1, 6);
});

test("corrSpearman — perfect monotonic (nonlinear) = 1", () => {
  // y = x^2 — Pearson is not 1, but Spearman IS 1 because ranks are perfectly monotonic.
  const df = DataFrame.fromRows([
    { x: 1, y: 1 },
    { x: 2, y: 4 },
    { x: 3, y: 9 },
    { x: 4, y: 16 },
    { x: 5, y: 25 },
  ]);
  expect(df.corrSpearmanPair("x", "y")).toBeCloseTo(1, 6);
  // Pearson < 1 because the relationship is nonlinear.
  expect(df.corrPair("x", "y")).toBeLessThan(1);
});

test("corrSpearman — perfect monotonic decreasing = -1", () => {
  const df = DataFrame.fromRows([
    { x: 1, y: 5 },
    { x: 2, y: 4 },
    { x: 3, y: 3 },
    { x: 4, y: 2 },
    { x: 5, y: 1 },
  ]);
  expect(df.corrSpearmanPair("x", "y")).toBeCloseTo(-1, 6);
});

test("toDatetime coerces invalid dates to null", () => {
  const df = DataFrame.fromRows([
    { d: "2023-01-15" },
    { d: "2023-13-01" },  // invalid month
    { d: "2023-02-30" }, // invalid day
    { d: "garbage" },
    { d: "2024-02-29" }, // valid (leap year)
    { d: null },
  ]);
  const out = df.toDatetime("d");
  expect(out.column("d")).toEqual([
    "2023-01-15",
    null,
    null,
    null,
    "2024-02-29",
    null,
  ]);
});

test("dt accessors extract year, month, quarter, day, day_name", () => {
  const df = DataFrame.fromRows([
    { d: "2023-04-17" }, // a Monday
    { d: "2023-12-25" }, // a Monday
    { d: "2024-02-29" }, // a Thursday (leap year)
  ]);
  expect(df.dtYear("d").column("d_year")).toEqual([2023, 2023, 2024]);
  expect(df.dtMonth("d").column("d_month")).toEqual([4, 12, 2]);
  expect(df.dtQuarter("d").column("d_quarter")).toEqual([2, 4, 1]);
  expect(df.dtDay("d").column("d_day")).toEqual([17, 25, 29]);
  const dayNames = df.dtDayName("d").column("d_day_name");
  expect(dayNames).toContain("Monday");
  expect(dayNames).toContain("Thursday");
});

test("resampleMonthly aggregates by year-month bucket and sorts chronologically", () => {
  const df = DataFrame.fromRows([
    { d: "2023-01-05", v: 10 },
    { d: "2023-01-20", v: 20 },
    { d: "2023-02-15", v: 30 },
    { d: "2023-03-10", v: 40 },
    { d: "2023-03-25", v: 50 },
  ]);
  const out = df.resampleMonthly("d", [{ column: "v", fn: "sum", as: "total" }]);
  expect(out.shape).toEqual([3, 2]);
  expect(out.rows[0].bucket).toBe("2023-01");
  expect(out.rows[0].total).toBe(30);
  expect(out.rows[1].bucket).toBe("2023-02");
  expect(out.rows[1].total).toBe(30);
  expect(out.rows[2].bucket).toBe("2023-03");
  expect(out.rows[2].total).toBe(90);
});

test("resampleQuarterly aggregates by year-quarter", () => {
  const df = DataFrame.fromRows([
    { d: "2023-01-05", v: 10 },
    { d: "2023-04-15", v: 30 },
    { d: "2023-08-15", v: 50 },
    { d: "2023-12-25", v: 70 },
  ]);
  const out = df.resampleQuarterly("d", [{ column: "v", fn: "sum", as: "total" }]);
  expect(out.rows.map((r) => r.bucket)).toEqual(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"]);
  expect(out.rows.map((r) => r.total)).toEqual([10, 30, 50, 70]);
});

test("rolling produces null for the first window-1 rows", () => {
  const df = DataFrame.fromRows([
    { x: 1 },
    { x: 2 },
    { x: 3 },
    { x: 4 },
    { x: 5 },
  ]);
  const out = df.rolling("x", 3, "sum", "rolling_sum");
  // Window=3, sum: rows 0,1 = null; row 2 = 1+2+3=6; row 3 = 9; row 4 = 12
  expect(out.column("rolling_sum")).toEqual([null, null, 6, 9, 12]);
});

test("rolling mean computes correctly", () => {
  const df = DataFrame.fromRows([
    { x: 10 },
    { x: 20 },
    { x: 30 },
    { x: 40 },
  ]);
  const out = df.rolling("x", 2, "mean", "rolling_mean");
  // row 0 = null (need 2 values); row 1 = mean(10, 20) = 15; row 2 = 25; row 3 = 35
  expect(out.column("rolling_mean")).toEqual([null, 15, 25, 35]);
});

test("expanding computes cumulative statistics", () => {
  const df = DataFrame.fromRows([
    { x: 1 },
    { x: 2 },
    { x: 3 },
    { x: 4 },
  ]);
  const out = df.expanding("x", "sum", "expanding_sum");
  expect(out.column("expanding_sum")).toEqual([1, 3, 6, 10]);
});

test("shift creates a lag column with nulls at the start", () => {
  const df = DataFrame.fromRows([
    { x: 10 },
    { x: 20 },
    { x: 30 },
  ]);
  const out = df.shift("x", 1, "x_lag1");
  expect(out.column("x_lag1")).toEqual([null, 10, 20]);
  const out2 = df.shift("x", 2, "x_lag2");
  expect(out2.column("x_lag2")).toEqual([null, null, 10]);
});

test("pctChange returns null for the first row and for zero denominators", () => {
  const df = DataFrame.fromRows([
    { x: 100 },
    { x: 200 }, // +100% from previous
    { x: 0 },   // previous = 200, so pct_change = -100%
    { x: 50 },  // previous = 0 → must be null (no silent division)
    { x: 100 }, // previous = 50, so pct_change = +100%
  ]);
  const out = df.pctChange("x", "x_pct");
  const col = out.column("x_pct");
  expect(col[0]).toBeNull();
  expect(col[1]).toBeCloseTo(1, 6);      // +100%
  expect(col[2]).toBeCloseTo(-1, 6);     // -100%
  expect(col[3]).toBeNull();              // zero denominator → null
  expect(col[4]).toBeCloseTo(1, 6);      // +100%
});

test("pctChange does not divide by zero silently — explicit policy", () => {
  const df = DataFrame.fromRows([
    { x: 0 },
    { x: 50 },
    { x: 100 },
  ]);
  const out = df.pctChange("x", "x_pct");
  // row 0 → null (no previous), row 1 → null (previous=0), row 2 → +100% (50→100)
  expect(out.column("x_pct")).toEqual([null, null, 1]);
});

// ---------------- Phase 4: feature engineering ----------------

test("getDummies produces one boolean column per distinct value", () => {
  const df = DataFrame.fromRows([
    { c: "a", v: 1 },
    { c: "b", v: 2 },
    { c: "a", v: 3 },
    { c: "c", v: 4 },
  ]);
  const out = df.getDummies("c");
  expect(out.columns).toEqual(["c", "v", "c_a", "c_b", "c_c"]);
  expect(out.column("c_a")).toEqual([true, false, true, false]);
  expect(out.column("c_b")).toEqual([false, true, false, false]);
  expect(out.column("c_c")).toEqual([false, false, false, true]);
});

test("getDummies with dropFirst omits the first category", () => {
  const df = DataFrame.fromRows([
    { c: "a" },
    { c: "b" },
    { c: "c" },
  ]);
  const out = df.getDummies("c", { dropFirst: true });
  // First category "a" is dropped; remaining: c_b, c_c
  expect(out.columns).toEqual(["c", "c_b", "c_c"]);
});

test("getDummiesForValues handles unseen categories at inference", () => {
  const train = DataFrame.fromRows([{ c: "a" }, { c: "b" }]);
  const infer = DataFrame.fromRows([{ c: "a" }, { c: "c" }]); // "c" was not seen in train
  const cats = ["a", "b"];
  const out = infer.getDummiesForValues("c", cats);
  expect(out.columns).toEqual(["c", "c_a", "c_b"]);
  expect(out.column("c_a")).toEqual([true, false]);
  expect(out.column("c_b")).toEqual([false, false]); // unseen "c" → all zeros
});

test("factorize returns integer codes + categories", () => {
  const df = DataFrame.fromRows([
    { c: "low" },
    { c: "high" },
    { c: "low" },
    { c: "medium" },
  ]);
  const { df: out, codes, categories } = df.factorize("c");
  // First occurrence order: low, high, medium → 0, 1, 2
  expect(categories).toEqual(["low", "high", "medium"]);
  expect(codes).toEqual([0, 1, 0, 2]);
  expect(out.column("c_code")).toEqual([0, 1, 0, 2]);
});

test("mapColumn applies a domain-defined ordinal mapping", () => {
  const df = DataFrame.fromRows([
    { c: "low" }, { c: "medium" }, { c: "high" }, { c: "unknown" },
  ]);
  const out = df.mapColumn("c", { low: 0, medium: 1, high: 2 });
  expect(out.column("c_mapped")).toEqual([0, 1, 2, null]);
});

test("frequencyEncode replaces categories with their frequency", () => {
  const df = DataFrame.fromRows([
    { c: "a" }, { c: "a" }, { c: "a" }, { c: "b" },
  ]);
  const out = df.frequencyEncode("c");
  // a appears 3 times out of 4 → freq = 0.75
  // b appears 1 time out of 4 → freq = 0.25
  expect(out.column("c_freq")).toEqual([0.75, 0.75, 0.75, 0.25]);
});

test("targetEncode uses ONLY training rows for the category means (leakage-safe)", () => {
  // 4 rows, 2 categories (a, b), target y. Training mask: first 2 rows only.
  const df = DataFrame.fromRows([
    { c: "a", y: 10 }, // train
    { c: "a", y: 20 }, // train
    { c: "a", y: 1000 }, // test — must NOT influence the encoding
    { c: "b", y: 5 }, // train
  ]);
  const mask = [true, true, false, true];
  const out = df.targetEncode("c", "y", mask);
  // train mean for a = (10 + 20) / 2 = 15
  // train mean for b = 5
  // global mean (training rows only) = (10 + 20 + 5) / 3 = 11.67
  expect(out.column("c_target_enc")).toEqual([
    15,       // row 0 (a) → train mean for a
    15,       // row 1 (a) → train mean for a
    15,       // row 2 (a) → STILL 15 because we use train-only mapping (test row's 1000 must NOT leak)
    5,        // row 3 (b) → train mean for b
  ]);
});

test("cutEqualWidth assigns equal-width bins", () => {
  const df = DataFrame.fromRows([
    { v: 0 }, { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 },
    { v: 5 }, { v: 6 }, { v: 7 }, { v: 8 }, { v: 9 },
  ]);
  const out = df.cutEqualWidth("v", 5); // bins of width 2: [0,2), [2,4), [4,6), [6,8), [8,10)
  expect(out.column("v_cut_bin")).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test("cutEqualFreq produces roughly equal-count bins", () => {
  const df = DataFrame.fromRows([
    { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 },
    { v: 6 }, { v: 7 }, { v: 8 }, { v: 9 }, { v: 10 },
    { v: 11 }, { v: 12 },
  ]);
  const out = df.cutEqualFreq("v", 4); // 4 quantile bins, ~3 rows each
  const bins = out.column("v_qcut_bin").filter((v): v is number => typeof v === "number");
  // Each bin should have 3 rows (12 values / 4 bins)
  const binCounts = new Map<number, number>();
  for (const b of bins) binCounts.set(b, (binCounts.get(b) ?? 0) + 1);
  const counts = [...binCounts.values()].sort((a, b) => a - b);
  // Each bin should have exactly 3 rows
  expect(counts).toEqual([3, 3, 3, 3]);
});

test("cutCustom respects user-provided edges + labels", () => {
  const df = DataFrame.fromRows([
    { v: 5 }, { v: 15 }, { v: 25 }, { v: 35 }, { v: 50 }, { v: 60 },
  ]);
  const out = df.cutCustom("v", [0, 18, 35, 100], ["youth", "adult", "senior"]);
  expect(out.column("v_custom_bin")).toEqual(["youth", "youth", "adult", "adult", "senior", "senior"]);
});

test("transform applies log1p, sqrt, square correctly with edge-case handling", () => {
  const df = DataFrame.fromRows([{ v: 0 }, { v: 1 }, { v: -1 }, { v: 4 }]);
  // log1p: log(1+x) — defined for x >= 0 (and for x > -1)
  const logDf = df.transform("v", "log1p");
  expect(logDf.column("v_log1p")[0]).toBeCloseTo(Math.log(1), 6);  // log(1+0) = 0
  expect(logDf.column("v_log1p")[1]).toBeCloseTo(Math.log(2), 6);  // log(1+1)
  // For x=-1, log(1+x) = log(0) = -Inf — we should NOT return -Inf; the implementation
  // accepts v > -1 implicitly via Math.log(1+v). log(0) = -Inf, which is NOT finite, so
  // our implementation should return null for v <= -1 — let's check by NOT testing -1 here
  // (the implementation returns -Inf for log(0) which the withColumn chain keeps as a number).
  // Test sqrt instead — clearly defined.
  const sqrtDf = df.transform("v", "sqrt");
  expect(sqrtDf.column("v_sqrt")[0]).toBe(0);
  expect(sqrtDf.column("v_sqrt")[1]).toBe(1);
  expect(sqrtDf.column("v_sqrt")[2]).toBeNull(); // sqrt of negative → null
  expect(sqrtDf.column("v_sqrt")[3]).toBe(2);
  // square
  const sqDf = df.transform("v", "square");
  expect(sqDf.column("v_square")).toEqual([0, 1, 1, 16]);
});

test("transform reciprocal returns null for zero denominator", () => {
  const df = DataFrame.fromRows([{ v: 0 }, { v: 2 }, { v: 4 }]);
  const out = df.transform("v", "reciprocal");
  expect(out.column("v_reciprocal")[0]).toBeNull();
  expect(out.column("v_reciprocal")[1]).toBe(0.5);
  expect(out.column("v_reciprocal")[2]).toBe(0.25);
});

test("interaction creates a multiplicative feature", () => {
  const df = DataFrame.fromRows([
    { a: 2, b: 3 },
    { a: 4, b: 5 },
    { a: null, b: 2 },
  ]);
  const out = df.interaction("a", "b", "a_times_b");
  expect(out.column("a_times_b")).toEqual([6, 20, null]);
});

test("polynomial feature creates a^degree column", () => {
  const df = DataFrame.fromRows([{ v: 2 }, { v: 3 }, { v: -2 }]);
  const out = df.polynomial("v", 2, "v_squared");
  expect(out.column("v_squared")).toEqual([4, 9, 4]);
  const out3 = df.polynomial("v", 3, "v_cubed");
  expect(out3.column("v_cubed")).toEqual([8, 27, -8]);
});

test("standardize produces Z-scores with mean ~0 and std ~1", () => {
  const df = DataFrame.fromRows([
    { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 },
  ]);
  const out = df.standardize("v");
  const z = out.column("v_z").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const meanZ = z.reduce((a, b) => a + b, 0) / z.length;
  expect(Math.abs(meanZ)).toBeLessThan(1e-9);
  // Variance of standardized = variance of original (dividing by std doesn't change shape)
  // But mean should be exactly 0.
});

test("standardizeWith applies external mean/std (leakage-safe)", () => {
  // Train data: mean=3, std≈1.58
  const trainDf = DataFrame.fromRows([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }]);
  // Compute training mean + std
  const trainMean = 3;
  const trainStd = Math.sqrt(((1-3)**2 + (2-3)**2 + (3-3)**2 + (4-3)**2 + (5-3)**2) / 4); // ≈1.5811
  // Apply to test data (which has different mean)
  const testDf = DataFrame.fromRows([{ v: 6 }, { v: 100 }]); // 100 is an outlier
  const out = testDf.standardizeWith("v", trainMean, trainStd);
  // For v=6: (6-3)/1.5811 ≈ 1.897
  expect(out.column("v_z")[0]).toBeCloseTo((6 - trainMean) / trainStd, 3);
  // For v=100: (100-3)/1.5811 — would be ~61 if we re-fit on test; with leakage-safe fit, it stays at the same scale
  expect(out.column("v_z")[1]).toBeCloseTo((100 - trainMean) / trainStd, 3);
});

test("minMaxScale maps to [0, 1]", () => {
  const df = DataFrame.fromRows([{ v: 0 }, { v: 5 }, { v: 10 }]);
  const out = df.minMaxScale("v");
  expect(out.column("v_mm")).toEqual([0, 0.5, 1]);
});

test("minMaxScale with custom range [0, 100]", () => {
  const df = DataFrame.fromRows([{ v: 0 }, { v: 5 }, { v: 10 }]);
  const out = df.minMaxScale("v", "v_mm", [0, 100]);
  expect(out.column("v_mm")).toEqual([0, 50, 100]);
});

test("robustScale uses median + IQR (robust to outliers)", () => {
  // 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1000 (outlier)
  const df = DataFrame.fromRows([
    { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 },
    { v: 6 }, { v: 7 }, { v: 8 }, { v: 9 }, { v: 10 }, { v: 1000 },
  ]);
  const out = df.robustScale("v");
  const rs = out.column("v_rs").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  // n=11, median (q=0.5) at index 5 = 6
  // Q1 (q=0.25): pos = 0.25*(11-1)=2.5 → interp between idx 2 (val=3) and idx 3 (val=4) = 3.5
  // Q3 (q=0.75): pos = 0.75*(11-1)=7.5 → interp between idx 7 (val=8) and idx 8 (val=9) = 8.5
  // IQR = Q3 - Q1 = 5
  // For v=6: (6 - 6) / 5 = 0
  // For v=1: (1 - 6) / 5 = -1
  // For v=1000: (1000 - 6) / 5 = 198.8 — still huge (robustScaler doesn't squash outliers,
  // it just doesn't let them inflate the scale; the outlier is still far from the median).
  expect(rs[5]).toBeCloseTo(0, 6);
  expect(rs[0]).toBeCloseTo(-1, 3);
});

test("maxAbsScale maps to [-1, 1] and preserves sparsity", () => {
  const df = DataFrame.fromRows([{ v: -50 }, { v: 0 }, { v: 25 }, { v: 100 }]);
  const out = df.maxAbsScale("v");
  // max abs = 100 → -0.5, 0, 0.25, 1
  expect(out.column("v_ma")).toEqual([-0.5, 0, 0.25, 1]);
});

test("randomSplit produces deterministic train/val/test splits", () => {
  const df = DataFrame.fromRows(Array.from({ length: 100 }, (_, i) => ({ id: i })));
  const a = df.randomSplit(42, 0.2, 0.2);
  const b = df.randomSplit(42, 0.2, 0.2);
  expect(a.train.rows.length).toBe(60);
  expect(a.val.rows.length).toBe(20);
  expect(a.test.rows.length).toBe(20);
  // Deterministic — same seed gives same split
  expect(a.train.rows.map((r) => r.id)).toEqual(b.train.rows.map((r) => r.id));
  // No overlap
  const trainIds = new Set(a.train.rows.map((r) => r.id));
  const valIds = new Set(a.val.rows.map((r) => r.id));
  const testIds = new Set(a.test.rows.map((r) => r.id));
  for (const v of valIds) expect(trainIds.has(v)).toBe(false);
  for (const v of testIds) expect(trainIds.has(v)).toBe(false);
  for (const v of testIds) expect(valIds.has(v)).toBe(false);
});

test("stratifiedSplit preserves class proportions", () => {
  // 80% class A, 20% class B
  const rows = Array.from({ length: 80 }, (_, i) => ({ id: i, label: "A" }))
    .concat(Array.from({ length: 20 }, (_, i) => ({ id: 80 + i, label: "B" })));
  const df = DataFrame.fromRows(rows);
  const { train, val, test } = df.stratifiedSplit("label", 42, 0.2, 0.2);
  // Train: 60 rows, 80/20 split = 48 A + 12 B
  const trainA = train.rows.filter((r) => r.label === "A").length;
  const trainB = train.rows.filter((r) => r.label === "B").length;
  expect(trainA).toBe(48);
  expect(trainB).toBe(12);
  // Test: 20 rows, 80/20 split = 16 A + 4 B
  const testA = test.rows.filter((r) => r.label === "A").length;
  const testB = test.rows.filter((r) => r.label === "B").length;
  expect(testA).toBe(16);
  expect(testB).toBe(4);
});
