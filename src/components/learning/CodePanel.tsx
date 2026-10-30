"use client";

/**
 * CodePanel — code block with copy button, monospace, line numbers optional.
 *
 * Phase-1 scope: pure client-side presentation. Syntax highlighting is
 * lightweight (one colour for code, one for comments) to keep the bundle
 * small; full syntax highlighting lands with the Pandas Playground in
 * Phase 6 (react-syntax-highlighter is already in deps).
 */

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodePanelProps {
  code: string;
  /** Language label (python, sql, bash, ...) — shown in the panel header. */
  language?: string;
  /** Optional caption above the code (what this code does). */
  caption?: string;
  /** Optional footer note (limitations, assumptions). */
  note?: string;
  /** Visual role colour class — defaults to none. */
  roleClassName?: string;
  /** Optional id for keyboard a11y linking. */
  id?: string;
  className?: string;
  /** Show line numbers. Default: false. */
  showLineNumbers?: boolean;
}

export function CodePanel({
  code,
  language = "python",
  caption,
  note,
  roleClassName,
  id,
  className,
  showLineNumbers = false,
}: CodePanelProps) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in restricted environments.
      setCopied(false);
    }
  };

  const lines = React.useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);

  return (
    <figure
      id={id}
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        roleClassName,
        className
      )}
      aria-label={caption ?? `${language} code`}
    >
      {(caption || language) && (
        <figcaption className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {caption ? (
              <span className="text-foreground/80">{caption}</span>
            ) : (
              <span className="text-mono uppercase tracking-wide">{language}</span>
            )}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-[var(--color-role-validated)]" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden />
                Copy
              </>
            )}
          </button>
        </figcaption>
      )}

      <pre className="m-0 overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className={cn("text-mono block")} aria-label={`${language} source`}>
          {showLineNumbers ? (
            <table className="border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i}>
                    <td className="select-none pr-3 text-right align-top text-muted-foreground/70">
                      {i + 1}
                    </td>
                    <td className="align-top whitespace-pre">{line || " "}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className="whitespace-pre">{code}</span>
          )}
        </code>
      </pre>

      {note && (
        <p className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </figure>
  );
}
