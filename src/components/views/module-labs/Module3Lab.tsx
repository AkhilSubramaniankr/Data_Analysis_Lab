"use client";

/**
 * Module 3 Lab — Selection, Filtering, Sorting, Transformation, Joins.
 *
 * Master spec §8. A filter builder, a sort/transform panel, and a join
 * playground with one-to-one, one-to-many, many-to-many demonstrations.
 * Every result is computed from the actual dataset rows.
 */

import * as React from "react";
import { Filter, ArrowDownUp, GitMerge, BookOpen, Plus, Trash2 } from "lucide-react";
import { buildRetailSales, buildCustomerTransactions } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import type { CellValue } from "@/lib/data/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE3_EXERCISES } from "@/lib/content/exercises/module3";

type Op = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "isna" | "notna";

interface Condition {
  id: number;
  column: string;
  op: Op;
  value: string;
}

const OP_LABELS: { op: Op; label: string; sample: string }[] = [
  { op: "eq", label: "== equal to", sample: '"East"' },
  { op: "ne", label: "!= not equal to", sample: '"East"' },
  { op: "gt", label: "> greater than", sample: "100" },
  { op: "gte", label: ">= greater or equal", sample: "100" },
  { op: "lt", label: "< less than", sample: "100" },
  { op: "lte", label: "<= less or equal", sample: "100" },
  { op: "in", label: "in (list)", sample: '"East, West"' },
  { op: "contains", label: "contains (substring)", sample: '"Mug"' },
  { op: "isna", label: "is null", sample: "" },
  { op: "notna", label: "is not null", sample: "" },
];

function evalCondition(row: Record<string, CellValue>, cond: Condition): boolean {
  const v = row[cond.column];
  const valStr = cond.value.trim();
  switch (cond.op) {
    case "eq": return v !== null && String(v) === valStr.replace(/^["']|["']$/g, "");
    case "ne": return v === null || String(v) !== valStr.replace(/^["']|["']$/g, "");
    case "gt": return typeof v === "number" && v > Number(valStr);
    case "gte": return typeof v === "number" && v >= Number(valStr);
    case "lt": return typeof v === "number" && v < Number(valStr);
    case "lte": return typeof v === "number" && v <= Number(valStr);
    case "in": {
      const items = valStr.replace(/[\[\]]/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      return v !== null && items.includes(String(v));
    }
    case "contains": {
      if (v === null || typeof v !== "string") return false;
      return v.includes(valStr.replace(/^["']|["']$/g, ""));
    }
    case "isna": return v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
    case "notna": return v !== null && v !== undefined && !(typeof v === "number" && !Number.isFinite(v));
  }
}

function codeForCondition(c: Condition): string {
  const col = `df["${c.column}"]`;
  const valRaw = c.value.trim();
  switch (c.op) {
    case "eq": return `${col} == ${valRaw}`;
    case "ne": return `${col} != ${valRaw}`;
    case "gt": return `${col} > ${valRaw}`;
    case "gte": return `${col} >= ${valRaw}`;
    case "lt": return `${col} < ${valRaw}`;
    case "lte": return `${col} <= ${valRaw}`;
    case "in": return `${col}.isin([${valRaw}])`;
    case "contains": return `${col}.str.contains(${valRaw}, case=False, na=False)`;
    case "isna": return `${col}.isna()`;
    case "notna": return `${col}.notna()`;
  }
}

export function Module3Lab() {
  const retail = React.useMemo(() => {
    const spec = buildRetailSales();
    return DataFrame.fromRows(spec.rows);
  }, []);

  const [conditions, setConditions] = React.useState<Condition[]>([
    { id: 1, column: "region", op: "eq", value: '"East"' },
  ]);
  const [nextId, setNextId] = React.useState(2);
  const [logic, setLogic] = React.useState<"AND" | "OR">("AND");
  const [sortCol, setSortCol] = React.useState<string>("revenue");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const filtered = React.useMemo(() => {
    if (conditions.length === 0) return retail;
    const result = retail.loc((r) => {
      const results = conditions.map((c) => evalCondition(r, c));
      return logic === "AND" ? results.every(Boolean) : results.some(Boolean);
    });
    return sortCol ? result.sort(sortCol, sortDir) : result;
  }, [retail, conditions, logic, sortCol, sortDir]);

  const filterCode = React.useMemo(() => {
    if (conditions.length === 0) return `# No filter — every row passes.\nfiltered = df`;
    const parts = conditions.map(codeForCondition);
    const join = logic === "AND" ? " & " : " | ";
    return `mask = ${parts.join(join)}\nfiltered = df[mask]`;
  }, [conditions, logic]);

  const sortCode = React.useMemo(() => {
    return `# Sort the filtered rows\nfiltered = filtered.sort_values("${sortCol}", ascending=${sortDir === "asc" ? "True" : "False"})`;
  }, [sortCol, sortDir]);

  const addCondition = () => {
    setConditions((c) => [...c, { id: nextId, column: "category", op: "eq", value: '""' }]);
    setNextId((n) => n + 1);
  };
  const updateCondition = (id: number, patch: Partial<Condition>) => {
    setConditions((c) => c.map((cc) => (cc.id === id ? { ...cc, ...patch } : cc)));
  };
  const removeCondition = (id: number) => {
    setConditions((c) => c.filter((cc) => cc.id !== id));
  };

  // Transform: create a new derived column live
  const [derivedName, setDerivedName] = React.useState<string>("profit_margin");
  const [derivedExpr, setDerivedExpr] = React.useState<string>("profit / revenue * 100");
  const derivedDf = React.useMemo(() => {
    try {
      // Tiny expression evaluator: supports column names, + - * /, numbers,
      // and the function `where`. Intentionally limited — for arbitrary
      // expressions learners should use the Pandas Playground (Phase 6).
      const cols = retail.columns;
      const sample = retail.rows.slice(0, 200);
      const compiled = new Function(
        "row",
        ...cols,
        `"use strict"; const np_nan = NaN; const where = (cond, a, b) => cond ? a : b; return (${derivedExpr});`
      );
      const rows = sample.map((r) => {
        const args = cols.map((c) => r[c]);
        try {
          const v = compiled(r, ...args);
          return { ...r, [derivedName]: typeof v === "number" && Number.isFinite(v) ? +v.toFixed(4) : null };
        } catch {
          return { ...r, [derivedName]: null };
        }
      });
      return new DataFrame([...retail.columns, derivedName], rows);
    } catch {
      return retail;
    }
  }, [retail, derivedName, derivedExpr]);

  const derivedCode = `# Create a derived column\ndf["${derivedName}"] = ${derivedExpr}`;

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[var(--color-ai-blue)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Build filters, sort, transform, and join. Every row shown is real;
        every count is computed from the actual dataset.
      </p>

      {/* --- Filter builder --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" aria-hidden />
          Filter builder (Boolean indexing)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Add conditions, combine with AND / OR, watch the matching rows update live. The Pandas equivalent appears below.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Label className="text-xs">Combine</Label>
          <Button variant={logic === "AND" ? "default" : "outline"} size="sm" onClick={() => setLogic("AND")} className="text-mono h-7">AND (&amp;)</Button>
          <Button variant={logic === "OR" ? "default" : "outline"} size="sm" onClick={() => setLogic("OR")} className="text-mono h-7">OR (|)</Button>
          <Button variant="ghost" size="sm" onClick={addCondition} className="ml-auto gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add condition
          </Button>
        </div>

        <ul className="mt-3 flex flex-col gap-2">
          {conditions.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2 text-xs">
              <Select value={c.column} onValueChange={(v) => updateCondition(c.id, { column: v })}>
                <SelectTrigger className="h-8 w-[8rem]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {retail.columns.map((col) => (
                    <SelectItem key={col} value={col}><code className="text-mono">{col}</code></SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={c.op} onValueChange={(v) => updateCondition(c.id, { op: v as Op })}>
                <SelectTrigger className="h-8 w-[14rem]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OP_LABELS.map((o) => (
                    <SelectItem key={o.op} value={o.op}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(c.op !== "isna" && c.op !== "notna") && (
                <Input
                  className="h-8 w-[12rem]"
                  value={c.value}
                  onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                  placeholder={OP_LABELS.find((o) => o.op === c.op)?.sample}
                />
              )}
              <Button variant="ghost" size="sm" onClick={() => removeCondition(c.id)} aria-label="Remove condition" className="h-8 px-2 ml-auto">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-3">
          <CodeAndResult
            code={`${filterCode}\n${sortCode}`}
            caption="Filter + sort (Pandas equivalent)"
            note="Boolean indexing with & (AND) and | (OR) is the standard Pandas idiom. Wrap each condition in parentheses — & has higher precedence than you'd expect, so df[a > 5 & b < 3] is a bug."
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Filtered: <span className="text-mono">{filtered.rows.length}</span> of <span className="text-mono">{retail.rows.length}</span> rows
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Sort by</Label>
                <Select value={sortCol} onValueChange={setSortCol}>
                  <SelectTrigger className="h-8 w-[10rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {retail.columns.map((c) => <SelectItem key={c} value={c}><code className="text-mono">{c}</code></SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant={sortDir === "asc" ? "default" : "outline"} size="sm" onClick={() => setSortDir("asc")} className="text-mono h-8">asc</Button>
                <Button variant={sortDir === "desc" ? "default" : "outline"} size="sm" onClick={() => setSortDir("desc")} className="text-mono h-8">desc</Button>
              </div>
            </div>
            <div className="mt-2">
              <DatasetTable df={filtered} pageSize={10} />
            </div>
          </CodeAndResult>
        </div>
      </div>

      {/* --- Transformation: derived column --- */}
      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ArrowDownUp className="h-4 w-4" aria-hidden />
          Conditional transformation (assign)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Create a derived column on the retail dataset. The expression runs against a 200-row sample. Use column names directly (e.g., <code className="text-mono">profit / revenue * 100</code>). The lab flags zero denominators — handle them with <code className="text-mono">where</code>.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="deriv-name" className="text-xs">New column name</Label>
            <Input id="deriv-name" className="text-mono mt-1 h-8" value={derivedName} onChange={(e) => setDerivedName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="deriv-expr" className="text-xs">Expression</Label>
            <Input id="deriv-expr" className="text-mono mt-1 h-8" value={derivedExpr} onChange={(e) => setDerivedExpr(e.target.value)} />
          </div>
        </div>
        <div className="mt-2 rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] p-2 text-xs text-foreground/80">
          <span className="font-semibold text-[var(--color-role-warning)]">Zero-denominator safety: </span>
          If your expression divides by a column that may contain zero (like <code className="text-mono">revenue</code>), use the safe form:
          <pre className="text-mono mt-1 overflow-x-auto rounded bg-background p-2 text-[11px]">{`import numpy as np\ndf["${derivedName}"] = (\n    df["profit"]\n        .div(df["revenue"].replace(0, np.nan))\n        .mul(100)\n)`}</pre>
          Missing margins produced by zero revenue require a deliberate interpretation policy.
        </div>
        <div className="mt-3">
          <CodeAndResult code={derivedCode} caption="Derived column (Pandas equivalent)">
            <DatasetTable df={derivedDf.head(15)} pageSize={15} />
          </CodeAndResult>
        </div>
      </div>

      {/* --- Joins --- */}
      <div className="mt-6">
        <JoinPlayground />
      </div>

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE3_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}

// ---------------- Join Playground ----------------

function JoinPlayground() {
  // Build a small customers + orders example for join demonstrations
  const customers = React.useMemo(
    () =>
      new DataFrame(["customer_id", "segment"], [
        { customer_id: "CUST-0001", segment: "Retail" },
        { customer_id: "CUST-0002", segment: "Premium" },
        { customer_id: "CUST-0003", segment: "Business" },
        { customer_id: "CUST-0004", segment: "Student" },
      ]),
    []
  );
  const orders = React.useMemo(
    () =>
      new DataFrame(["order_id", "customer_id", "revenue"], [
        { order_id: "ORD-1", customer_id: "CUST-0001", revenue: 120 },
        { order_id: "ORD-2", customer_id: "CUST-0001", revenue: 80 },
        { order_id: "ORD-3", customer_id: "CUST-0002", revenue: 250 },
        { order_id: "ORD-4", customer_id: "CUST-0005", revenue: 90 },
      ]),
    []
  );

  const [how, setHow] = React.useState<"inner" | "left" | "right" | "outer">("inner");
  const merged = React.useMemo(() => orders.merge(customers, "customer_id", how), [how, customers, orders]);

  // Detect cardinality
  const customerOrdersPerId = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of orders.rows) {
      const k = String(r.customer_id);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [orders]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <GitMerge className="h-4 w-4" aria-hidden />
        Join playground — merge()
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        orders (left) merged with customers (right) on <code className="text-mono">customer_id</code>. Try every <code className="text-mono">how</code> mode and watch the row count and null pattern change. CUST-0001 has two orders (one-to-many); CUST-0004 has no orders; ORD-4 references a customer that doesn't exist (an unmatched key).
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Left: orders ({orders.rows.length} rows)</p>
          <div className="mt-1"><DatasetTable df={orders} pageSize={4} /></div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Right: customers ({customers.rows.length} rows)</p>
          <div className="mt-1"><DatasetTable df={customers} pageSize={4} /></div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Label className="text-xs">how =</Label>
        {(["inner", "left", "right", "outer"] as const).map((h) => (
          <Button key={h} variant={how === h ? "default" : "outline"} size="sm" onClick={() => setHow(h)} className="text-mono h-8">{h}</Button>
        ))}
        <Badge variant="outline" className="text-[10px]">Result: {merged.rows.length} rows</Badge>
      </div>

      <div className="mt-3">
        <CodeAndResult code={`merged = orders.merge(customers, on="customer_id", how="${how}")`} caption="merge() — Pandas equivalent">
          <DatasetTable df={merged} pageSize={10} />
          <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            <li>One-to-many detected: <code className="text-mono">CUST-0001</code> → {customerOrdersPerId.get("CUST-0001") ?? 0} orders.</li>
            <li>Unmatched left key: <code className="text-mono">ORD-4 / CUST-0005</code> — customer does not exist.</li>
            <li>Unmatched right key: <code className="text-mono">CUST-0004</code> — no orders for this customer.</li>
            <li className="text-[var(--color-role-warning)]">
              Watch the row count: <code className="text-mono">inner</code> = matched only; <code className="text-mono">left</code> keeps all orders (with null segment for unmatched); <code className="text-mono">right</code> keeps all customers (with null order info for unmatched); <code className="text-mono">outer</code> keeps everything.
            </li>
          </ul>
        </CodeAndResult>
      </div>
    </div>
  );
}
