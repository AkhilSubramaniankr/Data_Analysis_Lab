"use client";

/**
 * CodeAndResult — paired Pandas code + result panel.
 *
 * Used by every lab to (a) show the equivalent Pandas code the learner
 * would type, and (b) show the real, computed result from the in-browser
 * DataFrame engine. A small "deterministic demonstration" badge reminds
 * the learner that the execution is in TypeScript, not Python.
 */

import * as React from "react";
import { CodePanel } from "@/components/learning/CodePanel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CodeAndResultProps {
  /** Pandas code the learner would type. */
  code: string;
  /** Caption above the code panel (what this code does). */
  caption?: string;
  /** The result panel — pass a rendered table, summary, or string. */
  children: React.ReactNode;
  /** Optional footer note (limitations / assumptions). */
  note?: string;
  className?: string;
}

export function CodeAndResult({ code, caption, children, note, className }: CodeAndResultProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">Pandas equivalent</h4>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          Deterministic demo
        </Badge>
      </div>
      <CodePanel language="python" caption={caption} code={code} note={note} />
      <div>
        <h4 className="mb-2 text-sm font-semibold">Computed result</h4>
        {children}
      </div>
    </div>
  );
}
