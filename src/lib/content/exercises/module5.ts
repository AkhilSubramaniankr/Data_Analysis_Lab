/**
 * Module 5 exercises — Grouping, Aggregation, Pivot Tables, Crosstabs.
 * Validators compute real values from the retail dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { sum, mean } from "@/lib/data/stats";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

// Pre-compute the answers used by the validators
const revenueByRegion = df.groupBy(["region"], [{ column: "revenue", fn: "sum", as: "total_revenue" }]);
const revenueByCategory = df.groupBy(["category"], [{ column: "revenue", fn: "sum", as: "total_revenue" }]);
const ordersByRegion = df.groupBy(["region"], [{ column: "order_id", fn: "count", as: "orders" }]);

// Hoist the specific expected values that the solution templates need.
const EAST_REVENUE_TOTAL = Math.round(Number(revenueByRegion.rows.find((r) => r.region === "East")?.total_revenue ?? 0));

export const MODULE5_EXERCISES: ExerciseSpec[] = [
  {
    id: "m5-revenue-by-region",
    tier: "beginner",
    moduleId: "grouping-aggregation",
    question: "What is the total revenue in the 'East' region? Use df.groupby('region')['revenue'].sum().",
    task: "Report the total revenue (rounded to the nearest integer).",
    type: "text",
    validator: (answer) => {
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = Math.abs(n - EAST_REVENUE_TOTAL) < 1;
      return {
        correct,
        explanation: correct
          ? `Correct — total revenue in East is ${EAST_REVENUE_TOTAL.toLocaleString()}.`
          : `Not quite. df.groupby('region')['revenue'].sum() for East returns ${EAST_REVENUE_TOTAL.toLocaleString()}. You answered ${answer}.`,
      };
    },
    hint: "groupby('region')['revenue'] selects the revenue column for each region group. .sum() then sums each group.",
    solution: `df.groupby("region")["revenue"].sum()\n# East      ${Number(revenueByRegion.rows.find((r) => r.region === "East")?.total_revenue ?? 0).toLocaleString()}\n# North     ${Number(revenueByRegion.rows.find((r) => r.region === "North")?.total_revenue ?? 0).toLocaleString()}\n# ...`,
    commonMistakes: [
      "Using .mean() instead of .sum() — gives AOV per region, not total revenue.",
      "Forgetting to filter to revenue — df.groupby('region').sum() sums every numeric column.",
    ],
    concept: "GroupBy",
    nextLessonId: "correlation",
  },

  {
    id: "m5-agg-choice",
    tier: "intermediate",
    moduleId: "grouping-aggregation",
    question: "You want to know the average order value per region. Which aggregation is correct?",
    task: "Pick the correct expression.",
    type: "mcq",
    options: [
      { value: "mean-revenue", label: "df.groupby('region')['revenue'].mean()" },
      { value: "sum-revenue", label: "df.groupby('region')['revenue'].sum()" },
      { value: "count-orders", label: "df.groupby('region')['order_id'].count()" },
      { value: "sum-quantity", label: "df.groupby('region')['quantity'].sum()" },
    ],
    validator: (answer) => {
      const correct = answer === "mean-revenue";
      return {
        correct,
        explanation: correct
          ? `Correct — AOV per region = mean of revenue per region. .mean() averages the revenue values within each region group. .sum() would give total revenue (different question); .count() would give the number of orders (different question).`
          : `Not quite. ${answer === "sum-revenue" ? "That gives TOTAL revenue per region, not AOV." : answer === "count-orders" ? "That gives the ORDER COUNT per region, not AOV." : "That sums quantities — total units sold, not AOV."} AOV = average revenue per order = .mean() of revenue per group.`,
      };
    },
    hint: "AOV = Average Order Value = average revenue per order = sum(revenue) / count(orders) = mean(revenue) per group.",
    solution: `df.groupby("region")["revenue"].mean()\n# Or equivalently:\ndf.groupby("region").agg(aov=("revenue", "mean"))`,
    commonMistakes: [
      "Confusing total revenue (.sum()) with average revenue (.mean()).",
      "Dividing total revenue by an unrelated count — the right denominator is the order count for the same group.",
    ],
    concept: "Aggregation",
    nextLessonId: "correlation",
  },

  {
    id: "m5-pivot-vs-melt",
    tier: "intermediate",
    moduleId: "grouping-aggregation",
    question: "A pivot_table produced a wide DataFrame: rows=month, columns=region, cells=total_revenue. How would you turn it back into a long (tidy) DataFrame?",
    task: "Pick the correct method.",
    type: "mcq",
    options: [
      { value: "melt", label: "df.melt(...)" },
      { value: "pivot", label: "df.pivot(...) again" },
      { value: "stack", label: "df.stack()" },
      { value: "transpose", label: "df.T (transpose)" },
    ],
    validator: (answer) => {
      const correct = answer === "melt";
      return {
        correct,
        explanation: correct
          ? `Correct — pd.melt() (or DataFrame.melt) is the inverse of pivot_table. It turns a wide DataFrame into a long one by unpivoting columns into row values. The signature: df.reset_index().melt(id_vars='month', var_name='region', value_name='total_revenue').`
          : `Not quite. ${answer === "pivot" ? "pivot() does the OPPOSITE — it makes a wide table from a long one." : answer === "stack" ? "stack() moves column labels into the row index — it produces a Series, not a tidy long DataFrame." : "transpose (.T) just swaps rows and columns — it doesn't reshape to long form."} The right tool is melt(): df.reset_index().melt(id_vars='month', var_name='region', value_name='total_revenue').`,
      };
    },
    hint: "pivot turns long → wide. The inverse — wide → long — has a one-word name. What is it?",
    solution: `# wide → long\nlong_df = wide_df.reset_index().melt(\n    id_vars="month",\n    var_name="region",\n    value_name="total_revenue",\n)\n# Useful for plotting with seaborn, joining on category, etc.`,
    commonMistakes: [
      "Calling pivot() again — it makes the table wider, not long.",
      "Confusing melt (unpivot) with stack (index-level pivoting).",
    ],
    concept: "Pivot table",
    nextLessonId: "correlation",
  },

  {
    id: "m5-crosstab-normalize",
    tier: "advanced",
    moduleId: "grouping-aggregation",
    question: "You want to know whether the product category mix is the same across regions. Should you use normalize='index', 'columns', or 'all'?",
    task: "Pick the correct normalisation.",
    type: "mcq",
    options: [
      { value: "index", label: "normalize='index' — row percentages (each row sums to 1)." },
      { value: "columns", label: "normalize='columns' — column percentages (each column sums to 1)." },
      { value: "all", label: "normalize='all' — cell percentages (the whole table sums to 1)." },
      { value: "none", label: "No normalisation — raw counts are enough." },
    ],
    validator: (answer) => {
      const correct = answer === "index";
      return {
        correct,
        explanation: correct
          ? `Correct — to compare the category MIX across regions, you want each region's category distribution to sum to 1. That's row percentages = normalize='index' (where 'index' means 'per row', i.e., per region). Raw counts are misleading because larger regions would dominate. normalize='columns' answers a different question: is the region mix the same for every category? normalize='all' answers: what fraction of all orders is in this (region, category) cell?`
          : `Not quite. To compare the category MIX across regions, you need each region's row to sum to 1 (row percentages). That's normalize='index'. ${answer === "columns" ? "'columns' answers the opposite question: is the region mix the same for every category?" : answer === "all" ? "'all' gives cell percentages of the grand total — useful for the overall picture, not for comparing distributions." : "Raw counts are misleading because larger regions would dominate."}`,
      };
    },
    hint: "You want to compare the SHAPE of each region's category distribution. Each row should sum to 1.",
    solution: `# Compare category mix across regions:\nct = pd.crosstab(df["region"], df["category"], normalize="index")\n# Each row sums to 1 — you can compare the shape of the distribution.\n# To compare region mix per category:\nct2 = pd.crosstab(df["region"], df["category"], normalize="columns")`,
    commonMistakes: [
      "Using raw counts when group sizes differ — larger groups dominate.",
      "Confusing normalize='index' (per-row) with normalize='columns' (per-column) — they answer different questions.",
    ],
    concept: "Crosstab",
    nextLessonId: "correlation",
  },

  {
    id: "m5-named-agg",
    tier: "advanced",
    moduleId: "grouping-aggregation",
    question: "Compute the total revenue AND the average profit per category in a single groupby. Use named aggregation.",
    task: "Write the Pandas code.",
    type: "code",
    validator: (answer) => {
      const a = answer.toLowerCase().replace(/\s+/g, "");
      const hasGroupby = a.includes("groupby");
      const hasCategory = a.includes('"category"') || a.includes("'category'");
      const hasAgg = a.includes(".agg(") || a.includes("namedagg") || a.includes("agg=");
      const hasRevenueSum = (a.includes('"revenue"') || a.includes("'revenue'")) && (a.includes('"sum"') || a.includes("'sum'") || a.includes('sum)') || a.includes('sum,'));
      const hasProfitMean = (a.includes('"profit"') || a.includes("'profit'")) && (a.includes('"mean"') || a.includes("'mean'") || a.includes('mean)') || a.includes('mean,'));
      const correct = hasGroupby && hasCategory && hasAgg && (hasRevenueSum || a.includes('sum')) && (hasProfitMean || a.includes('mean'));
      return {
        correct,
        explanation: correct
          ? `Correct — the named-aggregation form is df.groupby('category').agg(total_revenue=('revenue', 'sum'), avg_profit=('profit', 'mean')). Named aggregation makes the result columns readable and self-documenting.`
          : `Not quite. The cleanest Pandas 1.0+ form is named aggregation: df.groupby('category').agg(total_revenue=('revenue', 'sum'), avg_profit=('profit', 'mean')). The tuple form (column, func) lets you name each output column explicitly.`,
      };
    },
    hint: "Named aggregation syntax: df.groupby('category').agg(name=(column, func)). Each kwarg becomes a column in the result.",
    solution: `df.groupby("category").agg(\n    total_revenue=("revenue", "sum"),\n    avg_profit=("profit", "mean"),\n)\n# Returns a DataFrame with columns: total_revenue, avg_profit`,
    commonMistakes: [
      "Calling .agg(['sum', 'mean']) on every numeric column — produces multi-index columns that are hard to read.",
      "Doing two separate groupbys and merging them — named aggregation is one call.",
    ],
    concept: "Aggregation",
    nextLessonId: "correlation",
  },
];
