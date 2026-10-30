"use client";

import { CheckCircle2 } from "lucide-react";
import { totalModules } from "@/lib/content/modules";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  completed: number;
  className?: string;
}

export function ProgressIndicator({ completed, className }: ProgressIndicatorProps) {
  const total = totalModules();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      role="status"
      aria-label={`Learning progress: ${completed} of ${total} modules completed, ${pct} percent`}
      className={cn(
        "hidden items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:glow-cyan lg:flex",
        className
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-role-validated)]" aria-hidden />
      <span className="text-mono tabular-nums">
        {completed}/{total}
      </span>
      <span aria-hidden className="text-muted-foreground">·</span>
      <span className="text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}
