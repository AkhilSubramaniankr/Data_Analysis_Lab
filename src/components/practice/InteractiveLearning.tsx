"use client";

/**
 * InteractiveLearning — comprehensive curriculum companion.
 *
 * Renders all interactive learning topics organized by category,
 * with full educational content in expandable accordion sections.
 * Each topic teaches: WHAT → WHY → WHEN → HOW → EXAMPLE → CODE →
 * INTERPRETATION → MISTAKES → TAKEAWAY.
 *
 * Uses the existing Accordion, CodePanel, and Badge components.
 * No new dependencies. Premium dark theme preserved.
 */

import * as React from "react";
import { Lightbulb, AlertTriangle, BookOpen, Target, Code2, Eye, Wrench, Compass, CheckCircle2 } from "lucide-react";
import { Database, Search, Sparkles, Sigma, Layers, LineChart, TrendingUp, Workflow, ListChecks } from "lucide-react";
import {
  TOPICS,
  CATEGORIES,
  getTopicsByCategory,
  type TopicCategory,
  type InteractiveTopic,
} from "@/lib/content/interactive-topics";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodePanel } from "@/components/learning/CodePanel";
import { Badge } from "@/components/ui/badge";
import { useNavigation } from "@/lib/store/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TopicDemo } from "@/components/practice/TopicDemo";
import { labLinkToTab } from "@/lib/practice-tabs";

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Database: Database,
  Search: Search,
  Sparkles: Sparkles,
  Sigma: Sigma,
  Layers: Layers,
  LineChart: LineChart,
  TrendingUp: TrendingUp,
  Wrench: Wrench,
  ListChecks: ListChecks,
  Workflow: Workflow,
};

export function InteractiveLearning() {
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<TopicCategory | "all">("all");

  const filtered = TOPICS.filter((t) => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.concept.toLowerCase().includes(q) ||
        t.why.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCategories = activeCategory === "all"
    ? CATEGORIES.filter((c) => filtered.some((t) => t.category === c.id))
    : CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      {/* Search + category filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/50 backdrop-blur-sm p-3">
        <input
          type="text"
          placeholder="Search topics..."
          aria-label="Search topics"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-mono flex-1 min-w-[200px] rounded-md border border-border/60 bg-background/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:border-[var(--color-ai-cyan)] focus:outline-none"
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory("all")}
            aria-pressed={activeCategory === "all"}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              activeCategory === "all"
                ? "bg-[var(--color-ai-cyan)]/20 text-[var(--color-ai-cyan)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {CATEGORIES.map((c) => {
            const count = getTopicsByCategory(c.id).length;
            if (count === 0) return null;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                aria-pressed={activeCategory === c.id}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  activeCategory === c.id
                    ? "bg-[var(--color-ai-cyan)]/20 text-[var(--color-ai-cyan)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c.id} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {TOPICS.length} topics
      </p>

      {/* Topics by category */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No topics match your search. Try a different keyword.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {activeCategories.map((cat) => {
            const topics = filtered.filter((t) => t.category === cat.id);
            if (topics.length === 0) return null;
            const Icon = CATEGORY_ICONS[cat.icon] ?? BookOpen;
            return (
              <div key={cat.id}>
                {/* Category header */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-ai-cyan)]/10 text-[var(--color-ai-cyan)]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{cat.id}</h3>
                    <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                  </div>
                </div>

                {/* Topic accordion */}
                <Accordion type="single" collapsible className="flex flex-col gap-2">
                  {topics.map((topic, idx) => (
                    <AccordionItem
                      key={topic.id}
                      value={topic.id}
                      className="overflow-hidden rounded-lg border border-border/60 bg-card/50 backdrop-blur-sm"
                    >
                      <AccordionTrigger className="px-4 py-3 text-left hover:bg-accent/50 transition">
                        <span className="flex items-center gap-2">
                          <span className="text-mono text-xs font-semibold text-muted-foreground">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="text-sm font-medium">{topic.title}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <TopicContent topic={topic} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopicContent({ topic }: { topic: InteractiveTopic }) {
  const setView = useNavigation((s) => s.setView);
  const setViewWithPracticeTab = useNavigation((s) => s.setViewWithPracticeTab);
  const openModule = useNavigation((s) => s.openModule);

  // Resolve the topic's labLink to a deep-link Practice tab.
  const labLinkTab = topic.labLink ? labLinkToTab(topic.labLink) : null;

  // If the labLink references a real module (e.g., "module-5"), the
  // "Open the module lab" button takes the user to that module's view
  // instead. Otherwise the "Try in lab" button deep-links to the
  // resolved Practice tab.
  const isModuleLabLink = topic.labLink?.startsWith("module-") ?? false;

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* LIVE DEMO — rendered first so the learner can interact before reading */}
      {topic.demo && (
        <div className="role-data border-role bg-role-soft rounded-md border p-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          <span className="text-role font-semibold">Live demo</span> — interact with the controls below to see the concept in action.
        </div>
      )}
      {topic.demo && <TopicDemo demo={topic.demo} />}

      {/* WHAT — Concept */}
      <Section icon={BookOpen} label="What is it?" tone="data">
        <p className="text-sm leading-relaxed text-foreground/85">{topic.concept}</p>
      </Section>

      {/* WHY */}
      <Section icon={Compass} label="Why is it used?" tone="transform">
        <p className="text-sm leading-relaxed text-foreground/85">{topic.why}</p>
      </Section>

      {/* WHEN */}
      <Section icon={Target} label="When to use it" tone="stats">
        <p className="text-sm leading-relaxed text-foreground/85">{topic.when}</p>
      </Section>

      {/* HOW */}
      <Section icon={Wrench} label="How it works" tone="data">
        <p className="text-sm leading-relaxed text-foreground/85">{topic.how}</p>
      </Section>

      {/* PRACTICAL EXAMPLE */}
      <Section icon={Lightbulb} label="Practical example" tone="validated">
        <p className="text-sm leading-relaxed text-foreground/85">{topic.example}</p>
      </Section>

      {/* CODE */}
      <Section icon={Code2} label="Python / Pandas code" tone="transform">
        <CodePanel language="python" code={topic.code} />
      </Section>

      {/* INTERPRETATION */}
      <Section icon={Eye} label="How to interpret the result" tone="stats">
        <p className="text-sm leading-relaxed text-foreground/85">{topic.interpretation}</p>
      </Section>

      {/* COMMON MISTAKES */}
      {topic.mistakes.length > 0 && (
        <Section icon={AlertTriangle} label="Common mistakes" tone="warning">
          <ul className="flex flex-col gap-1.5">
            {topic.mistakes.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                <span className="text-[var(--color-role-warning)] mt-0.5">⚠</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* TAKEAWAY */}
      <div className="rounded-md border border-[var(--color-role-validated)]/30 bg-[color-mix(in_oklch,var(--color-role-validated)_6%,transparent)] p-3">
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[var(--color-role-validated)]" aria-hidden />
          <span>
            <span className="font-semibold text-[var(--color-role-validated)]">Key takeaway: </span>
            <span className="text-foreground/85">{topic.takeaway}</span>
          </span>
        </p>
      </div>

      {/* Lab link — deep-links to the correct Practice tab or opens the module view */}
      {topic.labLink && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          {isModuleLabLink ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Open the corresponding module view (e.g., "module-5" →
                // "grouping-aggregation"). The module id is derived from
                // the labLink by stripping the "module-" prefix and using
                // the modules.ts index lookup.
                const idx = Number(topic.labLink!.replace("module-", ""));
                // Map module index → id via the modules catalog (lazy import
                // would be overkill; we use the canonical mapping inline).
                const moduleIdByIndex: Record<number, string> = {
                  1: "dataset-exploration",
                  2: "data-quality",
                  3: "selection-filtering",
                  4: "descriptive-stats",
                  5: "grouping-aggregation",
                  6: "correlation",
                  7: "eda-business",
                  8: "trend-analysis",
                  9: "feature-engineering-fundamentals",
                  10: "categorical-encoding",
                  11: "binning",
                  12: "scaling",
                  13: "feature-selection",
                  14: "ml-preparation",
                };
                const moduleId = moduleIdByIndex[idx];
                if (moduleId) openModule(moduleId);
              }}
              className="gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Open the module lab →
            </Button>
          ) : labLinkTab ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewWithPracticeTab("practice", labLinkTab)}
              className="gap-1.5"
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              Try in the {labLinkTab} lab →
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("practice")}
              className="gap-1.5"
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              Try in the interactive lab →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: React.ElementType;
  label: string;
  tone: "data" | "transform" | "stats" | "validated" | "warning";
  children: React.ReactNode;
}) {
  const roleClass = `role-${tone}`;
  return (
    <div className={`flex flex-col gap-1.5 ${roleClass}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-role" aria-hidden />
        {label}
      </p>
      {children}
    </div>
  );
}
