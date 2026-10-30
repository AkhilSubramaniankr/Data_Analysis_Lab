"use client";

/**
 * Module 5 Lab — Grouping, Aggregation, Pivot Tables, Crosstabs.
 *
 * Master spec §10. Interactive groupby + agg, pivot_table, and crosstab
 * on the Retail Sales dataset. Every number is computed from real rows.
 */

import * as React from "react";
import { Layers, BookOpen, Grid3x3, Table2 } from "lucide-react";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import type { AggFunc, Row } from "@/lib/data/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE5_EXERCISES } from "@/lib/content/exercises/module5";

const AGG_FUNCS: AggFunc[] = ["sum", "mean", "median", "min", "max", "count", "nunique", "std", "var"];

export function Module5Lab() {
  const retail = React.useMemo(() => {
    const spec = buildRetailSales();
    return DataFrame.fromRows(spec.rows);
  }, []);

  const categoricalCols = retail.columns.filter((c) => retail.dtype(c) === "object");
  const numericCols = retail.columns.filter((c) => {
    const dt = retail.dtype(c);
    return dt === "int64" || dt === "float64";
  });

  // --- groupby state ---
  const [groupCols, setGroupCols] = React.useState<string[]>(["region"]);
  const [metricCol, setMetricCol] = React.useState<string>("revenue");
  const [aggFn, setAggFn] = React.useState<AggFunc>("sum");

  const toggleGroup = (c: string) => {
    setGroupCols((g) => (g.includes(c) ? g.filter((x) => x !== c) : [...g, c]));
  };

  const grouped = React.useMemo(() => {
    if (groupCols.length === 0) return null;
    return retail.groupBy(groupCols, [{ column: metricCol, fn: aggFn, as: `${aggFn}_${metricCol}` }]);
  }, [retail, groupCols, metricCol, aggFn]);

  const groupedCode = React.useMemo(() => {
    const cols = groupCols.map((c) => `"${c}"`).join(", ");
    return `# Group by ${groupCols.length > 1 ? "multiple columns" : "one column"}\n` +
      `grouped = df.groupby([${cols}])["${metricCol}"].${aggFn}().reset_index()\n` +
      `# or named aggregation:\n` +
      `df.groupby([${cols}]).agg(${aggFn}_${metricCol}=("${aggFn}", "${metricCol}"))`;
  }, [groupCols, metricCol, aggFn]);

  // --- pivot state ---
  const [pvIndex, setPvIndex] = React.useState<string>("category");
  const [pvCols, setPvCols] = React.useState<string>("region");
  const [pvVals, setPvVals] = React.useState<string>("revenue");
  const [pvAgg, setPvAgg] = React.useState<AggFunc>("sum");
  const [pvMargins, setPvMargins] = React.useState<boolean>(true);

  const pivoted = React.useMemo(() => {
    try {
      return retail.pivotTable({
        index: pvIndex,
        columns: pvCols,
        values: pvVals,
        aggfunc: pvAgg,
        margins: pvMargins,
      });
    } catch {
      return null;
    }
  }, [retail, pvIndex, pvCols, pvVals, pvAgg, pvMargins]);

  const pvCode = `df.pivot_table(\n    index="${pvIndex}",\n    columns="${pvCols}",\n    values="${pvVals}",\n    aggfunc="${pvAgg}",\n    margins=${pvMargins},\n)`;

  // --- crosstab state ---
  const [ctRow, setCtRow] = React.useState<string>("category");
  const [ctCol, setCtCol] = React.useState<string>("region");
  const [ctNormalize, setCtNormalize] = React.useState<"none" | "index" | "columns" | "all">("none");

  const crosstab = React.useMemo(() => {
    if (ctNormalize === "none") {
      return retail.crosstab({ index: ctRow, columns: ctCol, margins: true });
    }
    // For normalize modes, compute manually for now
    const ct = retail.crosstab({ index: ctRow, columns: ctCol, margins: false });
    if (ctNormalize === "all") {
      const total = ct.rows.reduce((acc, r) => acc + ct.columns.filter((c) => c !== ctRow).reduce((s, c) => s + (typeof r[c] === "number" ? r[c] : 0), 0), 0);
      const newRows: Row[] = ct.rows.map((r) => {
        const out: Row = { [ctRow]: r[ctRow] };
        for (const c of ct.columns) {
          if (c === ctRow) continue;
          out[c] = typeof r[c] === "number" && total > 0 ? r[c] / total : null;
        }
        return out;
      });
      return new DataFrame(ct.columns, newRows);
    }
    if (ctNormalize === "index") {
      // Row proportions: each row's cells / row sum
      const newRows: Row[] = ct.rows.map((r) => {
        const rowSum = ct.columns.filter((c) => c !== ctRow).reduce((s, c) => s + (typeof r[c] === "number" ? r[c] : 0), 0);
        const out: Row = { [ctRow]: r[ctRow] };
        for (const c of ct.columns) {
          if (c === ctRow) continue;
          out[c] = typeof r[c] === "number" && rowSum > 0 ? r[c] / rowSum : null;
        }
        return out;
      });
      return new DataFrame(ct.columns, newRows);
    }
    // columns
    const colSums: Record<string, number> = {};
    for (const c of ct.columns) {
      if (c === ctRow) continue;
      colSums[c] = ct.rows.reduce((s, r) => s + (typeof r[c] === "number" ? r[c] : 0), 0);
    }
    const newRows: Row[] = ct.rows.map((r) => {
      const out: Row = { [ctRow]: r[ctRow] };
      for (const c of ct.columns) {
        if (c === ctRow) continue;
        out[c] = typeof r[c] === "number" && colSums[c] > 0 ? r[c] / colSums[c] : null;
      }
      return out;
    });
    return new DataFrame(ct.columns, newRows);
  }, [retail, ctRow, ctCol, ctNormalize]);

  const ctCode = `pd.crosstab(\n    index=df["${ctRow}"],\n    columns=df["${ctCol}"],\n    normalize="${ctNormalize === "none" ? "False" : `'${ctNormalize}'`}"${ctNormalize !== "none" ? "" : ",\n    margins=True"},\n)`;

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Group, pivot, and crosstab the Retail Sales dataset. Every number is computed from the actual rows — no fabricated summary statistics.
      </p>

      {/* --- groupby --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4" aria-hidden />
          groupby + agg
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick the grouping column(s), the metric, and the aggregation function. The result updates live.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Group by (toggle)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {categoricalCols.map((c) => (
                <label key={c} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
                  <Checkbox checked={groupCols.includes(c)} onCheckedChange={() => toggleGroup(c)} id={`grp-${c}`} />
                  <Label htmlFor={`grp-${c}`} className="text-mono cursor-pointer text-xs">{c}</Label>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Metric</Label>
            <Select value={metricCol} onValueChange={setMetricCol}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Aggregation</Label>
            <Select value={aggFn} onValueChange={(v) => setAggFn(v as AggFunc)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGG_FUNCS.map((f) => <SelectItem key={f} value={f}><code className="text-mono">{f}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <CodeAndResult code={groupedCode} caption="groupby + agg (Pandas equivalent)" note="The aggregation function must match the business question: sum for totals (revenue, profit), mean for averages (AOV), count for volumes, nunique for distinct customers. Pick wrong and the summary is misleading.">
            {grouped ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Result: <span className="text-mono">{grouped.rows.length}</span> groups.
                </p>
                <div className="mt-2"><DatasetTable df={grouped} pageSize={15} /></div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Pick at least one grouping column.
              </div>
            )}
          </CodeAndResult>
        </div>
      </div>

      {/* --- pivot --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Grid3x3 className="h-4 w-4" aria-hidden />
          pivot_table
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          A pivot table is a 2-dimensional aggregation: rows index one categorical, columns index another, cells hold an aggregated metric. Try toggling margins to see subtotals.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Index (rows)</Label>
            <Select value={pvIndex} onValueChange={setPvIndex}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoricalCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Columns</Label>
            <Select value={pvCols} onValueChange={setPvCols}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoricalCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Values</Label>
            <Select value={pvVals} onValueChange={setPvVals}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {numericCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Aggregation</Label>
            <Select value={pvAgg} onValueChange={(v) => setPvAgg(v as AggFunc)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGG_FUNCS.map((f) => <SelectItem key={f} value={f}><code className="text-mono">{f}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs">
          <Checkbox checked={pvMargins} onCheckedChange={(v) => setPvMargins(Boolean(v))} id="pv-margins" />
          <Label htmlFor="pv-margins" className="cursor-pointer">margins=True (show row &amp; column subtotals)</Label>
        </label>

        <div className="mt-3">
          <CodeAndResult code={pvCode} caption="pivot_table (Pandas equivalent)" note="pivot_table handles missing combinations (returns NaN). Use margins=True for subtotals. To go from wide back to long, use df.melt().">
            {pivoted ? <DatasetTable df={pivoted} pageSize={15} /> : <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Invalid pivot configuration.</div>}
          </CodeAndResult>
        </div>
      </div>

      {/* --- crosstab --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Table2 className="h-4 w-4" aria-hidden />
          crosstab
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          A crosstab counts (or normalises) the frequency of two categoricals. Use normalize='index' for row proportions, 'columns' for column proportions, 'all' for cell proportions.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Index (rows)</Label>
            <Select value={ctRow} onValueChange={setCtRow}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoricalCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Columns</Label>
            <Select value={ctCol} onValueChange={setCtCol}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoricalCols.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider">Normalize</Label>
            <Select value={ctNormalize} onValueChange={(v) => setCtNormalize(v as "none" | "index" | "columns" | "all")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">none (counts)</SelectItem>
                <SelectItem value="index">index (row %)</SelectItem>
                <SelectItem value="columns">columns (col %)</SelectItem>
                <SelectItem value="all">all (cell %)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3">
          <CodeAndResult code={ctCode} caption="crosstab (Pandas equivalent)" note="crosstab is convenience for pivot_table with aggfunc='count'. Use normalize='index' to compare row proportions (e.g., does the product mix differ by region?). normalize='columns' to compare column proportions (e.g., is the region mix the same for every category?).">
            {crosstab ? <DatasetTable df={crosstab} pageSize={15} /> : <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Invalid crosstab configuration.</div>}
          </CodeAndResult>
        </div>
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE5_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}
