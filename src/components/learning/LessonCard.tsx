"use client";

/**
 * LessonCard — reusable card for roadmap &amp; lesson lists.
 * Accessible: renders as a button so keyboard + screen-reader users
 * get a focusable, activatable control.
 */

import * as React from "react";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface LessonCardProps {
  title: string;
  summary: string;
  /** Stable id of the lesson — used as the aria-control. */
  lessonId: string;
  /** "completed" | "in-progress" | "planned" */
  status: "completed" | "in-progress" | "planned";
  /** Whether this card is currently active (selected). */
  active?: boolean;
  /** Phase number, shown as a small label. */
  phase?: number;
  /** Index number, shown as a small label. */
  index?: number;
  /** Icon element. */
  icon?: React.ElementType;
  /** Click handler. */
  onSelect?: () => void;
  className?: string;
}

export function LessonCard({
  title,
  summary,
  lessonId,
  status,
  active,
  phase,
  index,
  icon: Icon,
  onSelect,
  className,
}: LessonCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active ? "true" : "false"}
      aria-label={`${title} — status: ${status}${phase ? `, phase ${phase}` : ""}`}
      data-lesson-id={lessonId}
      className={cn(
        "group card-interactive relative flex w-full flex-col gap-2 rounded-lg border border-border/60 bg-card/85 backdrop-blur-sm p-4 text-left shadow-sm",
        "hover:border-[var(--color-ai-cyan)]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ai-cyan)]",
        active && "ring-2 ring-[var(--color-ai-cyan)]/60 ring-offset-2 ring-offset-background glow-cyan",
        status === "planned" && "opacity-95",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-md bg-role-soft text-role"
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="flex flex-col">
            {index !== undefined && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Module {index}
              </span>
            )}
            <span className="text-sm font-semibold leading-tight">{title}</span>
          </div>
        </div>
        <StatusBadge status={status} phase={phase} />
      </div>

      <p className="line-clamp-3 text-xs text-muted-foreground">{summary}</p>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {status === "planned" ? "Planned" : status === "completed" ? "Completed" : "In progress"}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-foreground/80 transition group-hover:text-foreground">
          {status === "planned" ? (
            <>
              Preview <Lock className="h-3 w-3" aria-hidden />
            </>
          ) : (
            <>
              Open <ArrowRight className="h-3 w-3" aria-hidden />
            </>
          )}
        </span>
      </div>
    </button>
  );
}
