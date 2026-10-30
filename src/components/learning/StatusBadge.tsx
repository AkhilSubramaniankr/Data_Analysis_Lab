"use client";

/**
 * StatusBadge — small pill describing a lesson/module's status.
 */

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "completed" | "in-progress" | "planned";
  phase?: number;
  className?: string;
}

export function StatusBadge({ status, phase, className }: StatusBadgeProps) {
  const tone =
    status === "completed"
      ? "role-validated"
      : status === "in-progress"
        ? "role-transform"
        : "role-data";

  const label =
    status === "completed"
      ? "Completed"
      : status === "in-progress"
        ? "In progress"
        : phase
          ? `Phase ${phase}`
          : "Planned";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-role bg-role-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-role",
        tone,
        className
      )}
    >
      {label}
    </span>
  );
}
