"use client";

/**
 * TopNav — global navigation bar with premium glassmorphism + glow.
 *
 * Desktop: glassmorphic header with cyan glow on active nav item.
 * Mobile: Sheet with the same items.
 * Clicks call into the Zustand navigation store — unchanged behavior.
 */

import * as React from "react";
import { Menu, BookOpen, Database, FlaskConical, Trophy, BookText, HelpCircle, LineChart } from "lucide-react";
import { useNavigation, selectCompletedCount, type ViewId } from "@/lib/store/navigation";
import { MODULES } from "@/lib/content/modules";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem,
  NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ProgressIndicator } from "./ProgressIndicator";
import { ParticleIntensityToggle } from "@/components/effects/ParticleBackground";

interface NavItem {
  view: ViewId;
  label: string;
  icon: React.ElementType;
}

const TOP_NAV: NavItem[] = [
  { view: "home", label: "Home", icon: BookOpen },
  { view: "roadmap", label: "Roadmap", icon: LineChart },
  { view: "datasets", label: "Datasets", icon: Database },
  { view: "practice", label: "Practice", icon: FlaskConical },
  { view: "projects", label: "Projects", icon: Trophy },
  { view: "glossary", label: "Glossary", icon: BookText },
  { view: "help", label: "Help", icon: HelpCircle },
];

export function TopNav() {
  const view = useNavigation((s) => s.view);
  const setView = useNavigation((s) => s.setView);
  const openModule = useNavigation((s) => s.openModule);
  const completed = useNavigation(selectCompletedCount);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isActive = (v: ViewId) => view === v;

  return (
    <header
      role="banner"
      className="glass-nav sticky top-0 z-40 w-full border-b border-border/60"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Logo + wordmark */}
        <button
          type="button"
          onClick={() => setView("home")}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-accent"
          aria-label="Go to home"
        >
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-navy-950)] text-[var(--color-ai-cyan)] shadow-sm transition hover:glow-cyan"
            style={{ border: "1px solid color-mix(in oklch, var(--color-ai-cyan) 20%, transparent)" }}
          >
            <Database className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Pandas Lab</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Data Analysis &amp; Feature Engineering
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="ml-4 hidden flex-1 lg:block">
          <NavigationMenu>
            <NavigationMenuList className="flex-wrap gap-1">
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "transition-all",
                    isActive("roadmap") && "bg-accent text-[var(--color-ai-cyan)]"
                  )}
                  onClick={() => setView("roadmap")}
                >
                  Roadmap
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[640px] grid-cols-2 gap-1 p-2">
                    {MODULES.slice(0, 7).map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => openModule(m.id)}
                          className="flex w-full items-start gap-2 rounded-md p-2 text-left text-sm transition hover:bg-accent hover:text-accent-foreground"
                        >
                          <m.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="flex flex-col">
                            <span className="font-medium">
                              <span className="text-muted-foreground">M{m.index}.</span> {m.shortTitle}
                            </span>
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {m.learningObjective}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border/60 p-2 text-xs text-muted-foreground">
                    Modules 8-14 + Capstone on the full Roadmap page.
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {TOP_NAV.filter((n) => n.view !== "home" && n.view !== "roadmap").map((item) => {
              const active = isActive(item.view);
              return (
                <NavigationMenuItem key={item.view}>
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "transition-all",
                      active && "bg-accent"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setView(item.view)}
                      className={cn(
                        "flex items-center gap-1.5",
                        active && "text-[var(--color-ai-cyan)] glow-cyan rounded-md"
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden />
                      {item.label}
                    </button>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* Right cluster: particle toggle + progress + mobile menu */}
        <div className="ml-auto flex items-center gap-2">
          {mounted && (
            <div className="hidden xl:block">
              <ParticleIntensityToggle />
            </div>
          )}
          {mounted ? (
            <ProgressIndicator completed={completed} />
          ) : (
            <span className="hidden h-8 w-24 animate-pulse rounded-md bg-muted lg:block" aria-hidden />
          )}
          <MobileSheet />
        </div>
      </div>
    </header>
  );
}

function MobileSheet() {
  const view = useNavigation((s) => s.view);
  const setView = useNavigation((s) => s.setView);
  const openModule = useNavigation((s) => s.openModule);
  const open = useNavigation((s) => s.mobileNavOpen);
  const setOpen = useNavigation((s) => s.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[360px] glass">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-navy-950)] text-[var(--color-ai-cyan)]"
              style={{ border: "1px solid color-mix(in oklch, var(--color-ai-cyan) 20%, transparent)" }}
            >
              <Database className="h-4 w-4" aria-hidden />
            </span>
            Pandas Lab
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Mobile primary" className="mt-4 flex flex-col gap-1">
          {TOP_NAV.map((item) => {
            const active = view === item.view;
            return (
              <SheetClose asChild key={item.view}>
                <button
                  type="button"
                  onClick={() => setView(item.view)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-accent",
                    active && "bg-accent text-[var(--color-ai-cyan)]"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", active && "text-[var(--color-ai-cyan)]")} aria-hidden />
                  {item.label}
                </button>
              </SheetClose>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Modules
          </p>
          <div className="max-h-96 overflow-y-auto pr-1">
            <ul className="flex flex-col gap-0.5">
              {MODULES.map((m) => (
                <li key={m.id}>
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={() => openModule(m.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition hover:bg-accent"
                    >
                      <m.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="flex-1 truncate">
                        <span className="text-muted-foreground">M{m.index}.</span> {m.shortTitle}
                      </span>
                    </button>
                  </SheetClose>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
