"use client";

/**
 * Module 6 Lab — Correlation & Relationship Analysis.
 *
 * Master spec §11. Interactive correlation lab: pick two variables, see
 * Pearson + Spearman + scatter + correlation matrix + worked misleading
 * examples (outliers, nonlinear relationships, confounders).
 *
 * Every number is computed from the real Marketing dataset rows.
 */

import * as React from "react";
import { LineChart as LineChartIcon, BookOpen, AlertTriangle, Split } from "lucide-react";
import { buildMarketing, buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { ChartShell } from "@/components/charts/ChartShell";
import { ScatterChart } from "@/components/charts/ScatterChart";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { MODULE6_EXERCISES } from "@/lib/content/exercises/module6";

export function Module6Lab() {
  // Marketing dataset (has advertising_spend, unit_price, quantity, revenue, profit, holiday_week).
  const marketing = React.useMemo(() => DataFrame.fromRows(buildMarketing().rows), []);
  // Retail dataset for "outliers mislead Pearson" example (heavy right tail in revenue).
  const retail = React.useMemo(() => DataFrame.fromRows(buildRetailSales().rows), []);

  const numericCols = marketing.columns.filter((c) => {
    const dt = marketing.dtype(c);
    return dt === "int64" || dt === "float64";
  });

  const [colA, setColA] = React.useState("advertising_spend");
  const [colB, setColB] = React.useState("revenue");
  const safeA = numericCols.includes(colA) ? colA : numericCols[0];
  const safeB = numericCols.includes(colB) ? colB : numericCols[1] ?? numericCols[0];

  const scatterData = marketing.rows
    .map((r) => ({
      x: typeof r[safeA] === "number" ? (r[safeA] as number) : NaN,
      y: typeof r[safeB] === "number" ? (r[safeB] as number) : NaN,
      label: `week ${r.week}`,
    }))
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

  const pearson = marketing.corrPair(safeA, safeB);
  const spearman = marketing.corrSpearmanPair(safeA, safeB);

  // Pearson matrix on the full marketing dataset (numeric cols only)
  const pearsonMatrix = marketing.corr();
  const spearmanMatrix = marketing.corrSpearman();

  // --- Misleading example: confounder ---
  // Stratify by holiday_week and recompute correlation.
  const holidayMask = marketing.column("holiday_week");
  const holidayRows = marketing.rows.filter((_, i) => holidayMask[i] === true);
  const nonHolidayRows = marketing.rows.filter((_, i) => holidayMask[i] !== true);
  const holidayDf = new DataFrame(marketing.columns, holidayRows);
  const nonHolidayDf = new DataFrame(marketing.columns, nonHolidayRows);
  const corrOverall = marketing.corrPair("advertising_spend", "revenue");
  const corrHoliday = holidayDf.corrPair("advertising_spend", "revenue");
  const corrNonHoliday = nonHolidayDf.corrPair("advertising_spend", "revenue");

  // --- Misleading example: nonlinear (parabola) ---
  // y = x^2 + noise; Pearson ≈ 0 (the linear fit is flat), Spearman ≈ 1 (monotonic).
  const parabolaDf = React.useMemo(() => {
    const rows = Array.from({ length: 50 }, (_, i) => {
      const x = i - 25;
      const noise = (Math.sin(i) * 5);
      const y = x * x + noise;
      return { x, y: +y.toFixed(2) };
    });
    return DataFrame.fromRows(rows);
  }, []);
  const paraPearson = parabolaDf.corrPair("x", "y");
  const paraSpearman = parabolaDf.corrSpearmanPair("x", "y");

  // --- Misleading example: outlier-driven ---
  // Clean positive correlation + one extreme outlier that flips Pearson.
  const outlierDf = React.useMemo(() => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      x: i,
      y: i + (i % 3 === 0 ? 1 : -1), // mostly y=x with mild noise
    }));
    rows[29] = { x: 100, y: 5 }; // extreme outlier
    return DataFrame.fromRows(rows);
  }, []);
  const withoutOutlier = new DataFrame(outlierDf.columns, outlierDf.rows.slice(0, 29));
  const outlierPearson = outlierDf.corrPair("x", "y");
  const outlierPearsonClean = withoutOutlier.corrPair("x", "y");

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <LineChartIcon className="h-4 w-4 text-[var(--color-role-stats)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick two variables from the Marketing dataset, see Pearson + Spearman + scatter, and study the correlation matrix. Then explore three misleading-example panels: a confounder (holiday_week), a nonlinear (parabolic) relationship, and an outlier that flips Pearson.
      </p>

      <div className="role-data border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="font-semibold text-role">Critical principle: correlation ≠ causation</p>
        <p className="mt-1 text-foreground/80">
          The correlation coefficient measures linear (Pearson) or monotonic (Spearman) association. It says nothing about cause-and-effect. A high correlation can come from a confounder (a third variable driving both), from a coincidence, or from a sampling artefact. Always plot the scatter, always check for confounders, and never claim a causal relationship from correlation alone.
        </p>
      </div>

      {/* --- Pair picker --- */}
      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Split className="h-4 w-4" aria-hidden />
          Pick two variables
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The scatter, Pearson r, and Spearman ρ all update live. Look for cases where Pearson and Spearman disagree — they reveal nonlinearity.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Variable A (x-axis)</Label>
            <Select value={safeA} onValueChange={setColA}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Variable B (y-axis)</Label>
            <Select value={safeB} onValueChange={setColB}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Pearson r" value={fmt(pearson, 3)} tone="stats" />
          <Stat label="Spearman ρ" value={fmt(spearman, 3)} tone="stats" />
          <Stat label="|Pearson − Spearman|" value={fmt(Math.abs(pearson - spearman), 3)} tone={Math.abs(pearson - spearman) > 0.2 ? "warning" : "stats"} />
          <Stat label="n (pairs)" value={String(scatterData.length)} tone="data" />
        </div>

        <div className="mt-3">
          <CodeAndResult
            code={`pearson_r  = df["${safeA}"].corr(df["${safeB}"], method="pearson")   # ${fmt(pearson, 4)}
spearman_rho = df["${safeA}"].corr(df["${safeB}"], method="spearman")  # ${fmt(spearman, 4)}`}
            caption="Pairwise correlation (Pandas equivalent)"
            note="Pearson is the default. Pearson measures linear association; Spearman measures monotonic association. A big gap between them signals nonlinearity — plot the scatter to see why."
          >
            <ChartShell
              title={`${safeA} vs ${safeB} — scatter plot`}
              subtitle="One point per week of the Marketing dataset."
              annotation={{
                question: `Is ${safeA} linearly associated with ${safeB}?`,
                whyThisChart: "Scatter is the only chart that reveals the shape of a bivariate relationship. Correlation alone is a single number; the scatter is the truth.",
                shows: `Pearson r = ${fmt(pearson, 3)}, Spearman ρ = ${fmt(spearman, 3)}. ${Math.abs(pearson - spearman) > 0.2 ? "Pearson and Spearman differ — the relationship is likely nonlinear." : "Both coefficients agree — the relationship is approximately linear."}`,
                doesNotEstablish: "Correlation does not prove causation. A confounder (e.g., holiday_week) may be driving both.",
                nextStep: "Check the correlation matrix below for multicollinearity, then stratify by potential confounders.",
              }}
            >
              <ScatterChart
                data={scatterData}
                xLabel={safeA}
                yLabel={safeB}
                altText={`Scatter plot of ${safeA} vs ${safeB} with ${scatterData.length} data points. Pearson r = ${fmt(pearson, 3)}, Spearman ρ = ${fmt(spearman, 3)}.`}
              />
            </ChartShell>
          </CodeAndResult>
        </div>
      </div>

      {/* --- Correlation matrices --- */}
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <ChartShell
          title="Pearson correlation matrix"
          subtitle="Linear association between every pair of numeric columns in the Marketing dataset."
          annotation={{
            question: "Which pairs of variables are linearly associated?",
            whyThisChart: "A matrix shows every pairwise correlation in one view. The diagonal is always 1 (a variable is perfectly correlated with itself).",
            shows: "Pairs with |r| close to 1 are strongly linearly associated; pairs close to 0 are not (linearly).",
            doesNotEstablish: "It says nothing about nonlinearity, confounders, or causation. A near-zero Pearson can hide a strong nonlinear relationship.",
            nextStep: "Compare with the Spearman matrix on the right; large gaps point at nonlinearity.",
          }}
        >
          <CorrelationHeatmap columns={pearsonMatrix.columns} matrix={pearsonMatrix.matrix} method="pearson" />
        </ChartShell>
        <ChartShell
          title="Spearman rank correlation matrix"
          subtitle="Monotonic association — captures any monotonic relationship, linear or not."
          annotation={{
            question: "Which pairs are monotonically associated?",
            whyThisChart: "Spearman uses ranks, so it captures any monotonic relationship (e.g., y = x² over x ≥ 0). Robust to outliers because ranks cap their effect.",
            shows: "Pairs with |ρ| close to 1 are strongly monotonically associated.",
            doesNotEstablish: "Says nothing about the SHAPE of the relationship, only its monotonic direction. Like Pearson, it is not causation.",
            nextStep: "Compare with the Pearson matrix. Large gaps are diagnostic of nonlinearity or outliers.",
          }}
        >
          <CorrelationHeatmap columns={spearmanMatrix.columns} matrix={spearmanMatrix.matrix} method="spearman" />
        </ChartShell>
      </div>

      {/* --- Misleading example 1: confounder --- */}
      <section className="mt-8 rounded-lg border border-[var(--color-role-warning)]/30 bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-role-warning)]">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Misleading example 1: confounder (holiday_week)
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          The overall correlation between advertising_spend and revenue is high. But <code className="text-mono">holiday_week</code> is a confounder — it drives up both advertising and revenue independently (because people buy more on holiday weeks regardless of ads). Stratifying by <code className="text-mono">holiday_week</code> reveals a more honest estimate.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="Overall (r)" value={fmt(corrOverall, 3)} tone="stats" />
          <Stat label="Holiday weeks only (r)" value={fmt(corrHoliday, 3)} tone="warning" />
          <Stat label="Non-holiday weeks only (r)" value={fmt(corrNonHoliday, 3)} tone="warning" />
        </div>
        <div className="mt-3">
          <CodeAndResult
            code={`# Confounder stratification
overall = df["advertising_spend"].corr(df["revenue"])
holiday    = df[df["holiday_week"]]["advertising_spend"].corr(df[df["holiday_week"]]["revenue"])
non_holiday = df[~df["holiday_week"]]["advertising_spend"].corr(df[~df["holiday_week"]]["revenue"])`}
            caption="Stratifying by a confounder (Pandas equivalent)"
            note="The stratified correlations are typically LOWER than the overall — that's the confounder at work. The overall correlation was inflated by the shared driver (holiday_week)."
          >
            <p className="text-xs text-muted-foreground">
              Overall r ({fmt(corrOverall, 3)}) is higher than the stratified r values ({fmt(corrHoliday, 3)} holiday, {fmt(corrNonHoliday, 3)} non-holiday). The gap is the confounder's contribution — caution is required before claiming advertising causes revenue.
            </p>
          </CodeAndResult>
        </div>
      </section>

      {/* --- Misleading example 2: nonlinear --- */}
      <section className="mt-4 rounded-lg border border-[var(--color-role-warning)]/30 bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-role-warning)]">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Misleading example 2: nonlinear (parabolic) relationship
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          y = x² + small noise. Pearson is near zero (the best-fit straight line is flat), but Spearman is +1 (the relationship is perfectly monotonic over the range). Always plot the scatter before trusting a correlation number.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="Pearson r" value={fmt(paraPearson, 3)} tone="warning" />
          <Stat label="Spearman ρ" value={fmt(paraSpearman, 3)} tone="validated" />
        </div>
        <div className="mt-3">
          <ChartShell
            title="Parabolic relationship (y = x²)"
            subtitle="50 synthetic points; Pearson ≈ 0, Spearman ≈ 1."
            annotation={{
              question: "Is there an association between x and y?",
              whyThisChart: "Pearson alone would say no (r ≈ 0). The scatter reveals the truth: a strong nonlinear relationship.",
              shows: "A perfect parabola. Pearson misses it; Spearman catches the monotonic portion.",
              doesNotEstablish: "Even the Spearman coefficient doesn't tell you the SHAPE of the relationship — only the scatter does.",
              nextStep: "Engineer a polynomial feature (x²) before fitting a linear model.",
            }}
          >
            <ScatterChart
              data={parabolaDf.rows.map((r) => ({ x: r.x as number, y: r.y as number }))}
              xLabel="x"
              yLabel="y = x² + noise"
              correlation={paraPearson}
              correlationLabel="Pearson r"
              altText={`Scatter plot of a parabolic relationship. Pearson r = ${fmt(paraPearson, 3)} (near zero), Spearman ρ = ${fmt(paraSpearman, 3)} (near one).`}
            />
          </ChartShell>
        </div>
      </section>

      {/* --- Misleading example 3: outlier --- */}
      <section className="mt-4 rounded-lg border border-[var(--color-role-warning)]/30 bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-role-warning)]">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Misleading example 3: outlier flips Pearson
        </h3>
        <p className="mt-1 text-xs text-foreground/80">
          30 points with y ≈ x (positive correlation), plus one extreme outlier at (100, 5). Pearson drops dramatically; Spearman barely moves — rank-based statistics are robust to outliers.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Stat label="Pearson with outlier" value={fmt(outlierPearson, 3)} tone="warning" />
          <Stat label="Pearson without outlier" value={fmt(outlierPearsonClean, 3)} tone="validated" />
        </div>
        <div className="mt-3">
          <ChartShell
            title="Outlier distortion of Pearson"
            subtitle="29 clean points + 1 outlier."
            annotation={{
              question: "Is x linearly associated with y?",
              whyThisChart: "Without the scatter, you'd trust Pearson (low) and conclude no association. The scatter shows the truth: a clean linear relationship plus one extreme outlier.",
              shows: `Pearson with the outlier = ${fmt(outlierPearson, 3)}; Pearson without it = ${fmt(outlierPearsonClean, 3)}. The single outlier moved the coefficient dramatically.`,
              doesNotEstablish: "It does NOT establish that the outlier is an error — outliers can be real. Investigate before dropping.",
              nextStep: "Verify the outlier is real (data-entry error? legitimate extreme?). If legitimate, use robust statistics (Spearman, IQR) rather than dropping.",
            }}
          >
            <ScatterChart
              data={outlierDf.rows.map((r) => ({ x: r.x as number, y: r.y as number }))}
              xLabel="x"
              yLabel="y"
              correlation={outlierPearson}
              correlationLabel="Pearson r"
              altText={`Scatter plot showing how one outlier pulls Pearson down to ${fmt(outlierPearson, 3)}; without the outlier Pearson = ${fmt(outlierPearsonClean, 3)}.`}
            />
          </ChartShell>
        </div>
      </section>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE6_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "data" | "transform" | "stats" | "validated" | "warning" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-2 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold text-role tabular-nums">{value}</p>
    </div>
  );
}
