"use client";

/**
 * PandasPlayground — interactive Pandas operation environment.
 *
 * Master spec §21: "Create a practical environment where learners can
 * select operations and inspect their effects. Provide: a dataset
 * preview, a code panel, an output panel, a simple explanation panel,
 * a reset button, a step-by-step execution history, and a before-and-
 * after data comparison."
 *
 * The learner picks an operation from a palette, the system generates
 * the matching Pandas code and executes the operation using the
 * in-browser DataFrame engine. Every result is real — computed from
 * the active dataset. The environment is clearly labelled as a
 * "deterministic demonstration" because Python is not actually
 * executed (per master spec: "If code execution is unavailable,
 * implement deterministic demonstrations and clearly label simulated
 * execution").
 *
 * Step history + before/after comparison + reset are all functional.
 */

import * as React from "react";
import {
  Play,
  RotateCcw,
  History,
  Eye,
  Lightbulb,
  Trash2,
  ChevronRight,
  Database,
  Code2,
} from "lucide-react";
import { BUILT_IN_DATASETS } from "@/lib/data/datasets";
import { DataFrame, fmt } from "@/lib/data/frame";
import type { CellValue } from "@/lib/data/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatasetTable } from "@/components/data/DatasetTable";
import { CodePanel } from "@/components/learning/CodePanel";

interface OperationDef {
  id: string;
  category: "inspect" | "select" | "filter" | "transform" | "aggregate" | "sort";
  name: string;
  pandasCode: (df: DataFrame, params: Record<string, string>) => string;
  apply: (df: DataFrame, params: Record<string, string>) => DataFrame;
  explanation: string;
  paramDefs: { name: string; label: string; type: "column" | "text"; default: string }[];
}

const OPERATIONS: OperationDef[] = [
  {
    id: "head", category: "inspect", name: "df.head(n)",
    paramDefs: [{ name: "n", label: "Rows", type: "text", default: "5" }],
    pandasCode: (_df, p) => `df.head(${p.n || "5"})`,
    apply: (df, p) => df.head(Number(p.n) || 5),
    explanation: "head(n) returns the first n rows. Use it to peek at the start of the dataset after a chain of operations.",
  },
  {
    id: "tail", category: "inspect", name: "df.tail(n)",
    paramDefs: [{ name: "n", label: "Rows", type: "text", default: "5" }],
    pandasCode: (_df, p) => `df.tail(${p.n || "5"})`,
    apply: (df, p) => df.tail(Number(p.n) || 5),
    explanation: "tail(n) returns the last n rows — useful for checking the end of a sorted or filtered dataset.",
  },
  {
    id: "describe", category: "inspect", name: "df.describe()",
    paramDefs: [],
    pandasCode: () => `df.describe()`,
    apply: (df) => {
      const desc = df.describe();
      if (desc.length === 0) return df.head(0);
      const stats = ["count", "mean", "std", "min", "q25", "q50", "q75", "max"];
      const rows = stats.map((s) => {
        const row: Record<string, CellValue> = { statistic: s };
        for (const d of desc) row[d.column] = fmt(d[s as keyof typeof d] as number, 2);
        return row;
      });
      return new DataFrame(["statistic", ...desc.map((d) => d.column)], rows);
    },
    explanation: "describe() returns count/mean/std/min/quantiles/max for every numeric column. Non-numeric columns are excluded (use include='all' to include them).",
  },
  {
    id: "info", category: "inspect", name: "df.info()",
    paramDefs: [],
    pandasCode: () => `df.info()`,
    apply: (df) => {
      const info = df.info();
      const rows = info.columns.map((c) => ({
        column: c.name, dtype: c.dtype,
        non_null: String(c.nonNull), null_count: String(c.nullCount),
      }));
      return new DataFrame(["column", "dtype", "non_null", "null_count"], rows);
    },
    explanation: "info() reveals dtypes, non-null counts, and total memory. Useful as the first call on an unfamiliar dataset.",
  },
  {
    id: "select", category: "select", name: "df[['col1', 'col2']]",
    paramDefs: [{ name: "cols", label: "Columns (comma-separated)", type: "text", default: "revenue, profit" }],
    pandasCode: (_df, p) => `df[[${(p.cols || "").split(",").map((c) => `"${c.trim()}"`).join(", ")}]]`,
    apply: (df, p) => {
      const cols = (p.cols || "").split(",").map((c) => c.trim()).filter((c) => df.columns.includes(c));
      return df.select(cols);
    },
    explanation: "Column selection with double brackets returns a DataFrame (single brackets returns a Series). Always verify the column names exist before selecting.",
  },
  {
    id: "filter_gt", category: "filter", name: "df[df['col'] > value]",
    paramDefs: [
      { name: "col", label: "Column", type: "column", default: "revenue" },
      { name: "val", label: "Value", type: "text", default: "100" },
    ],
    pandasCode: (_df, p) => `df[df["${p.col}"] > ${p.val}]`,
    apply: (df, p) => {
      const v = Number(p.val);
      if (!Number.isFinite(v)) return df.head(0);
      return df.filter((r) => typeof r[p.col] === "number" && (r[p.col] as number) > v);
    },
    explanation: "Boolean indexing: df[mask] returns only rows where the mask is True. Always wrap each condition in parentheses when combining with & or |.",
  },
  {
    id: "filter_eq", category: "filter", name: 'df[df["col"] == "value"]',
    paramDefs: [
      { name: "col", label: "Column", type: "column", default: "region" },
      { name: "val", label: "Value (string)", type: "text", default: "East" },
    ],
    pandasCode: (_df, p) => `df[df["${p.col}"] == "${p.val}"]`,
    apply: (df, p) => df.filter((r) => String(r[p.col]) === p.val),
    explanation: "String equality filter. Use .str.contains() for partial matches, .isin() for multiple values.",
  },
  {
    id: "assign", category: "transform", name: "df.assign(new = col * factor)",
    paramDefs: [
      { name: "new_col", label: "New column name", type: "text", default: "profit_margin" },
      { name: "expr", label: "Expression (e.g., profit / revenue * 100)", type: "text", default: "profit / revenue * 100" },
    ],
    pandasCode: (_df, p) => `df["${p.new_col}"] = ${p.expr}`,
    apply: (df, p) => {
      try {
        const expr = p.expr || "0";
        const cols = df.columns;
        const compiled = new Function("row", ...cols, `"use strict"; const np = { nan: NaN }; const where = (c, a, b) => c ? a : b; return (${expr});`);
        return df.withColumn(p.new_col, (r) => {
          try {
            const args = cols.map((c) => r[c]);
            const v = compiled(r, ...args);
            return typeof v === "number" && Number.isFinite(v) ? +v.toFixed(4) : null;
          } catch { return null; }
        });
      } catch { return df; }
    },
    explanation: "assign() creates a new column from an expression. Use column names directly. For division that might hit zero, use the safe form: profit.div(revenue.replace(0, np.nan)).",
  },
  {
    id: "fillna", category: "transform", name: "df.fillna(value)",
    paramDefs: [
      { name: "col", label: "Column", type: "column", default: "customer_id" },
      { name: "val", label: "Fill value", type: "text", default: "UNKNOWN" },
    ],
    pandasCode: (_df, p) => `df["${p.col}"] = df["${p.col}"].fillna("${p.val}")`,
    apply: (df, p) => df.fillnaPerColumn({ [p.col]: p.val }),
    explanation: "fillna() replaces NaN/None with the given value. For numeric columns, use median or mean; for categoricals, use 'UNKNOWN' or the mode.",
  },
  {
    id: "dropna", category: "transform", name: "df.dropna()",
    paramDefs: [{ name: "subset", label: "Subset columns (optional)", type: "text", default: "" }],
    pandasCode: (_df, p) => p.subset ? `df.dropna(subset=[${p.subset.split(",").map((c) => `"${c.trim()}"`).join(", ")}])` : `df.dropna()`,
    apply: (df, p) => {
      if (p.subset) {
        const cols = p.subset.split(",").map((c) => c.trim()).filter((c) => df.columns.includes(c));
        const rows = df.rows.filter((r) => cols.every((c) => r[c] !== null && r[c] !== undefined));
        return new DataFrame(df.columns, rows);
      }
      return df.dropna("rows", "any");
    },
    explanation: "dropna() removes rows with any NaN. Use subset= to target specific columns. Dropping rows biases the dataset toward complete records — prefer fillna + an indicator column when possible.",
  },
  {
    id: "drop_duplicates", category: "transform", name: "df.drop_duplicates()",
    paramDefs: [{ name: "subset", label: "Subset (optional)", type: "text", default: "" }],
    pandasCode: (_df, p) => p.subset ? `df.drop_duplicates(subset=[${p.subset.split(",").map((c) => `"${c.trim()}"`).join(", ")}])` : `df.drop_duplicates()`,
    apply: (df, p) => {
      if (p.subset) {
        const cols = p.subset.split(",").map((c) => c.trim()).filter((c) => df.columns.includes(c));
        return df.dropDuplicates(cols);
      }
      return df.dropDuplicates();
    },
    explanation: "drop_duplicates() removes rows that are fully duplicated. Use subset= to deduplicate by specific columns (e.g., order_id).",
  },
  {
    id: "groupby_sum", category: "aggregate", name: "df.groupby('col').sum()",
    paramDefs: [
      { name: "group_col", label: "Group by", type: "column", default: "region" },
      { name: "agg_col", label: "Aggregate", type: "column", default: "revenue" },
    ],
    pandasCode: (_df, p) => `df.groupby("${p.group_col}")["${p.agg_col}"].sum().reset_index()`,
    apply: (df, p) => df.groupBy([p.group_col], [{ column: p.agg_col, fn: "sum", as: `${p.agg_col}_sum` }]),
    explanation: "groupby + sum aggregates the metric within each group. Use mean for averages, count for volumes, nunique for distinct counts.",
  },
  {
    id: "groupby_mean", category: "aggregate", name: "df.groupby('col').mean()",
    paramDefs: [
      { name: "group_col", label: "Group by", type: "column", default: "category" },
      { name: "agg_col", label: "Aggregate", type: "column", default: "profit" },
    ],
    pandasCode: (_df, p) => `df.groupby("${p.group_col}")["${p.agg_col}"].mean().reset_index()`,
    apply: (df, p) => df.groupBy([p.group_col], [{ column: p.agg_col, fn: "mean", as: `${p.agg_col}_mean` }]),
    explanation: "groupby + mean computes the average per group. Be careful: mean is sensitive to outliers — use median for skewed distributions.",
  },
  {
    id: "value_counts", category: "aggregate", name: "df['col'].value_counts()",
    paramDefs: [{ name: "col", label: "Column", type: "column", default: "category" }],
    pandasCode: (_df, p) => `df["${p.col}"].value_counts().reset_index()`,
    apply: (df, p) => {
      const vc = df.valueCounts(p.col);
      const rows = vc.map((v) => ({ value: String(v.value), count: v.count }));
      return new DataFrame(["value", "count"], rows);
    },
    explanation: "value_counts() returns the frequency of each distinct value, sorted by count desc. The categorical equivalent of a histogram.",
  },
  {
    id: "sort_values", category: "sort", name: "df.sort_values('col')",
    paramDefs: [
      { name: "col", label: "Sort by", type: "column", default: "revenue" },
      { name: "asc", label: "Ascending (true/false)", type: "text", default: "false" },
    ],
    pandasCode: (_df, p) => `df.sort_values("${p.col}", ascending=${p.asc === "true" ? "True" : "False"})`,
    apply: (df, p) => df.sort(p.col, p.asc === "true" ? "asc" : "desc"),
    explanation: "sort_values() sorts by one or more columns. ascending=False for descending. Always inspect after sorting — it changes row order.",
  },
  {
    id: "nlargest", category: "sort", name: "df.nlargest(n, 'col')",
    paramDefs: [
      { name: "n", label: "Top n", type: "text", default: "5" },
      { name: "col", label: "Column", type: "column", default: "revenue" },
    ],
    pandasCode: (_df, p) => `df.nlargest(${p.n}, "${p.col}")`,
    apply: (df, p) => df.nlargest(Number(p.n) || 5, p.col),
    explanation: "nlargest returns the top-n rows by the given column. Faster than sort_values + head for large datasets.",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  inspect: "Inspect", select: "Select", filter: "Filter",
  transform: "Transform", aggregate: "Aggregate", sort: "Sort",
};

interface HistoryStep {
  id: number; opId: string; opName: string; code: string;
  shapeBefore: [number, number]; shapeAfter: [number, number];
  explanation: string;
}

export function PandasPlayground() {
  const [datasetId, setDatasetId] = React.useState("retail");
  const spec = BUILT_IN_DATASETS.find((d) => d.id === datasetId) ?? BUILT_IN_DATASETS[0];
  const [originalDf, setOriginalDf] = React.useState(() => DataFrame.fromRows(spec.rows));
  const [currentDf, setCurrentDf] = React.useState<DataFrame>(originalDf);
  const [selectedOp, setSelectedOp] = React.useState("head");
  const [params, setParams] = React.useState<Record<string, string>>({});
  const [history, setHistory] = React.useState<HistoryStep[]>([]);
  const [stepId, setStepId] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const newDf = DataFrame.fromRows(spec.rows);
    setOriginalDf(newDf);
    setCurrentDf(newDf);
    setHistory([]); setStepId(0); setError(null);
  }, [spec]);

  const op = OPERATIONS.find((o) => o.id === selectedOp) ?? OPERATIONS[0];
  const columns = currentDf.columns;

  React.useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const pd of op.paramDefs) defaults[pd.name] = pd.default;
    setParams(defaults); setError(null);
  }, [selectedOp, op]);

  const code = op.pandasCode(currentDf, params);

  const runOp = () => {
    try {
      setError(null);
      const result = op.apply(currentDf, params);
      setHistory((h) => [...h, {
        id: stepId, opId: op.id, opName: op.name, code,
        shapeBefore: currentDf.shape, shapeAfter: result.shape, explanation: op.explanation,
      }]);
      setStepId((s) => s + 1);
      setCurrentDf(result);
    } catch (e) { setError((e as Error).message); }
  };

  const reset = () => { setCurrentDf(originalDf); setHistory([]); setStepId(0); setError(null); };

  const undoLast = () => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    let df = originalDf;
    for (const step of newHistory) {
      const stepOp = OPERATIONS.find((o) => o.id === step.opId);
      if (stepOp) df = stepOp.apply(df, {});
    }
    setCurrentDf(df);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Dataset</Label>
          <Select value={datasetId} onValueChange={setDatasetId}>
            <SelectTrigger className="mt-1 w-[16rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUILT_IN_DATASETS.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name} ({d.rows.length} rows)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current state</span>
          <span className="text-mono rounded-md border border-border bg-card px-3 py-1.5 text-sm">
            ({currentDf.shape[0]}, {currentDf.shape[1]}) — {currentDf.columns.length} columns
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={undoLast} disabled={history.length === 0} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Undo last
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Reset all
        </Button>
      </div>

      <div className="role-data border-role bg-role-soft rounded-md border p-2 text-xs">
        <p className="font-semibold text-role">Deterministic demonstration — not real Python execution</p>
        <p className="mt-0.5 text-foreground/80">
          The playground uses the in-browser DataFrame engine. Every operation produces a real result from the actual rows, but Pandas is not executed. The generated code is the equivalent you'd type in a Jupyter notebook.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operation palette</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <div key={cat} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              <div className="flex flex-wrap gap-1">
                {OPERATIONS.filter((o) => o.category === cat).map((o) => (
                  <button key={o.id} type="button" onClick={() => setSelectedOp(o.id)}
                    className={`text-mono rounded-md border px-2 py-1 text-[11px] transition ${
                      selectedOp === o.id
                        ? "border-[var(--color-ai-blue)] bg-[color-mix(in_oklch,var(--color-ai-blue)_10%,transparent)] text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}>{o.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h4 className="text-sm font-semibold">{op.name}</h4>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{op.explanation}</p>
        {op.paramDefs.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {op.paramDefs.map((pd) => (
              <div key={pd.name}>
                <Label className="text-xs">{pd.label}</Label>
                {pd.type === "column" ? (
                  <Select value={params[pd.name] ?? pd.default} onValueChange={(v) => setParams((p) => ({ ...p, [pd.name]: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => <SelectItem key={c} value={c}><code className="text-mono text-xs">{c}</code></SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="text-mono mt-1 h-8" value={params[pd.name] ?? pd.default}
                    onChange={(e) => setParams((p) => ({ ...p, [pd.name]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3"><CodePanel language="python" caption="Generated Pandas code" code={code} /></div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={runOp} className="gap-1.5"><Play className="h-4 w-4" aria-hidden /> Execute</Button>
          <Button variant="outline" size="sm" onClick={reset} disabled={history.length === 0} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset
          </Button>
          {history.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {history.length} step{history.length > 1 ? "s" : ""} executed
            </span>
          )}
          {error && (
            <p className="rounded-md border border-[var(--color-role-error)]/40 bg-[color-mix(in_oklch,var(--color-role-error)_8%,transparent)] px-2 py-1 text-xs text-[var(--color-role-error)]">Error: {error}</p>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden /> Before &amp; after
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Last operation: <span className="text-mono">{history[history.length - 1].shapeBefore.join("×")}</span> → <span className="text-mono">{history[history.length - 1].shapeAfter.join("×")}</span>
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Before</p>
              <div className="mt-1"><DatasetTable df={originalDf.head(5)} pageSize={5} /></div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">After (first 10)</p>
              <div className="mt-1"><DatasetTable df={currentDf.head(10)} pageSize={10} /></div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-muted-foreground" aria-hidden /> Current result ({currentDf.rows.length} rows)
        </h4>
        <div className="mt-2"><DatasetTable df={currentDf.head(20)} pageSize={10} /></div>
      </div>

      {history.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden /> Execution history ({history.length} step{history.length > 1 ? "s" : ""})
          </h4>
          <ol className="mt-2 flex flex-col gap-1">
            {history.map((step, i) => (
              <li key={step.id} className="flex items-start gap-2 rounded-md border border-border bg-background p-2 text-xs">
                <span className="text-mono shrink-0 font-semibold text-muted-foreground">{i + 1}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <code className="text-mono text-xs font-medium">{step.opName}</code>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                    <span className="text-mono text-[10px] text-muted-foreground">{step.shapeBefore.join("×")} → {step.shapeAfter.join("×")}</span>
                  </div>
                  <code className="text-mono rounded bg-muted/40 p-1 text-[10px]">{step.code}</code>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {history.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <Lightbulb className="mx-auto h-5 w-5 mb-1" aria-hidden />
          Pick an operation from the palette above, adjust its parameters, and click <strong>Execute</strong> to see the result. Every operation is recorded in the step history.
        </div>
      )}
    </div>
  );
}
