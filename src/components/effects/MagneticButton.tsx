"use client";

/**
 * MagneticButton — subtle magnetic hover effect for primary CTAs.
 *
 * When the cursor approaches, the button shifts a few pixels toward
 * the cursor with smooth easing. Returns to origin on mouse leave.
 *
 * Disabled for touch devices and reduced-motion users.
 *
 * Preserves the original click handler, disabled state, and all
 * button props — this is purely a visual wrapper.
 */

import * as React from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends React.ComponentProps<typeof motion.button> {
  /** Max displacement in pixels (default: 6). */
  strength?: number;
  /** Visual size — passed through to the underlying button styles (default: "lg"). */
  size?: "sm" | "md" | "lg" | "default";
  /** Visual variant — passed through to the underlying button styles. */
  variant?: "default" | "outline" | "ghost" | "secondary" | "link";
  children: React.ReactNode;
}

export function MagneticButton({
  children,
  strength = 6,
  className,
  size: _size = "lg",
  variant: _variant = "default",
  ...props
}: MagneticButtonProps) {
  // size and variant are accepted for API compatibility with the Button
  // component; the actual visual treatment comes from the className the
  // caller passes (the home-page CTAs already pass className="..." with
  // explicit button styles). These props are intentionally not forwarded
  // to motion.button (which doesn't understand them).
  void _size;
  void _variant;
  const prefersReduced = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const isTouchDevice = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const disabled = prefersReduced || isTouchDevice;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.max(rect.width, rect.height) / 2 + 20;
    if (dist < maxDist) {
      const factor = (1 - dist / maxDist) * strength;
      x.set((dx / dist) * factor);
      y.set((dy / dist) * factor);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (disabled) {
    // Render as a plain button (no motion) for reduced-motion / touch
    return (
      <button className={cn(className)} {...(props as React.ComponentProps<"button">)}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={cn(className)}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
