/**
 * Module 4 exercises — Descriptive Statistics.
 * Validators compute real values from the retail dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import {
  mean,
  median,
  std,
  variance,
  quantile,
  iqr,
} from "@/lib/data/stats";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);
const revenue = df.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
const profit = df.column("profit").filter((v): v is number => typeof v === "number" && Number.isFinite(v));

// Hoist expected values to module top-level so they can be used in
// both the validator closures AND the solution template strings.
const MEAN_REVENUE = Math.round(mean(revenue));
const PROFIT_IQR = +iqr(profit).toFixed(2);
const PROFIT_Q1 = quantile(profit, 0.25).toFixed(2);
const PROFIT_Q3 = quantile(profit, 0.75).toFixed(2);

export const MODULE4_EXERCISES: ExerciseSpec[] = [
  {
    id: "m4-mean-revenue",
    tier: "beginner",
    moduleId: "descriptive-stats",
    question: `What is the mean of the revenue column in the Retail Sales dataset? (Round to the nearest integer.)`,
    task: "Report the integer mean of revenue.",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = n === MEAN_REVENUE;
      return {
        correct,
        explanation: correct
          ? `Correct — df["revenue"].mean() = ${MEAN_REVENUE}.`
          : `Not quite. df["revenue"].mean() = ${MEAN_REVENUE} (rounded). You answered ${answer}. Check that you called .mean() on the revenue column, not the whole DataFrame.`,
      };
    },
    hint: "mean() = sum of values / count of values. Pandas drops NaN automatically.",
    solution: `df["revenue"].mean()  # → ${MEAN_REVENUE}\n# or, more verbosely:\ndf["revenue"].sum() / df["revenue"].count()`,
    commonMistakes: [
      "Using df.mean() on the whole frame — returns the mean per numeric column, not a single number.",
      "Forgetting that NaN values are skipped (Pandas default), not counted as zero.",
    ],
    concept: "Variance",
    nextLessonId: "grouping-aggregation",
  },

  {
    id: "m4-median-vs-mean",
    tier: "intermediate",
    moduleId: "descriptive-stats",
    question: `If a column is right-skewed (e.g., revenue with a few very large orders), how will the mean compare to the median?`,
    task: "Pick the correct statement.",
    type: "mcq",
    options: [
      { value: "mean-gt-median", label: "mean > median — the long right tail pulls the mean upward." },
      { value: "mean-lt-median", label: "mean < median — the tail pulls the mean downward." },
      { value: "equal", label: "mean == median — the tail does not affect the mean." },
      { value: "cannot-tell", label: "Cannot tell without computing both." },
    ],
    validator: (answer) => {
      const correct = answer === "mean-gt-median";
      const actualMean = mean(revenue);
      const actualMedian = median(revenue);
      return {
        correct,
        explanation: correct
          ? `Correct — in a right-skewed distribution, the few very large values in the right tail pull the mean upward while the median (the middle value) is barely affected. In our dataset: mean = ${actualMean.toFixed(2)}, median = ${actualMedian.toFixed(2)} — confirming mean > median. This is why income, prices, and revenue are typically reported with the median.`
          : `Not quite. A right-skewed distribution has a long right tail; the few large values pull the mean upward, so mean > median. In our dataset: mean = ${actualMean.toFixed(2)}, median = ${actualMedian.toFixed(2)} — confirming mean > median.`,
      };
    },
    hint: "Think about which statistic is more 'robust' to a single huge value. The mean is pulled by every value; the median only cares about the middle value.",
    solution: `# Verify on the actual data:\ndf["revenue"].mean()    # → ${mean(revenue).toFixed(2)}\ndf["revenue"].median()  # → ${median(revenue).toFixed(2)}\n# mean > median → right-skewed.\n# Skewness confirms it:\ndf["revenue"].skew()    # → ${df.dtype("revenue") === "float64" ? "(positive)" : "?"}`,
    commonMistakes: [
      "Assuming mean and median are interchangeable — they're not for skewed data.",
      "Reporting the mean for long-tailed distributions like income or prices — that's misleading; use the median.",
    ],
    concept: "Standard deviation",
    nextLessonId: "grouping-aggregation",
  },

  {
    id: "m4-sample-vs-pop",
    tier: "intermediate",
    moduleId: "descriptive-stats",
    question: `Pandas .var() and .std() default to ddof=1 (sample). What is the difference between sample variance (ddof=1) and population variance (ddof=0)?`,
    task: "Pick the accurate statement.",
    type: "mcq",
    options: [
      { value: "denom", label: "Sample uses n-1 in the denominator (Bessel's correction); population uses n." },
      { value: "same", label: "They are identical; the ddof argument is ignored." },
      { value: "units", label: "Sample variance is in the same units as the data; population variance is in squared units." },
      { value: "fix", label: "Sample variance is a 'fixed' estimate; population variance is a random variable." },
    ],
    validator: (answer) => {
      const correct = answer === "denom";
      const sv = variance(revenue);
      const pv = variance(revenue) * (revenue.length - 1) / revenue.length;
      return {
        correct,
        explanation: correct
          ? `Correct — sample variance (ddof=1) divides the sum of squared deviations by (n-1), which is Bessel's correction. It's used when your data is a sample from a larger population, because dividing by n would systematically underestimate the population variance. Population variance (ddof=0) divides by n, used when your data IS the entire population. On our revenue: sample = ${sv.toFixed(2)}, population = ${pv.toFixed(2)} — the sample variance is slightly larger to compensate for the underestimate.`
          : `Not quite. Sample variance uses n-1 (Bessel's correction); population variance uses n. Pandas defaults to ddof=1 (sample). Use ddof=0 only when your data is the entire population. On our revenue: sample = ${sv.toFixed(2)}, population = ${pv.toFixed(2)}.`,
      };
    },
    hint: "Bessel's correction: dividing by n-1 instead of n corrects for the bias introduced when the sample mean is used to estimate the population variance.",
    solution: `# Pandas default: ddof=1 (sample)\ndf["revenue"].var()              # ddof=1\ndf["revenue"].var(ddof=0)        # population\n\n# Same for std:\ndf["revenue"].std()              # ddof=1 (sample)\ndf["revenue"].std(ddof=0)        # population`,
    commonMistakes: [
      "Using ddof=1 (sample) on the entire population — the variance is slightly over-estimated.",
      "Confusing variance (squared units) with standard deviation (original units). Pandas std() returns original units.",
    ],
    concept: "Variance",
    nextLessonId: "grouping-aggregation",
  },

  {
    id: "m4-iqr",
    tier: "advanced",
    moduleId: "descriptive-stats",
    question: `Compute the IQR (Q3 − Q1) of the profit column. Report the value rounded to 2 decimals.`,
    task: "Use the .quantile() method: df['profit'].quantile(0.75) - df['profit'].quantile(0.25).",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9.-]/g, ""));
      const correct = Math.abs(n - PROFIT_IQR) < 0.5;
      return {
        correct,
        explanation: correct
          ? `Correct — df["profit"].quantile(0.75) - df["profit"].quantile(0.25) = ${PROFIT_IQR}. The IQR is a robust spread measure — it isn't pulled by outliers, unlike the std.`
          : `Not quite. The IQR of profit is ${PROFIT_IQR} (Q1 = ${PROFIT_Q1}, Q3 = ${PROFIT_Q3}). You answered ${answer}. Re-check that you computed 0.75 minus 0.25, not the other way around.`,
      };
    },
    hint: "Q1 = 0.25 quantile, Q3 = 0.75 quantile. IQR = Q3 - Q1. It's robust to outliers because it's based on quantiles, not the mean.",
    solution: `df["profit"].quantile(0.25)  # → ${PROFIT_Q1}\ndf["profit"].quantile(0.75)  # → ${PROFIT_Q3}\ndf["profit"].quantile(0.75) - df["profit"].quantile(0.25)  # → ${PROFIT_IQR}`,
    commonMistakes: [
      "Computing Q3 - Q1 in the wrong order (gets a negative number).",
      "Using df.describe()['profit']['75%'] - df.describe()['profit']['25%'] — verbose but correct.",
    ],
    concept: "Quantile",
    nextLessonId: "grouping-aggregation",
  },

  {
    id: "m4-outlier-impact",
    tier: "advanced",
    moduleId: "descriptive-stats",
    question: `Add a single value of 1,000,000 to the revenue column. Which statistics change a LOT and which barely move?`,
    task: "Pick the accurate comparison.",
    type: "mcq",
    options: [
      { value: "mean-std", label: "Mean and std change a lot; median and IQR barely move." },
      { value: "median-iqr", label: "Median and IQR change a lot; mean and std barely move." },
      { value: "all-change", label: "All four change a lot — outliers affect everything equally." },
      { value: "none", label: "None change — a single value can't move summary statistics." },
    ],
    validator: (answer) => {
      const correct = answer === "mean-std";
      const origMean = mean(revenue);
      const origMedian = median(revenue);
      const origStd = std(revenue);
      const origIqr = iqr(revenue);
      const newRev = [...revenue, 1_000_000];
      const newMean = mean(newRev);
      const newMedian = median(newRev);
      const newStd = std(newRev);
      const newIqr = iqr(newRev);
      return {
        correct,
        explanation: correct
          ? `Correct — the mean moves from ${origMean.toFixed(0)} to ${newMean.toFixed(0)} (huge); the std moves from ${origStd.toFixed(0)} to ${newStd.toFixed(0)} (huge); but the median moves from ${origMedian.toFixed(0)} to ${newMedian.toFixed(0)} (small) and the IQR moves from ${origIqr.toFixed(0)} to ${newIqr.toFixed(0)} (small). This is why the median and IQR are called 'robust' statistics — they're not pulled by extreme values, while the mean and std are.`
          : `Not quite. On our actual data: mean ${origMean.toFixed(0)} → ${newMean.toFixed(0)}, std ${origStd.toFixed(0)} → ${newStd.toFixed(0)}, median ${origMedian.toFixed(0)} → ${newMedian.toFixed(0)}, IQR ${origIqr.toFixed(0)} → ${newIqr.toFixed(0)}. The mean and std move a lot; the median and IQR barely move. That's why the median and IQR are called 'robust'.`,
      };
    },
    hint: "The mean is sensitive to every value; the median only cares about the middle value. The std is in squared units; the IQR depends on quantiles.",
    solution: `import numpy as np\ndf_with_outlier = df.copy()\ndf_with_outlier.loc[len(df)] = {**{c: np.nan for c in df.columns}, "revenue": 1_000_000}\n\n# Compare:\nprint("mean  :", df["revenue"].mean(),  df_with_outlier["revenue"].mean())\nprint("median:", df["revenue"].median(), df_with_outlier["revenue"].median())\nprint("std   :", df["revenue"].std(),    df_with_outlier["revenue"].std())\nprint("IQR   :", df["revenue"].quantile(.75) - df["revenue"].quantile(.25),\n               df_with_outlier["revenue"].quantile(.75) - df_with_outlier["revenue"].quantile(.25))`,
    commonMistakes: [
      "Reporting the mean for skewed distributions — use the median instead.",
      "Assuming all summary statistics are equally affected by outliers — they aren't; quantile-based statistics are robust.",
    ],
    concept: "Outlier",
    nextLessonId: "grouping-aggregation",
  },
];
