"use client";

/**
 * ExerciseCard — interactive exercise with validation, hints, and a
 * revealed-on-request solution.
 *
 * Per master spec §23: provides question, expected task, interactive
 * answer input, validation, correct answer, explanation, common mistakes,
 * relevant concept, suggested next lesson. The answer is NOT revealed
 * before submission unless the learner explicitly requests a hint or the
 * full solution.
 *
 * Validation runs against the real DataFrame engine where possible —
 * no fabricated answer keys.
 */

import * as React from "react";
import { CheckCircle2, Lightbulb, XCircle, Eye, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ExerciseType = "mcq" | "text" | "code" | "select";

export interface ExerciseSpec {
  id: string;
  /** Difficulty tier. */
  tier: "beginner" | "intermediate" | "advanced" | "industry";
  /** Module this exercise belongs to. */
  moduleId: string;
  /** Question (can include inline code via backticks). */
  question: string;
  /** What the learner is expected to do (one sentence). */
  task: string;
  type: ExerciseType;
  /** Options for MCQ / select. */
  options?: { value: string; label: string }[];
  /** Validator: takes the user's answer, returns {correct, explanation}. */
  validator: (answer: string) => { correct: boolean; explanation: string };
  /** Optional hint (revealed on request). */
  hint?: string;
  /** Full solution (revealed on request, or after incorrect submission). */
  solution: string;
  /** Common mistakes the learner should know about. */
  commonMistakes?: string[];
  /** Relevant concept / glossary term. */
  concept?: string;
  /** Suggested next lesson id (a module id). */
  nextLessonId?: string;
}

interface ExerciseCardProps {
  exercise: ExerciseSpec;
  /** Title for keyboard nav / aria. */
  title?: string;
  className?: string;
}

export function ExerciseCard({ exercise, title, className }: ExerciseCardProps) {
  const [answer, setAnswer] = React.useState<string>("");
  const [submitted, setSubmitted] = React.useState(false);
  const [result, setResult] = React.useState<{ correct: boolean; explanation: string } | null>(null);
  const [hintShown, setHintShown] = React.useState(false);
  const [solutionShown, setSolutionShown] = React.useState(false);

  const onSubmit = () => {
    if (!answer.trim()) return;
    const r = exercise.validator(answer);
    setResult(r);
    setSubmitted(true);
    // Reveal the solution after submission (per spec, the answer is revealed
    // only after the learner submits or explicitly requests it).
    setSolutionShown(true);
  };

  const onReset = () => {
    setAnswer("");
    setSubmitted(false);
    setResult(null);
    setHintShown(false);
    setSolutionShown(false);
  };

  return (
    <div
      className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm", className)}
      aria-label={title ?? `Exercise: ${exercise.question.slice(0, 60)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          {exercise.tier}
        </Badge>
        {exercise.concept && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            {exercise.concept}
          </Badge>
        )}
      </div>

      <p className="text-sm font-medium leading-relaxed">{exercise.question}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold">Task:</span> {exercise.task}
      </p>

      <AnswerInput
        type={exercise.type}
        answer={answer}
        setAnswer={setAnswer}
        options={exercise.options}
        disabled={submitted}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onSubmit} disabled={submitted || !answer.trim()}>
          Submit
        </Button>
        {exercise.hint && !hintShown && (
          <Button size="sm" variant="ghost" onClick={() => setHintShown(true)} className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Show hint
          </Button>
        )}
        {!solutionShown && (
          <Button size="sm" variant="ghost" onClick={() => setSolutionShown(true)} className="gap-1.5">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Reveal solution
          </Button>
        )}
        {submitted && (
          <Button size="sm" variant="outline" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </Button>
        )}
      </div>

      {hintShown && exercise.hint && (
        <div className="rounded-md border border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)] p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-role-warning)]">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Hint
          </p>
          <p className="mt-1 text-foreground/80">{exercise.hint}</p>
        </div>
      )}

      {submitted && result && (
        <div
          className={cn(
            "rounded-md border p-3 text-sm",
            result.correct
              ? "border-[var(--color-role-validated)]/40 bg-[color-mix(in_oklch,var(--color-role-validated)_8%,transparent)]"
              : "border-[var(--color-role-error)]/40 bg-[color-mix(in_oklch,var(--color-role-error)_8%,transparent)]"
          )}
          role="status"
          aria-live="polite"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
            {result.correct ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-role-validated)]" aria-hidden />
                <span className="text-[var(--color-role-validated)]">Correct</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-[var(--color-role-error)]" aria-hidden />
                <span className="text-[var(--color-role-error)]">Not quite</span>
              </>
            )}
          </p>
          <p className="mt-1 text-foreground/80">{result.explanation}</p>
        </div>
      )}

      {solutionShown && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Solution</p>
          <pre className="text-mono mt-1 overflow-x-auto rounded bg-background p-2 text-xs leading-relaxed">
            {exercise.solution}
          </pre>
        </div>
      )}

      {exercise.commonMistakes && exercise.commonMistakes.length > 0 && solutionShown && (
        <div className="rounded-md border border-border bg-card p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Common mistakes</p>
          <ul className="mt-1 list-disc gap-1 pl-5 text-xs text-foreground/80">
            {exercise.commonMistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {exercise.nextLessonId && solutionShown && (
        <p className="text-xs text-muted-foreground">
          Suggested next: <span className="font-medium">{exercise.nextLessonId}</span>
        </p>
      )}
    </div>
  );
}

function AnswerInput({
  type,
  answer,
  setAnswer,
  options,
  disabled,
}: {
  type: ExerciseType;
  answer: string;
  setAnswer: (s: string) => void;
  options?: { value: string; label: string }[];
  disabled?: boolean;
}) {
  if (type === "mcq" && options) {
    return (
      <RadioGroup value={answer} onValueChange={setAnswer} disabled={disabled}>
        {options.map((o) => (
          <div key={o.value} className="flex items-start gap-2">
            <RadioGroupItem value={o.value} id={`opt-${o.value}`} />
            <Label htmlFor={`opt-${o.value}`} className="text-sm font-normal">
              {o.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (type === "select" && options) {
    return (
      <Select value={answer} onValueChange={setAnswer} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (type === "code") {
    return (
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your Pandas code…"
        disabled={disabled}
        className="text-mono text-xs"
        rows={4}
      />
    );
  }
  return (
    <Input
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      placeholder="Type your answer…"
      disabled={disabled}
    />
  );
}
