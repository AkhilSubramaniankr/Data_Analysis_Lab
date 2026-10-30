"use client";

/**
 * DatasetTable — paginated, sortable display of a DataFrame's rows.
 *
 * Real values, real pagination, real sort. No fabrication.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { DataFrame } from "@/lib/data/frame";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DatasetTableProps {
  df: DataFrame;
  /** Page size (default 10). */
  pageSize?: number;
  /** Optional caption for screen readers. */
  caption?: string;
  className?: string;
  /** Optional id of an outer <section>. */
  id?: string;
}

export function DatasetTable({ df, pageSize = 10, caption, className, id }: DatasetTableProps) {
  const [page, setPage] = React.useState(0);
  const [sortCol, setSortCol] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  React.useEffect(() => {
    // Reset to first page when the underlying DataFrame changes identity
    // (e.g., when the user picks a new dataset).
    setPage(0);
    setSortCol(null);
    setSortDir("asc");
  }, [df]);

  const sorted = React.useMemo(() => {
    if (!sortCol) return df;
    return df.sort(sortCol, sortDir);
  }, [df, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.rows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  if (df.rows.length === 0) {
    return (
      <div className={cn("rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground", className)}>
        No rows to display.
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)} id={id}>
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr>
              {sorted.columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="border-b border-border px-3 py-2 text-left font-medium"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c)}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                    aria-label={`Sort by ${c}${sortCol === c ? ` (${sortDir})` : ""}`}
                  >
                    {c}
                    {sortCol === c ? (
                      sortDir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                {sorted.columns.map((c) => (
                  <td key={c} className="px-3 py-1.5 align-top">
                    <CellValue value={r[c]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>
          {sorted.rows.length === 0
            ? "0 rows"
            : `Showing ${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, sorted.rows.length)} of ${sorted.rows.length}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            aria-label="Previous page"
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <span className="text-mono tabular-nums">
            {safePage + 1}/{totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            aria-label="Next page"
            className="h-7 px-2"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CellValue({ value }: { value: import("@/lib/data/types").CellValue }) {
  if (value === null || value === undefined) {
    return <span className="text-mono text-[var(--color-role-warning)]">NaN</span>;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return <span className="text-mono text-[var(--color-role-warning)]">NaN</span>;
    if (Number.isInteger(value)) return <span className="text-mono">{value}</span>;
    return <span className="text-mono">{value.toFixed(2)}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-mono">{String(value)}</span>;
  }
  return <span>{value}</span>;
}
