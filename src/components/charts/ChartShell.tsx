"use client";

/**
 * ChartShell — consistent wrapper for every chart.
 *
 * Master spec §24 requires: "Every chart must have a clear purpose,
 * readable labels, appropriate scales, and a short interpretation."
 *
 * Every chart on the platform is wrapped in ChartShell so the
 * business question, chart-choice rationale, what-it-shows, what-it-does-
 * not-establish, and next-investigation sections never drift.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChartAnnotation {
  /** The business question this chart answers. */
  question: string;
  /** Why this chart type is the right choice. */
  whyThisChart: string;
  /** What the chart shows (one sentence). */
  shows: string;
  /** What the chart does NOT establish (e.g., correlation ≠ causation). */
  doesNotEstablish: string;
  /** Suggested next investigation. */
  nextStep: string;
}

interface ChartShellProps {
  title: string;
  subtitle?: string;
  /** Optional small note (assumption / limitation). */
  note?: string;
  /** Deterministic-demo badge (default: shown). */
  deterministicBadge?: boolean;
  /** Annotation block — optional but recommended per spec. */
  annotation?: ChartAnnotation;
  children: React.ReactNode;
  className?: string;
}

export function ChartShell({
  title,
  subtitle,
  note,
  deterministicBadge = true,
  annotation,
  children,
  className,
}: ChartShellProps) {
  return (
    <figure className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}>
      <figcaption className="border-b border-border pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {deterministicBadge && (
            <span className="text-mono rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Deterministic demo
            </span>
          )}
        </div>
      </figcaption>

      <div className="mt-3">{children}</div>

      {note && (
        <p className="mt-3 rounded-md border border-[var(--color-role-warning)]/30 bg-[color-mix(in_oklch,var(--color-role-warning)_6%,transparent)] px-2 py-1 text-xs text-foreground/80">
          {note}
        </p>
      )}

      {annotation && (
        <div className="mt-3 grid gap-1 text-xs text-foreground/80 sm:grid-cols-2">
          <AnnotRow label="Business question" value={annotation.question} />
          <AnnotRow label="Why this chart" value={annotation.whyThisChart} />
          <AnnotRow label="Shows" value={annotation.shows} />
          <AnnotRow label="Does NOT establish" value={annotation.doesNotEstablish} tone="warning" />
          <AnnotRow label="Next investigation" value={annotation.nextStep} />
        </div>
      )}
    </figure>
  );
}

function AnnotRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "default";
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-background px-2 py-1.5">
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${tone === "warning" ? "text-[var(--color-role-warning)]" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="text-xs text-foreground/80">{value}</p>
    </div>
  );
}
