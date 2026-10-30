"use client";

/**
 * ProjectsView — Capstone project hub (Phase 7).
 *
 * Embeds the CapstoneFlow component — the guided 9-phase Retail Sales
 * Analysis & ML Dataset Preparation capstone. Every phase shows real
 * computed results from the actual Retail Sales dataset.
 */

import { Trophy } from "lucide-react";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PageHeader } from "@/components/learning/PageHeader";
import { CapstoneFlow } from "@/components/practice/CapstoneFlow";

export function ProjectsView() {
  return (
    <SectionContainer className="py-8">
      <PageHeader
        eyebrow="Capstone project"
        title="Retail Sales Analysis & Machine Learning Dataset Preparation"
        subtitle="A guided nine-phase workflow on a real retail dataset — from raw rows to a validated, model-ready analytical dataset and a final report. Every number computed from the actual data."
      />

      <div className="role-data border-role bg-role-soft mt-4 rounded-md border p-3 text-xs">
        <p className="font-semibold text-role">How the capstone works</p>
        <p className="mt-1 text-foreground/80">
          Click any phase to expand it. Each phase shows the learning objective, the tasks, the Pandas code, and the real computed results from the Retail Sales dataset. Mark each phase complete as you go — your progress is persisted in your browser.
        </p>
        <p className="mt-1 text-foreground/80">
          Every number in this capstone was computed at page-load time from the actual dataset rows — no fabricated results. The final report (Phase 9) summarizes every finding.
        </p>
      </div>

      <div className="mt-5">
        <CapstoneFlow />
      </div>
    </SectionContainer>
  );
}
