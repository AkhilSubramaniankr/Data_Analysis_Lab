/**
 * Customer Transactions — deterministic 300-row sample dataset.
 *
 * Columns (master spec §20):
 *   customer_id, transaction_date, transaction_amount, transaction_type,
 *   payment_method, region, customer_segment.
 */

import type { DatasetSpec, Row } from "../types";
import { makeRngHelper } from "../rng";

const SEED = 7777;

const SEGMENTS = ["Retail", "Premium", "Student", "Business"] as const;
const PAYMENTS = ["Card", "Cash", "Wallet", "Bank Transfer"] as const;
const TYPES = ["deposit", "withdrawal"] as const;
const REGIONS = ["North", "South", "East", "West"] as const;

export function buildCustomerTransactions(n: number = 300): DatasetSpec {
  const rng = makeRngHelper(SEED);
  const rows: Row[] = [];
  const start = Date.UTC(2023, 0, 1);
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < n; i++) {
    const customer = `CUST-${String(rng.int(1, 50)).padStart(4, "0")}`;
    const type = rng.pick(TYPES);
    const amount = type === "deposit"
      ? +rng.float(50, 2500).toFixed(2)
      : +rng.float(20, 1500).toFixed(2);
    const dayOffset = rng.int(0, 540);
    const date = new Date(start + dayOffset * dayMs);
    rows.push({
      customer_id: customer,
      transaction_date: date.toISOString().slice(0, 10),
      transaction_amount: amount,
      transaction_type: type,
      payment_method: rng.pick(PAYMENTS),
      region: rng.pick(REGIONS),
      customer_segment: rng.pick(SEGMENTS),
    });
  }

  return {
    id: "customers",
    name: "Customer Transactions",
    context:
      "Bank-style customer transactions over 18 months. Each row is one transaction (deposit or withdrawal) with the payment method, region, and the customer's segment. Same customer appears many times.",
    columns: [
      { name: "customer_id", dtype: "object", description: "Customer identifier.", example: "CUST-0042", isKey: false },
      { name: "transaction_date", dtype: "datetime64[ns]", description: "Date of the transaction (ISO 8601).", example: "2023-06-12" },
      { name: "transaction_amount", dtype: "float64", description: "Transaction amount in USD (always positive; direction is in transaction_type).", example: 248.75, isTargetCandidate: true, range: { min: 0, max: 2500 } },
      { name: "transaction_type", dtype: "object", description: "Direction of the transaction (deposit or withdrawal).", example: "deposit", categories: ["deposit", "withdrawal"] },
      { name: "payment_method", dtype: "object", description: "How the customer paid (4 categories).", example: "Card", categories: [...PAYMENTS] },
      { name: "region", dtype: "object", description: "Region where the transaction originated.", example: "East", categories: [...REGIONS] },
      { name: "customer_segment", dtype: "object", description: "Customer segment (4 categories).", example: "Premium", categories: [...SEGMENTS] },
    ],
    rows,
    knownIssues: [
      "Same customer_id appears on many transactions — primary key is (customer_id, transaction_date, transaction_amount) at best, and even that can collide.",
      "transaction_type is a categorical with only two values — keep that in mind for high-cardinality encoding examples.",
      "Segment is a property of the customer, not the transaction — denormalisation is intentional for the lesson.",
    ],
    analyticalQuestions: [
      "What is the average deposit amount per customer segment?",
      "Which regions have the highest withdrawal frequency?",
      "Which payment method dominates in each segment?",
      "Is there a weekly cycle in transaction volume?",
    ],
    featureOpportunities: [
      "Net cash flow per customer per month = sum(deposit) − sum(withdrawal).",
      "Customer-level average transaction value (groupby + mean).",
      "Days since last transaction per customer (recency).",
      "Customer tenure (max date − min date).",
    ],
    limitations: [
      "Synthetic data — no real fraud patterns to detect.",
      "Wallet as a payment method is over-represented for realism in 2023+ retail banking.",
      "No currency — all amounts are USD.",
    ],
    seed: SEED,
  };
}
