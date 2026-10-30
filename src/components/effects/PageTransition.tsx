"use client";

/**
 * PageTransition — gentle fade-in + slide-up entrance for view changes.
 *
 * Uses Framer Motion. Respects prefers-reduced-motion (renders without
 * animation). Does NOT remount children (preserves all state).
 *
 * Key: uses `key={view}` on the motion.div so Framer Motion animates
 * the transition when the view changes — but the child components
 * inside the view are NOT remounted (they manage their own state).
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function PageTransition({
  children,
  viewId,
}: {
  children: React.ReactNode;
  viewId: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      key={viewId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1], // smooth ease-out
      }}
    >
      {children}
    </motion.div>
  );
}
