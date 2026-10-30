"use client";

/**
 * PracticeCenter — aggregates all exercises across modules 1–14 into
 * a filterable, searchable interface.
 *
 * Reads every module exercise bank, flattens them into a single list,
 * and lets the learner filter by tier, module, and search text.
 * Reuses the existing ExerciseCard component for rendering + validation.
 */

import * as React from "react";
import { Search, Filter as FilterIcon, GraduationCap, FlaskConical, Briefcase, Rocket } from "lucide-react";
import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { ExerciseCard } from "@/components/data/ExerciseCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/content/modules";

// Import all module exercise banks
import { MODULE1_EXERCISES } from "@/lib/content/exercises/module1";
import { MODULE2_EXERCISES } from "@/lib/content/exercises/module2";
import { MODULE3_EXERCISES } from "@/lib/content/exercises/module3";
import { MODULE4_EXERCISES } from "@/lib/content/exercises/module4";
import { MODULE5_EXERCISES } from "@/lib/content/exercises/module5";
import { MODULE6_EXERCISES } from "@/lib/content/exercises/module6";
import { MODULE7_EXERCISES } from "@/lib/content/exercises/module7";
import { MODULE8_EXERCISES } from "@/lib/content/exercises/module8";
import { MODULE9_EXERCISES } from "@/lib/content/exercises/module9";
import { MODULE10_EXERCISES } from "@/lib/content/exercises/module10";
import { MODULE11_EXERCISES } from "@/lib/content/exercises/module11";
import { MODULE12_EXERCISES } from "@/lib/content/exercises/module12";
import { MODULE13_EXERCISES } from "@/lib/content/exercises/module13";
import { MODULE14_EXERCISES } from "@/lib/content/exercises/module14";

const ALL_EXERCISES: (ExerciseSpec & { moduleIndex: number; moduleTitle: string })[] = [
  ...MODULE1_EXERCISES, ...MODULE2_EXERCISES, ...MODULE3_EXERCISES,
  ...MODULE4_EXERCISES, ...MODULE5_EXERCISES, ...MODULE6_EXERCISES,
  ...MODULE7_EXERCISES, ...MODULE8_EXERCISES, ...MODULE9_EXERCISES,
  ...MODULE10_EXERCISES, ...MODULE11_EXERCISES, ...MODULE12_EXERCISES,
  ...MODULE13_EXERCISES, ...MODULE14_EXERCISES,
].map((ex) => {
  const mod = MODULES.find((m) => m.id === ex.moduleId);
  return { ...ex, moduleIndex: mod?.index ?? 0, moduleTitle: mod?.shortTitle ?? ex.moduleId };
});

const TIERS = [
  { id: "all", name: "All tiers" },
  { id: "beginner", name: "Beginner", icon: GraduationCap },
  { id: "intermediate", name: "Intermediate", icon: FlaskConical },
  { id: "advanced", name: "Advanced", icon: Rocket },
  { id: "industry", name: "Industry", icon: Briefcase },
];

export function PracticeCenter() {
  const [tier, setTier] = React.useState("all");
  const [moduleId, setModuleId] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const filtered = ALL_EXERCISES.filter((ex) => {
    if (tier !== "all" && ex.tier !== tier) return false;
    if (moduleId !== "all" && ex.moduleId !== moduleId) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return ex.question.toLowerCase().includes(q) || ex.task.toLowerCase().includes(q) || (ex.concept ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h4 className="text-sm font-semibold">Filters</h4>
          <Badge variant="outline" className="ml-auto text-[10px]">{filtered.length} of {ALL_EXERCISES.length}</Badge>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {MODULES.map((m) => <SelectItem key={m.id} value={m.id}>M{m.index}: {m.shortTitle}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…" />
            </div>
          </div>
        </div>
      </div>

      {/* Exercise list */}
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No exercises match your filters. Try widening the search.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ex) => (
            <div key={ex.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold">M{ex.moduleIndex}</span>
                <span>·</span>
                <span>{ex.moduleTitle}</span>
                <span>·</span>
                <span className="uppercase tracking-wider">{ex.tier}</span>
              </div>
              <ExerciseCard exercise={ex} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
