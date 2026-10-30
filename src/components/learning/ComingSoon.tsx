"use client";

/**
 * ComingSoon — clearly-labelled placeholder for deferred features.
 *
 * Used wherever a deep interactive lab is planned for a later phase.
 * NEVER used to fake completed functionality. Always names the future
 * phase and the planned deliverable, so the user knows what to expect.
 */

import * as React from "react";
import { Hammer, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonProps {
  /** Which phase will deliver this feature. */
  phase: number;
  /** What the phase will deliver (one sentence). */
  deliverable: string;
  /** Optional: why it's deferred (e.g., "depends on the Dataset Explorer"). */
  reason?: string;
  className?: string;
}

export function ComingSoon({ phase, deliverable, reason, className }: ComingSoonProps) {
  return (
    <div
      role="note"
      aria-label={`Coming in phase ${phase}`}
      className={cn(
        "role-warning border-role bg-role-soft rounded-lg border p-4 text-sm",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-role-soft text-role">
          <Hammer className="h-4 w-4" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1.5 font-semibold text-role">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Coming in Phase {phase}
          </p>
          <p className="text-foreground/80">{deliverable}</p>
          {reason && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Why deferred:</span> {reason}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            This is a clearly-labelled placeholder — no interactive lab is
            simulated here. The plan and phase are committed; the deep
            content lands when that phase ships.
          </p>
        </div>
      </div>
    </div>
  );
}
