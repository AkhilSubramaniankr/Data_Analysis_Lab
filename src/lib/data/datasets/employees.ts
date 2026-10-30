/**
 * Employee Analytics — deterministic 250-row sample dataset.
 *
 * Columns (master spec §20):
 *   employee_id, department, job_level, years_experience, salary,
 *   performance_rating, training_hours, attrition.
 *
 * Ethical note (master spec §20): this dataset must NOT be used to suggest
 * that sensitive employment decisions can be automated without safeguards.
 * Correlation is not causation; individual outcomes are not predictable
 * from group statistics.
 */

import type { DatasetSpec, Row } from "../types";
import { makeRngHelper } from "../rng";

const SEED = 99;
const DEPARTMENTS = ["Engineering", "Sales", "Operations", "Finance", "Support", "People"] as const;

export function buildEmployeeAnalytics(n: number = 250): DatasetSpec {
  const rng = makeRngHelper(SEED);
  const rows: Row[] = [];

  for (let i = 0; i < n; i++) {
    const dept = rng.pick(DEPARTMENTS);
    const level = rng.int(1, 5);
    const years = Math.max(0, Math.round(rng.gauss(level * 3, 3)));
    const baseSalary = 35000 + level * 12000 + years * 1800;
    const salary = Math.round(baseSalary + rng.float(-4000, 4000));
    // Performance rating: 1–5, slightly higher with more training hours
    const trainingHours = rng.int(0, 80);
    const perfBias = trainingHours / 80 * 0.6;
    const rating = Math.min(5, Math.max(1, Math.round(rng.gauss(3 + perfBias, 0.9))));
    // Attrition: probabilistic — lower with higher salary & rating, but mostly random
    const attritionScore = rng.float(0, 1) - (salary - 35000) / 100000 - rating / 20;
    const attrition = attritionScore > 0.55 ? "yes" : "no";
    rows.push({
      employee_id: `EMP-${String(1000 + i).padStart(5, "0")}`,
      department: dept,
      job_level: level,
      years_experience: years,
      salary,
      performance_rating: rating,
      training_hours: trainingHours,
      attrition,
    });
  }

  return {
    id: "employees",
    name: "Employee Analytics",
    context:
      "Employee records across six departments. Each row is one employee with their level, experience, salary, performance rating, training hours, and attrition status.",
    columns: [
      { name: "employee_id", dtype: "object", description: "Unique employee identifier (primary key).", example: "EMP-01000", isKey: true },
      { name: "department", dtype: "object", description: "Department name (6 categories).", example: "Engineering", categories: [...DEPARTMENTS] },
      { name: "job_level", dtype: "int64", description: "Job level on a 1–5 scale.", example: 3, range: { min: 1, max: 5 } },
      { name: "years_experience", dtype: "int64", description: "Years of professional experience.", example: 7, range: { min: 0, max: 40 } },
      { name: "salary", dtype: "int64", description: "Annual salary in USD.", example: 72000, isTargetCandidate: true, range: { min: 35000, max: 110000 } },
      { name: "performance_rating", dtype: "int64", description: "Most recent performance rating (1–5).", example: 4, range: { min: 1, max: 5 } },
      { name: "training_hours", dtype: "int64", description: "Training hours completed in the last 12 months.", example: 24, range: { min: 0, max: 80 } },
      { name: "attrition", dtype: "object", description: "Whether the employee left (yes/no).", example: "no", isTargetCandidate: true, categories: ["yes", "no"] },
    ],
    rows,
    knownIssues: [
      "performance_rating is missing for some new hires (handled in the messy version in Module 2).",
      "Salary is correlated with job_level and years_experience by construction — useful for teaching multicollinearity later.",
      "attrition is a binary categorical target — handle with appropriate metrics (F1, ROC-AUC), not MSE.",
    ],
    analyticalQuestions: [
      "Which departments have the highest attrition rate?",
      "Does training correlate with performance rating?",
      "Is there a salary gap between departments at the same job level?",
      "(Statistical only, not causal.) What factors are associated with attrition?",
    ],
    featureOpportunities: [
      "salary_zscore_per_department = (salary − dept_mean) / dept_std (use sparingly — leakage risk if computed on full data).",
      "training_intensity = training_hours / (years_experience + 1).",
      "Categorical encoding: department → one-hot; attrition → binary (yes=1).",
    ],
    limitations: [
      "Synthetic — attrition probabilities are illustrative, not predictive of any real workforce.",
      "No temporal dimension; cannot model attrition as a survival problem here.",
      "Single time snapshot — no tenure or attrition date.",
    ],
    ethicalWarning:
      "This dataset must NOT be used to suggest that sensitive employment decisions can be automated without appropriate safeguards. Correlation is not causation; group statistics do not predict individual outcomes.",
    seed: SEED,
  };
}
