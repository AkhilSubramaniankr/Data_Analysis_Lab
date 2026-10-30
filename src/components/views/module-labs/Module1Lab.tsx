"use client";

/**
 * Module 1 Lab — Dataset Exploration.
 *
 * Master spec §6. Interactive dataset inspection: head/tail/sample,
 * dtypes, descriptive summaries, unique values, cardinality, memory usage.
 *
 * Every result is computed from the active dataset (real DataFrame engine,
 * real rows). The Pandas code shown is the equivalent the learner would
 * type — clearly labelled as "deterministic demonstration" since the
 * execution is in TypeScript, not Python.
 */

import * as React from "react";
import { BookOpen, FileSearch } from "lucide-react";
import { BUILT_IN_DATASETS } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ColumnProfile } from "@/components/data/ColumnProfile";
import { ExerciseCard, type ExerciseSpec } from "@/components/data/ExerciseCard";
import { MODULE1_EXERCISES } from "@/lib/content/exercises/module1";

interface Module1LabProps {
  /** Pre-selected dataset id (default: "retail"). */
  defaultDatasetId?: string;
}

export function Module1Lab({ defaultDatasetId = "retail" }: Module1LabProps) {
  const [datasetId, setDatasetId] = React.useState<string>(defaultDatasetId);
  const spec = BUILT_IN_DATASETS.find((d) => d.id === datasetId) ?? BUILT_IN_DATASETS[0];
  const df = React.useMemo(() => DataFrame.fromRows(spec.rows), [spec]);

  // Inspection mode: head / tail / sample
  const [mode, setMode] = React.useState<"head" | "tail" | "sample">("head");
  const [n, setN] = React.useState<number>(5);
  const inspected = React.useMemo(() => {
    if (mode === "head") return df.head(n);
    if (mode === "tail") return df.tail(n);
    return df.sample(n, 42);
  }, [df, mode, n]);

  const inspectionCode = React.useMemo(() => {
    if (mode === "head") return `df.head(${n})`;
    if (mode === "tail") return `df.tail(${n})`;
    return `df.sample(${n}, random_state=42)`;
  }, [mode, n]);

  // info() panel
  const info = df.info();

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <FileSearch className="h-4 w-4 text-[var(--color-ai-blue)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a built-in dataset, inspect rows, study the data dictionary,
        explore per-column profiles, and read the data-quality report.
        All numbers below are computed from the actual rows in your browser.
      </p>

      {/* Deterministic-demo callout */}
      <div className="role-data border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="font-semibold text-role">How this lab works</p>
        <p className="mt-1 text-foreground/80">
          The lab uses a real in-browser DataFrame engine that mirrors the
          Pandas API. The arithmetic is real (every mean, count, dtype is
          computed from the actual rows). Pandas is <em>not</em> executed —
          the code blocks below show the equivalent Pandas you would type
          to reproduce each result. This is a clearly-labelled deterministic
          demonstration, not Python execution.
        </p>
      </div>

      {/* Dataset picker */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dataset</span>
        <Select value={datasetId} onValueChange={setDatasetId}>
          <SelectTrigger className="w-[16rem]" aria-label="Pick a dataset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUILT_IN_DATASETS.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} ({d.rows.length} rows)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-mono text-xs text-muted-foreground">
          shape = ({df.shape[0]}, {df.shape[1]})
        </span>
      </div>

      {/* 1. Inspection: head/tail/sample */}
      <Subsection
        title="1 · Inspect rows: head, tail, sample"
        code={inspectionCode}
        caption={`${mode}(${n}) — ${spec.name}`}
        note="head(n) returns the first n rows in insertion order. tail(n) returns the last n. sample(n, random_state=42) returns a deterministic random subset (the seed makes it reproducible)."
      >
        <div className="flex flex-wrap items-center gap-2">
          <ModeButton active={mode === "head"} onClick={() => setMode("head")}>head</ModeButton>
          <ModeButton active={mode === "tail"} onClick={() => setMode("tail")}>tail</ModeButton>
          <ModeButton active={mode === "sample"} onClick={() => setMode("sample")}>sample</ModeButton>
          <span className="text-xs text-muted-foreground">n =</span>
          {[5, 10, 20].map((k) => (
            <ModeButton key={k} active={n === k} onClick={() => setN(k)}>{k}</ModeButton>
          ))}
        </div>
        <DatasetTable df={inspected} pageSize={n} />
      </Subsection>

      {/* 2. info() */}
      <Subsection
        title="2 · info(): dtypes, non-null counts, memory"
        code={`df.info()`}
        caption="info() — summary of dtypes, non-null counts, memory usage"
        note="info() reveals dtypes, non-null counts per column, and total memory. describe() (next) reveals distributional statistics for numeric columns. They answer different questions — use both."
      >
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Column</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dtype</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Non-null</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Null</th>
              </tr>
            </thead>
            <tbody>
              {info.columns.map((c) => (
                <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-3 py-1.5"><code className="text-mono text-xs font-medium">{c.name}</code></td>
                  <td className="px-3 py-1.5"><code className="text-mono rounded bg-muted px-1.5 py-0.5 text-[10px]">{c.dtype}</code></td>
                  <td className="px-3 py-1.5 text-mono">{c.nonNull}</td>
                  <td className={`text-mono px-3 py-1.5 ${c.nullCount > 0 ? "text-[var(--color-role-warning)]" : "text-muted-foreground"}`}>
                    {c.nullCount > 0 ? c.nullCount : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40">
                <td className="px-3 py-2 text-xs font-semibold" colSpan={2}>Total memory</td>
                <td className="px-3 py-2 text-mono text-xs font-semibold" colSpan={2}>
                  {(info.memoryBytes / 1024).toFixed(2)} KB
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Subsection>

      {/* 3. memory_usage */}
      <Subsection
        title="3 · memory_usage(): per-column memory"
        code={`df.memory_usage(deep=True)`}
        caption="memory_usage(deep=True) — bytes per column"
        note="With deep=True, Pandas accounts for the actual heap memory of object (string) columns. Our engine mirrors this: each object column costs 8 bytes per row for the pointer plus the string's character count."
      >
        <MemoryBar df={df} />
      </Subsection>

      {/* 4. Column profile (dtype + nunique + value_counts + describe) */}
      <Subsection
        title="4 · Per-column profile: dtype, nunique, value_counts, describe"
        code={`# Pick any column
col = "${df.columns[0]}"

df[col].dtype            # dtype
df[col].nunique()        # cardinality
df[col].value_counts()   # top values
df[col].describe()       # numeric: count/mean/std/min/quantiles/max`}
        caption="Per-column profile (select a column above)"
        note="nunique() counts distinct non-null values. value_counts() returns the frequency table. describe() returns distributional statistics for numeric columns. For object columns, describe() returns count, nunique, top, freq instead."
      >
        <ColumnProfile df={df} />
      </Subsection>

      {/* 5. describe() on the whole frame */}
      <Subsection
        title="5 · describe(): distributional summary for numeric columns"
        code={`df.describe()`}
        caption="describe() — numeric columns only"
        note="describe() ignores non-numeric columns. Use df.describe(include='all') to include object columns. The 50% quantile is the median; the 25% and 75% quantiles bracket the interquartile range."
      >
        <DescribeTable df={df} />
      </Subsection>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Validated against the real dataset above. Don't peek — submit first; the
          solution is revealed afterwards.
        </p>
        <div className="mt-3 grid gap-3">
          {MODULE1_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

// ---------- Local helpers ----------

function Subsection({
  title,
  code,
  caption,
  note,
  children,
}: {
  title: string;
  code: string;
  caption?: string;
  note?: string;
  children: React.ReactNode;
}) {
  // Wrapper that combines a heading + CodeAndResult
  // (defined locally so the JSX reads naturally)
  return (
    <section className="mt-6" aria-labelledby={`sub-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-2">
        <CodeAndResult code={code} caption={caption} note={note}>
          {children}
        </CodeAndResult>
      </div>
    </section>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="text-mono h-8"
    >
      {children}
    </Button>
  );
}

function MemoryBar({ df }: { df: DataFrame }) {
  const mem = df.memoryUsage();
  const total = mem.reduce((s, m) => s + m.bytes, 0);
  const max = Math.max(...mem.map((m) => m.bytes), 1);
  return (
    <div className="flex flex-col gap-1">
      {mem.map((m) => {
        const pct = (m.bytes / max) * 100;
        const share = total > 0 ? (m.bytes / total) * 100 : 0;
        return (
          <div key={m.column} className="flex items-center gap-2 text-xs">
            <code className="text-mono w-32 shrink-0 truncate">{m.column}</code>
            <div className="h-3 flex-1 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full rounded-sm bg-[var(--color-ai-blue)]"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
            <span className="text-mono tabular-nums w-20 text-right">
              {m.bytes.toLocaleString()} B
            </span>
            <span className="text-mono tabular-nums w-12 text-right text-muted-foreground">
              {share.toFixed(1)}%
            </span>
          </div>
        );
      })}
      <div className="mt-1 text-xs text-muted-foreground">
        Total: <span className="text-mono">{total.toLocaleString()}</span> bytes
        ({(total / 1024).toFixed(2)} KB)
      </div>
    </div>
  );
}

function DescribeTable({ df }: { df: DataFrame }) {
  const desc = df.describe();
  if (desc.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        This dataset has no numeric columns to describe.
      </div>
    );
  }
  const stats: { key: keyof typeof desc[number]; label: string }[] = [
    { key: "count", label: "count" },
    { key: "mean", label: "mean" },
    { key: "std", label: "std" },
    { key: "min", label: "min" },
    { key: "q25", label: "25%" },
    { key: "q50", label: "50% (median)" },
    { key: "q75", label: "75%" },
    { key: "max", label: "max" },
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statistic</th>
              {desc.map((d) => (
                <th key={d.column} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <code className="text-mono">{d.column}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.key} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-3 py-1.5 text-xs font-medium">{s.label}</td>
                {desc.map((d) => (
                  <td key={d.column} className="text-mono px-3 py-1.5 text-xs">
                    {fmt(d[s.key] as number, 2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
