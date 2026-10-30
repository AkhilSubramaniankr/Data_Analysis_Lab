"use client";

/**
 * PipelineDiagram — animated 7-stage flow used on the homepage hero.
 *
 * Animates the active stage through the pipeline on a timer. Honours
 * prefers-reduced-motion (skips animation, shows static stages instead).
 * Each stage is colour-coded per the design system's role palette.
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HERO_PIPELINE_IDS, PIPELINE_STAGES } from "@/lib/content/pipeline-stages";
import { cn } from "@/lib/utils";

const roleClass: Record<string, string> = {
  data: "role-data",
  transform: "role-transform",
  stats: "role-stats",
  validated: "role-validated",
  warning: "role-warning",
  error: "role-error",
};

export function PipelineDiagram() {
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = window.setInterval(() => {
      setActive((a) => (a + 1) % HERO_PIPELINE_IDS.length);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  const stages = HERO_PIPELINE_IDS.map(
    (id) => PIPELINE_STAGES.find((s) => s.id === id)!
  );

  return (
    <div
      role="img"
      aria-label="Data analysis pipeline: raw data, explore, clean, analyze, engineer features, select features, validate"
      className="rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-6"
    >
      <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {stages.map((stage, i) => {
          const isActive = i === active;
          const role = roleClass[stage.role] ?? "role-data";
          return (
            <li key={stage.id} className="flex items-center gap-2 sm:gap-3">
              <motion.div
                className={cn(
                  "flex min-w-[6.5rem] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-center",
                  role,
                  isActive
                    ? "border-role bg-role-soft shadow-md"
                    : "border-border bg-background"
                )}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : isActive
                      ? { y: [-2, 2, -2], transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }
                      : { y: 0 }
                }
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border border-role bg-background text-[10px] font-bold tabular-nums text-role",
                    role
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("text-xs font-semibold", isActive && "text-role")}>
                  {stage.label}
                </span>
              </motion.div>
              {i < stages.length - 1 && (
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {prefersReducedMotion
          ? "Pipeline shown statically (reduced motion is on)."
          : "Animated — the highlighted stage cycles every 2 seconds."}
      </p>
    </div>
  );
}
