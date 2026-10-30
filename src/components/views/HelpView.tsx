"use client";

/**
 * HelpView — guide for the platform.
 *
 * Explains the navigation model (single-route SPA), the design system's
 * role colours, the phase-1 scope, the honesty rules, and the upload
 * policy. Pure content — no fabricated features.
 */

import { LifeBuoy, Shield, Palette, Route, Upload, AlertTriangle } from "lucide-react";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PageHeader } from "@/components/learning/PageHeader";
import { CodePanel } from "@/components/learning/CodePanel";

const ROLE_LEGEND = [
  { cls: "role-data", label: "Data input & operations", meaning: "AI blue — raw data, dataset operations, schema." },
  { cls: "role-transform", label: "Transformation", meaning: "Cyan — cleaning, encoding, scaling, feature creation." },
  { cls: "role-stats", label: "Statistics / modelling", meaning: "Purple — descriptive stats, correlation, model output." },
  { cls: "role-validated", label: "Validated output", meaning: "Green — checked, persisted, ready for use." },
  { cls: "role-warning", label: "Warning / limitation", meaning: "Orange — caveat, assumption, partial result." },
  { cls: "role-error", label: "Error / data-quality issue", meaning: "Red — failure, broken invariant." },
];

export function HelpView() {
  return (
    <SectionContainer className="py-8" maxWidth="default">
      <PageHeader
        eyebrow="Help & guide"
        title="How this platform works"
        subtitle="A short orientation. Read this once and you'll know how to navigate, what the colours mean, what's already built, and what's honestly deferred."
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <HelpCard icon={Route} title="Navigation">
          <p>
            The platform is a single-page application. The top navigation
            (or the mobile sheet menu) switches between views; clicking a
            module on the Roadmap opens that module's overview. The lesson
            sidebar inside a module view collapses on desktop and is
            reachable by scrolling on mobile.
          </p>
          <p>
            Your progress is persisted in your browser's <code className="text-mono">localStorage</code>.
            No account is required; clearing your browser data resets
            progress.
          </p>
        </HelpCard>

        <HelpCard icon={Palette} title="Colour system">
          <p>
            Every visual element is colour-coded by role, so you can scan a
            page and know which kind of thing you're looking at. Colour is
            never the only signal — text labels accompany every colour
            usage (per accessibility rules).
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {ROLE_LEGEND.map((r) => (
              <li
                key={r.cls}
                className={`flex items-start gap-2 rounded-md border border-border bg-background p-2 ${r.cls}`}
              >
                <span aria-hidden className="mt-0.5 h-3 w-3 rounded-sm bg-role-soft border border-role" />
                <span className="text-xs">
                  <span className="font-semibold text-role">{r.label}</span>
                  <span className="block text-muted-foreground">{r.meaning}</span>
                </span>
              </li>
            ))}
          </ul>
        </HelpCard>

        <HelpCard icon={Shield} title="Honesty rules">
          <p>
            The platform never fabricates a chart, statistic, table, or
            model result. Where a future feature is planned, you see a
            clearly-labelled <em>Coming in Phase N</em> panel that names
            the future phase and what it will deliver.
          </p>
          <p>
            Pandas demonstrations show accurate transformations and code.
            When the Pandas Playground ships in Phase 6, it will execute
            real Python in an isolated environment if the runtime supports
            it — otherwise deterministic, clearly-labelled simulated
            execution.
          </p>
        </HelpCard>

        <HelpCard icon={AlertTriangle} title="Phase 1 scope">
          <p>
            Phase 1 delivers the foundation: design system, navigation,
            homepage, learning roadmap, glossary, and reusable components.
          </p>
          <p>
            Module overview pages show the full topic list and planned
            Pandas functions now. Deep interactive labs land in
            Phases 2–5; the capstone lands in Phase 7.
          </p>
          <p className="text-xs text-muted-foreground">
            See the roadmap for the full delivery plan.
          </p>
        </HelpCard>

        <HelpCard icon={Upload} title="CSV upload policy (Phase 2)">
          <p>When CSV upload lands in Phase 2, it will follow these rules:</p>
          <ul className="mt-2 list-disc gap-1 pl-5 text-xs text-foreground/80">
            <li>File-size limit: 1 MB.</li>
            <li>Processed entirely in your browser; no external transmission.</li>
            <li>Clear, actionable error messages for the wrong delimiter, missing columns, or oversized uploads.</li>
            <li>Datasets you upload are not persisted across sessions unless you choose to.</li>
          </ul>
        </HelpCard>

        <HelpCard icon={LifeBuoy} title="Keyboard & accessibility">
          <p>
            The whole site is keyboard-navigable: Tab through the top
            nav, Enter to activate, Escape to close the mobile sheet.
            A skip-link at the top of every page jumps straight to main
            content.
          </p>
          <p>
            <code className="text-mono">prefers-reduced-motion</code> is
            honoured — the homepage pipeline animation stops, and
            transitions become near-instant.
          </p>
        </HelpCard>
      </div>

      <section className="mt-10" aria-labelledby="shortcut-h">
        <h2 id="shortcut-h" className="text-lg font-semibold">Quick keyboard shortcuts</h2>
        <CodePanel
          language="text"
          caption="Keyboard shortcuts"
          showLineNumbers={false}
          code={`Tab            Move focus to the next interactive element
Shift+Tab      Move focus to the previous interactive element
Enter          Activate the focused button or link
Escape         Close the mobile sheet / dialog
H              (when focused on the body) Skip-link is the first Tab target`}
          note="No global key handlers are bound — these are native browser behaviours plus the focus-ring CSS in globals.css."
        />
      </section>
    </SectionContainer>
  );
}

function HelpCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`help-${title.replace(/\s+/g, "-").toLowerCase()}-h`}
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <h2
        id={`help-${title.replace(/\s+/g, "-").toLowerCase()}-h`}
        className="flex items-center gap-2 text-base font-semibold"
      >
        <Icon className="h-4 w-4 text-[var(--color-ai-blue)]" aria-hidden />
        {title}
      </h2>
      <div className="mt-2 flex flex-col gap-2 text-sm text-foreground/80">
        {children}
      </div>
    </section>
  );
}
