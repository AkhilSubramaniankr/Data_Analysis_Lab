"use client";

/**
 * PracticeView — hub with 6 tabs for interactive learning + practice.
 *
 * Tabs: Interactive Learning, Pandas Playground, Practice Center,
 * Statistical Lab, Feature Engineering Lab, Feature Selection Lab.
 */

import * as React from "react";
import { FlaskConical, Terminal, Sigma, Wrench, ListChecks, GraduationCap } from "lucide-react";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PageHeader } from "@/components/learning/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InteractiveLearning } from "@/components/practice/InteractiveLearning";
import { PandasPlayground } from "@/components/practice/PandasPlayground";
import { PracticeCenter } from "@/components/practice/PracticeCenter";
import { StatisticalLab } from "@/components/practice/StatisticalLab";
import { FeatureEngineeringLab } from "@/components/practice/FeatureEngineeringLab";
import { FeatureSelectionLab } from "@/components/practice/FeatureSelectionLab";
import { useNavigation } from "@/lib/store/navigation";

export function PracticeView() {
  const pendingTab = useNavigation((s) => s.pendingPracticeTab);
  const clearPending = useNavigation((s) => s.clearPendingPracticeTab);

  // Active tab is plain component state — no ref mutations during render.
  // The initial value reads pendingTab once (this is allowed — useState's
  // initializer is a pure read of store state, not a ref mutation).
  const [activeTab, setActiveTab] = React.useState<string>(
    () => (pendingTab && pendingTab !== "learn") ? pendingTab : "learn",
  );

  // Single effect that consumes a pending deep-link tab. Runs only when
  // pendingTab changes. Pattern:
  //   1. If pendingTab is set AND differs from activeTab → apply + clear.
  //   2. If pendingTab is set AND equals activeTab → already applied, just clear.
  //   3. If pendingTab is null → nothing to do.
  //
  // This avoids the previous refs-during-render pattern (which violated the
  // react-hooks/refs lint rule) and the previous race condition (where the
  // clear effect ran before the apply effect, resetting activeTab to "learn").
  //
  // activeTab is intentionally excluded from the dependency array: we want
  // this effect to fire only when a NEW pendingTab arrives, not on every
  // user-initiated tab switch. Reading activeTab inside an effect without
  // listing it as a dep is safe here because we only compare (never write)
  // and any stale read just delays the apply by one render cycle.
  React.useEffect(() => {
    if (!pendingTab) return;
    if (pendingTab !== "learn" && pendingTab !== activeTab) {
      setActiveTab(pendingTab);
    }
    clearPending();
  }, [pendingTab, clearPending, activeTab]);

  return (
    <SectionContainer className="py-8">
      <PageHeader
        eyebrow="Interactive Learning"
        title="Learn, practice, and master Pandas"
        subtitle="A complete interactive learning companion covering every topic in the curriculum — from DataFrame fundamentals to ML data preparation. Each topic includes a live demo, concept explanation, practical examples, Python code, and links to hands-on laboratories."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="learn" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            Interactive Learning
          </TabsTrigger>
          <TabsTrigger value="playground" className="gap-1.5">
            <Terminal className="h-3.5 w-3.5" aria-hidden />
            Pandas Playground
          </TabsTrigger>
          <TabsTrigger value="exercises" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden />
            Practice Center
          </TabsTrigger>
          <TabsTrigger value="stat-lab" className="gap-1.5">
            <Sigma className="h-3.5 w-3.5" aria-hidden />
            Statistical Lab
          </TabsTrigger>
          <TabsTrigger value="fe-lab" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
            Feature Engineering Lab
          </TabsTrigger>
          <TabsTrigger value="fs-lab" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Feature Selection Lab
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="mt-4">
          <InteractiveLearning />
        </TabsContent>

        <TabsContent value="playground" className="mt-4">
          <PandasPlayground />
        </TabsContent>

        <TabsContent value="exercises" className="mt-4">
          <PracticeCenter />
        </TabsContent>

        <TabsContent value="stat-lab" className="mt-4">
          <StatisticalLab />
        </TabsContent>

        <TabsContent value="fe-lab" className="mt-4">
          <FeatureEngineeringLab />
        </TabsContent>

        <TabsContent value="fs-lab" className="mt-4">
          <FeatureSelectionLab />
        </TabsContent>
      </Tabs>
    </SectionContainer>
  );
}
