"use client";

/**
 * BoxPlot — distribution summary (min, Q1, median, Q3, max, outliers).
 *
 * Recharts doesn't have a native BoxPlot, so we compose one from
 * error bars + custom shapes. Each series gets one row.
 */

import * as React from "react";
import { fmt } from "@/lib/data/frame";
import { quartiles, min, max, tukeyFence, toNumericArray } from "@/lib/data/stats";

export interface BoxPlotDatum {
  /** Series name (e.g., region or category). */
  label: string;
  /** Raw values for the series. */
  values: number[];
}

interface BoxPlotProps {
  data: BoxPlotDatum[];
  yLabel?: string;
  height?: number;
  altText?: string;
}

export function BoxPlot({ data, yLabel, height = 320, altText }: BoxPlotProps) {
  const stats = React.useMemo(() => {
    return data.map((d) => {
      const xs = toNumericArray(d.values.map((v) => v as never) as number[]);
      if (xs.length === 0) {
        return { label: d.label, empty: true as const };
      }
      const { q1, q2, q3 } = quartiles(xs);
      const fence = tukeyFence(xs);
      return {
        label: d.label,
        empty: false as const,
        min: min(xs),
        q1,
        median: q2,
        q3,
        max: max(xs),
        lowerFence: fence.lower,
        upperFence: fence.upper,
        outliers: fence.outliers,
      };
    });
  }, [data]);

  // Compute the y-axis range across all series
  const allValues = stats.flatMap((s) => (s.empty ? [] : [s.min, s.max, s.lowerFence, s.upperFence, ...s.outliers.map((o) => o.value)]));
  const yMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const yMax = allValues.length > 0 ? Math.max(...allValues) : 1;
  const yRange = yMax - yMin || 1;
  const padding = yRange * 0.1;
  const yLo = yMin - padding;
  const yHi = yMax + padding;
  const yScale = (v: number) => ((yHi - v) / (yHi - yLo)) * 100;

  return (
    <div role="img" aria-label={altText ?? `Box plot: ${data.length} series`} style={{ width: "100%", height }}>
      <div className="flex h-full gap-2">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between py-2 pr-1 text-[10px] text-muted-foreground" style={{ width: 50 }}>
          <span className="text-mono">{fmt(yHi, 1)}</span>
          <span className="text-mono">{fmt(yMin + (yMax - yMin) * 0.75, 1)}</span>
          <span className="text-mono">{fmt(yMin + (yMax - yMin) * 0.5, 1)}</span>
          <span className="text-mono">{fmt(yMin + (yMax - yMin) * 0.25, 1)}</span>
          <span className="text-mono">{fmt(yLo, 1)}</span>
        </div>

        {/* Plot area */}
        <div className="relative flex-1 border-l border-b border-border">
          <div className="flex h-full items-stretch">
            {stats.map((s, i) => (
              // NOTE: `relative` on this column is REQUIRED so the absolutely-
              // positioned whisker line, whisker caps, and outlier dots
              // anchor to the per-series column (not the plot area). Without
              // it, all series' decorations stack at the left-center of the
              // plot area.
              <div key={s.label} className="relative flex flex-1 flex-col items-center justify-center gap-1 px-1">
                {s.empty ? (
                  <div className="text-xs text-muted-foreground">no data</div>
                ) : (
                  <>
                    {/* Whisker line (vertical, behind the box) */}
                    <div
                      className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-foreground/40"
                      style={{
                        height: `${yScale(s.lowerFence) - yScale(s.upperFence)}%`,
                        top: `${yScale(s.upperFence)}%`,
                      }}
                    />
                    {/* Whisker caps (top + bottom) */}
                    <div className="absolute left-1/2 h-px w-4 -translate-x-1/2 bg-foreground/40" style={{ top: `${yScale(s.upperFence)}%` }} />
                    <div className="absolute left-1/2 h-px w-4 -translate-x-1/2 bg-foreground/40" style={{ top: `${yScale(s.lowerFence)}%` }} />
                    {/* Box (positioned relative to the column, centered horizontally) */}
                    <div
                      className="absolute left-1/2 w-8 -translate-x-1/2 rounded-sm border border-[var(--color-ai-blue)]/60 bg-[color-mix(in_oklch,var(--color-ai-blue)_20%,transparent)]"
                      style={{
                        height: `${yScale(s.q1) - yScale(s.q3)}%`,
                        top: `${yScale(s.q3)}%`,
                      }}
                      title={`${s.label}: min=${fmt(s.min,2)} Q1=${fmt(s.q1,2)} med=${fmt(s.median,2)} Q3=${fmt(s.q3,2)} max=${fmt(s.max,2)}`}
                    >
                      {/* Median line — top measured from the q3 end (top of the box).
                          yScale inverts: higher value → smaller yScale. So
                          yScale(median) is between yScale(q3) (top of box) and
                          yScale(q1) (bottom of box). Distance from box-top
                          (q3) down to median = yScale(median) - yScale(q3). */}
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-[var(--color-ai-purple)]"
                        style={{
                          top: `${((yScale(s.median) - yScale(s.q3)) / Math.max(0.0001, yScale(s.q1) - yScale(s.q3))) * 100}%`,
                        }}
                      />
                    </div>
                    {/* Outlier dots */}
                    {s.outliers.map((o, j) => (
                      <span
                        key={j}
                        className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--color-role-warning)]"
                        style={{ top: `calc(${yScale(o.value)}% - 3px)` }}
                        title={`outlier: ${fmt(o.value, 2)}`}
                      />
                    ))}
                  </>
                )}
                <span className="absolute bottom-1 mt-1 truncate text-[10px] text-muted-foreground" title={s.label}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {yLabel && <p className="mt-1 text-center text-[10px] text-muted-foreground">{yLabel}</p>}
    </div>
  );
}
