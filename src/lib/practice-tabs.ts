/**
 * Practice-tab deep-link map.
 *
 * Resolves a topic's `labLink` identifier to the Practice view tab that
 * contains the matching hands-on laboratory. Used by InteractiveLearning's
 * "Try in lab →" button to deep-link to the correct tab.
 *
 * Kept in a neutral module (not PracticeView) to avoid a circular import
 * (PracticeView imports InteractiveLearning; InteractiveLearning must not
 * import PracticeView).
 */

import type { PracticeTabId } from "@/lib/store/navigation";

export const LAB_LINK_TO_TAB: Record<string, Exclude<PracticeTabId, null>> = {
  // Direct tab identifiers
  "stat-lab": "stat-lab",
  "fe-lab": "fe-lab",
  "fs-lab": "fs-lab",
  "playground": "playground",
  "exercises": "exercises",

  // Module-lab links — deep-link to the most relevant practice tab
  "module-5": "playground",  // grouping & aggregation → playground for hands-on
  "module-10": "fe-lab",     // categorical encoding → FE lab
  "module-12": "fe-lab",     // scaling → FE lab
  "module-13": "fs-lab",     // feature selection → FS lab
  "module-14": "playground", // ML preparation → playground
};

/** Resolve a labLink identifier to a deep-link tab (or null). */
export function labLinkToTab(labLink: string): Exclude<PracticeTabId, null> | null {
  return LAB_LINK_TO_TAB[labLink] ?? null;
}
