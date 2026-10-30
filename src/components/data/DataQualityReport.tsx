"use client";

/**
 * DataQualityReport — before/after report for the cleaning lab.
 *
 * Computes real counts: missing values per column, duplicate rows,
 * mixed-type columns, invalid dates, range violations. Updates whenever
 * the input DataFrame changes (the cleaning operations produce a new df).
 */

import * as React from "react";
import { AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import type { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { cn } from "@/lib/utils";

interface DataQualityReportProps {
  df: DataFrame;
  /** Optional column constraints for range / allowed-values checks. */
  constraints?: {
    column: string;
    min?: number;
    max?: number;
    allowed?: (string | number)[];
  }[];
  className?: string;
}

export function DataQualityReport({ df, constraints = [], className }: DataQualityReportProps) {
  const issues: { column: string; issue: string; count: number; severity: "error" | "warning" | "info" }[] = [];

  // Missing values
  for (const c of df.columns) {
    const nullCount = df.isnaCount()[c] ?? 0;
    if (nullCount > 0) {
      issues.push({
        column: c,
        issue: "Missing values",
        count: nullCount,
        severity: "warning",
      });
    }
  }

  // Duplicates (full-row)
  const dupCount = df.countDuplicates();
  if (dupCount > 0) {
    issues.push({
      column: "(whole row)",
      issue: "Duplicate rows",
      count: dupCount,
      severity: "warning",
    });
  }

  // Duplicate business keys (order_id)
  const keyCols = df.columns.filter((c) => c.endsWith("_id") || c === "id");
  for (const k of keyCols) {
    const dups = df.countDuplicates([k]);
    if (dups > 0) {
      issues.push({
        column: k,
        issue: `Duplicate ${k} values`,
        count: dups,
        severity: "error",
      });
    }
  }

  // Mixed-type columns (Pandas "object" dtype with both numbers and strings)
  for (const c of df.columns) {
    if (df.dtype(c) !== "object") continue;
    let hasNum = false;
    let hasStr = false;
    for (const v of df.column(c)) {
      if (typeof v === "number") hasNum = true;
      else if (typeof v === "string") hasStr = true;
    }
    if (hasNum && hasStr) {
      issues.push({
        column: c,
        issue: "Mixed types (numbers and strings in object column)",
        count: df.column(c).filter((v) => typeof v === "string").length,
        severity: "warning",
      });
    }
  }

  // Invalid dates (object dtype that should be datetime)
  for (const c of df.columns) {
    if (!/date|time/.test(c.toLowerCase())) continue;
    for (const v of df.column(c)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && !/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?Z?)?$/.test(v)) {
        issues.push({
          column: c,
          issue: "Invalid date format (does not match YYYY-MM-DD)",
          count: df.column(c).filter((vv) => typeof vv === "string" && !/^\d{4}-\d{2}-\d{2}/.test(vv)).length,
          severity: "error",
        });
        break;
      }
    }
  }

  // Constraint violations
  for (const con of constraints) {
    if (!df.columns.includes(con.column)) continue;
    let viol = 0;
    for (const v of df.column(con.column)) {
      if (typeof v !== "number") continue;
      if (con.min !== undefined && v < con.min) viol++;
      else if (con.max !== undefined && v > con.max) viol++;
    }
    if (viol > 0) {
      issues.push({
        column: con.column,
        issue: `Out of range [${con.min ?? "—"}, ${con.max ?? "—"}]`,
        count: viol,
        severity: "warning",
      });
    }
    if (con.allowed) {
      const inv = df.column(con.column).filter((v) => v !== null && !con.allowed!.includes(v as string | number)).length;
      if (inv > 0) {
        issues.push({
          column: con.column,
          issue: `Not in allowed values`,
          count: inv,
          severity: "warning",
        });
      }
    }
  }

  const totalRows = df.rows.length;
  const cleanRows = df.dropna("rows", "any").dropDuplicates().rows.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Rows" value={fmt(totalRows, 0)} />
        <StatCard label="Columns" value={fmt(df.columns.length, 0)} />
        <StatCard label="Issues found" value={fmt(issues.length, 0)} tone={issues.length > 0 ? "warning" : "validated"} />
        <StatCard label="Fully clean rows" value={fmt(cleanRows, 0)} tone="validated" />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Issues by column
          </p>
        </div>
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-[var(--color-role-validated)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            No issues detected.
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {issues.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                <span className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-3.5 w-3.5",
                      i.severity === "error" ? "text-[var(--color-role-error)]" : "text-[var(--color-role-warning)]"
                    )}
                    aria-hidden
                  />
                  <code className="text-mono font-medium">{i.column}</code>
                  <span className="text-muted-foreground">{i.issue}</span>
                </span>
                <span className="text-mono rounded bg-muted px-1.5 py-0.5">{i.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "data" }: { label: string; value: string; tone?: "data" | "transform" | "stats" | "validated" | "warning" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-2 role-${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-mono mt-0.5 text-sm font-semibold text-role">{value}</p>
    </div>
  );
}
