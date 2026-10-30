"use client";

/**
 * ModuleShell — consistent wrapper for module views.
 *
 * Layout: [Sidebar][Body]
 * - Sidebar is collapsible (desktop only).
 * - Body has a PageHeader, the topic sections, and a ComingSoon panel
 *   for the interactive lab.
 *
 * Mobile: sidebar hidden (topics reachable by scrolling).
 */

import * as React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "./PageHeader";
import { SectionContainer } from "./SectionContainer";
import { ComingSoon } from "./ComingSoon";
import { StatusBadge } from "./StatusBadge";
import type { ModuleCatalogEntry } from "@/lib/content/modules";
import { useNavigation } from "@/lib/store/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

interface ModuleShellProps {
  module: ModuleCatalogEntry;
  /** Optional extra sections below the standard topic list. */
  children?: React.ReactNode;
}

export function ModuleShell({ module, children }: ModuleShellProps) {
  const setView = useNavigation((s) => s.setView);
  const Icon = module.icon;

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-0 px-0 md:px-6 lg:px-8">
      <Sidebar />

      <article className="min-w-0 flex-1 px-4 py-6 md:py-8">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setView("roadmap")}
            className="inline-flex items-center gap-1 transition hover:text-[var(--color-ai-cyan)]"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Roadmap
          </button>
          <span aria-hidden className="px-1.5">/</span>
          <span className="text-foreground/80">Module {module.index}</span>
        </nav>

        <PageHeader
          eyebrow={`Module ${module.index} · Master spec §${module.specSection}`}
          title={module.title}
          subtitle={module.learningObjective}
        >
          <StatusBadge status={module.status} phase={module.phase} />
        </PageHeader>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-role-soft text-role role-data"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-semibold">What you'll build</p>
            <p className="text-muted-foreground">{module.buildPreview}</p>
          </div>
        </div>

        <section className="mt-8" aria-label="Topics in this module">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-lg font-semibold">Topics</h2>
          </div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {module.topics.map((t, i) => (
              <li
                key={i}
                id={`topic-${i}`}
                className="flex items-start gap-2 rounded-md border border-border bg-card p-2.5 text-sm"
              >
                <span className="text-mono shrink-0 text-xs font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8" aria-label="Pandas and library functions">
          <h2 className="text-lg font-semibold">Pandas &amp; library functions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The functions this module teaches. The exact usage lands with
            the interactive lab in <span className="font-medium">Phase {module.phase}</span>.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {module.pandasFunctions.map((f) => (
              <li
                key={f}
                className="text-mono rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm"
              >
                {f}
              </li>
            ))}
          </ul>
        </section>

        {children}

        {!children && (
          <section className="mt-10" aria-label="Interactive lab status">
            <h2 className="text-lg font-semibold">Interactive lab</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The hands-on lab is the centrepiece of this module. It's not
              built yet — and rather than fake it, we tell you exactly when
              it will land.
            </p>
            <div className="mt-3">
              <ComingSoon
                phase={module.phase}
                deliverable={module.buildPreview}
                reason={
                  module.phase > 2
                    ? "This lab depends on the Dataset Explorer (Phase 2)."
                    : "Phase 2 ships the Dataset Explorer and the first five interactive labs."
                }
              />
            </div>
          </section>
        )}

        <nav className="mt-10 flex items-center justify-between gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={() => setView("roadmap")}>
            ← Back to roadmap
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("help")}
            className="text-muted-foreground"
          >
            Need help? Read the guide
          </Button>
        </nav>
      </article>
    </div>
  );
}
