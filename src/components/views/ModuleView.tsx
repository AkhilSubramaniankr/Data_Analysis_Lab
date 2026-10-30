"use client";

/**
 * ModuleView — wraps the active module in a ModuleShell and renders the
 * matching lab (if any) as the module body.
 *
 * Phase 2 wires labs for modules 1–5. Modules 6+ still get the ModuleShell
 * with its "Coming in Phase N" panel.
 */

import { ArrowLeft } from "lucide-react";
import { useNavigation } from "@/lib/store/navigation";
import { getModuleById } from "@/lib/content/modules";
import { ModuleShell } from "@/components/learning/ModuleShell";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { Button } from "@/components/ui/button";
import { Module1Lab } from "@/components/views/module-labs/Module1Lab";
import { Module2Lab } from "@/components/views/module-labs/Module2Lab";
import { Module3Lab } from "@/components/views/module-labs/Module3Lab";
import { Module4Lab } from "@/components/views/module-labs/Module4Lab";
import { Module5Lab } from "@/components/views/module-labs/Module5Lab";
import { Module6Lab } from "@/components/views/module-labs/Module6Lab";
import { Module7Lab } from "@/components/views/module-labs/Module7Lab";
import { Module8Lab } from "@/components/views/module-labs/Module8Lab";
import { Module9Lab } from "@/components/views/module-labs/Module9Lab";
import { Module10Lab } from "@/components/views/module-labs/Module10Lab";
import { Module11Lab } from "@/components/views/module-labs/Module11Lab";
import { Module12Lab } from "@/components/views/module-labs/Module12Lab";
import { Module13Lab } from "@/components/views/module-labs/Module13Lab";
import { Module14Lab } from "@/components/views/module-labs/Module14Lab";
import { CapstoneFlow } from "@/components/practice/CapstoneFlow";

/**
 * Lab dispatch table. Maps a module/capstone id (from modules.ts) to the
 * React component that renders its interactive body. The capstone id is
 * included here so the Roadmap's capstone card opens the real guided flow
 * instead of an empty module shell.
 */
const LABS: Record<string, () => React.ReactNode> = {
  "dataset-exploration": () => <Module1Lab />,
  "data-quality": () => <Module2Lab />,
  "selection-filtering": () => <Module3Lab />,
  "descriptive-stats": () => <Module4Lab />,
  "grouping-aggregation": () => <Module5Lab />,
  "correlation": () => <Module6Lab />,
  "eda-business": () => <Module7Lab />,
  "trend-analysis": () => <Module8Lab />,
  "feature-engineering-fundamentals": () => <Module9Lab />,
  "categorical-encoding": () => <Module10Lab />,
  "binning": () => <Module11Lab />,
  "scaling": () => <Module12Lab />,
  "feature-selection": () => <Module13Lab />,
  "ml-preparation": () => <Module14Lab />,
  "capstone": () => <CapstoneFlow />,
};

export function ModuleView() {
  const moduleId = useNavigation((s) => s.moduleId);
  const setView = useNavigation((s) => s.setView);

  const moduleEntry = moduleId ? getModuleById(moduleId) : undefined;

  if (!moduleEntry) {
    return (
      <SectionContainer className="py-16" maxWidth="narrow">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl" aria-hidden>🧭</span>
          <h1 className="text-xl font-semibold">No module selected</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Pick a module from the roadmap to see its full topic list,
            planned Pandas functions, and what you'll build.
          </p>
          <Button onClick={() => setView("roadmap")} className="mt-2 gap-1.5">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Open the roadmap
          </Button>
        </div>
      </SectionContainer>
    );
  }

  const Lab = moduleId ? LABS[moduleId] : undefined;

  return (
    <ModuleShell module={moduleEntry}>
      {Lab ? <Lab /> : null}
    </ModuleShell>
  );
}
