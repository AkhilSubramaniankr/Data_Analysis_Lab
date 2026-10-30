"use client";

/**
 * Module 8 Lab — Trend Analysis & Time-Based Data.
 *
 * Master spec §13. Interactive trend lab: pick granularity
 * (daily/weekly/monthly/quarterly), metric (revenue/profit/orders),
 * rolling window, and comparison period. Real pct_change with explicit
 * zero-denominator handling.
 *
 * All numbers from the real Retail Sales dataset (with monthly buckets
 * resampled via the in-browser engine).
 */

import * as React from "react";
import { TrendingUp, BookOpen, CalendarClock, AlertTriangle } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import type { AggFunc } from "@/lib/data/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { ChartShell } from "@/components/charts/ChartShell";
import { LineChart } from "@/components/charts/LineChart";
import { MODULE8_EXERCISES } from "@/lib/content/exercises/module8";

type Granularity = "monthly" | "quarterly";
type Metric = "revenue" | "profit" | "orders";

export function Module8Lab() {
  const retail = React.useMemo(() => DataFrame.fromRows(buildRetailSales().rows), []);

  // Day-of-week distribution (for the "weekly cycle" question)
  const dayOfWeek = React.useMemo(() => {
    return retail.dtDayName("order_date").valueCounts("order_date_day_name");
  }, [retail]);

  const [granularity, setGranularity] = React.useState<Granularity>("monthly");
  const [metric, setMetric] = React.useState<Metric>("revenue");
  const [rollingWindow, setRollingWindow] = React.useState<number>(3);

  // Build the resampled time series
  const series = React.useMemo(() => {
    const aggs = metric === "orders"
      ? [{ column: "order_id", fn: "count" as AggFunc, as: "value" }]
      : [{ column: metric, fn: "sum" as AggFunc, as: "value" }];
    return granularity === "monthly"
      ? retail.resampleMonthly("order_date", aggs)
      : retail.resampleQuarterly("order_date", aggs);
  }, [retail, granularity, metric]);

  // Compute rolling, expanding, shift, pct_change on the series.
  const withRolling = React.useMemo(() => {
    return series
      .rolling("value", rollingWindow, "mean", "rolling_mean")
      .expanding("value", "mean", "expanding_mean")
      .shift("value", 1, "prev_value")
      .pctChange("value", "pct_change");
  }, [series, rollingWindow]);

  // Find MoM / QoQ growth stats
  const growth = React.useMemo(() => {
    const pct = withRolling.column("pct_change").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (pct.length === 0) return { mean: NaN, max: NaN, min: NaN, positive: 0, negative: 0, zeroDenomSkipped: 0 };
    return {
      mean: pct.reduce((a, b) => a + b, 0) / pct.length,
      max: Math.max(...pct),
      min: Math.min(...pct),
      positive: pct.filter((p) => p > 0).length,
      negative: pct.filter((p) => p < 0).length,
      // Rows where prev_value was 0 (and pct_change returned null) — these are the "zero denominator" rows.
      zeroDenomSkipped: withRolling.rows.filter((r) => r.prev_value === 0).length,
    };
  }, [withRolling]);

  // YoY growth: compare total revenue in 2023 vs total in 2024 (per month for chart)
  const yoy = React.useMemo(() => {
    const monthlyWithYear = retail.dtYear("order_date").dtMonth("order_date").groupBy(["order_date_year", "order_date_month"], [
      { column: "revenue", fn: "sum", as: "revenue" },
    ]);
    const byMonth: { month: string; y2023: number | null; y2024: number | null }[] = [];
    for (let m = 1; m <= 12; m++) {
      const r2023 = monthlyWithYear.rows.find((r) => r.order_date_year === 2023 && r.order_date_month === m);
      const r2024 = monthlyWithYear.rows.find((r) => r.order_date_year === 2024 && r.order_date_month === m);
      byMonth.push({
        month: `M${m}`,
        y2023: r2023 ? (r2023.revenue as number) : null,
        y2024: r2024 ? (r2024.revenue as number) : null,
      });
    }
    return byMonth;
  }, [retail]);

  // Total YoY
  const yoyTotals = React.useMemo(() => {
    const t2023 = yoy.reduce((s, r) => s + (r.y2023 ?? 0), 0);
    const t2024 = yoy.reduce((s, r) => s + (r.y2024 ?? 0), 0);
    const growth = t2023 > 0 ? ((t2024 - t2023) / t2023) * 100 : NaN;
    return { t2023, t2024, growth };
  }, [yoy]);

  const seriesCode = React.useMemo(() => {
    const aggCall = metric === "orders"
      ? `[("order_id", "count")]`
      : `[("${metric}", "sum")]`;
    const resampleFn = granularity === "monthly" ? "resample('ME')" : "resample('QE')";
    return `# Resample and aggregate\nseries = df.set_index("order_date")${resampleFn}.agg(${aggCall})\nseries.columns = ["value"]\n\n# Rolling mean (window=${rollingWindow})\nseries["rolling_mean"] = series["value"].rolling(${rollingWindow}).mean()\n\n# Previous period (shift by 1)\nseries["prev_value"] = series["value"].shift(1)\n\n# Percentage change — explicit zero-denominator policy\nseries["pct_change"] = series["value"].pct_change()\n# Rows where prev_value == 0 produce NaN — investigate, don't impute.`;
  }, [granularity, metric, rollingWindow]);

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick the granularity, metric, and rolling window. See the resampled series, the rolling mean, the percentage change — with explicit zero-denominator handling. Then study the year-over-year comparison.
      </p>

      {/* Controls */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Trend controls
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Granularity</Label>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly (resample 'ME')</SelectItem>
                <SelectItem value="quarterly">Quarterly (resample 'QE')</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Metric</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue (sum)</SelectItem>
                <SelectItem value="profit">Profit (sum)</SelectItem>
                <SelectItem value="orders">Orders (count)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Rolling window</Label>
            <Select value={String(rollingWindow)} onValueChange={(v) => setRollingWindow(Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 6, 12].map((k) => <SelectItem key={k} value={String(k)}>{k} periods</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <CodeAndResult code={seriesCode} caption="Trend pipeline (Pandas equivalent)" note="pct_change() returns NaN where the previous value is 0 — we never divide by zero silently. Investigate each NaN; it can be a returns month, a data gap, or a launch month.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Periods" value={String(series.rows.length)} tone="data" />
              <Stat label="Mean growth" value={`${fmt(growth.mean * 100, 2)}%`} tone={growth.mean >= 0 ? "validated" : "warning"} />
              <Stat label="Best period" value={`${fmt(growth.max * 100, 2)}%`} tone="validated" />
              <Stat label="Worst period" value={`${fmt(growth.min * 100, 2)}%`} tone="warning" />
              <Stat label="Up periods" value={String(growth.positive)} tone="validated" />
              <Stat label="Down periods" value={String(growth.negative)} tone="warning" />
              <Stat label="Zero-denominator rows (skipped)" value={String(growth.zeroDenomSkipped)} tone="error" />
              <Stat label="Rolling mean window" value={`${rollingWindow} ${granularity === "monthly" ? "months" : "quarters"}`} tone="stats" />
            </div>
          </CodeAndResult>
        </div>
      </div>

      {/* Trend + rolling chart */}
      <div className="mt-5">
        <ChartShell
          title={`${metric === "orders" ? "Order count" : metric === "revenue" ? "Revenue" : "Profit"} — ${granularity} trend with rolling mean`}
          subtitle={`Real ${granularity} resampling + ${rollingWindow}-period rolling mean.`}
          annotation={{
            question: `How does ${metric} move over time, and what's the smoothed trend?`,
            whyThisChart: "Line chart for a sequential time index. The rolling mean smooths short-term noise to reveal the underlying direction.",
            shows: `Raw ${granularity} values and a ${rollingWindow}-period rolling mean over ${series.rows.length} periods.`,
            doesNotEstablish: "A trend is not a forecast. It does not establish causation (price changes, seasonality, marketing campaigns all contribute).",
            nextStep: "If the rolling mean is flat or declining, investigate with the YoY comparison below.",
          }}
        >
          <LineChart
            data={withRolling.rows.map((r) => ({
              bucket: String(r.bucket),
              value: r.value as number,
              rolling_mean: r.rolling_mean as number | null,
            }))}
            xKey="bucket"
            xLabel={granularity === "monthly" ? "Month" : "Quarter"}
            series={[
              { key: "value", label: metric === "orders" ? "Orders" : metric === "revenue" ? "Revenue" : "Profit" },
              { key: "rolling_mean", label: `Rolling mean (${rollingWindow})`, color: "#34D399" },
            ]}
            altText={`${metric} ${granularity} trend with ${rollingWindow}-period rolling mean`}
          />
        </ChartShell>
      </div>

      {/* Percentage change chart */}
      <div className="mt-5">
        <ChartShell
          title={`Period-over-period percentage change (${granularity})`}
          subtitle="Real pct_change() with explicit zero-denominator handling."
          annotation={{
            question: "How much did the metric grow or shrink each period vs the previous one?",
            whyThisChart: "Line chart on a sequential time index. Zero line implied; positive = growth, negative = decline.",
            shows: `Percentage change between consecutive ${granularity} periods.`,
            doesNotEstablish: "Growth percentages are undefined when the previous period is zero. We mark those as NaN — never silently divide by zero. Each NaN requires deliberate interpretation (returns month? data gap? launch?).",
            nextStep: "Investigate each NaN. A single zero-revenue month could be a returns period (legitimate) or a missing-data issue (treatable).",
          }}
        >
          <LineChart
            data={withRolling.rows.map((r) => ({
              bucket: String(r.bucket),
              pct_change: r.pct_change as number | null,
            }))}
            xKey="bucket"
            xLabel={granularity === "monthly" ? "Month" : "Quarter"}
            series={[{ key: "pct_change", label: "% change", color: "#A78BFA" }]}
            altText={`Period-over-period percentage change chart; ${growth.zeroDenomSkipped} zero-denominator rows skipped`}
          />
        </ChartShell>
      </div>

      {/* Zero-denominator explicit policy */}
      <div className="mt-5 rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold text-[var(--color-role-warning)]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Zero-denominator policy (data integrity)
        </p>
        <p className="mt-1 text-foreground/80">
          When the previous period's value is 0, percentage growth is mathematically undefined (∞). Rather than fabricating a number, the engine marks those rows NaN and counts them. In this dataset there {growth.zeroDenomSkipped > 0 ? <>are <span className="text-mono">{growth.zeroDenomSkipped}</span> such period(s)</> : <>are no such periods</>} — investigate any NaN before reporting growth figures.
        </p>
      </div>

      {/* Year-over-year comparison */}
      <div className="mt-5">
        <ChartShell
          title="Year-over-year comparison: 2023 vs 2024 monthly revenue"
          subtitle="Two lines on the same monthly x-axis — direct YoY comparison."
          annotation={{
            question: "Is 2024 growing relative to 2023?",
            whyThisChart: "Two lines on the same x-axis is the clearest way to compare two years month by month.",
            shows: `2023 total: $${fmt(yoyTotals.t2023, 0)}; 2024 total: $${fmt(yoyTotals.t2024, 0)}; YoY growth: ${fmt(yoyTotals.growth, 2)}%`,
            doesNotEstablish: "YoY growth does not adjust for seasonality, inflation, or one-off events (a marketing campaign in 2024 would inflate the comparison).",
            nextStep: "Decompose with a 12-month rolling mean to remove seasonality before drawing conclusions about the trend.",
          }}
        >
          <LineChart
            data={yoy}
            xKey="month"
            xLabel="Month"
            series={[
              { key: "y2023", label: "2023 revenue", color: "#38BDF8" },
              { key: "y2024", label: "2024 revenue", color: "#34D399" },
            ]}
            altText="Year-over-year monthly revenue comparison: 2023 vs 2024"
          />
        </ChartShell>
      </div>

      {/* Weekly cycle (day-of-week distribution) */}
      <div className="mt-5">
        <ChartShell
          title="Order count by day of week"
          subtitle="Real distribution of order_date across the seven weekdays."
          annotation={{
            question: "Is there a weekly cycle in order volume?",
            whyThisChart: "Bar chart with the seven weekdays as a categorical x-axis; bars are independent categories.",
            shows: `Order counts per weekday. The dataset was generated with a uniform day-of-week distribution, so bars should be approximately equal — but in real retail data you'd expect weekend spikes.`,
            doesNotEstablish: "A weekly cycle does not establish what causes it (consumer behavior, marketing cadence, inventory cycle).",
            nextStep: "If a cycle is visible, decompose with day-of-week dummies before modelling revenue.",
          }}
        >
          <ul className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
            {dayOfWeek.map((d) => (
              <li key={String(d.value)} className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1">
                <span>{String(d.value)}</span>
                <span className="text-mono rounded bg-muted px-1.5 py-0.5">{d.count}</span>
              </li>
            ))}
          </ul>
        </ChartShell>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE8_EXERCISES.map((ex) => (
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
