/**
 * Retail Sales — deterministic 240-row sample dataset.
 *
 * Columns (master spec §20):
 *   order_id, order_date, customer_id, product, category, region,
 *   quantity, unit_price, revenue, profit.
 *
 * Relationships are real:
 *   revenue = quantity * unit_price
 *   profit  = revenue * margin(category)  ± small per-row noise
 *
 * Determinism: seeded RNG (seed=4242). Same seed ⇒ same rows every run.
 */

import type { DatasetSpec, Row } from "../types";
import { makeRngHelper } from "../rng";

const SEED = 4242;

const PRODUCTS: { product: string; category: string; unit_price: number; margin: number }[] = [
  { product: "Panda Tee",          category: "Apparel",     unit_price: 24.99, margin: 0.42 },
  { product: "DataFrame Hoodie",   category: "Apparel",     unit_price: 59.99, margin: 0.38 },
  { product: "GroupBy Mug",        category: "Accessories", unit_price: 12.50, margin: 0.55 },
  { product: "Jupyter Sticker",    category: "Accessories", unit_price: 3.99,  margin: 0.71 },
  { product: "NumPy Calculator",  category: "Electronics", unit_price: 29.99, margin: 0.22 },
  { product: "Pandas Notebook",    category: "Stationery",  unit_price: 8.50,  margin: 0.49 },
  { product: "Vector Backpack",    category: "Accessories", unit_price: 89.00, margin: 0.31 },
  { product: "Bokeh Lamp",         category: "Home",        unit_price: 64.00, margin: 0.27 },
  { product: "Sklearn Puzzle",     category: "Toys",        unit_price: 19.99, margin: 0.46 },
  { product: "TensorPlay Card",    category: "Toys",        unit_price: 4.50,  margin: 0.62 },
];

const REGIONS = ["North", "South", "East", "West", "Central"] as const;

export function buildRetailSales(n: number = 240): DatasetSpec {
  const rng = makeRngHelper(SEED);
  const rows: Row[] = [];
  const startEpoch = Date.UTC(2023, 0, 1); // 2023-01-01
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < n; i++) {
    const p = rng.pick(PRODUCTS);
    const region = rng.pick(REGIONS);
    const quantity = rng.int(1, 12);
    const unitPrice = p.unit_price;
    const revenue = +(quantity * unitPrice).toFixed(2);
    const marginJitter = p.margin + rng.float(-0.04, 0.04);
    const profit = +(revenue * marginJitter).toFixed(2);
    const dayOffset = rng.int(0, 729); // 2 years span
    const date = new Date(startEpoch + dayOffset * dayMs);
    const isoDate = date.toISOString().slice(0, 10);
    rows.push({
      order_id: `ORD-${String(10000 + i).padStart(5, "0")}`,
      order_date: isoDate,
      customer_id: `CUST-${String(rng.int(1, 80)).padStart(4, "0")}`,
      product: p.product,
      category: p.category,
      region,
      quantity,
      unit_price: unitPrice,
      revenue,
      profit,
    });
  }

  return {
    id: "retail",
    name: "Retail Sales",
    context:
      "Order-level retail transactions for an online merchandise store. Each row is one order line — one product, one quantity, one revenue, one profit. The dataset spans two years of trading across five regions.",
    columns: [
      { name: "order_id", dtype: "object", description: "Unique order identifier (primary key).", example: "ORD-10001", isKey: true },
      { name: "order_date", dtype: "datetime64[ns]", description: "Calendar date the order was placed (ISO 8601).", example: "2023-04-17" },
      { name: "customer_id", dtype: "object", description: "Customer identifier — one customer can place many orders.", example: "CUST-0042" },
      { name: "product", dtype: "object", description: "Product name (one of ten distinct products).", example: "GroupBy Mug" },
      { name: "category", dtype: "object", description: "Product category (5 distinct values: Apparel, Accessories, Electronics, Stationery, Home, Toys).", example: "Accessories", categories: ["Apparel", "Accessories", "Electronics", "Stationery", "Home", "Toys"] },
      { name: "region", dtype: "object", description: "Sales region (North, South, East, West, Central).", example: "East", categories: [...REGIONS] },
      { name: "quantity", dtype: "int64", description: "Units ordered (integer, 1–12).", example: 4, range: { min: 1, max: 12 } },
      { name: "unit_price", dtype: "float64", description: "List price per unit in USD.", example: 12.50, range: { min: 3.99, max: 89.00 } },
      { name: "revenue", dtype: "float64", description: "Order revenue = quantity × unit_price (USD).", example: 50.00, isTargetCandidate: true, range: { min: 0, max: 2000 } },
      { name: "profit", dtype: "float64", description: "Gross profit per order, derived from category margin ± small per-row noise (USD).", example: 21.42, isTargetCandidate: true, range: { min: 0, max: 1000 } },
    ],
    rows,
    knownIssues: [
      "Profit is a derived feature — never use it as an input to a model that predicts revenue (target leakage).",
      "Categories are pre-cleaned (consistent casing) — the messy version is in Module 2.",
      "Some customers place many orders; the dataset is therefore not at customer granularity without aggregation.",
    ],
    analyticalQuestions: [
      "Which region drives the highest total profit?",
      "Which product category has the best profit margin?",
      "What is the average order value (AOV), and how does it vary by region?",
      "Is there monthly seasonality in revenue?",
    ],
    featureOpportunities: [
      "profit_margin = profit / revenue (safe division: revenue can be 0 in returns — handle explicitly).",
      "Days since last transaction per customer (requires aggregation by customer_id).",
      "Customer tenure = max(order_date) − min(order_date) per customer.",
      "Product revenue rank within its category (use rank with method='dense').",
    ],
    limitations: [
      "Synthetic data — relationships are illustrative, not real-world market dynamics.",
      "Two-year span is too short for robust seasonality claims.",
      "Customer_id is anonymous — no real segment demographics available.",
    ],
    seed: SEED,
  };
}
