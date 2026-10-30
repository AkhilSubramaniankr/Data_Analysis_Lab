"use client";

/**
 * RoadmapView — the full learning roadmap.
 *
 * Renders all 14 modules + capstone, grouped by implementation phase,
 * in canonical order. Each module is a clickable card that opens the
 * module overview. Includes a real progress summary and a reset-progress
 * control (no fabricated numbers).
 */

import * as React from "react";
import { CheckCircle2, Circle, RotateCcw, Layers as LayersIcon } from "lucide-react";
import { useNavigation } from "@/lib/store/navigation";
import { ROADMAP, MODULES, CAPSTONE, totalModules } from "@/lib/content/modules";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PageHeader } from "@/components/learning/PageHeader";
import { LessonCard } from "@/components/learning/LessonCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PHASE_NAMES: Record<number, string> = {
  1: "Phase 1 — Foundation",
  2: "Phase 2 — Core Pandas Learning",
  3: "Phase 3 — Analytical Learning",
  4: "Phase 4 — Feature Engineering",
  5: "Phase 5 — Feature Selection & ML Preparation",
  6: "Phase 6 — Interactive Practice",
  7: "Phase 7 — Capstone & QA",
};

export function RoadmapView() {
  const openModule = useNavigation((s) => s.openModule);
  const toggleLesson = useNavigation((s) => s.toggleLesson);
  const resetProgress = useNavigation((s) => s.resetProgress);
  const completedLessons = useNavigation((s) => s.completedLessons);

  const total = totalModules();
  const completedCount = completedLessons.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  // Group modules by phase, preserving canonical order.
  const byPhase = React.useMemo(() => {
    const map = new Map<number, typeof ROADMAP>();
    for (const m of ROADMAP) {
      const arr = map.get(m.phase) ?? [];
      arr.push(m);
      map.set(m.phase, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, []);

  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <SectionContainer className="py-8">
      <PageHeader
        eyebrow="Learning roadmap"
        title="From raw data to validated analytical dataset"
        subtitle="Fourteen modules and a capstone, ordered exactly the way a real analyst works. Click any module to see its full topic list and planned Pandas functions. Mark a module complete to track real, persisted progress."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirmReset) {
              resetProgress();
              setConfirmReset(false);
            } else {
              setConfirmReset(true);
              setTimeout(() => setConfirmReset(false), 4000);
            }
          }}
          className="gap-1.5"
          aria-label="Reset progress"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {confirmReset ? "Click again to confirm" : "Reset"}
        </Button>
      </PageHeader>

      <Card className="mt-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-navy-900)] text-white"
            >
              <LayersIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Progress</p>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {total} modules completed · {pct}%
              </p>
            </div>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall learning progress"
            className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-72"
          >
            <div
              className="h-full rounded-full bg-[var(--color-role-validated)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col gap-8">
        {byPhase.map(([phase, mods]) => (
          <section key={phase} aria-labelledby={`phase-${phase}-h`}>
            <div className="flex items-end justify-between gap-2">
              <h2
                id={`phase-${phase}-h`}
                className="text-lg font-semibold sm:text-xl"
              >
                {PHASE_NAMES[phase] ?? `Phase ${phase}`}
              </h2>
              <span className="text-xs text-muted-foreground">
                {mods.length} module{mods.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {phase === 1 && "Application foundation, design system, navigation, homepage, roadmap — delivered."}
              {phase === 2 && "Dataset Explorer + the first five interactive labs: dataset inspection, messy-data cleaning, filter builder, statistics explorer, pivot/crosstab builder — delivered."}
              {phase === 3 && "Correlation, EDA dashboard, trend analysis — every chart annotated with what it shows and what it does not establish — delivered."}
              {phase === 4 && "Feature creation, categorical encoding, binning, scaling — with leakage-safe train-only fitting — delivered."}
              {phase === 5 && "Filter, model-based, and wrapper feature selection + the ML preprocessing pipeline builder — delivered."}
              {phase === 6 && "Pandas Playground + Practice Center + the feature-engineering & feature-selection laboratories + the Interactive Learning tab with 45 live-demo topics — delivered."}
              {phase === 7 && "End-to-end retail capstone + accessibility / responsive / data-correctness QA pass — delivered."}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mods.map((m) => {
                const isDone = completedLessons.includes(m.id);
                return (
                  <div key={m.id} className="flex flex-col gap-2">
                    <LessonCard
                      lessonId={m.id}
                      title={m.shortTitle}
                      summary={m.learningObjective}
                      status={isDone ? "completed" : m.status}
                      phase={m.phase}
                      index={m.index}
                      icon={m.icon}
                      onSelect={() => openModule(m.id)}
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleLesson(m.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 transition hover:bg-accent"
                        aria-pressed={isDone}
                        aria-label={`${isDone ? "Mark" : "Unmark"} module ${m.index} as ${isDone ? "incomplete" : "complete"}`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-role-validated)]" aria-hidden />
                        ) : (
                          <Circle className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {isDone ? "Completed" : "Mark complete"}
                      </button>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12" aria-labelledby="capstone-h">
        <h2 id="capstone-h" className="text-lg font-semibold sm:text-xl">
          Capstone
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          The capstone runs the full workflow on a real retail dataset. It's
          the final piece — and like every other number on this platform, its
          results are computed from the actual data, not invented.
        </p>
        <div className="mt-4">
          <LessonCard
            lessonId={CAPSTONE.id}
            title={CAPSTONE.shortTitle}
            summary={CAPSTONE.learningObjective}
            status={CAPSTONE.status}
            phase={CAPSTONE.phase}
            index={CAPSTONE.index}
            icon={CAPSTONE.icon}
            onSelect={() => openModule(CAPSTONE.id)}
          />
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        All 14 modules and the capstone are delivered. Click any card to
        open its interactive lab — every chart, statistic, and exercise
        is computed from the real built-in datasets. The capstone is also
        reachable from the <strong>Projects</strong> tab in the top nav.
      </p>
    </SectionContainer>
  );
}
