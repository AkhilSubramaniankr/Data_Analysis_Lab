"use client";

/**
 * GlossaryView — technical terminology explorer.
 *
 * Renders the 30+ glossary terms from the master spec §25. Each term has
 * a beginner-friendly definition, a technical explanation, a concrete
 * example, and a list of related terms. Supports filtering by keyword.
 *
 * No fabricated definitions — all explanations are accurate, plain
 * language, and respect the analytical caveats from the master spec.
 */

import * as React from "react";
import { BookText, Search, X } from "lucide-react";
import { GLOSSARY } from "@/lib/content/glossary";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PageHeader } from "@/components/learning/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function GlossaryView() {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(q) ||
        g.beginner.toLowerCase().includes(q) ||
        g.technical.toLowerCase().includes(q) ||
        g.example.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <SectionContainer className="py-8" maxWidth="default">
      <PageHeader
        eyebrow="Glossary"
        title="Technical terminology explorer"
        subtitle="Beginner-friendly definitions with technical explanations, examples, and related terms. Use it whenever a lesson mentions a term you're not 100% sure about."
      />

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms… (e.g., multicollinearity, leakage, quartile)"
          className="pl-9"
          aria-label="Search glossary terms"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-accent"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Showing {filtered.length} of {GLOSSARY.length} terms.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.map((g) => (
          <Card key={g.term} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookText className="h-4 w-4 text-[var(--color-ai-purple)]" aria-hidden />
                {g.term}
              </CardTitle>
              <CardDescription>{g.beginner}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Technical
                </p>
                <p className="mt-1 text-foreground/80">{g.technical}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Example
                </p>
                <p className="text-mono mt-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                  {g.example}
                </p>
              </div>
              {g.related.length > 0 && (
                <div className="mt-auto pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Related
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {g.related.map((r) => (
                      <li
                        key={r}
                        className="text-mono rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No terms match <span className="text-mono">"{query}"</span>. Try a
          different keyword.
        </div>
      )}
    </SectionContainer>
  );
}
