/**
 * Canonical module catalog.
 *
 * Single source of truth consumed by TopNav, RoadmapView, ModuleView, and
 * any other component that needs to know what modules exist.
 *
 * Re-exported as `MODULES` and `CAPSTONE`.
 */

import type { LucideIcon } from "lucide-react";
import {
  Table2,
  Sparkles,
  Filter,
  Sigma,
  Layers,
  LineChart,
  TrendingUp,
  Wrench,
  Tags,
  Scissors,
  Gauge,
  ListChecks,
  Workflow,
  Trophy,
} from "lucide-react";

export type ModuleStatus = "completed" | "in-progress" | "planned";

export interface ModuleCatalogEntry {
  /** Stable id, used in URLs / state. */
  id: string;
  /** 1-indexed display order in the roadmap. */
  index: number;
  title: string;
  shortTitle: string;
  /** Which implementation phase delivers the deep interactive content. */
  phase: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  status: ModuleStatus;
  /** One-sentence learning objective. */
  learningObjective: string;
  /** Topic list (verbatim from master spec). */
  topics: string[];
  /** Pandas / scikit-learn functions taught in this module. */
  pandasFunctions: string[];
  /** What the learner will build (interactive lab description). */
  buildPreview: string;
  icon: LucideIcon;
  /** Master spec section number, for traceability. */
  specSection: number;
}

export const MODULES: ModuleCatalogEntry[] = [
  {
    id: "dataset-exploration",
    index: 1,
    title: "Dataset Exploration",
    shortTitle: "Dataset Exploration",
    phase: 2,
    status: "completed",
    learningObjective:
      "Understand an unfamiliar dataset before making any analytical decisions — dimensions, types, cardinality, and potential target variables.",
    topics: [
      "What is a dataset?",
      "Rows, columns, observations, and features",
      "Structured versus unstructured data",
      "Numerical versus categorical columns",
      "Dataset dimensions",
      "Data types",
      "Dataset inspection",
      "Dataset profiling",
      "Unique values and cardinality",
      "Identifying potential target variables",
      "Understanding data dictionaries",
      "Identifying primary keys and potential duplicate records",
    ],
    pandasFunctions: [
      "head()",
      "tail()",
      "sample()",
      "shape",
      "columns",
      "index",
      "info()",
      "describe()",
      "dtypes",
      "select_dtypes()",
      "nunique()",
      "unique()",
      "value_counts()",
      "memory_usage()",
    ],
    buildPreview:
      "An interactive table where you pick a column and instantly see its dtype, nunique, value_counts, and memory_usage — with the matching Pandas code shown side-by-side.",
    icon: Table2,
    specSection: 6,
  },
  {
    id: "data-quality",
    index: 2,
    title: "Data Quality Assessment & Cleaning",
    shortTitle: "Data Quality",
    phase: 2,
    status: "completed",
    learningObjective:
      "Identify missing values, duplicates, and inconsistent data — and choose a cleaning strategy that respects the meaning of the data and the business rules.",
    topics: [
      "Identifying and counting missing values",
      "Missing-value percentages and patterns",
      "Dropping rows or columns",
      "Mean, median, and mode imputation",
      "Group-based and conditional imputation",
      "Missing-value indicators and the limits of simple imputation",
      "Detecting and removing duplicates",
      "Duplicate business keys vs legitimate repeats",
      "Inconsistent categories, casing, whitespace, and date formats",
      "Range, allowed-value, and cross-column validation",
      "Business-rule validation",
    ],
    pandasFunctions: [
      "isna()",
      "notna()",
      "fillna()",
      "dropna()",
      "duplicated()",
      "drop_duplicates()",
      "replace()",
      "astype()",
      "to_datetime()",
      "str.strip()",
      "str.lower()",
      "str.upper()",
      "between()",
      "where()",
      "mask()",
    ],
    buildPreview:
      "A deliberately messy dataset with missing customers, duplicate transactions, inconsistent categories, invalid dates, and negative quantities. You pick a strategy, run it, and compare the before-and-after data-quality report.",
    icon: Sparkles,
    specSection: 7,
  },
  {
    id: "selection-filtering",
    index: 3,
    title: "Selection, Filtering, Sorting & Transformation",
    shortTitle: "Selection & Filtering",
    phase: 2,
    status: "completed",
    learningObjective:
      "Select rows and columns with label- and position-based indexing, filter with Boolean conditions, sort and rank, and combine datasets without silently multiplying records.",
    topics: [
      "Selecting columns and rows",
      "Label-based indexing with loc",
      "Position-based indexing with iloc",
      "Boolean indexing and multiple conditions",
      "Membership and range filtering",
      "Avoiding chained-indexing pitfalls",
      "sort_values, sort_index, nlargest, nsmallest, rank",
      "Ranking within groups",
      "map, apply, assign, where, mask",
      "Vectorized and NumPy-based transforms",
      "merge, join, concat",
      "Inner, left, right, and outer joins",
      "One-to-one, one-to-many, many-to-many",
      "Join validation and duplicate multiplication",
    ],
    pandasFunctions: [
      "loc[]",
      "iloc[]",
      "sort_values()",
      "sort_index()",
      "nlargest()",
      "nsmallest()",
      "rank()",
      "map()",
      "apply()",
      "assign()",
      "where()",
      "mask()",
      "merge()",
      "join()",
      "concat()",
    ],
    buildPreview:
      "A filter builder: pick column + operator + value, see the matching rows, the count, and the generated Pandas code with an explanation of any data-quality implication.",
    icon: Filter,
    specSection: 8,
  },
  {
    id: "descriptive-stats",
    index: 4,
    title: "Descriptive Statistics & Summary Reports",
    shortTitle: "Descriptive Statistics",
    phase: 2,
    status: "completed",
    learningObjective:
      "Describe a dataset accurately, communicate meaningful findings, and recognise when a summary statistic is misleading.",
    topics: [
      "Count, sum, mean, median, mode",
      "Min, max, range",
      "Variance, standard deviation",
      "Quantiles, quartiles, percentiles, IQR",
      "Skewness and kurtosis",
      "Frequency distributions",
      "Grouped summary statistics",
      "Sample vs population variance",
      "When a statistic is misleading",
    ],
    pandasFunctions: [
      "mean()",
      "median()",
      "mode()",
      "sum()",
      "min()",
      "max()",
      "var()",
      "std()",
      "quantile()",
      "describe()",
      "value_counts()",
      "agg()",
      "groupby()",
    ],
    buildPreview:
      "Pick a numerical column, see mean vs median, spread, quartiles, percentiles, distribution shape, and potential outliers — all computed from the dataset. Edit an observation and watch the statistics move.",
    icon: Sigma,
    specSection: 9,
  },
  {
    id: "grouping-aggregation",
    index: 5,
    title: "Grouping, Aggregation, Pivot Tables & Crosstabs",
    shortTitle: "Grouping & Aggregation",
    phase: 2,
    status: "completed",
    learningObjective:
      "Group data, aggregate it meaningfully, build pivot tables and crosstabs, and choose the right aggregation function for the business question.",
    topics: [
      "groupby, agg, transform, filter",
      "Multiple grouping columns and aggregations",
      "Named aggregation and group-level ranking",
      "Percentage contribution and cumulative totals",
      "pivot vs pivot_table",
      "Margins and totals",
      "Wide vs long data",
      "crosstab and frequency tables",
      "Row, column, and conditional proportions",
    ],
    pandasFunctions: [
      "groupby()",
      "agg()",
      "transform()",
      "filter()",
      "pivot()",
      "pivot_table()",
      "crosstab()",
    ],
    buildPreview:
      "A sales dataset (order, date, customer, product, category, region, quantity, revenue, profit). Pick dimensions and metrics and get a real summary table — with the Pandas code and a one-line justification for the chosen aggregation.",
    icon: Layers,
    specSection: 10,
  },
  {
    id: "correlation",
    index: 6,
    title: "Correlation & Relationship Analysis",
    shortTitle: "Correlation",
    phase: 3,
    status: "completed",
    learningObjective:
      "Measure relationships between variables, distinguish Pearson from Spearman, spot multicollinearity and confounders, and never confuse correlation with causation.",
    topics: [
      "Positive, negative, weak, strong correlation",
      "Pearson vs Spearman rank",
      "Covariance and correlation matrices",
      "Correlation heatmaps",
      "Numerical vs categorical relationships",
      "Multicollinearity and confounding variables",
      "Nonlinear relationships",
      "Correlation is not causation",
    ],
    pandasFunctions: ["corr()", "cov()"],
    buildPreview:
      "A dataset with sales, advertising spend, price, quantity, profit. Pick two variables, see Pearson + Spearman, scatter, and the correlation matrix — with worked examples where outliers or nonlinearity make correlation misleading.",
    icon: LineChart,
    specSection: 11,
  },
  {
    id: "eda-business",
    index: 7,
    title: "Exploratory Data Analysis & Business Insights",
    shortTitle: "EDA & Business Insights",
    phase: 3,
    status: "completed",
    learningObjective:
      "Run univariate, bivariate, and multivariate analysis on a sales dataset and turn the findings into honest business insights — every chart annotated with what it shows and what it does not.",
    topics: [
      "Univariate, bivariate, multivariate analysis",
      "Distribution analysis and category comparisons",
      "Trend, segment, and outlier investigation",
      "KPI analysis and business summaries",
      "Hypothesis generation",
      "Histograms, box plots, scatter, line, heatmaps, count, violin, pair plots",
    ],
    pandasFunctions: [
      "hist()",
      "plot()",
      "boxplot()",
      "groupby()",
      "agg()",
    ],
    buildPreview:
      "A filterable sales dashboard: total revenue, profit, order count, AOV, monthly trend, regional split, top/bottom products. Every chart carries a business question, the reason the chart type was chosen, what it shows, what it does not establish, and what to investigate next.",
    icon: TrendingUp,
    specSection: 12,
  },
  {
    id: "trend-analysis",
    index: 8,
    title: "Trend Analysis & Time-Based Data",
    shortTitle: "Trend Analysis",
    phase: 3,
    status: "completed",
    learningObjective:
      "Convert strings to datetime, aggregate time series, compute period-over-period growth and rolling averages — and recognise when percentage growth is undefined or misleading.",
    topics: [
      "pd.to_datetime and .dt accessors",
      "Date filtering and chronological sorting",
      "Monthly and quarterly aggregation",
      "MoM and YoY growth",
      "Rolling averages and cumulative totals",
      "Seasonal patterns and missing periods",
      "Time-zone and date consistency",
    ],
    pandasFunctions: [
      "pd.to_datetime()",
      ".dt.year",
      ".dt.month",
      ".dt.day",
      ".dt.day_name()",
      "resample()",
      "rolling()",
      "expanding()",
      "shift()",
      "pct_change()",
    ],
    buildPreview:
      "Pick granularity (daily/weekly/monthly/quarterly), metric (revenue/profit/orders), rolling window, and comparison period. See the real trend chart, the code, and an honest interpretation — including when pct_change is undefined.",
    icon: TrendingUp,
    specSection: 13,
  },
  {
    id: "feature-engineering-fundamentals",
    index: 9,
    title: "Feature Engineering Fundamentals",
    shortTitle: "Feature Engineering",
    phase: 4,
    status: "completed",
    learningObjective:
      "Create, transform, and represent features for downstream analysis and predictive modelling — documenting assumptions, validating formulas, and never implying that every transformation helps every model.",
    topics: [
      "Raw vs engineered features",
      "Domain-driven feature creation",
      "Feature transformation and representation",
      "Feature interactions and leakage risks",
      "Total order value, AOV, profit margin, frequency, recency, tenure",
      "Log, square-root, power, reciprocal, polynomial, interaction features",
      "Date/time-derived and aggregated customer-level features",
    ],
    pandasFunctions: [
      "assign()",
      "apply()",
      "np.log()",
      "np.sqrt()",
      "np.power()",
      ".dt.*",
    ],
    buildPreview:
      "Build derived features (order value, profit margin, days since last transaction) on the retail dataset. The tool flags zero denominators and offers the safer NumPy-based implementation — exactly as the master spec requires.",
    icon: Wrench,
    specSection: 14,
  },
  {
    id: "categorical-encoding",
    index: 10,
    title: "Categorical Variable Representation",
    shortTitle: "Categorical Encoding",
    phase: 4,
    status: "completed",
    learningObjective:
      "Encode nominal, ordinal, binary, and high-cardinality categorical variables appropriately — distinguishing native Pandas from scikit-learn, and never leaking targets through target encoding.",
    topics: [
      "Nominal, ordinal, binary, high-cardinality, rare, missing, unseen categories",
      "One-hot, dummy, ordinal, label, frequency, target, binary, hash encoding",
      "When one-hot is appropriate",
      "Why arbitrary integer codes mislead some models",
      "Why target encoding must be fitted without leaking validation targets",
      "Handling unseen categories at inference",
      "Cost of high-cardinality encoding",
    ],
    pandasFunctions: [
      "pd.get_dummies()",
      "astype('category')",
      "map()",
      "factorize()",
    ],
    buildPreview:
      "A dataset with city, category, tier, segment, satisfaction. Pick an encoding, see the original vs encoded table, column count, memory footprint, interpretability, and a clear list of risks — including leakage for target encoding.",
    icon: Tags,
    specSection: 15,
  },
  {
    id: "binning",
    index: 11,
    title: "Binning & Discretization",
    shortTitle: "Binning",
    phase: 4,
    status: "completed",
    learningObjective:
      "Discretise continuous variables with equal-width, equal-frequency, quantile, and domain-defined bins — knowing when binning aids interpretation and when it throws away information.",
    topics: [
      "Continuous vs discrete variables",
      "Equal-width, equal-frequency, quantile binning",
      "Domain-defined and model-based bins",
      "Choosing bin boundaries and the number of bins",
      "Duplicate quantile boundaries",
      "Outliers and extreme values",
      "Information loss vs interpretability",
    ],
    pandasFunctions: ["pd.cut()", "pd.qcut()"],
    buildPreview:
      "Pick a numerical variable (age, order value, delivery time), adjust bin count and strategy, see the distribution shift and the summary statistics change — and read when discretization helps vs hurts.",
    icon: Scissors,
    specSection: 16,
  },
  {
    id: "scaling",
    index: 12,
    title: "Feature Scaling & Numerical Transformation",
    shortTitle: "Scaling",
    phase: 4,
    status: "completed",
    learningObjective:
      "Apply standardization, min-max, robust, and max-abs scaling — distinguishing standardization from normalization, feature scaling from row-wise normalization, and respecting train-only fitting.",
    topics: [
      "Mean, standard deviation, Z-scores",
      "Min-max, robust, max-abs scaling",
      "Row-wise normalization and when it is appropriate",
      "Sensitivity to outliers",
      "Suitability per model family",
      "Tree models and the scaling question",
      "Why preprocessing parameters come from training data only",
    ],
    pandasFunctions: [
      "(sklearn) StandardScaler",
      "MinMaxScaler",
      "RobustScaler",
      "MaxAbsScaler",
      "Normalizer",
    ],
    buildPreview:
      "Pick a numerical feature, apply each scaler, see original vs transformed values, mean/std/min/max, outlier sensitivity, and a per-model-family recommendation. Preprocessing is fitted on training data only — verified by the UI.",
    icon: Gauge,
    specSection: 17,
  },
  {
    id: "feature-selection",
    index: 13,
    title: "Feature Selection",
    shortTitle: "Feature Selection",
    phase: 5,
    status: "completed",
    learningObjective:
      "Select a useful subset of features with filter, model-based, and wrapper methods — always inside the train/validation workflow, never on the test set.",
    topics: [
      "Filter: variance threshold, correlation, chi-square, ANOVA F, mutual information",
      "Model-based: tree importance, RF, Extra Trees, L1/Lasso, Elastic Net, SelectFromModel, permutation importance",
      "Wrapper: RFE, RFECV, Sequential Forward, Sequential Backward",
      "Cross-validation-based subset evaluation",
      "Feature-selection stability",
      "Limitations of importance with correlated or high-cardinality features",
    ],
    pandasFunctions: [
      "(sklearn) VarianceThreshold",
      "SelectKBest",
      "SelectFromModel",
      "RFE",
      "RFECV",
      "SequentialFeatureSelector",
      "permutation_importance",
    ],
    buildPreview:
      "Pick a target, a selection method, and a feature count or threshold. See the selected feature names, ranking, and model performance before vs after — with the right metric (accuracy/F1/ROC-AUC for classification, MAE/RMSE/R² for regression) and a leakage-safe train/val/test workflow.",
    icon: ListChecks,
    specSection: 18,
  },
  {
    id: "ml-preparation",
    index: 14,
    title: "Preparing Analytical Datasets for Predictive Modelling",
    shortTitle: "ML Preparation",
    phase: 5,
    status: "completed",
    learningObjective:
      "Connect Pandas analysis to a real ML preprocessing pipeline — splits, transformers, leakage prevention, and a model-ready dataset you can defend.",
    topics: [
      "Defining the prediction objective and separating features from target",
      "Identifying identifiers and target leakage",
      "Train/validation/test split; stratified and time-based splitting",
      "Mixed numerical/categorical columns",
      "Imputation, encoding, scaling, selection in a single pipeline",
      "Model-ready data validation and reproducibility",
    ],
    pandasFunctions: [
      "(sklearn) train_test_split",
      "Pipeline",
      "ColumnTransformer",
      "SimpleImputer",
      "OneHotEncoder",
      "StandardScaler",
      "SelectFromModel",
    ],
    buildPreview:
      "A visual pipeline builder: raw → split → impute → encode → scale → select → train → evaluate. Every stage shows the generated Python code, and the UI blocks you from fitting preprocessing on the test set.",
    icon: Workflow,
    specSection: 19,
  },
];

export const CAPSTONE: ModuleCatalogEntry = {
  id: "capstone",
  index: 15,
  title: "Capstone — Retail Sales Analysis & ML Dataset Preparation",
  shortTitle: "Capstone Project",
  phase: 7,
  status: "completed",
  learningObjective:
    "Run a realistic 9-phase analytical workflow on a retail sales dataset, from understanding the data to producing a validated, model-ready analytical dataset and a final report — with every number computed from the actual data.",
  topics: [
    "Phase 1: Understand the dataset",
    "Phase 2: Assess data quality",
    "Phase 3: Clean the data",
    "Phase 4: Exploratory data analysis",
    "Phase 5: Generate business insights",
    "Phase 6: Engineer features",
    "Phase 7: Select features",
    "Phase 8: Prepare the analytical dataset",
    "Phase 9: Final report (data-quality, EDA, findings, FE doc, selection report, dataset description, limitations)",
  ],
  pandasFunctions: [
    "head()",
    "info()",
    "describe()",
    "isna()",
    "duplicated()",
    "fillna()",
    "drop_duplicates()",
    "astype()",
    "to_datetime()",
    "groupby()",
    "agg()",
    "pivot_table()",
    "corr()",
    "assign()",
    "pd.cut()",
    "pd.qcut()",
    "pd.get_dummies()",
    "(sklearn) Pipeline",
    "ColumnTransformer",
    "train_test_split",
  ],
  buildPreview:
    "A guided 9-phase capstone. Each phase has a checklist, the real retail dataset, the code, and the expected output. You cannot advance until the prior phase's checks pass. The final report contains only numbers computed from the actual dataset.",
  icon: Trophy,
  specSection: 26,
};

/** Combined list (modules + capstone) for roadmap / nav iteration. */
export const ROADMAP: ModuleCatalogEntry[] = [...MODULES, CAPSTONE];

/** Convenience: look up a module by id. */
export function getModuleById(id: string): ModuleCatalogEntry | undefined {
  return ROADMAP.find((m) => m.id === id);
}

/** Convenience: count modules out of total, for progress display. */
export function totalModules(): number {
  return ROADMAP.length;
}
