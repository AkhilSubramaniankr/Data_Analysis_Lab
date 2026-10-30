"use client";

import * as React from "react";
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_THEME, TOOLTIP_STYLE, BAR_CURSOR, AXIS_TICK, axisLabel } from "./chart-theme";
import { ChartSizer } from "./ChartSizer";

interface HistogramProps {
  values: number[];
  bins?: number;
  xLabel?: string;
  yLabel?: string;
  height?: number;
  altText?: string;
}

export function Histogram({
  values,
  bins = 10,
  xLabel,
  yLabel,
  height = 280,
  altText,
}: HistogramProps) {
  const data = React.useMemo(() => {
    const clean = values.filter((v) => typeof v === "number" && Number.isFinite(v));
    if (clean.length === 0) return [];
    const lo = Math.min(...clean);
    const hi = Math.max(...clean);
    if (lo === hi) return [{ label: lo.toFixed(2), value: clean.length }];
    const width = (hi - lo) / bins;
    const counts = new Array(bins).fill(0);
    for (const v of clean) {
      let idx = Math.floor((v - lo) / width);
      if (idx >= bins) idx = bins - 1;
      counts[idx]++;
    }
    return counts.map((c, i) => {
      const left = lo + i * width;
      const right = left + width;
      return {
        label: `${left.toFixed(1)}–${right.toFixed(1)}`,
        value: c,
      };
    });
  }, [values, bins]);

  return (
    <ChartSizer height={height} aria-label={altText ?? `Histogram: ${values.length} values in ${bins} bins`}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 12, right: 24, bottom: 48, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="label"
            tick={{ ...AXIS_TICK, fontSize: 9 }}
            label={xLabel ? axisLabel(xLabel, 0, "insideBottom") : undefined}
            interval="preserveStartEnd"
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={AXIS_TICK} label={yLabel ? axisLabel(yLabel) : undefined} />
          <Tooltip
            cursor={BAR_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => [`${v} items`, "Count"]}
          />
          <Bar dataKey="value" fill={CHART_THEME.cyan} fillOpacity={0.7} stroke={CHART_THEME.cyan} />
        </RBarChart>
      </ResponsiveContainer>
    </ChartSizer>
  );
}
