"use client";

/**
 * HomeView — homepage.
 *
 * Student-focused composition:
 *  - Hero: title, subtitle, primary CTA (Start Learning), secondary CTA
 *    (Explore Interactive Labs), animated 7-stage pipeline, compact
 *    stats strip.
 *  - Dashboard: current stage, recommended lesson, recently completed,
 *    featured datasets, practice labs, capstone project.
 *  - Roadmap preview: first 6 module cards.
 *  - Principles: educational benefits, not development milestones.
 */

import * as React from "react";
import {
  ArrowRight,
  Compass,
  Database,
  FlaskConical,
  Trophy,
  Sparkles,
  PlayCircle,
  Layers,
  BookOpen,
} from "lucide-react";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { motion } from "framer-motion";
import { useNavigation } from "@/lib/store/navigation";
import { MODULES, ROADMAP } from "@/lib/content/modules";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PipelineDiagram } from "@/components/learning/PipelineDiagram";
import { LessonCard } from "@/components/learning/LessonCard";
import { StatusBadge } from "@/components/learning/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function HomeView() {
  const setView = useNavigation((s) => s.setView);
  const openModule = useNavigation((s) => s.openModule);
  const completedLessons = useNavigation((s) => s.completedLessons);
  const completed = completedLessons.length;

  const nextModule =
    MODULES.find((m) => !completedLessons.includes(m.id)) ?? MODULES[0];

  const recent = MODULES.filter((m) => completedLessons.includes(m.id))
    .slice(-3)
    .reverse();

  const heroCtaPrimary = () => openModule(nextModule.id);
  const heroCtaSecondary = () => setView("practice");

  return (
    <>
      <Hero onPrimary={heroCtaPrimary} onSecondary={heroCtaSecondary} />

      <SectionContainer className="mt-12 sm:mt-16" id="dashboard">
        <section aria-labelledby="dashboard-h">
          <h2 id="dashboard-h" className="text-xl font-semibold sm:text-2xl">
            Your learning dashboard
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Track your progress through the analytical lifecycle. Your completed
            modules persist between sessions — pick up where you left off.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Compass className="h-4 w-4 text-[var(--color-ai-cyan)]" aria-hidden />
                  Current stage
                </CardTitle>
                <CardDescription>
                  Where you are in the analytical workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-mono text-sm font-semibold">
                  {completed === 0
                    ? "Raw Dataset → Explore"
                    : completed < 5
                      ? "Explore → Clean → Analyze"
                      : completed < 10
                        ? "Analyze → Engineer Features"
                        : "Select Features → Validate"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {completed} of {ROADMAP.length} modules completed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-[var(--color-role-transform)]" aria-hidden />
                  Recommended next lesson
                </CardTitle>
                <CardDescription>
                  The next module in learning order.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  onClick={() => openModule(nextModule.id)}
                  className="card-interactive flex w-full items-center justify-between rounded-md border border-border/60 bg-background/50 px-3 py-2 text-left text-sm"
                >
                  <span>
                    <span className="text-xs text-muted-foreground">Module {nextModule.index}.</span>{" "}
                    <span className="font-medium">{nextModule.shortTitle}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </button>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextModule.learningObjective}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-[var(--color-role-stats)]" aria-hidden />
                  Recently completed
                </CardTitle>
                <CardDescription>
                  Modules you've marked done.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completed === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    None yet. Mark a module complete on the Roadmap and it
                    will appear here.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {recent.map((m) => (
                      <li
                        key={m.id}
                        className="text-mono flex items-center gap-2 text-xs"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-role-validated)]" aria-hidden />
                        Module {m.index}: {m.shortTitle}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <DashboardTile
              icon={Database}
              role="data"
              title="Explore datasets"
              cta="Open Dataset Explorer"
              onCta={() => setView("datasets")}
              description="Real built-in datasets — Retail Sales, Customer Transactions, Employee Analytics, and Marketing — each with a data dictionary, quality report, and CSV upload support."
            />
            <DashboardTile
              icon={FlaskConical}
              role="transform"
              title="Practice labs"
              cta="Open Practice Center"
              onCta={() => setView("practice")}
              description="Five hands-on labs: a Pandas Playground, statistical analysis, feature engineering, feature selection, and 71 validated exercises with instant feedback."
            />
            <DashboardTile
              icon={Trophy}
              role="validated"
              title="Capstone project"
              cta="Open capstone"
              onCta={() => setView("projects")}
              description="A guided 9-phase retail sales analysis — from raw dataset to a validated, model-ready analytical dataset with a final report."
            />
          </div>
        </section>
      </SectionContainer>

      <SectionContainer className="mt-12 sm:mt-16" id="roadmap-preview">
        <section aria-labelledby="roadmap-preview-h">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 id="roadmap-preview-h" className="text-xl font-semibold sm:text-2xl">
                Start with the foundations
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">
                Begin with Dataset Exploration, Data Quality, Selection &amp; Filtering,
                Descriptive Statistics, and Grouping &amp; Aggregation. Click any card
                to open the full interactive lab.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("roadmap")}>
              View all {ROADMAP.length} →
            </Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.slice(0, 6).map((m) => (
              <LessonCard
                key={m.id}
                lessonId={m.id}
                title={m.shortTitle}
                summary={m.learningObjective}
                status={m.status}
                phase={m.phase}
                index={m.index}
                icon={m.icon}
                onSelect={() => openModule(m.id)}
              />
            ))}
          </div>
        </section>
      </SectionContainer>

      <SectionContainer className="mt-12 sm:mt-16" id="principles">
        <section aria-labelledby="principles-h">
          <h2 id="principles-h" className="text-xl font-semibold sm:text-2xl">
            What makes this platform different
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <PrincipleCard
              icon={BookOpen}
              role="data"
              title="Concepts first, code second"
              body="Every module teaches the analytical decision before the Pandas call. You learn when to use median imputation — not just how to call fillna()."
            />
            <PrincipleCard
              icon={Layers}
              role="stats"
              title="Real data, real results"
              body="Every chart, statistic, and table is computed from actual dataset rows. No placeholder numbers, no mockup data — just real arithmetic you can verify."
            />
            <PrincipleCard
              icon={Compass}
              role="validated"
              title="Leakage-safe by design"
              body="Every preprocessing step is fit on training data only — and the UI prevents leakage. Target encoding never sees validation targets. Train and test never mix."
            />
          </div>
        </section>
      </SectionContainer>
    </>
  );
}

function Hero({
  onPrimary,
  onSecondary,
}: {
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <section
      aria-labelledby="hero-h"
      className="relative overflow-hidden border-b border-border/60 bg-grid"
    >
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ai-cyan)]" aria-hidden />
            Interactive Pandas learning · Real datasets · Hands-on labs
          </span>
          <h1
            id="hero-h"
            className="max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            Data Analysis &amp; Feature Engineering with Pandas
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Master the journey from raw data to meaningful business insights
            and machine-learning-ready datasets through interactive lessons,
            practical Python examples, statistical explanations, and
            real-world analytics workflows.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <MagneticButton
              size="lg"
              onClick={onPrimary}
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all h-10 px-6 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-[0_0_12px_var(--color-glow-cyan)]"
            >
              <PlayCircle className="h-4 w-4" aria-hidden />
              Start Learning
            </MagneticButton>
            <MagneticButton
              size="lg"
              onClick={onSecondary}
              className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all h-10 px-6 border border-border/60 bg-background/50 backdrop-blur-sm shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-[var(--color-ai-cyan)]/30"
            >
              Explore Interactive Labs
            </MagneticButton>
          </div>

          {/* Compact stats strip — one place, one line */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <StatChip icon={BookOpen} label={`${ROADMAP.length - 1} modules + capstone`} />
            <StatChip icon={FlaskConical} label="5 practice labs" />
            <StatChip icon={Database} label="4 built-in datasets" />
            <StatChip icon={Layers} label="71 exercises" />
          </div>
        </motion.div>

        <div className="mt-10">
          <PipelineDiagram />
        </div>
      </div>
    </section>
  );
}

function StatChip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
      <span className="font-medium">{label}</span>
    </span>
  );
}

interface DashboardTileProps {
  icon: React.ElementType;
  role: "data" | "transform" | "stats" | "validated" | "warning";
  title: string;
  description: string;
  cta: string;
  onCta: () => void;
}

function DashboardTile({
  icon: Icon,
  role,
  title,
  description,
  cta,
  onCta,
}: DashboardTileProps) {
  const roleClass = `role-${role}`;
  return (
    <Card className={roleClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-md bg-role-soft text-role">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onCta} className="w-full">
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

function PrincipleCard({
  icon: Icon,
  role,
  title,
  body,
}: {
  icon: React.ElementType;
  role: "data" | "stats" | "validated";
  title: string;
  body: string;
}) {
  const roleClass = `role-${role}`;
  return (
    <div className={`card-interactive flex flex-col gap-2 rounded-lg border border-border/60 bg-card/85 backdrop-blur-sm p-4 shadow-sm ${roleClass}`}>
      <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-md bg-role-soft text-role">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
