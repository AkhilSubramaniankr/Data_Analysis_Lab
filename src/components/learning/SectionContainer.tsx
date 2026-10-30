"use client";

/**
 * SectionContainer — max-width content wrapper.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Optional id for anchor navigation. */
  id?: string;
  /** Override the default max width. */
  maxWidth?: "default" | "narrow" | "wide";
}

export function SectionContainer({
  children,
  className,
  id,
  maxWidth = "default",
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        maxWidth === "narrow" && "max-w-3xl",
        maxWidth === "default" && "max-w-7xl",
        maxWidth === "wide" && "max-w-[90rem]",
        className
      )}
    >
      {children}
    </section>
  );
}
