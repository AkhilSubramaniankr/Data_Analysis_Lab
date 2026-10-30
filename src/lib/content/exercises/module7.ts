/**
 * Module 7 exercises — EDA & Business Insights.
 * Validators compute real values from the retail dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { sum, mean } from "@/lib/data/stats";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

// Hoist expected values for solution templates.
const TOTAL_REVENUE = sum(df.column("revenue").filter((v): v is number => typeof v === "number" && Number.isFinite(v)));
const TOTAL_PROFIT = sum(df.column("profit").filter((v): v is number => typeof v === "number" && Number.isFinite(v)));
const ORDERS = df.rows.length;
const AOV = TOTAL_REVENUE / ORDERS;
const PROFIT_MARGIN = (TOTAL_PROFIT / TOTAL_REVENUE) * 100;
const byRegion = df.groupBy(["region"], [{ column: "revenue", fn: "sum", as: "total_revenue" }]);
const TOP_REGION = [...byRegion.rows].sort((a, b) => (b.total_revenue as number) - (a.total_revenue as number))[0];
const byProduct = df.groupBy(["product"], [{ column: "revenue", fn: "sum", as: "total_revenue" }]);
const TOP_PRODUCT = [...byProduct.rows].sort((a, b) => (b.total_revenue as number) - (a.total_revenue as number))[0];
const byCategory = df.groupBy(["category"], [{ column: "profit", fn: "sum", as: "total_profit" }]);
const TOP_CATEGORY = [...byCategory.rows].sort((a, b) => (b.total_profit as number) - (a.total_profit as number))[0];

export const MODULE7_EXERCISES: ExerciseSpec[] = [
  {
    id: "m7-kpi-revenue",
    tier: "beginner",
    moduleId: "eda-business",
    question: `What is the total revenue across all orders in the Retail Sales dataset? (Round to the nearest integer.)`,
    task: "Report the total revenue in USD.",
    type: "text",
    validator: (answer) => {
      const expected = Math.round(TOTAL_REVENUE);
      const n = Number(answer.replace(/[^0-9-]/g, ""));
      const correct = Math.abs(n - expected) < 1;
      return {
        correct,
        explanation: correct
          ? `Correct — df["revenue"].sum() = $${expected.toLocaleString()}.`
          : `Not quite. df["revenue"].sum() = $${expected.toLocaleString()}. You answered ${answer}.`,
      };
    },
    hint: "Use df['revenue'].sum(). Pandas drops NaN automatically.",
    solution: `df["revenue"].sum()  # → $${Math.round(TOTAL_REVENUE).toLocaleString()}`,
    commonMistakes: [
      "Using df.sum() on the whole frame — sums every numeric column.",
      "Counting non-null cells with .count() instead of summing values with .sum().",
    ],
    concept: "Aggregation",
    nextLessonId: "trend-analysis",
  },

  {
    id: "m7-aov",
    tier: "intermediate",
    moduleId: "eda-business",
    question: `What is the Average Order Value (AOV) for the Retail Sales dataset? (Round to 2 decimals.)`,
    task: "AOV = total revenue / order count.",
    type: "text",
    validator: (answer) => {
      const expected = +AOV.toFixed(2);
      const n = Number(answer.replace(/[^0-9.-]/g, ""));
      const correct = Math.abs(n - expected) < 0.5;
      return {
        correct,
        explanation: correct
          ? `Correct — AOV = total_revenue / order_count = $${TOTAL_REVENUE.toLocaleString()} / ${ORDERS} = $${expected}.`
          : `Not quite. AOV = $${expected}. You answered ${answer}. The right computation is df['revenue'].sum() / len(df) (or .mean() — same thing).`,
      };
    },
    hint: "AOV = total_revenue / number_of_orders. Or just df['revenue'].mean() — same thing.",
    solution: `df["revenue"].mean()  # → $${AOV.toFixed(2)}\n# or\ndf["revenue"].sum() / len(df)  # same value`,
    commonMistakes: [
      "Computing the mean of unit_price — that's the average unit price, not AOV.",
      "Dividing by nunique(customer_id) — that's revenue per customer, not per order.",
    ],
    concept: "Mean",
    nextLessonId: "trend-analysis",
  },

  {
    id: "m7-top-region",
    tier: "intermediate",
    moduleId: "eda-business",
    question: `Which region drives the highest total revenue?`,
    task: "Pick the top-performing region.",
    type: "select",
    options: ["North", "South", "East", "West", "Central"].map((r) => ({ value: r, label: r })),
    validator: (answer) => {
      const correct = answer === TOP_REGION.region;
      return {
        correct,
        explanation: correct
          ? `Correct — ${TOP_REGION.region} has the highest total revenue at $${Math.round(TOP_REGION.total_revenue as number).toLocaleString()}.`
          : `Not quite. ${TOP_REGION.region} has the highest total revenue at $${Math.round(TOP_REGION.total_revenue as number).toLocaleString()}. You picked ${answer}. Verify with df.groupby('region')['revenue'].sum().sort_values(ascending=False).`,
      };
    },
    hint: "df.groupby('region')['revenue'].sum().sort_values(ascending=False).head(1)",
    solution: `df.groupby("region")["revenue"].sum().sort_values(ascending=False)\n# ${TOP_REGION.region}     $${Math.round(TOP_REGION.total_revenue as number).toLocaleString()}\n# ...`,
    commonMistakes: [
      "Sorting ascending instead of descending.",
      "Using .mean() instead of .sum() — gives AOV per region, not total revenue.",
    ],
    concept: "GroupBy",
    nextLessonId: "trend-analysis",
  },

  {
    id: "m7-profit-margin",
    tier: "advanced",
    moduleId: "eda-business",
    question: `What is the overall profit margin (profit / revenue × 100) for the Retail Sales dataset? (Round to 2 decimals; report as a percentage.)`,
    task: "Compute the margin as a percentage.",
    type: "text",
    validator: (answer) => {
      const expected = +PROFIT_MARGIN.toFixed(2);
      const n = Number(answer.replace(/[^0-9.-]/g, ""));
      const correct = Math.abs(n - expected) < 0.5;
      return {
        correct,
        explanation: correct
          ? `Correct — (total_profit / total_revenue) × 100 = ($${Math.round(TOTAL_PROFIT).toLocaleString()} / $${Math.round(TOTAL_REVENUE).toLocaleString()}) × 100 = ${expected}%.`
          : `Not quite. The overall profit margin is ${expected}%. You answered ${answer}. Re-check: total_profit / total_revenue × 100, NOT mean(profit/revenue) — those differ!`,
      };
    },
    hint: "Margin = total_profit / total_revenue × 100. NOT mean(profit/revenue) — those differ when volumes differ.",
    solution: `total_profit = df["profit"].sum()  # $${Math.round(TOTAL_PROFIT).toLocaleString()}\ntotal_revenue = df["revenue"].sum()  # $${Math.round(TOTAL_REVENUE).toLocaleString()}\nmargin_pct = (total_profit / total_revenue) * 100  # ${PROFIT_MARGIN.toFixed(2)}%\n\n# Per-category margin:\ndf.groupby("category").apply(lambda g: g["profit"].sum() / g["revenue"].sum() * 100)`,
    commonMistakes: [
      "Using (df['profit'] / df['revenue']).mean() — that's the AVERAGE per-order margin, not the overall margin. They differ when order volumes vary.",
      "Forgetting to multiply by 100 to get a percentage.",
    ],
    concept: "Aggregation",
    nextLessonId: "trend-analysis",
  },

  {
    id: "m7-top-product",
    tier: "advanced",
    moduleId: "eda-business",
    question: `Which product contributes the most total revenue? (Round to the nearest product name.)`,
    task: "Pick the top product by total revenue.",
    type: "select",
    options: ["Panda Tee", "DataFrame Hoodie", "GroupBy Mug", "Jupyter Sticker", "NumPy Calculator", "Pandas Notebook", "Vector Backpack", "Bokeh Lamp", "Sklearn Puzzle", "TensorPlay Card"].map((p) => ({ value: p, label: p })),
    validator: (answer) => {
      const correct = answer === TOP_PRODUCT.product;
      return {
        correct,
        explanation: correct
          ? `Correct — ${TOP_PRODUCT.product} has the highest total revenue at $${Math.round(TOP_PRODUCT.total_revenue as number).toLocaleString()}.`
          : `Not quite. ${TOP_PRODUCT.product} has the highest total revenue at $${Math.round(TOP_PRODUCT.total_revenue as number).toLocaleString()}. You picked ${answer}.`,
      };
    },
    hint: "df.groupby('product')['revenue'].sum().sort_values(ascending=False).head(1)",
    solution: `df.groupby("product")["revenue"].sum().sort_values(ascending=False)\n# ${TOP_PRODUCT.product}   $${Math.round(TOP_PRODUCT.total_revenue as number).toLocaleString()}\n# ...`,
    commonMistakes: [
      "Sorting ascending — picks the worst product.",
      "Using .mean() — picks the product with the highest AOV, not the highest total.",
    ],
    concept: "GroupBy",
    nextLessonId: "trend-analysis",
  },
];
