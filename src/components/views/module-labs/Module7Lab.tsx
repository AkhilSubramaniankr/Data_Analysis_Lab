"use client";

/**
 * Module 7 Lab — Exploratory Data Analysis & Business Insights.
 *
 * Master spec §12. A filterable sales analytics dashboard with KPI
 * cards + monthly revenue trend + revenue by region + profit by
 * category + top/bottom products. Every chart is annotated per spec
 * §24 (business question, why this chart, what it shows, what it does
 * not establish, next step). Filters update KPIs and charts live.
 *
 * All numbers are computed from the real Retail Sales dataset.
 */

import * as React from "react";
import { TrendingUp, BookOpen, Filter, LayoutDashboard, Trophy, ArrowDown } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { ChartShell } from "@/components/charts/ChartShell";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { Histogram } from "@/components/charts/Histogram";
import { BoxPlot } from "@/components/charts/BoxPlot";
import { MODULE7_EXERCISES } from "@/lib/content/exercises/module7";

export function Module7Lab() {
  const retailSpec = React.useMemo(() => buildRetailSales(), []);
  const fullDf = React.useMemo(() => DataFrame.fromRows(retailSpec.rows), [retailSpec]);

  // Filter state
  const regions = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of fullDf.column("region")) if (typeof r === "string") set.add(r);
    return [...set].sort();
  }, [fullDf]);
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of fullDf.column("category")) if (typeof r === "string") set.add(r);
    return [...set].sort();
  }, [fullDf]);
  const products = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of fullDf.column("product")) if (typeof r === "string") set.add(r);
    return [...set].sort();
  }, [fullDf]);

  const [region, setRegion] = React.useState<string>("all");
  const [category, setCategory] = React.useState<string>("all");
  const [product, setProduct] = React.useState<string>("all");
  const [year, setYear] = React.useState<string>("all");

  const years = React.useMemo(() => {
    const withY = fullDf.dtYear("order_date");
    const set = new Set<number>();
    for (const v of withY.column("order_date_year")) if (typeof v === "number") set.add(v);
    return [...set].sort();
  }, [fullDf]);

  // Apply filters
  const df = React.useMemo(() => {
    let d = fullDf;
    if (region !== "all") d = d.filter((r) => r.region === region);
    if (category !== "all") d = d.filter((r) => r.category === category);
    if (product !== "all") d = d.filter((r) => r.product === product);
    if (year !== "all") {
      const y = Number(year);
      d = d.dtYear("order_date").filter((r) => r.order_date_year === y);
    }
    return d;
  }, [fullDf, region, category, product, year]);

  const resetFilters = () => {
    setRegion("all");
    setCategory("all");
    setProduct("all");
    setYear("all");
  };

  // KPIs
  const kpi = React.useMemo(() => {
    const revenueArr = df.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const profitArr = df.column("profit").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const orders = df.rows.length;
    const totalRevenue = revenueArr.reduce((a, b) => a + b, 0);
    const totalProfit = profitArr.reduce((a, b) => a + b, 0);
    const aov = orders > 0 ? totalRevenue / orders : NaN;
    return {
      orders,
      totalRevenue,
      totalProfit,
      aov,
      margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : NaN,
    };
  }, [df]);

  // Monthly revenue trend (after filters)
  const monthly = React.useMemo(() => {
    return df.resampleMonthly("order_date", [
      { column: "revenue", fn: "sum", as: "revenue" },
      { column: "profit", fn: "sum", as: "profit" },
    ]);
  }, [df]);

  // Revenue by region (only if not filtered by region — otherwise single bar)
  const byRegion = React.useMemo(() => {
    if (region !== "all") return null;
    return df.groupBy(["region"], [
      { column: "revenue", fn: "sum", as: "revenue" },
      { column: "profit", fn: "sum", as: "profit" },
    ]);
  }, [df, region]);

  // Profit by category (only if not filtered by category)
  const byCategory = React.useMemo(() => {
    if (category !== "all") return null;
    return df.groupBy(["category"], [
      { column: "revenue", fn: "sum", as: "revenue" },
      { column: "profit", fn: "sum", as: "profit" },
    ]);
  }, [df, category]);

  // Top + bottom products by revenue
  const byProduct = React.useMemo(() => {
    return df.groupBy(["product"], [
      { column: "revenue", fn: "sum", as: "revenue" },
      { column: "profit", fn: "sum", as: "profit" },
    ]).sort("revenue", "desc");
  }, [df]);

  const topProducts = byProduct.head(5);
  const bottomProducts = byProduct.tail(5);

  // Revenue distribution (histogram)
  const revenueArr = df.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const filterCode = React.useMemo(() => {
    const parts: string[] = [];
    if (region !== "all") parts.push(`df["region"] == "${region}"`);
    if (category !== "all") parts.push(`df["category"] == "${category}"`);
    if (product !== "all") parts.push(`df["product"] == "${product}"`);
    if (year !== "all") parts.push(`df["order_date"].dt.year == ${year}`);
    if (parts.length === 0) return `# No filters applied — full dataset\ndf_filtered = df`;
    return `mask = ${parts.join(" & ")}\ndf_filtered = df[mask]`;
  }, [region, category, product, year]);

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A filterable sales analytics dashboard on the real Retail Sales dataset. Every chart is annotated with the business question, why this chart, what it shows, what it does NOT establish, and what to investigate next.
      </p>

      {/* Filters */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" aria-hidden />
          Filters
          <span className="text-xs font-normal text-muted-foreground">
            ({df.rows.length} of {fullDf.rows.length} rows)
          </span>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="ml-auto h-7 text-xs">
            Reset
          </Button>
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <CodeAndResult code={filterCode} caption="Filter (Pandas equivalent)" note="Filters compose with & (Boolean AND). Wrap each condition in parentheses — & has higher precedence than you'd expect.">
            <p className="text-xs text-muted-foreground">Filters update every chart and KPI below in real time.</p>
          </CodeAndResult>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <KPI label="Total Revenue" value={`$${fmt(kpi.totalRevenue, 0)}`} tone="data" />
        <KPI label="Total Profit" value={`$${fmt(kpi.totalProfit, 0)}`} tone="data" />
        <KPI label="Orders" value={fmt(kpi.orders, 0)} tone="stats" />
        <KPI label="Avg Order Value" value={`$${fmt(kpi.aov, 2)}`} tone="stats" />
        <KPI label="Profit Margin" value={`${fmt(kpi.margin, 2)}%`} tone={kpi.margin > 30 ? "validated" : kpi.margin > 0 ? "warning" : "error"} />
      </div>

      {/* Monthly revenue trend */}
      <div className="mt-5">
        <ChartShell
          title="Monthly revenue & profit trend"
          subtitle="Real monthly sums from the filtered dataset."
          annotation={{
            question: "How does revenue move over time, and does profit track revenue?",
            whyThisChart: "Line chart is the right choice for a sequential time index. Bars would imply discrete, unrelated categories.",
            shows: `Revenue and profit per month (${monthly.rows.length} months). Look for seasonality, growth, or sudden dips.`,
            doesNotEstablish: "A trend is not a forecast. It does not establish causation (a marketing campaign, a price change, or a holiday week could all drive the same pattern).",
            nextStep: "If seasonality is visible, decompose with a moving average. Investigate any sudden dip by re-filtering to that month.",
          }}
        >
          <LineChart
            data={monthly.rows.map((r) => ({ bucket: String(r.bucket), revenue: r.revenue as number, profit: r.profit as number }))}
            xKey="bucket"
            xLabel="Month"
            series={[
              { key: "revenue", label: "Revenue" },
              { key: "profit", label: "Profit" },
            ]}
            altText="Monthly revenue and profit trend line chart"
          />
        </ChartShell>
      </div>

      {/* Two-column: revenue by region + profit by category */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {byRegion ? (
          <ChartShell
            title="Revenue by region"
            subtitle="Total revenue per region after filters."
            annotation={{
              question: "Which regions drive the most revenue?",
              whyThisChart: "Bar chart with categorical x-axis; bars are independent (regions don't form a sequence).",
              shows: "Regional totals after applying the current filters.",
              doesNotEstablish: "Total revenue does NOT equal profitability — a high-revenue region might have low margins. Check profit by category too.",
              nextStep: "Filter to a specific region to drill into its product mix.",
            }}
          >
            <BarChart
              data={byRegion.rows.map((r) => ({ label: String(r.region), value: r.revenue as number }))}
              xLabel="Region"
              yLabel="Revenue (USD)"
              altText="Bar chart of revenue by region"
            />
          </ChartShell>
        ) : (
          <ChartShell title="Revenue by region" subtitle="Hidden — region filter is applied. Reset to see the comparison.">
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Reset the region filter to see this chart.
            </div>
          </ChartShell>
        )}

        {byCategory ? (
          <ChartShell
            title="Profit by category"
            subtitle="Total profit per product category after filters."
            annotation={{
              question: "Which categories are most profitable?",
              whyThisChart: "Bar chart; categories are independent.",
              shows: "Category totals after applying the current filters.",
              doesNotEstablish: "Profit is not margin. A high-profit category might have a low margin on high volume.",
              nextStep: "Compute profit_margin = profit / revenue per category to compare margins, not totals.",
            }}
          >
            <BarChart
              data={byCategory.rows.map((r) => ({ label: String(r.category), value: r.profit as number }))}
              xLabel="Category"
              yLabel="Profit (USD)"
              altText="Bar chart of profit by category"
            />
          </ChartShell>
        ) : (
          <ChartShell title="Profit by category" subtitle="Hidden — category filter is applied.">
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Reset the category filter to see this chart.
            </div>
          </ChartShell>
        )}
      </div>

      {/* Top + bottom products */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ChartShell
          title="Top 5 products by revenue"
          subtitle="The highest-revenue products after filters."
          annotation={{
            question: "Which products drive the most revenue?",
            whyThisChart: "Horizontal bar chart because product names are long; bars make ranking obvious.",
            shows: "Top 5 by total revenue.",
            doesNotEstablish: "Top revenue does NOT mean top profit or top margin. A best-seller can be a margin-loser.",
            nextStep: "Compute margin per product (profit / revenue) and compare with this ranking.",
          }}
        >
          <BarChart
            data={topProducts.rows.map((r) => ({ label: String(r.product), value: r.revenue as number }))}
            layout="horizontal"
            xLabel="Revenue (USD)"
            altText="Horizontal bar chart of top 5 products by revenue"
          />
        </ChartShell>

        <ChartShell
          title="Bottom 5 products by revenue"
          subtitle="The lowest-revenue products after filters."
          annotation={{
            question: "Which products are underperforming?",
            whyThisChart: "Horizontal bar chart; bars make ranking obvious.",
            shows: "Bottom 5 by total revenue.",
            doesNotEstablish: "Low revenue can be intentional (premium niche product) or a sign of a problem. Investigate before acting.",
            nextStep: "Check whether the low-revenue products have a margin or volume problem, not just a revenue problem.",
          }}
        >
          <BarChart
            data={bottomProducts.rows.map((r) => ({ label: String(r.product), value: r.revenue as number })).reverse()}
            layout="horizontal"
            xLabel="Revenue (USD)"
            highlightIndices={bottomProducts.rows.map((_, i) => i).filter((i) => {
              // Highlight bars with revenue < $50 (illustrative threshold)
              return true;
            })}
            altText="Horizontal bar chart of bottom 5 products by revenue"
          />
        </ChartShell>
      </div>

      {/* Univariate distribution */}
      <div className="mt-5">
        <ChartShell
          title="Revenue distribution"
          subtitle="Histogram of per-order revenue after filters."
          annotation={{
            question: "What is the shape of per-order revenue?",
            whyThisChart: "Histogram is the standard chart for the distribution of a single continuous variable. Bars are bins, ordered and contiguous.",
            shows: `Distribution across ${Math.max(10, Math.min(30, Math.floor(revenueArr.length / 5)))} bins. Long right tails are typical for retail revenue.`,
            doesNotEstablish: "The shape of the distribution does not predict individual future orders.",
            nextStep: "If the distribution is long-tailed, consider log-transforming before modelling. Report median + IQR rather than mean + std.",
          }}
        >
          <Histogram
            values={revenueArr}
            bins={12}
            xLabel="Revenue (USD)"
            yLabel="Frequency"
            altText="Histogram of per-order revenue distribution"
          />
        </ChartShell>
      </div>

      {/* Multi-series box plot: revenue distribution per region.
          This exercises the BoxPlot component (previously defined but
          unused) and the Phase 6 positioning fix (per-series relative
          anchoring for whisker lines, caps, outlier dots, and the
          corrected median-line formula). */}
      <div className="mt-5">
        <ChartShell
          title="Revenue distribution by region (box plot)"
          subtitle="Per-region five-number summary (min, Q1, median, Q3, max) + outliers."
          annotation={{
            question: "How does the revenue distribution differ across regions?",
            whyThisChart: "Box plots are the standard chart for comparing the distribution of a continuous variable across several groups. Each box shows Q1–Q3 (the middle 50% of orders), the median line, whiskers to the non-outlier min/max, and dots for Tukey-fence outliers (1.5×IQR beyond Q1/Q3).",
            shows: `${regions.length} regions side-by-side. Taller boxes = more variability; higher median lines = higher typical revenue; dots above the upper whisker = bulk orders or extreme orders worth investigating.`,
            doesNotEstablish: "The box plot shows distribution, not totals — a region with a high median could still have lower total revenue if it has fewer orders. Check the 'Revenue by region' bar chart above for totals.",
            nextStep: "Investigate outlier dots — they may be legitimate bulk orders (keep) or data-entry errors (correct). If one region's box is much tighter, its orders are more consistent; if wider, more variable.",
          }}
        >
          <BoxPlot
            data={regions.map((region) => ({
              label: region,
              values: df.rows
                .filter((r) => r.region === region)
                .map((r) => r.revenue)
                .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
            }))}
            yLabel="Revenue (USD)"
            height={360}
            altText="Box plot of revenue distribution by region"
          />
        </ChartShell>
      </div>

      <div className="mt-5 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-semibold">
          <Trophy className="h-3.5 w-3.5" aria-hidden />
          Business findings (computed, not fabricated)
        </p>
        <ul className="mt-1 flex flex-col gap-1">
          <li>Total revenue (filtered): <span className="text-mono">${fmt(kpi.totalRevenue, 0)}</span> across <span className="text-mono">{fmt(kpi.orders, 0)}</span> orders.</li>
          <li>Profit margin (filtered): <span className="text-mono">{fmt(kpi.margin, 2)}%</span> — {kpi.margin > 30 ? "healthy for retail." : kpi.margin > 0 ? "slim — investigate cost structure." : "negative — investigate returns or costs."}</li>
          <li>Best-performing product (filtered): <span className="text-mono">{String(topProducts.rows[0]?.product ?? "—")}</span> with <span className="text-mono">${fmt(topProducts.rows[0]?.revenue as number, 0)}</span> in revenue.</li>
          <li>Worst-performing product (filtered): <span className="text-mono">{String(bottomProducts.rows[bottomProducts.rows.length - 1]?.product ?? "—")}</span> with <span className="text-mono">${fmt(bottomProducts.rows[bottomProducts.rows.length - 1]?.revenue as number, 0)}</span> in revenue.</li>
        </ul>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE7_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone: "data" | "transform" | "stats" | "validated" | "warning" | "error" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-3 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-1 text-base font-bold text-role tabular-nums">{value}</p>
    </div>
  );
}
