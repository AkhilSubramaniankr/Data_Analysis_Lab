/**
 * Dataset registry — the three built-in datasets + the messy variant.
 *
 * `loadDataset(id)` always returns a fresh `DataFrame` instance backed by
 * the canonical dataset rows. Built-in datasets are deterministic and
 * reproducible; the messy variant is also deterministic.
 */

import type { DatasetSpec } from "../types";
import { DataFrame } from "../frame";
import { buildRetailSales } from "./retail";
import { buildCustomerTransactions } from "./customers";
import { buildEmployeeAnalytics } from "./employees";
import { buildMessyRetail } from "./messy";
import { buildMarketing } from "./marketing";

export { buildRetailSales, buildCustomerTransactions, buildEmployeeAnalytics, buildMessyRetail, buildMarketing };

/** Catalogue of built-in datasets (used by the Dataset Explorer + module labs). */
export const BUILT_IN_DATASETS: DatasetSpec[] = [
  buildRetailSales(),
  buildCustomerTransactions(),
  buildEmployeeAnalytics(),
  buildMarketing(),
];

/** Catalogue of lab-only datasets (the messy variant is referenced by Module 2). */
export const LAB_DATASETS: DatasetSpec[] = [
  buildMessyRetail(),
];

export const ALL_DATASETS: DatasetSpec[] = [...BUILT_IN_DATASETS, ...LAB_DATASETS];

export function getDatasetById(id: string): DatasetSpec | undefined {
  return ALL_DATASETS.find((d) => d.id === id);
}

/** Load a dataset as a DataFrame. Returns a fresh instance every call. */
export function loadDataFrame(id: string): DataFrame {
  const spec = getDatasetById(id);
  if (!spec) {
    throw new Error(`Unknown dataset id: ${id}`);
  }
  return DataFrame.fromRows(spec.rows);
}

/** Load a dataset's spec (for dictionary display). */
export function loadDatasetSpec(id: string): DatasetSpec {
  const spec = getDatasetById(id);
  if (!spec) {
    throw new Error(`Unknown dataset id: ${id}`);
  }
  return spec;
}
