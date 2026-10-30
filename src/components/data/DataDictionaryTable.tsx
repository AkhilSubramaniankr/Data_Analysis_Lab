"use client";

/**
 * DataDictionaryTable — the documented schema for a dataset.
 *
 * Shows column name, inferred dtype, description, example, key/target flags.
 * No fabrication — descriptions come from the DatasetSpec, which is the
 * documented source of truth.
 */

import type { DatasetSpec } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DataDictionaryTableProps {
  spec: DatasetSpec;
  className?: string;
}

export function DataDictionaryTable({ spec, className }: DataDictionaryTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr>
              <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Column</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dtype</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</th>
            </tr>
          </thead>
          <tbody>
            {spec.columns.map((c) => (
              <tr key={c.name} className="border-b border-border/50 hover:bg-muted/30">
                <td className="px-3 py-2 align-top">
                  <code className="text-mono text-xs font-medium">{c.name}</code>
                </td>
                <td className="px-3 py-2 align-top">
                  <code className="text-mono rounded bg-muted px-1.5 py-0.5 text-[10px]">{c.dtype}</code>
                </td>
                <td className="px-3 py-2 align-top text-xs text-foreground/80">{c.description}</td>
                <td className="px-3 py-2 align-top">
                  <code className="text-mono rounded bg-muted px-1.5 py-0.5 text-xs">{c.example}</code>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-wrap gap-1">
                    {c.isKey && <Badge variant="outline" className="text-[10px]">PK</Badge>}
                    {c.isTargetCandidate && <Badge variant="outline" className="text-[10px]">target</Badge>}
                    {c.categories && <Badge variant="outline" className="text-[10px]">{c.categories.length} cats</Badge>}
                    {c.range && <Badge variant="outline" className="text-[10px]">{c.range.min}–{c.range.max}</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
