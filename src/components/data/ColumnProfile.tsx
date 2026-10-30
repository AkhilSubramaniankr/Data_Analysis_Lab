"use client";

/**
 * ColumnProfile — per-column profile for the Dataset Exploration lab.
 *
 * Shows the dtype, non-null count, null count, nunique, top value_counts,
 * and memory usage — all computed from the actual DataFrame, never fabricated.
 */

import * as React from "react";
import { Database } from "lucide-react";
import type { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ColumnProfileProps {
  df: DataFrame;
  className?: string;
}

export function ColumnProfile({ df, className }: ColumnProfileProps) {
  const numericCols = df.columns;
  const [col, setCol] = React.useState<string>(numericCols[0] ?? "");

  // Reset selection when df changes
  React.useEffect(() => {
    if (!df.columns.includes(col)) setCol(df.columns[0] ?? "");
  }, [df, col]);

  if (df.columns.length === 0) {
    return (
      <div className={cn("rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground", className)}>
        No columns to profile.
      </div>
    );
  }

  const safeCol = df.columns.includes(col) ? col : df.columns[0];
  const dtype = df.dtype(safeCol);
  const values = df.column(safeCol);
  const nullCount = values.filter((v) => v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))).length;
  const nonNull = values.length - nullCount;
  const nu = df.nunique(safeCol);
  const vc = df.valueCounts(safeCol).slice(0, 5);
  const memBytes = df.memoryUsage().find((m) => m.column === safeCol)?.bytes ?? 0;
  const isNumeric = dtype === "int64" || dtype === "float64";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Select value={safeCol} onValueChange={setCol}>
          <SelectTrigger className="w-[16rem]" aria-label="Select a column to profile">
            <SelectValue placeholder="Pick a column" />
          </SelectTrigger>
          <SelectContent>
            {df.columns.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="text-mono">{c}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <code className="text-mono rounded bg-muted px-2 py-0.5 text-xs">{dtype}</code>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Non-null" value={fmt(nonNull, 0)} tone="data" />
        <Stat label="Null" value={fmt(nullCount, 0)} tone={nullCount > 0 ? "warning" : "data"} />
        <Stat label="Unique" value={fmt(nu, 0)} tone="stats" />
        <Stat label="Memory (bytes)" value={fmt(memBytes, 0)} tone="data" />
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top 5 values (value_counts)</p>
        {vc.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No non-null values in this column.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {vc.map((v) => (
              <li key={String(v.value)} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-mono truncate">
                  {v.value === null || v.value === undefined ? "NaN" : String(v.value)}
                </span>
                <span className="text-mono rounded bg-muted px-1.5 py-0.5">{v.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isNumeric && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Numeric summary (describe)</p>
          <NumericSummary df={df} col={safeCol} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "data" | "transform" | "stats" | "validated" | "warning" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-2 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold text-role">{value}</p>
    </div>
  );
}

function NumericSummary({ df, col }: { df: import("@/lib/data/frame").DataFrame; col: string }) {
  const desc = df.describe().find((d) => d.column === col);
  if (!desc) {
    return <p className="mt-2 text-sm text-muted-foreground">No numeric values to describe.</p>;
  }
  const rows = [
    ["count", desc.count],
    ["mean", desc.mean],
    ["std", desc.std],
    ["min", desc.min],
    ["25%", desc.q25],
    ["50%", desc.q50],
    ["75%", desc.q75],
    ["max", desc.max],
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
      {rows.map(([k, v]) => (
        <div key={k} className="text-xs">
          <span className="text-mono text-muted-foreground">{k}</span>{" "}
          <span className="text-mono font-medium">{fmt(v as number, 2)}</span>
        </div>
      ))}
    </div>
  );
}
