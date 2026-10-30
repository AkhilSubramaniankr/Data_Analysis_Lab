"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useNavigation, type ViewId } from "@/lib/store/navigation";
import { PageTransition } from "@/components/effects/PageTransition";
import { HomeView } from "@/components/views/HomeView";
import { RoadmapView } from "@/components/views/RoadmapView";
import { ModuleView } from "@/components/views/ModuleView";
import { DatasetsView } from "@/components/views/DatasetsView";
import { PracticeView } from "@/components/views/PracticeView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { GlossaryView } from "@/components/views/GlossaryView";
import { HelpView } from "@/components/views/HelpView";

const VIEWS: Record<ViewId, React.ComponentType> = {
  home: HomeView,
  roadmap: RoadmapView,
  module: ModuleView,
  datasets: DatasetsView,
  practice: PracticeView,
  projects: ProjectsView,
  glossary: GlossaryView,
  help: HelpView,
};

export default function Page() {
  const view = useNavigation((s) => s.view);
  const moduleId = useNavigation((s) => s.moduleId);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const activeView: ViewId = mounted ? view : "home";
  const ViewComponent = VIEWS[activeView] ?? HomeView;
  // Include moduleId in the transition key so module-switches also animate
  const transitionKey = activeView === "module" ? `module-${moduleId}` : activeView;

  return (
    <AppShell>
      <PageTransition viewId={transitionKey}>
        <ViewComponent />
      </PageTransition>
    </AppShell>
  );
}
