"use client";

import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_THEME, TOOLTIP_STYLE, AXIS_TICK, axisLabel } from "./chart-theme";
import { ChartSizer } from "./ChartSizer";

interface LineSeries {
  key: string;
  label: string;
  color?: string;
}

interface LineChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: LineSeries[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  altText?: string;
}

export function LineChart({ data, xKey, series, xLabel, yLabel, height = 320, altText }: LineChartProps) {
  return (
    <ChartSizer height={height} aria-label={altText ?? `Line chart: ${series.map((s) => s.label).join(", ")} over ${xLabel ?? xKey}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data} margin={{ top: 12, right: 24, bottom: 32, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis
            dataKey={xKey}
            tick={{ ...AXIS_TICK, fontSize: 10 }}
            label={xLabel ? axisLabel(xLabel, 0, "insideBottom") : undefined}
            tickFormatter={(v) => String(v).length > 8 ? String(v).slice(0, 8) : String(v)}
          />
          <YAxis
            tick={AXIS_TICK}
            label={yLabel ? axisLabel(yLabel) : undefined}
          />
          <Tooltip
            cursor={{ stroke: CHART_THEME.grid, strokeWidth: 1 }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => (typeof v === "number" ? v.toFixed(2) : String(v))}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: CHART_THEME.axisText }} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? CHART_THEME.palette[i % CHART_THEME.palette.length]}
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </ChartSizer>
  );
}
