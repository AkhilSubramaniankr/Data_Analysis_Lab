/**
 * The 16-stage real-world analytical lifecycle from the master spec §3.
 * Used by the homepage pipeline animation and the roadmap.
 */

export interface PipelineStage {
  /** Stable id. */
  id: string;
  /** Display label (short, ~1-3 words). */
  label: string;
  /** One-sentence description. */
  description: string;
  /** Role colour for visual coding (matches design system). */
  role: "data" | "transform" | "stats" | "validated" | "warning";
  /** Master spec ordering (1-indexed). */
  order: number;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "raw", label: "Raw Dataset", description: "Start with whatever the business gave you — messy, undocumented, and real.", role: "data", order: 1 },
  { id: "business", label: "Business Problem", description: "Understand the question before you touch a single row.", role: "stats", order: 2 },
  { id: "explore", label: "Explore", description: "Inspect dimensions, types, cardinality, and potential targets.", role: "data", order: 3 },
  { id: "quality", label: "Data Quality", description: "Find missing values, duplicates, and inconsistencies — and decide what's actually invalid.", role: "warning", order: 4 },
  { id: "clean", label: "Clean & Validate", description: "Apply the cleaning strategy that respects the data's meaning and the business rules.", role: "transform", order: 5 },
  { id: "select", label: "Select & Transform", description: "Pick rows, columns, and create the working analytical view.", role: "transform", order: 6 },
  { id: "eda", label: "EDA", description: "Describe distributions, segments, and trends — generate hypotheses, don't confirm them.", role: "stats", order: 7 },
  { id: "descriptive", label: "Descriptive Stats", description: "Compute mean, spread, quantiles, and grouped summaries that mean something.", role: "stats", order: 8 },
  { id: "grouping", label: "Group & Aggregate", description: "Build the business summaries your stakeholders actually need.", role: "transform", order: 9 },
  { id: "relationships", label: "Relationships & Trends", description: "Correlation, crosstabs, time-series — and where they mislead.", role: "stats", order: 10 },
  { id: "engineer", label: "Engineer Features", description: "Create derived features with documented assumptions and zero-denominator safety.", role: "transform", order: 11 },
  { id: "feature-selection", label: "Select Features", description: "Filter, model-based, and wrapper methods — inside the train/val workflow.", role: "transform", order: 12 },
  { id: "prepare", label: "Prepare Analytical Dataset", description: "Build a leakage-safe, model-ready dataset you can defend.", role: "validated", order: 13 },
  { id: "ml-prep", label: "ML Preprocessing", description: "Pipeline, ColumnTransformer, splits — fitted on training data only.", role: "transform", order: 14 },
  { id: "validation", label: "Validation", description: "Confirm types, shapes, missing values, and train/test separation before modelling.", role: "validated", order: 15 },
  { id: "final", label: "Validated Dataset", description: "A clean, reliable, analytically useful, ML-ready dataset — and a report that says so honestly.", role: "validated", order: 16 },
];

/** The 7-stage simplified pipeline used on the homepage hero. */
export const HERO_PIPELINE_IDS: string[] = [
  "raw",
  "explore",
  "clean",
  "eda",
  "engineer",
  "feature-selection",
  "final",
];
