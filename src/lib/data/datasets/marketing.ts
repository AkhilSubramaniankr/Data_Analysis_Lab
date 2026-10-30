/**
 * Marketing & Sales — deterministic 200-row dataset for Module 6
 * (correlation analysis).
 *
 * Columns: week, advertising_spend, unit_price, quantity, revenue, profit.
 *
 * Relationships (real, by construction):
 *   - quantity is positively influenced by advertising_spend (with noise).
 *   - revenue = quantity * unit_price.
 *   - profit = revenue - quantity * unit_cost (where unit_cost is implicit).
 *   - A deliberate confounder: a "holiday_week" flag boosts both advertising
 *     and revenue — so advertising and revenue are correlated, but not
 *     because advertising causes revenue.
 *
 * Determinism: seed=2024.
 */

import type { DatasetSpec, Row } from "../types";
import { makeRngHelper } from "../rng";

const SEED = 2024;

export function buildMarketing(): DatasetSpec {
  const rng = makeRngHelper(SEED);
  const rows: Row[] = [];
  for (let w = 0; w < 200; w++) {
    const holidayWeek = rng.bool(0.18); // 18% of weeks are holiday weeks
    const baseSpend = 500 + rng.float(0, 200);
    const adSpend = +(baseSpend + (holidayWeek ? 400 : 0) + rng.float(-50, 50)).toFixed(2);
    const unitPrice = +(29.99 + rng.float(-3, 3)).toFixed(2);
    // Quantity rises with adSpend (saturating) and with holidayWeek.
    const baseQty = 80 + Math.log(adSpend) * 12 + (holidayWeek ? 25 : 0);
    const quantity = Math.max(0, Math.round(baseQty + rng.float(-15, 15)));
    const revenue = +(quantity * unitPrice).toFixed(2);
    const unitCost = 12.50 + rng.float(-1, 1);
    const profit = +(revenue - quantity * unitCost).toFixed(2);
    rows.push({
      week: w + 1,
      advertising_spend: adSpend,
      holiday_week: holidayWeek,
      unit_price: unitPrice,
      quantity,
      revenue,
      profit,
    });
  }
  return {
    id: "marketing",
    name: "Marketing & Sales (Module 6 lab)",
    context:
      "Weekly marketing-spend dataset for teaching correlation. advertising_spend, unit_price, quantity, revenue, profit, and a holiday_week flag (a confounder that boosts BOTH advertising and revenue independently).",
    columns: [
      { name: "week", dtype: "int64", description: "Week number (1–200).", example: 42, isKey: true },
      { name: "advertising_spend", dtype: "float64", description: "USD spent on advertising that week.", example: 742.50, isTargetCandidate: true },
      { name: "holiday_week", dtype: "bool", description: "Whether the week contained a major holiday.", example: true },
      { name: "unit_price", dtype: "float64", description: "Average product unit price (USD).", example: 30.12 },
      { name: "quantity", dtype: "int64", description: "Units sold in the week.", example: 124, isTargetCandidate: true },
      { name: "revenue", dtype: "float64", description: "Revenue = quantity × unit_price (USD).", example: 3734.88, isTargetCandidate: true },
      { name: "profit", dtype: "float64", description: "Profit = revenue − quantity × unit_cost (USD).", example: 2184.38, isTargetCandidate: true },
    ],
    rows,
    knownIssues: [
      "holiday_week is a confounder — it influences both advertising_spend and revenue independently. Naive correlation(advertising, revenue) overstates the causal effect of advertising.",
      "Synthetic — relationships are illustrative, not real market dynamics.",
    ],
    analyticalQuestions: [
      "Is advertising_spend correlated with revenue?",
      "Does the correlation change after stratifying by holiday_week?",
      "Are quantity and revenue perfectly correlated? Why or why not?",
      "What is the relationship between unit_price and quantity?",
    ],
    featureOpportunities: [
      "Log-transform advertising_send to model diminishing returns.",
      "Create an advertising_intensity = advertising_spend / quantity feature.",
      "Stratify by holiday_week before computing correlations.",
    ],
    limitations: [
      "Synthetic — no real market signal.",
      "The holiday_week confounder is deliberately injected; real-world confounders are rarely this clean.",
    ],
    seed: SEED,
  };
}
