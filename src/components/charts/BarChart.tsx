"use client";

import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { CHART_THEME, TOOLTIP_STYLE, BAR_CURSOR, AXIS_TICK, axisLabel } from "./chart-theme";
import { ChartSizer } from "./ChartSizer";

interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  layout?: "vertical" | "horizontal";
  xLabel?: string;
  yLabel?: string;
  height?: number;
  altText?: string;
  highlightIndices?: number[];
  selectedIndices?: number[];
  useSelectionColors?: boolean;
}

export function BarChart({
  data,
  layout = "vertical",
  xLabel,
  yLabel,
  height = 320,
  altText,
  highlightIndices = [],
  selectedIndices,
  useSelectionColors = false,
}: BarChartProps) {
  const isHorizontal = layout === "horizontal";

  const getCellColor = (i: number) => {
    if (useSelectionColors && selectedIndices) {
      return selectedIndices.includes(i) ? CHART_THEME.selected : CHART_THEME.dropped;
    }
    return highlightIndices.includes(i) ? CHART_THEME.amber : CHART_THEME.cyan;
  };

  const getCellOpacity = (i: number) => {
    if (useSelectionColors && selectedIndices) {
      return selectedIndices.includes(i) ? 0.8 : 0.4;
    }
    return highlightIndices.includes(i) ? 0.8 : 0.7;
  };

  // Build axis elements — must be DIRECT children of RBarChart, NOT wrapped in Fragment
  const axes = isHorizontal
    ? [
        <XAxis key="x" type="number" tick={AXIS_TICK} label={xLabel ? axisLabel(xLabel, 0, "insideBottom") : undefined} />,
        <YAxis key="y" type="category" dataKey="label" tick={{ fill: CHART_THEME.axisText, fontSize: 10 }} width={140} label={yLabel ? axisLabel(yLabel) : undefined} interval={0} />,
      ]
    : [
        <XAxis key="x" dataKey="label" tick={{ fill: CHART_THEME.axisText, fontSize: 10 }} label={xLabel ? axisLabel(xLabel, 0, "insideBottom") : undefined} />,
        <YAxis key="y" tick={AXIS_TICK} label={yLabel ? axisLabel(yLabel) : undefined} />,
      ];

  return (
    <ChartSizer height={height} aria-label={altText ?? `Bar chart: ${data.length} categories`}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart
          data={data}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{ top: 12, right: 24, bottom: 32, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          {axes}
          <Tooltip
            cursor={BAR_CURSOR}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => (typeof v === "number" ? v.toFixed(2) : String(v))}
          />
          <Bar dataKey="value" fill={CHART_THEME.cyan} fillOpacity={0.7} stroke={CHART_THEME.cyan}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={getCellColor(i)}
                fillOpacity={getCellOpacity(i)}
                stroke={getCellColor(i)}
              />
            ))}
            <LabelList
              dataKey="value"
              position={isHorizontal ? "right" : "top"}
              formatter={(v: number) => typeof v === "number" ? (Math.abs(v) < 0.01 ? v.toFixed(4) : v.toFixed(2)) : String(v)}
              style={{ fontSize: 9, fill: CHART_THEME.axisText }}
            />
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </ChartSizer>
  );
}
