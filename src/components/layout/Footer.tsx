"use client";

import { Database, Github, LifeBuoy } from "lucide-react";
import { useNavigation } from "@/lib/store/navigation";

export function Footer() {
  const setView = useNavigation((s) => s.setView);

  return (
    <footer
      role="contentinfo"
      className="mt-auto border-t border-border/60 glass"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-navy-950)] text-[var(--color-ai-cyan)]"
            style={{ border: "1px solid color-mix(in oklch, var(--color-ai-cyan) 20%, transparent)" }}
          >
            <Database className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <p className="font-semibold">Pandas Lab</p>
            <p className="text-muted-foreground">
              An interactive learning platform for data analysis &amp; feature engineering with Pandas.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Learn data analysis and feature engineering from raw data to model-ready datasets.
            </p>
          </div>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-4 text-sm">
          <button
            type="button"
            onClick={() => setView("roadmap")}
            className="text-muted-foreground transition hover:text-[var(--color-ai-cyan)]"
          >
            Roadmap
          </button>
          <button
            type="button"
            onClick={() => setView("glossary")}
            className="text-muted-foreground transition hover:text-[var(--color-ai-cyan)]"
          >
            Glossary
          </button>
          <button
            type="button"
            onClick={() => setView("help")}
            className="flex items-center gap-1 text-muted-foreground transition hover:text-[var(--color-ai-cyan)]"
          >
            <LifeBuoy className="h-4 w-4" aria-hidden />
            Help
          </button>
          <a
            href="https://pandas.pydata.org/docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-muted-foreground transition hover:text-[var(--color-ai-cyan)]"
          >
            <Github className="h-4 w-4" aria-hidden />
            Pandas docs
          </a>
        </nav>
      </div>
    </footer>
  );
}
