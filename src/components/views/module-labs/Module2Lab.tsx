"use client";

/**
 * Module 2 Lab — Data Quality Assessment & Cleaning.
 *
 * Master spec §7. Loads the deliberately messy dataset, shows a real
 * data-quality report, lets the learner apply cleaning operations
 * (fillna, drop_duplicates, str.strip, str.lower/title, astype,
 * to_datetime coercion), and shows a before/after report.
 *
 * Critical rule: do NOT auto-remove legitimate duplicates, impute all
 * missing values, or drop negative quantities without considering
 * business rules. The lab explicitly explains which issues are real
 * errors and which are legitimate business events.
 */

import * as React from "react";
import { Sparkles, RotateCcw, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { buildMessyRetail } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { fmt } from "@/lib/data/frame";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CodeAndResult } from "@/components/data/CodeAndResult";
import { DataQualityReport } from "@/components/data/DataQualityReport";
import { DatasetTable } from "@/components/data/DatasetTable";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { MODULE2_EXERCISES } from "@/lib/content/exercises/module2";

type CleaningOp =
  | "strip-product"
  | "lower-category"
  | "title-category"
  | "astype-revenue-float"
  | "coerce-date"
  | "drop-dup-rows"
  | "drop-dup-order-id"
  | "fillna-customer-unknown"
  | "fillna-profit-median"
  | "drop-missing-customer"
  | "keep-returns";

interface CleaningStep {
  id: CleaningOp;
  label: string;
  pandasCode: string;
  /** Apply the operation; return the new DataFrame. */
  apply: (df: DataFrame) => DataFrame;
  /** Whether this op is safe / recommended for the messy dataset. */
  recommendation: "recommended" | "optional" | "risky" | "always-keep";
  rationale: string;
}

const CLEANING_STEPS: CleaningStep[] = [
  {
    id: "strip-product",
    label: "Strip whitespace from product",
    pandasCode: `df["product"] = df["product"].str.strip()`,
    apply: (df) => df.strTransform("product", "strip"),
    recommendation: "recommended",
    rationale: "Trailing whitespace on 'product' is a data-entry artefact. Stripping makes 'GroupBy Mug  ' equal to 'GroupBy Mug'. Safe and reversible.",
  },
  {
    id: "title-category",
    label: "Normalise category casing (titlecase)",
    pandasCode: `df["category"] = df["category"].str.strip().str.title()`,
    apply: (df) => df.strTransform("category", "strip").strTransform("category", "title"),
    recommendation: "recommended",
    rationale: "Category casing is inconsistent (apparel / APPAREL / Apparel). Titlecasing makes the values consistent. Use lower() if your convention is lowercase — pick one and apply it everywhere.",
  },
  {
    id: "astype-revenue-float",
    label: "Coerce revenue to float64",
    pandasCode: `df["revenue"] = df["revenue"].astype("float64")`,
    apply: (df) => df.astype("revenue", "float64"),
    recommendation: "recommended",
    rationale: "Some revenue values were stored as strings. astype('float64') coerces them. Use pd.to_numeric(errors='coerce') if you suspect invalid strings — it will null them rather than raising.",
  },
  {
    id: "coerce-date",
    label: "Coerce order_date to datetime (invalid → NaT)",
    pandasCode: `df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")`,
    apply: (df) => {
      // Our engine keeps invalid dates as-is; simulate the coerce by nulling
      // any value that does not match ISO format.
      return df.apply("order_date", (v) => {
        if (typeof v !== "string") return v;
        return /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?Z?)?$/.test(v) ? v : null;
      });
    },
    recommendation: "recommended",
    rationale: "errors='coerce' turns invalid date strings into NaT (null). Better than dropping the row, because you keep the rest of the row's data and decide later what to do with the nulls.",
  },
  {
    id: "drop-dup-rows",
    label: "Drop fully-duplicated rows",
    pandasCode: `df = df.drop_duplicates()  # whole-row duplicates`,
    apply: (df) => df.dropDuplicates(),
    recommendation: "recommended",
    rationale: "Fully-duplicated rows are almost always sync errors (the same order written twice). They double-count revenue and inflate every metric. Safe to drop. (Inspect first: df.duplicated().sum() tells you how many.)",
  },
  {
    id: "drop-dup-order-id",
    label: "Drop duplicates by order_id (keep first)",
    pandasCode: `df = df.drop_duplicates(subset=["order_id"], keep="first")`,
    apply: (df) => df.dropDuplicates(["order_id"]),
    recommendation: "risky",
    rationale: "Risk: dropping by order_id alone will remove rows where the same order_id has DIFFERENT values (e.g., an update). Only do this if you've confirmed order_id is genuinely unique per order and the duplicates are sync errors. Inspect df[df.duplicated(subset=['order_id'], keep=False)] first.",
  },
  {
    id: "fillna-customer-unknown",
    label: "Fill missing customer_id with 'UNKNOWN'",
    pandasCode: `df["customer_id"] = df["customer_id"].fillna("UNKNOWN")`,
    apply: (df) => df.fillnaPerColumn({ customer_id: "UNKNOWN" }),
    recommendation: "optional",
    rationale: "Filling with 'UNKNOWN' preserves the row and the revenue — useful when customer attribution is not the analysis goal. If you need accurate customer-level analysis, you may instead DROP these rows (next option), but never impute a fake customer without documenting it.",
  },
  {
    id: "drop-missing-customer",
    label: "Drop rows with missing customer_id",
    pandasCode: `df = df.dropna(subset=["customer_id"])`,
    apply: (df) => {
      // Dropna with subset
      const rows = df.rows.filter((r) => r.customer_id !== null && r.customer_id !== undefined);
      return new DataFrame(df.columns, rows);
    },
    recommendation: "optional",
    rationale: "Dropping rows with missing customer_id biases the dataset toward customers the business can identify. Use this only if customer-level analysis is the goal AND the missingness is not informative. Otherwise, keep the rows with an indicator column.",
  },
  {
    id: "fillna-profit-median",
    label: "Fill missing profit with the median",
    pandasCode: `median_profit = df["profit"].median()\ndf["profit"] = df["profit"].fillna(median_profit)`,
    apply: (df) => {
      const col = df.column("profit").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const sorted = [...col].sort((a, b) => a - b);
      const n = sorted.length;
      const med = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
      return df.fillnaPerColumn({ profit: med });
    },
    recommendation: "risky",
    rationale: "Risk: simple imputation shrinks variance and biases downstream models. The median is more robust than the mean (less sensitive to outliers), but it still flattens the distribution. Prefer a missing-value indicator column, or impute by group (e.g., median per category) — and ALWAYS fit imputation on training data only when modelling.",
  },
  {
    id: "keep-returns",
    label: "Keep negative quantities (returns) — DO NOT drop",
    pandasCode: `# Returns are legitimate business events.\n# Decide a 'returns' indicator instead:\ndf["is_return"] = df["quantity"] < 0\n# Do NOT do this:\n# df = df[df["quantity"] > 0]  # silently drops returns!`,
    apply: (df) =>
      df.withColumn("is_return", (r) => (typeof r.quantity === "number" && r.quantity < 0)),
    recommendation: "always-keep",
    rationale: "Negative quantities are RETURNS — real business events, not errors. Dropping them would silently erase revenue reversals and inflate every metric. Add an is_return indicator instead. (Same for zero-quantity zero-revenue rows: keep them, document them.)",
  },
];

export function Module2Lab() {
  const initial = React.useMemo(() => {
    const spec = buildMessyRetail();
    return DataFrame.fromRows(spec.rows);
  }, []);

  const [current, setCurrent] = React.useState<DataFrame>(initial);
  const [applied, setApplied] = React.useState<Set<CleaningOp>>(new Set());
  const [history, setHistory] = React.useState<string[]>([]);

  // Reset everything when the initial dataset changes (shouldn't normally).
  React.useEffect(() => {
    setCurrent(initial);
    setApplied(new Set());
    setHistory([]);
  }, [initial]);

  const toggle = (op: CleaningOp) => {
    const step = CLEANING_STEPS.find((s) => s.id === op)!;
    const next = new Set(applied);
    let nextDf = current;
    let nextHistory = history;
    if (next.has(op)) {
      // Undo by re-applying from initial up to the remaining ops (in spec order).
      next.delete(op);
      nextDf = initial;
      for (const s of CLEANING_STEPS) {
        if (next.has(s.id)) nextDf = s.apply(nextDf);
      }
      nextHistory = [...history.filter((h) => !h.startsWith(`${op}::`))];
    } else {
      next.add(op);
      nextDf = step.apply(current);
      nextHistory = [...history, `${op}:: ${step.pandasCode.split("\n")[0]}`];
    }
    setApplied(next);
    setCurrent(nextDf);
    setHistory(nextHistory);
  };

  const resetAll = () => {
    setCurrent(initial);
    setApplied(new Set());
    setHistory([]);
  };

  // Build the cumulative Pandas code from the applied steps in spec order.
  const cumulativeCode = React.useMemo(() => {
    const lines: string[] = [`# Load the messy dataset`, `df = pd.read_csv("messy_retail.csv")`, ``];
    for (const step of CLEANING_STEPS) {
      if (applied.has(step.id)) {
        lines.push(`# ${step.label}`, step.pandasCode, ``);
      }
    }
    if (lines.length <= 3) {
      lines.push(`# Tick boxes above to apply cleaning operations.`);
    }
    return lines.join("\n");
  }, [applied]);

  // Compile a summary of what's still messy
  const remainingIssues = React.useMemo(() => {
    const out: { issue: string; count: number }[] = [];
    const nulls = current.isnaCount();
    for (const [col, n] of Object.entries(nulls)) {
      if (n > 0) out.push({ issue: `Missing ${col}`, count: n });
    }
    const dupRows = current.countDuplicates();
    if (dupRows > 0) out.push({ issue: "Full-row duplicates", count: dupRows });
    const dupIds = current.countDuplicates(["order_id"]);
    if (dupIds > 0) out.push({ issue: "Duplicate order_id", count: dupIds });
    let mixedType = 0;
    for (const c of current.columns) {
      if (current.dtype(c) !== "object") continue;
      let hasNum = false, hasStr = false;
      for (const v of current.column(c)) {
        if (typeof v === "number") hasNum = true;
        else if (typeof v === "string") hasStr = true;
      }
      if (hasNum && hasStr) mixedType++;
    }
    if (mixedType > 0) out.push({ issue: "Mixed-type columns (object)", count: mixedType });
    return out;
  }, [current]);

  return (
    <section className="mt-10" aria-labelledby="lab-h">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
        <h2 id="lab-h" className="text-lg font-semibold">Interactive lab</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Load the deliberately messy dataset, inspect the data-quality report,
        and apply cleaning operations one at a time. Every count below is
        computed from the actual rows. The lab will not let you auto-drop
        legitimate returns without a clear warning — business rules come first.
      </p>

      <div className="role-data border-role bg-role-soft mt-3 rounded-md border p-3 text-xs">
        <p className="font-semibold text-role">Critical principle: business rules first</p>
        <p className="mt-1 text-foreground/80">
          The lab never auto-removes legitimate duplicates, imputes every
          missing value, or discards negative numbers without considering
          business meaning. Negative quantities in this dataset are
          <em> returns</em> — they are real revenue reversals, not errors.
          The lab adds an <code className="text-mono">is_return</code> indicator instead of dropping them.
        </p>
      </div>

      {/* Before / After report */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Before</h3>
          <p className="text-xs text-muted-foreground">The original messy dataset.</p>
          <div className="mt-2">
            <DataQualityReport df={initial} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">After (current state)</h3>
          <p className="text-xs text-muted-foreground">Updates as you apply cleaning operations.</p>
          <div className="mt-2">
            <DataQualityReport df={current} />
          </div>
        </div>
      </div>

      {/* Cleaning operations */}
      <section className="mt-8" aria-labelledby="ops-h">
        <div className="flex items-center justify-between">
          <h3 id="ops-h" className="text-sm font-semibold">Cleaning operations</h3>
          <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset all
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Tick a box to apply the operation. Tick again to undo. Each box shows the Pandas code, the recommendation, and the rationale. Operations marked risky are clearly flagged.
        </p>
        <div className="mt-3 grid gap-2">
          {CLEANING_STEPS.map((step) => {
            const isOn = applied.has(step.id);
            const tone =
              step.recommendation === "recommended" ? "role-validated" :
              step.recommendation === "always-keep" ? "role-validated" :
              step.recommendation === "optional" ? "role-data" :
              "role-warning";
            return (
              <label
                key={step.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card p-3 ${isOn ? "ring-1 ring-[var(--color-ai-blue)]/40" : ""}`}
              >
                <Checkbox
                  checked={isOn}
                  onCheckedChange={() => toggle(step.id)}
                  className="mt-0.5"
                  id={`op-${step.id}`}
                />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`op-${step.id}`} className="text-sm font-semibold cursor-pointer">
                      {step.label}
                    </Label>
                    <span className={`text-[10px] uppercase tracking-wider ${tone} border-role bg-role-soft border px-1.5 py-0.5 rounded`}>
                      {step.recommendation}
                    </span>
                  </div>
                  <pre className="text-mono rounded bg-muted/40 p-2 text-[11px] overflow-x-auto">{step.pandasCode}</pre>
                  <p className="text-xs text-muted-foreground">{step.rationale}</p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Cumulative code + current table */}
      <section className="mt-8">
        <CodeAndResult
          code={cumulativeCode}
          caption="Cumulative Pandas — the script you'd run"
          note="The script is the cumulative application of every ticked operation above, in spec order. In a real project you'd commit this script alongside the dataset so cleaning is reproducible."
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Current shape: <span className="text-mono">({current.shape[0]}, {current.shape[1]})</span>
              {" · "}
              <span className="text-mono">{remainingIssues.length}</span> issue(s) remaining.
            </p>
          </div>
          {remainingIssues.length === 0 ? (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--color-role-validated)]/40 bg-[color-mix(in_oklch,var(--color-role-validated)_8%,transparent)] p-3 text-sm text-[var(--color-role-validated)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              No issues detected in the current view.
            </div>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {remainingIssues.map((i, idx) => (
                <li key={idx} className="text-mono rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] px-2 py-1 text-xs text-[var(--color-role-warning)]">
                  {i.issue} × {i.count}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <DatasetTable df={current} pageSize={10} caption="Current dataset (post-cleaning)" />
          </div>
        </CodeAndResult>
      </section>

      {/* Operation history */}
      {history.length > 0 && (
        <section className="mt-6" aria-labelledby="hist-h">
          <h3 id="hist-h" className="text-sm font-semibold">Operation history</h3>
          <ol className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            {history.map((h, i) => (
              <li key={i} className="text-mono rounded border border-border bg-card px-2 py-1">
                {i + 1}. {h.replace(/^[a-z-]+::\s/, "")}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Exercises */}
      <section className="mt-10" aria-labelledby="ex-h">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="ex-h" className="text-lg font-semibold">Exercises</h2>
        </div>
        <div className="mt-3 grid gap-3">
          {MODULE2_EXERCISES.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </section>
    </section>
  );
}
