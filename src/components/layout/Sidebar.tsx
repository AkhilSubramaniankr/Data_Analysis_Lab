"use client";

import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { useNavigation } from "@/lib/store/navigation";
import { getModuleById } from "@/lib/content/modules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const moduleId = useNavigation((s) => s.moduleId);
  const collapsed = useNavigation((s) => s.sidebarCollapsed);
  const toggleSidebar = useNavigation((s) => s.toggleSidebar);
  const setView = useNavigation((s) => s.setView);

  const moduleEntry = moduleId ? getModuleById(moduleId) : undefined;

  if (!moduleEntry) return null;

  return (
    <aside
      aria-label={`${moduleEntry.shortTitle} lesson list`}
      className={cn(
        "glass sticky top-20 hidden h-[calc(100vh-6rem)] shrink-0 self-start overflow-hidden border-r border-border/60 transition-[width] duration-200 md:block",
        collapsed ? "w-14" : "w-72"
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Module {moduleEntry.index}
              </p>
              <p className="truncate text-sm font-medium">{moduleEntry.shortTitle}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand lesson list" : "Collapse lesson list"}
            className="h-7 w-7 shrink-0 hover:glow-cyan"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed && (
          <nav aria-label="Module topics" className="flex-1 overflow-y-auto px-2 py-2">
            <p className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Topics
            </p>
            <ul className="flex flex-col gap-0.5">
              {moduleEntry.topics.map((t, i) => (
                <li key={i}>
                  <a
                    href={`#topic-${i}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 transition hover:bg-accent hover:text-[var(--color-ai-cyan)]"
                  >
                    <span className="text-mono text-xs text-muted-foreground">{i + 1}.</span>{" "}
                    {t}
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-4 flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pandas functions
            </p>
            <ul className="flex flex-wrap gap-1.5 px-2">
              {moduleEntry.pandasFunctions.map((f) => (
                <li key={f} className="text-mono rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[11px]">
                  {f}
                </li>
              ))}
            </ul>
          </nav>
        )}

        {!collapsed && (
          <div className="border-t border-border/60 p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:glow-cyan"
              onClick={() => setView("roadmap")}
            >
              ← All modules
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
