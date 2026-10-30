/**
 * Messy Retail — deliberately imperfect retail dataset used by Module 2.
 *
 * Same 240 rows as `buildRetailSales` but with intentional data-quality
 * issues, so learners can practise cleaning:
 *
 *   • Missing customer_id (~5% of rows).
 *   • Duplicate transactions (~3 rows fully duplicated).
 *   • Inconsistent category casing ('apparel', 'APPAREL', 'Apparel').
 *   • Trailing whitespace on product names.
 *   • A handful of negative quantities (returns — they are legitimate,
 *     not errors).
 *   • Invalid order_date values ('2023-13-45', 'invalid').
 *   • A few revenue values stored as strings ('124.50' instead of 124.50).
 *   • Two orders with revenue=0 (returns — keep them; do NOT auto-drop).
 *
 * Every issue is reproducible — seeded RNG.
 */

import type { DatasetSpec, Row } from "../types";
import { makeRngHelper } from "../rng";

const SEED = 4242; // identical to clean retail so the underlying facts match
const PRODUCTS = [
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
] as const;
const REGIONS = ["North", "South", "East", "West", "Central"] as const;

const INVALID_DATES = ["2023-13-45", "invalid", "2024-02-30", ""];

export function buildMessyRetail(n: number = 240): DatasetSpec {
  const rng = makeRngHelper(SEED);
  const cleanRows: Row[] = [];
  const startEpoch = Date.UTC(2023, 0, 1);
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < n; i++) {
    const p = PRODUCTS[rng.int(0, PRODUCTS.length - 1)];
    const region = REGIONS[rng.int(0, REGIONS.length - 1)];
    const quantity = rng.int(1, 12);
    const unitPrice = p.unit_price;
    const revenue = +(quantity * unitPrice).toFixed(2);
    const marginJitter = p.margin + rng.float(-0.04, 0.04);
    const profit = +(revenue * marginJitter).toFixed(2);
    const dayOffset = rng.int(0, 729);
    const date = new Date(startEpoch + dayOffset * dayMs);
    const isoDate = date.toISOString().slice(0, 10);
    cleanRows.push({
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

  // Now corrupt deterministically:
  const rows: Row[] = cleanRows.map((r) => ({ ...r }));

  // 1. ~5% missing customer_id (every 20th row)
  for (let i = 0; i < rows.length; i += 20) {
    rows[i].customer_id = null;
  }
  // A few more random missing values in profit
  for (let i = 0; i < rows.length; i += 50) {
    rows[i].profit = null;
  }

  // 2. Duplicate rows 5, 33, 100, 188 (full duplicates)
  const dupIndices = [5, 33, 100, 188];
  const dupes: Row[] = dupIndices.map((i) => ({ ...rows[i] }));
  // Insert duplicates right after their originals
  for (let k = dupes.length - 1; k >= 0; k--) {
    rows.splice(dupIndices[k] + 1, 0, dupes[k]);
  }

  // 3. Inconsistent casing on category
  for (let i = 0; i < rows.length; i++) {
    if (typeof rows[i].category === "string") {
      const r = rng.next();
      if (r < 0.20) rows[i].category = (rows[i].category as string).toLowerCase();
      else if (r < 0.35) rows[i].category = (rows[i].category as string).toUpperCase();
    }
  }

  // 4. Trailing whitespace on product
  for (let i = 0; i < rows.length; i++) {
    if (typeof rows[i].product === "string" && i % 7 === 0) {
      rows[i].product = (rows[i].product as string) + "  ";
    }
  }

  // 5. Negative quantities (returns) on rows 11, 47, 89, 200 — legitimate
  for (const i of [11, 47, 89, 200]) {
    if (i < rows.length) rows[i].quantity = -(rows[i].quantity as number);
  }
  // And two zero-revenue returns
  for (const i of [22, 145]) {
    if (i < rows.length) {
      rows[i].quantity = 0;
      rows[i].revenue = 0;
      rows[i].profit = 0;
    }
  }

  // 6. Invalid order_date on rows 3, 17, 99
  for (let k = 0; k < 3; k++) {
    const i = [3, 17, 99][k];
    if (i < rows.length) rows[i].order_date = INVALID_DATES[k];
  }

  // 7. Revenue stored as strings on rows 8, 25, 40
  for (const i of [8, 25, 40]) {
    if (i < rows.length && typeof rows[i].revenue === "number") {
      rows[i].revenue = String(rows[i].revenue);
    }
  }

  return {
    id: "messy-retail",
    name: "Messy Retail Sales (Module 2 lab)",
    context:
      "Same underlying facts as Retail Sales, but with deliberate data-quality issues: missing customer_id, duplicate transactions, inconsistent casing on category, trailing whitespace on product, negative quantities (returns — keep them!), invalid dates, mixed-type revenue.",
    columns: [
      { name: "order_id", dtype: "object", description: "Order identifier — should be unique but isn't (duplicates injected).", example: "ORD-10001" },
      { name: "order_date", dtype: "object", description: "Date string — some values are invalid (will not parse as datetime).", example: "2023-04-17" },
      { name: "customer_id", dtype: "object", description: "Customer identifier — some values are null.", example: "CUST-0042" },
      { name: "product", dtype: "object", description: "Product name — some have trailing whitespace.", example: "GroupBy Mug  " },
      { name: "category", dtype: "object", description: "Product category — inconsistent casing (Apparel, apparel, APPAREL).", example: "apparel" },
      { name: "region", dtype: "object", description: "Sales region (consistent).", example: "East" },
      { name: "quantity", dtype: "int64", description: "Units ordered. Some are negative (returns) or zero — these are legitimate.", example: -3 },
      { name: "unit_price", dtype: "float64", description: "List price per unit in USD.", example: 12.50 },
      { name: "revenue", dtype: "object", description: "Order revenue — some values are strings, some are 0 (returns).", example: "124.50" },
      { name: "profit", dtype: "float64", description: "Profit per order — some null.", example: 21.42 },
    ],
    rows,
    knownIssues: [
      "5% of customer_id values are null (every 20th row).",
      "4 full duplicate rows were inserted.",
      "Category casing is inconsistent (lowercase, uppercase, titlecase).",
      "Some product names have trailing whitespace.",
      "4 rows have negative quantity — these are RETURNS, not errors. Keep them.",
      "2 rows have quantity=0 and revenue=0 (zero-value returns). Keep them.",
      "3 order_date values are invalid strings (e.g., '2023-13-45').",
      "3 revenue values are stored as strings rather than numbers.",
      "Some profit values are null.",
    ],
    analyticalQuestions: [
      "What cleaning strategy respects the meaning of each issue?",
      "Which issues are real errors vs legitimate business events?",
      "How does the data-quality report change before vs after cleaning?",
    ],
    featureOpportunities: [
      "Add a missing-customer indicator column (rather than dropping rows).",
      "Normalise category casing with str.strip().str.title().",
      "Coerce revenue to float64 with astype.",
      "Parse order_date with pd.to_datetime(errors='coerce') — nulls the invalid ones.",
    ],
    limitations: [
      "Deterministic synthetic dataset for the cleaning lab — no real customer data.",
      "Issues are reproducible; real-world messy data is far less predictable.",
    ],
    seed: SEED,
  };
}
