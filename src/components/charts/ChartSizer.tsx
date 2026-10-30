"use client";

/**
 * ChartSizer — guards against Recharts' NaN-width console warning.
 *
 * When a chart is rendered inside a hidden container (e.g., a collapsed
 * accordion panel), ResponsiveContainer measures the parent's clientWidth
 * as 0 or NaN and logs a console warning: "Received NaN for the `width`
 * attribute". The chart then renders with no visible bars/points until the
 * container is expanded and Recharts re-measures.
 *
 * ChartSizer uses a ResizeObserver to wait until the parent has a non-zero
 * width, then renders its children. The children are still responsible for
 * using ResponsiveContainer with width="100%" — ChartSizer just ensures
 * the parent has a measurable width before the chart mounts.
 *
 * Used by: Histogram, BarChart, LineChart, ScatterChart, CorrelationHeatmap.
 */

import * as React from "react";

interface ChartSizerProps {
  /** Pixel height of the chart area (passed through to the wrapper div). */
  height: number;
  /** Accessible label for the wrapper. */
  "aria-label"?: string;
  /** Role for the wrapper (default: "img" for charts). */
  role?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartSizer({
  height,
  "aria-label": ariaLabel,
  role = "img",
  children,
  className,
}: ChartSizerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hasWidth, setHasWidth] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Initial check — if the container already has a width, render immediately.
    if (el.clientWidth > 0) {
      setHasWidth(true);
      return;
    }
    // Otherwise, observe until it gets a non-zero width.
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setHasWidth(true);
          ro.disconnect();
          break;
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      role={role}
      aria-label={ariaLabel}
      className={className}
      style={{ width: "100%", height, minWidth: 0 }}
    >
      {hasWidth ? children : (
        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
          {/* Placeholder while the container measures its width. Usually
              resolves within one frame; invisible to users on visible charts. */}
        </div>
      )}
    </div>
  );
}
