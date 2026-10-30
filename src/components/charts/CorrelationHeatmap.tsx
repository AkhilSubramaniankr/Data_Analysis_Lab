"use client";

/**
 * CorrelationHeatmap — coloured matrix view of a correlation matrix.
 *
 * Cells are coloured by the sign and magnitude of the correlation
 * (deep navy = strong negative, white = 0, AI-blue = strong positive).
 * Each cell shows the actual numeric value. Accessible: tabular text
 * fallback for screen readers.
 */

import * as React from "react";
import { fmt } from "@/lib/data/frame";

interface CorrelationHeatmapProps {
  columns: string[];
  matrix: number[][];
  /** Optional: which correlation method this matrix represents (Pearson / Spearman). */
  method?: "pearson" | "spearman";
  /** Accessible caption. */
  caption?: string;
}

export function CorrelationHeatmap({ columns, matrix, method = "pearson", caption }: CorrelationHeatmapProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {method === "spearman" ? "Spearman rank correlation matrix" : "Pearson correlation matrix"}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption ?? "Correlation matrix"}</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left"></th>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-2 py-1 text-center">
                  <code className="text-mono text-[10px]">{c}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowName, i) => (
              <tr key={rowName}>
                <th scope="row" className="px-2 py-1 text-right">
                  <code className="text-mono text-[10px]">{rowName}</code>
                </th>
                {columns.map((colName, j) => {
                  const v = matrix[i]?.[j];
                  return (
                    <td
                      key={colName}
                      className="text-mono px-2 py-1 text-center font-semibold"
                      style={{
                        background: heatColor(v),
                        color: "#E2E8F0",
                      }}
                      title={`${rowName} vs ${colName}: ${fmt(v, 3)}`}
                    >
                      {fmt(v, 2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>Color: dark = 0 (no correlation), cyan = strong positive (+1), blue = strong negative (-1)</span>
        <span>Diagonal = 1.0 (perfect self-correlation).</span>
      </div>
    </div>
  );
}

function heatColor(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "#303846";
  // v in [-1, 1]. Positive → cyan tint; negative → blue tint.
  if (v >= 0) {
    // Mix cyan (#38BDF8) with dark surface (#141922)
    const alpha = v * 0.7;
    const r = Math.round(0x14 + (0x38 - 0x14) * alpha);
    const g = Math.round(0x19 + (0xBD - 0x19) * alpha);
    const b = Math.round(0x22 + (0xF8 - 0x22) * alpha);
    return `rgb(${r},${g},${b})`;
  }
  const alpha = -v * 0.7;
  // Mix blue (#3B82F6) with dark surface (#141922)
  const r = Math.round(0x14 + (0x3B - 0x14) * alpha);
  const g = Math.round(0x19 + (0x82 - 0x19) * alpha);
  const b = Math.round(0x22 + (0xF6 - 0x22) * alpha);
  return `rgb(${r},${g},${b})`;
}
