/**
 * Client-side navigation store (Zustand).
 *
 * The sandbox only exposes one user-visible route (`/`), so all module
 * navigation is implemented as client-side view switching. This store is
 * the single source of truth for the current view, the current module,
 * and the user's completed-lesson set (persisted to localStorage).
 *
 * No fabricated progress. Completion defaults to the empty set; the user
 * (or, later, real exercise submissions) toggles entries.
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ViewId =
  | "home"
  | "roadmap"
  | "module"
  | "datasets"
  | "practice"
  | "projects"
  | "glossary"
  | "help";

/**
 * The set of tabs available inside the Practice view. Allows deep-linking
 * from an Interactive topic's "Try in lab →" button to a specific lab.
 * `null` means "use the default tab".
 */
export type PracticeTabId =
  | "learn"
  | "playground"
  | "exercises"
  | "stat-lab"
  | "fe-lab"
  | "fs-lab"
  | null;

export interface NavigationState {
  /** Active top-level view. */
  view: ViewId;
  /** Active module id (only meaningful when view === "module"). */
  moduleId: string | null;
  /** Set of completed lesson ids — persisted to localStorage. */
  completedLessons: string[];
  /** Whether the mobile nav sheet is open. */
  mobileNavOpen: boolean;
  /** Whether the lesson sidebar is collapsed (within module view). */
  sidebarCollapsed: boolean;
  /**
   * When the user navigates to the Practice view, this tab is auto-selected.
   * Set by deep-link buttons (e.g., Interactive topic "Try in lab →").
   * Reset to null after first consumption so subsequent Practice visits
   * use the default tab.
   */
  pendingPracticeTab: PracticeTabId;

  setView: (view: ViewId) => void;
  /** Navigate to the Practice view AND auto-select a specific tab. */
  setViewWithPracticeTab: (view: "practice", tab: PracticeTabId) => void;
  openModule: (moduleId: string) => void;
  toggleLesson: (lessonId: string) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  resetProgress: () => void;
  /** Clear the pending practice tab (called by PracticeView after consuming it). */
  clearPendingPracticeTab: () => void;
}

export const useNavigation = create<NavigationState>()(
  persist(
    (set, get) => ({
      view: "home",
      moduleId: null,
      completedLessons: [],
      mobileNavOpen: false,
      sidebarCollapsed: false,
      pendingPracticeTab: null,

      setView: (view) =>
        set({
          view,
          mobileNavOpen: false,
          moduleId: view === "module" ? get().moduleId : null,
          // Clear any pending practice tab when navigating away from Practice.
          pendingPracticeTab: view === "practice" ? get().pendingPracticeTab : null,
        }),

      setViewWithPracticeTab: (view, tab) =>
        set({
          view,
          pendingPracticeTab: tab,
          mobileNavOpen: false,
          // view is always "practice" here, so moduleId is always reset.
          moduleId: null,
        }),

      openModule: (moduleId) =>
        set({ view: "module", moduleId, mobileNavOpen: false, pendingPracticeTab: null }),

      toggleLesson: (lessonId) => {
        const current = get().completedLessons;
        const exists = current.includes(lessonId);
        set({
          completedLessons: exists
            ? current.filter((id) => id !== lessonId)
            : [...current, lessonId],
        });
      },

      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      clearPendingPracticeTab: () => set({ pendingPracticeTab: null }),

      resetProgress: () => set({ completedLessons: [] }),
    }),
    {
      name: "pandas-learning-progress-v1",
      storage: createJSONStorage(() => {
        // SSR-safe storage guard.
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),
      // Only persist the user's progress, not the transient UI state.
      partialize: (state) => ({
        completedLessons: state.completedLessons,
      }),
    }
  )
);

/** Total completed-lesson count for header progress display. */
export function selectCompletedCount(state: NavigationState): number {
  return state.completedLessons.length;
}
