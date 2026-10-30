"use client";

import {
  ScatterChart as RScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_THEME, TOOLTIP_STYLE, AXIS_TICK, axisLabel } from "./chart-theme";
import { ChartSizer } from "./ChartSizer";

interface ScatterChartProps {
  data: { x: number; y: number; label?: string }[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  correlation?: number;
  correlationLabel?: string;
  height?: number;
  altText?: string;
}

export function ScatterChart({
  data,
  xLabel,
  yLabel,
  xUnit,
  yUnit,
  correlation,
  correlationLabel,
  height = 320,
  altText,
}: ScatterChartProps) {
  const safeData = data.filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
  const hasData = safeData.length > 0;

  const fullXLabel = xLabel + (xUnit ? ` (${xUnit})` : "");
  const fullYLabel = yLabel + (yUnit ? ` (${yUnit})` : "");

  return (
    <ChartSizer height={height} aria-label={altText ?? `Scatter plot of ${xLabel} vs ${yLabel}`}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <RScatterChart margin={{ top: 12, right: 24, bottom: 32, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis
              type="number"
              dataKey="x"
              name={fullXLabel}
              tick={AXIS_TICK}
              label={axisLabel(fullXLabel, 0, "insideBottom")}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={fullYLabel}
              tick={AXIS_TICK}
              label={axisLabel(fullYLabel)}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: CHART_THEME.grid }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number, name: string, item: { payload?: { label?: string } }) => {
                const label = item?.payload?.label ? ` (${item.payload.label})` : "";
                if (name === "x") return [`${Number(value).toFixed(2)}${label}`, fullXLabel];
                if (name === "y") return [Number(value).toFixed(2), fullYLabel];
                return [Number(value).toFixed(2), name];
              }}
            />
            <Scatter
              data={safeData}
              fill={CHART_THEME.cyan}
              fillOpacity={0.7}
              stroke={CHART_THEME.cyan}
            />
            {correlation !== undefined && correlationLabel && (
              <text
                x="95%"
                y="10"
                textAnchor="end"
                fontSize="11"
                fill={CHART_THEME.axisText}
              >
                {correlationLabel} = {Number.isFinite(correlation) ? correlation.toFixed(3) : "NaN"}
              </text>
            )}
          </RScatterChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          No (x, y) pairs with both values numeric.
        </div>
      )}
    </ChartSizer>
  );
}
