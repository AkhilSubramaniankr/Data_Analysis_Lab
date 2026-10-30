/**
 * Interactive Learning Topics — comprehensive curriculum companion.
 *
 * Every topic from the 14 Pandas Lab modules, organized by category,
 * with full educational content: WHAT → WHY → WHEN → HOW → EXAMPLE →
 * CODE → INTERPRETATION → MISTAKES → TAKEAWAY.
 *
 * This file is the single source of truth for the Interactive Learning tab.
 * Add new topics by appending to the TOPICS array.
 */

/**
 * Live demo specification attached to a topic. Each `kind` switches the
 * TopicDemo component to a different renderer. All fields are optional —
 * the demo component uses sensible defaults per kind.
 */
export type TopicDemoSpec =
  | { kind: "describe-stats"; datasetId?: string; defaultCol?: string }
  | { kind: "histogram"; datasetId?: string; defaultCol?: string; bins?: number }
  | { kind: "scatter-corr"; datasetId?: string; defaultX?: string; defaultY?: string }
  | { kind: "parabolic" }
  | { kind: "outlier-distortion" }
  | { kind: "groupby-summary"; datasetId?: string; defaultGroup?: string; defaultMetric?: string; defaultAgg?: "sum" | "mean" | "count" | "nunique" | "median" }
  | { kind: "pivot-table"; datasetId?: string; defaultIndex?: string; defaultCols?: string; defaultMetric?: string }
  | { kind: "crosstab"; datasetId?: string; defaultIndex?: string; defaultCols?: string }
  | { kind: "monthly-trend"; datasetId?: string; defaultMetric?: string }
  | { kind: "transform"; datasetId?: string; defaultCol?: string; defaultTransform?: "log1p" | "sqrt" | "square" }
  | { kind: "encoding"; datasetId?: string; defaultCol?: string; defaultMethod?: "onehot" | "label" | "frequency" }
  | { kind: "scaling"; datasetId?: string; defaultCol?: string; defaultScaler?: "standardize" | "minmax" | "robust" | "maxabs" }
  | { kind: "feature-selection"; datasetId?: string; defaultTarget?: string }
  | { kind: "train-test-split"; datasetId?: string }
  | { kind: "binning"; datasetId?: string; defaultCol?: string; defaultStrategy?: "equal-width" | "equal-frequency"; defaultBins?: number }
  | { kind: "target-encoding"; datasetId?: string; defaultCol?: string; defaultTarget?: string }
  | { kind: "missing-values"; datasetId?: string }
  | { kind: "duplicates"; datasetId?: string }
  | { kind: "dtypes" }
  | { kind: "value-counts"; datasetId?: string; defaultCol?: string }
  | { kind: "shape-info"; datasetId?: string };

export interface InteractiveTopic {
  id: string;
  category: TopicCategory;
  title: string;
  concept: string;
  why: string;
  when: string;
  how: string;
  example: string;
  code: string;
  interpretation: string;
  mistakes: string[];
  takeaway: string;
  /** Optional: link to a specific interactive lab tab */
  labLink?: string;
  /** Optional: live demo specification. When present, TopicDemo renders a
   * real, computed demonstration of the topic using the in-browser engine. */
  demo?: TopicDemoSpec;
}

export type TopicCategory =
  | "Pandas Fundamentals"
  | "Data Exploration"
  | "Data Cleaning"
  | "Statistics"
  | "Grouping & Aggregation"
  | "Correlation"
  | "Time Series"
  | "Feature Engineering"
  | "Feature Selection"
  | "ML Preparation";

export const CATEGORIES: { id: TopicCategory; icon: string; description: string }[] = [
  { id: "Pandas Fundamentals", icon: "Database", description: "DataFrames, Series, indexing, selection, filtering, sorting" },
  { id: "Data Exploration", icon: "Search", description: "shape, dtypes, info, describe, value_counts, memory_usage" },
  { id: "Data Cleaning", icon: "Sparkles", description: "Missing values, duplicates, type conversion, inconsistencies" },
  { id: "Statistics", icon: "Sigma", description: "Mean, median, std, quantiles, IQR, skewness, outliers" },
  { id: "Grouping & Aggregation", icon: "Layers", description: "groupby, agg, pivot tables, crosstabs" },
  { id: "Correlation", icon: "LineChart", description: "Pearson, Spearman, heatmaps, nonlinear, causation" },
  { id: "Time Series", icon: "TrendingUp", description: "to_datetime, resample, rolling, pct_change, trends" },
  { id: "Feature Engineering", icon: "Wrench", description: "Feature creation, transforms, binning, encoding, scaling" },
  { id: "Feature Selection", icon: "ListChecks", description: "Filter, model-based, wrapper methods, RFE" },
  { id: "ML Preparation", icon: "Workflow", description: "Train/test split, pipelines, leakage prevention" },
];

export const TOPICS: InteractiveTopic[] = [
  // ─── PANDAS FUNDAMENTALS ─────────────────────────────────────────
  {
    id: "dataframe-structure",
    category: "Pandas Fundamentals",
    title: "DataFrame Structure: Rows, Columns, and Index",
    concept: "A DataFrame is Pandas' two-dimensional data structure — think of it as a spreadsheet or SQL table. Each column is a Series (a one-dimensional array with labels). The intersection of a row and column is a single cell value. Every row has an index (a label), and every column has a name. The index doesn't have to be sequential integers — it can be dates, strings, or any hashable value. Understanding the row/column/index distinction is the foundation of every Pandas operation.",
    why: "Before you can select, filter, or transform data, you need to understand how Pandas organises it. The index is not just a row number — it's a label that enables fast lookups, alignment during operations, and time-series handling. Misunderstanding the index leads to silent bugs where operations align on the wrong axis.",
    when: "Always. The first step of any analysis is understanding the shape (rows × columns), the index type, and the column dtypes. This tells you whether your data is at the right granularity (order-level vs customer-level) and whether the types are correct (dates stored as strings, numbers stored as objects).",
    how: "1. Check df.shape → returns (n_rows, n_columns). 2. Check df.columns → list of column names. 3. Check df.index → the row labels. 4. Check df.dtypes → the data type of each column. 5. The index is used for alignment: when you add two Series, Pandas matches them by index, not position.",
    example: "A retail dataset has 240 rows (one per order) and 10 columns (order_id, order_date, customer_id, product, category, region, quantity, unit_price, revenue, profit). The default index is 0-239 (RangeIndex). If you set order_date as the index, you unlock time-series operations like resampling and rolling windows.",
    code: `import pandas as pd

df = pd.read_csv("retail_sales.csv")

print(df.shape)      # (240, 10) — 240 rows, 10 columns
print(df.columns)    # Index(['order_id', 'order_date', ...])
print(df.index)      # RangeIndex(start=0, stop=240, step=1)
print(df.dtypes)     # order_id: object, order_date: object, ...`,
    interpretation: "shape (240, 10) means 240 orders with 10 attributes each. If shape were (1, 10), you'd have one order — likely a data loading issue. dtypes showing 'object' for order_date means it's stored as a string, not a datetime — you'll need pd.to_datetime() before time-series operations.",
    mistakes: [
      "Confusing rows and columns — shape is always (rows, columns), not (columns, rows).",
      "Treating the index as 'just row numbers' — it's a label that affects alignment, joins, and time-series operations.",
      "Ignoring dtype — 'object' columns hide strings that should be numbers or dates.",
    ],
    takeaway: "A DataFrame is a table with labeled rows (index) and labeled columns. Always check shape, columns, index, and dtypes before any analysis.",
    demo: { kind: "shape-info" },
  },
  {
    id: "loc-iloc",
    category: "Pandas Fundamentals",
    title: "loc vs iloc: Label vs Position Indexing",
    concept: "loc accesses rows and columns by LABEL — you use the actual index values and column names. iloc accesses by POSITION — you use integer positions (0, 1, 2...), like Python list indexing. They produce different results when the index is not a default RangeIndex. loc includes the endpoint in slices; iloc excludes it (Python half-open slicing).",
    why: "Using the wrong one is one of the most common Pandas bugs. If your index is ['alice', 'bob', 'carol'], loc['alice':'carol'] returns all three rows. iloc[0:2] returns only 'alice' and 'bob' (positions 0 and 1, not 2). When the index is the default RangeIndex (0, 1, 2...), loc and iloc appear to do the same thing — but that's a coincidence, not a rule.",
    when: "Use loc when you know the label (e.g., df.loc['2023-01-15'] for a date-indexed DataFrame, or df.loc[:, ['revenue', 'profit']] for column selection). Use iloc when you want positional access (e.g., df.iloc[:5] for the first 5 rows, or df.iloc[:, 0] for the first column). Use loc for boolean indexing (df.loc[df['revenue'] > 100]).",
    how: "1. df.loc[row_labels, column_labels] — labels are inclusive. 2. df.iloc[row_positions, column_positions] — positions are half-open [start, stop). 3. loc accepts boolean masks. 4. iloc accepts integer arrays. 5. Both support slicing: loc['a':'c'] includes 'c'; iloc[0:2] excludes index 2.",
    example: "A customer DataFrame indexed by customer name: df.loc['alice', 'email'] returns Alice's email. df.iloc[0, 2] returns the value at row 0, column 2 (which happens to be Alice's email if Alice is first). If you add a new customer 'zara' at the end, df.loc['alice':'zara'] includes both endpoints — but df.iloc[0:1] only includes Alice.",
    code: `# By label (loc)
df.loc[0]            # row with index label 0
df.loc[:, "revenue"] # all rows, revenue column
df.loc[df["revenue"] > 100, ["product", "revenue"]]

# By position (iloc)
df.iloc[0]          # first row (position 0)
df.iloc[:5]         # first 5 rows (positions 0-4)
df.iloc[:, 0]       # first column (position 0)
df.iloc[-1]         # last row`,
    interpretation: "loc always uses labels — if your index is 0-239, loc[5] returns the row with label 5. iloc uses positions — iloc[5] returns the 6th row (position 5). They coincide for RangeIndex but diverge for any custom index.",
    mistakes: [
      "Using .loc[5] expecting 'the 5th row' — it actually returns the row whose label is 5.",
      "Chaining indexing: df.loc[5]['revenue'] — fragile, use df.loc[5, 'revenue'] instead.",
      "Forgetting that loc slices are inclusive but iloc slices are half-open.",
    ],
    takeaway: "loc = by label (inclusive slices). iloc = by position (half-open slices). When in doubt, check your index type.",
    demo: { kind: "shape-info" },
  },
  {
    id: "boolean-filtering",
    category: "Pandas Fundamentals",
    title: "Boolean Indexing: Filtering Rows with Conditions",
    concept: "Boolean indexing is Pandas' primary filtering mechanism. You create a Boolean mask (a Series of True/False values aligned with the DataFrame's index), then pass it to df[mask] or df.loc[mask]. Each row where the mask is True is kept; False rows are dropped. Multiple conditions combine with & (AND), | (OR), and ~ (NOT) — each must be wrapped in parentheses.",
    why: "Filtering is the most common data operation in analytics. 'Show me all orders from the East region with revenue > $500' is a Boolean mask: (df['region'] == 'East') & (df['revenue'] > 500). Without understanding Boolean indexing, you can't answer any real analytical question.",
    when: "Use Boolean indexing whenever you need a subset of rows based on column values. For categorical filters (region == 'East'), use == or .isin(). For numeric filters (revenue > 100), use >, <, >=, <=. For string filters, use .str.contains(). For null checks, use .isna() or .notna().",
    how: "1. Create a condition: mask = df['region'] == 'East'. 2. Apply it: filtered = df[mask] or df.loc[mask]. 3. Combine conditions: mask = (df['region'] == 'East') & (df['revenue'] > 100). 4. Use .isin() for multiple values: df[df['region'].isin(['East', 'West'])]. 5. Negate: df[~mask] returns rows that DON'T match.",
    example: "A retail analyst wants high-value orders in the East region: df[(df['region'] == 'East') & (df['revenue'] > 500)]. This returns only rows where BOTH conditions are True. If you used | instead of &, you'd get rows from East OR rows with revenue > 500 — a much larger set.",
    code: `# Single condition
east_orders = df[df["region"] == "East"]

# Multiple conditions (AND)
high_value_east = df[(df["region"] == "East") & (df["revenue"] > 500)]

# OR condition
east_or_west = df[(df["region"] == "East") | (df["region"] == "West")]

# Membership filter
selected_regions = df[df["region"].isin(["East", "West", "Central"])]

# Null filter
missing_customers = df[df["customer_id"].isna()]`,
    interpretation: "The result is a new DataFrame containing only the matching rows. Check len(result) to verify the count. If the result is empty (0 rows), your condition may be too strict or the column values may have unexpected casing or whitespace.",
    mistakes: [
      "Forgetting parentheses: df[df['region'] == 'East' & df['revenue'] > 500] — & has higher precedence than ==, causing a SyntaxError or wrong result.",
      "Using 'and'/'or' instead of '&'/'|' — Python's 'and'/'or' don't work element-wise on Series.",
      "Not checking the result count — an empty DataFrame means no matches, which may indicate a data issue.",
    ],
    takeaway: "Boolean indexing: create a mask with ==, >, <, .isin(), .isna(), combine with & (AND), | (OR), ~ (NOT), always wrap each condition in parentheses.",
    demo: { kind: "value-counts", defaultCol: "region" },
  },
  {
    id: "sorting-ranking",
    category: "Pandas Fundamentals",
    title: "Sorting and Ranking",
    concept: "sort_values() reorders rows by one or more column values. sort_index() reorders by the index labels. rank() assigns a rank to each value in a column — ties are handled by method: 'average' (default), 'min', 'max', 'first', 'dense'. Ranking within groups requires groupby + rank.",
    why: "Sorting reveals the top/bottom performers, detects outliers, and prepares data for percentile calculations. Ranking enables 'top 10 customers by revenue' without changing row order. Without sorting, summary tables appear random and trends are invisible.",
    when: "Sort before displaying results, before computing cumulative sums, and before head/tail to find extremes. Rank when you need a relative position ('3rd highest revenue') rather than an absolute value ($1,234).",
    how: "1. df.sort_values('revenue', ascending=False) — descending sort. 2. df.sort_values(['region', 'revenue'], ascending=[True, False]) — sort by region ascending, then revenue descending. 3. df['rank'] = df['revenue'].rank(method='average') — average rank for ties. 4. df.groupby('region')['revenue'].rank(method='dense') — rank within each region.",
    example: "To find the top 5 products by revenue: df.nlargest(5, 'revenue'). To rank products within their category: df['category_rank'] = df.groupby('category')['revenue'].rank(method='dense', ascending=False). The product with category_rank 1 is the top seller in its category.",
    code: `# Sort by single column
df_sorted = df.sort_values("revenue", ascending=False)

# Sort by multiple columns
df_sorted = df.sort_values(["region", "revenue"], ascending=[True, False])

# Top 5 by revenue
top5 = df.nlargest(5, "revenue")

# Rank within groups
df["rank_in_region"] = df.groupby("region")["revenue"].rank(method="dense", ascending=False)`,
    interpretation: "sort_values changes row order — inspect the result with head() to verify. rank() doesn't change order — it adds a new column with the rank. method='dense' means no gaps (1, 2, 2, 3), while 'average' means tied values share the average rank (1, 2.5, 2.5, 4).",
    mistakes: [
      "Forgetting ascending=False for 'top N' — default is ascending (smallest first).",
      "Using sort_values + head instead of nlargest — nlargest is faster and clearer.",
      "Confusing rank methods — 'average' is default but 'dense' is often more intuitive.",
    ],
    takeaway: "sort_values for ordering, rank for relative position, nlargest/nsmallest for top/bottom N. Within groups: groupby + rank.",
    demo: { kind: "describe-stats", defaultCol: "revenue" },
  },
  // ─── DATA EXPLORATION ────────────────────────────────────────────
  {
    id: "shape-dimensions",
    category: "Data Exploration",
    title: "Dataset Shape and Dimensions",
    concept: "df.shape returns a tuple (n_rows, n_columns). The first element is the number of observations (rows); the second is the number of features (columns). len(df) returns the row count. df.columns gives the column names. Together, these answer: 'How big is this dataset, and what does it contain?'",
    why: "Shape is the first thing to check after loading data. If you expect 10,000 rows and get 1, your CSV parsing is wrong. If you expect 50 columns and get 3, the delimiter is wrong. Shape also tells you the granularity (order-level vs customer-level) and whether you need aggregation before modelling.",
    when: "Always check shape immediately after loading: df = pd.read_csv(...); print(df.shape). Also check after merges (did the join multiply rows?), after dropna (how many rows did we lose?), and after groupby (how many groups?).",
    how: "df.shape → (240, 10). df.shape[0] = 240 (rows). df.shape[1] = 10 (columns). len(df) = 240. df.columns.tolist() = ['order_id', 'order_date', ...]. df.ndim = 2 (always 2 for DataFrames).",
    example: "After merging orders (240 rows) with customers (80 rows) on customer_id, if shape is (240, 15) — good, no multiplication. If shape is (320, 15) — some customers had multiple matches, indicating a one-to-many join you didn't expect.",
    code: `print(df.shape)          # (240, 10)
print(df.shape[0])       # 240 (row count)
print(len(df))           # 240 (same as shape[0])
print(df.columns.tolist())  # list of column names
print(df.ndim)           # 2 (always 2 for DataFrames)`,
    interpretation: "(240, 10) means 240 observations with 10 attributes. If you see (0, 10), the DataFrame is empty — check your data source. If columns include unexpected names, your CSV header parsing may be wrong.",
    mistakes: [
      "Confusing rows and columns — shape is always (rows, columns).",
      "Not checking shape after a merge — a many-to-many join can silently multiply rows.",
      "Assuming len(df) == len(df.columns) — they measure different things.",
    ],
    takeaway: "df.shape = (rows, columns). Check it after every load, merge, filter, and dropna to catch data issues early.",
    demo: { kind: "shape-info" },
  },
  {
    id: "dtypes-type-system",
    category: "Data Exploration",
    title: "Data Types (dtypes) and Type Conversion",
    concept: "Pandas dtypes determine what operations are valid on each column: int64 (integers), float64 (decimals), bool (True/False), object (typically strings), datetime64[ns] (dates), category (categorical). The dtype affects memory usage, computation speed, and which methods are available. astype() converts between types; pd.to_datetime() parses date strings; pd.to_numeric() parses numbers with error handling.",
    why: "Wrong dtypes cause silent bugs: numbers stored as 'object' (strings) can't be summed; dates stored as 'object' can't be resampled; categories stored as 'object' waste memory. A column with revenue values like '124.50' (string) instead of 124.50 (float) will fail arithmetic operations silently — '124.50' + '124.50' = '124.50124.50' (string concatenation, not addition).",
    when: "Check dtypes immediately after loading data (df.dtypes). Convert when: dates are strings (pd.to_datetime), numbers are strings (astype('float64')), low-cardinality strings waste memory (astype('category')). Always verify dtypes after type conversion — astype can silently produce NaN for unconvertible values.",
    how: "1. df.dtypes → series of column:dtype pairs. 2. df.astype('int64') → convert column. 3. pd.to_datetime(df['date'], errors='coerce') → parse dates, invalid → NaT. 4. pd.to_numeric(df['col'], errors='coerce') → parse numbers, invalid → NaN. 5. df.select_dtypes(include='number') → select all numeric columns.",
    example: "A CSV has order_date as '2023-04-17' (string). After pd.to_datetime(), you can use .dt.month, .dt.day_name(), resample('ME'). Revenue stored as '124.50' (string) → astype('float64') → 124.50 (number, can be summed).",
    code: `# Check dtypes
print(df.dtypes)

# Convert string to datetime
df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")

# Convert string to number
df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce")

# Convert to category (saves memory for low-cardinality columns)
df["region"] = df["region"].astype("category")

# Select numeric columns only
numeric_df = df.select_dtypes(include="number")`,
    interpretation: "dtypes output shows each column's type. 'object' usually means strings — investigate whether they should be dates, numbers, or categories. After conversion, check for NaN/NaT values that indicate parse failures.",
    mistakes: [
      "Leaving dates as strings — breaks all time-series operations (.dt, resample, rolling).",
      "Using astype('int64') on a column with NaN — int64 can't represent NaN; use 'float64' or Int64 (nullable).",
      "Not checking for NaN after to_datetime/to_numeric with errors='coerce' — invalid values become NaN silently.",
    ],
    takeaway: "Check dtypes after loading. Convert strings to dates/numbers/categories. errors='coerce' silently nulls invalid values — always check the null count after.",
    demo: { kind: "dtypes" },
  },
  // ─── DATA CLEANING ──────────────────────────────────────────────
  {
    id: "missing-values",
    category: "Data Cleaning",
    title: "Missing Values: Detection, Analysis, and Handling",
    concept: "Missing values (NaN, None, NaT) represent absent data. df.isna() returns a Boolean mask of where values are missing. .sum() counts them per column. Handling strategies: drop (dropna), impute (fillna with mean/median/mode/constant), or add an indicator column (df['col_is_missing'] = df['col'].isna()). Each strategy has trade-offs: dropping loses data, imputation biases distributions, indicators preserve the signal but add complexity.",
    why: "Missing values can cause: silent errors in arithmetic (NaN + x = NaN), biased statistics (mean ignores NaN but understates the total), and broken ML models (most algorithms can't handle NaN). The choice of handling strategy depends on WHY values are missing: MCAR (missing completely at random — safe to drop), MAR (missing at random — impute by group), MNAR (missing not at random — investigate, don't impute blindly).",
    when: "Always check for missing values after loading data. Drop when <5% of rows are affected and missingness is random. Impute when the column is important and missingness is informative. Add an indicator when the fact of missingness itself is a signal (e.g., missing 'phone_number' may indicate a digital-only customer). Never impute before splitting train/test — fit the imputer on train only to prevent leakage.",
    how: "1. Detect: df.isna().sum() → count per column. 2. Percentage: df.isna().mean() * 100. 3. Drop: df.dropna(subset=['col']) or df.dropna(). 4. Impute: df.fillna({'revenue': df['revenue'].median()}). 5. Group impute: df.groupby('category')['revenue'].transform(lambda s: s.fillna(s.median())). 6. Indicator: df['revenue_missing'] = df['revenue'].isna().",
    example: "A customer dataset has 5% missing customer_id. Dropping those rows loses revenue data. Instead, fill with 'UNKNOWN' and add a flag column: df['customer_id'] = df['customer_id'].fillna('UNKNOWN'); df['is_customer_missing'] = df['customer_id'].eq('UNKNOWN'). This preserves all rows and the signal that customer attribution was missing.",
    code: `# Count missing values per column
print(df.isna().sum())

# Percentage missing
print(df.isna().mean() * 100)

# Drop rows with any missing value
df_clean = df.dropna()

# Drop rows missing a specific column
df_clean = df.dropna(subset=["customer_id"])

# Fill with a constant
df["customer_id"] = df["customer_id"].fillna("UNKNOWN")

# Fill with median (numeric columns)
df["revenue"] = df["revenue"].fillna(df["revenue"].median())

# Group-based imputation
df["revenue"] = df.groupby("category")["revenue"].transform(
    lambda s: s.fillna(s.median())
)

# Missing-value indicator
df["revenue_is_missing"] = df["revenue"].isna()`,
    interpretation: "isna().sum() shows how many values are missing per column. If customer_id has 12 missing values out of 240, that's 5% — consider whether dropping 5% of rows biases the analysis. After fillna, verify that isna().sum() returns 0 for the filled columns.",
    mistakes: [
      "Imputing with the global mean when group-specific medians are more accurate.",
      "Imputing before train/test split — leakage! Fit the imputer on train only.",
      "Dropping all rows with any NaN without checking the percentage — may lose most of the data.",
      "Assuming NaN means 'zero' — it means 'unknown', which is different.",
    ],
    takeaway: "Missing values require a deliberate strategy: drop (if <5% and random), impute (if important and informative), or flag (if missingness is a signal). Never impute before splitting.",
    demo: { kind: "missing-values" },
  },
  {
    id: "duplicates",
    category: "Data Cleaning",
    title: "Duplicate Records: Detection and Removal",
    concept: "duplicated() returns a Boolean mask marking rows that are duplicates of earlier rows. drop_duplicates() removes them. By default, 'keep=first' keeps the first occurrence and drops subsequent duplicates. Use subset= to check duplicates by specific columns (e.g., order_id). A full-row duplicate means every column value matches; a key-level duplicate means only the key column matches (which may be legitimate).",
    why: "Duplicates cause double-counting: revenue sums are inflated, averages are skewed, model training is biased. But not all duplicates are errors: a customer placing two orders on the same day is a legitimate repeat, not a duplicate. The distinction is whether the entire row is duplicated (sync error) vs. only the business key (possibly legitimate).",
    when: "Check for duplicates after loading data, after joins (many-to-many joins can silently multiply rows), and after concatenation. Drop full-row duplicates unconditionally — they're always errors. Investigate key-level duplicates before dropping — they may be legitimate business events.",
    how: "1. Count: df.duplicated().sum(). 2. Inspect: df[df.duplicated(keep=False)] shows ALL copies. 3. Drop full-row: df.drop_duplicates(). 4. Drop by key: df.drop_duplicates(subset=['order_id']). 5. Keep last: df.drop_duplicates(keep='last'). 6. Validate: after drop, check len(df) decreased by the expected amount.",
    example: "A retail dataset has 4 full-row duplicates (identical order_id, date, product, revenue). These are sync errors — drop_duplicates() removes them. But 2 rows share order_id but have different revenue values — these might be order updates, not duplicates. Investigate before dropping.",
    code: `# Count full-row duplicates
print(df.duplicated().sum())

# Count key-level duplicates
print(df.duplicated(subset=["order_id"]).sum())

# Inspect all copies of duplicates
df[df.duplicated(subset=["order_id"], keep=False)]

# Drop full-row duplicates (keep first)
df = df.drop_duplicates()

# Drop by order_id (keep first)
df = df.drop_duplicates(subset=["order_id"], keep="first")

# Verify
print(f"Before: {len_before}, After: {len(df)}, Dropped: {len_before - len(df)}")`,
    interpretation: "duplicated().sum() tells you how many rows are duplicates of earlier rows. If 4 rows are flagged, dropping them reduces the dataset from 244 to 240. df[df.duplicated(keep=False)] shows ALL copies (both the original and the duplicate) — useful for investigating whether they're true errors.",
    mistakes: [
      "Dropping by order_id without inspecting first — might remove legitimate order updates.",
      "Forgetting that drop_duplicates returns a new DataFrame — assign it back: df = df.drop_duplicates().",
      "Assuming duplicated() marks the first occurrence — it marks subsequent copies, not the original.",
    ],
    takeaway: "Always inspect duplicates before dropping. Full-row duplicates = sync errors (drop). Key-level duplicates = investigate (may be legitimate repeats).",
    demo: { kind: "duplicates" },
  },
  // ─── STATISTICS ────────────────────────────────────────────────
  {
    id: "mean-vs-median",
    category: "Statistics",
    title: "Mean vs Median: Why Outliers Matter",
    concept: "The mean (average) is the sum of values divided by the count. The median is the middle value when sorted. The mean is sensitive to outliers — a single extreme value pulls it toward the tail. The median is robust — it depends only on the middle value's position, not its magnitude. For symmetric distributions, mean ≈ median. For skewed distributions, mean > median (right-skewed) or mean < median (left-skewed).",
    why: "Reporting the mean for a skewed distribution is misleading. If 99 people earn $50k and one person earns $10M, the mean salary is ~$150k — but no one actually earns that. The median ($50k) better represents the 'typical' person. In retail, revenue is often right-skewed (a few large orders dominate), so median revenue per order is more representative than mean.",
    when: "Use median for: income, revenue, prices, house values (all typically right-skewed). Use mean for: symmetric distributions (height, temperature), when the total matters (total revenue = mean × count), and when the model assumes normality. Report BOTH for skewed data — the gap between them reveals the skew.",
    how: "1. df['revenue'].mean() → sum / count. 2. df['revenue'].median() → middle value (50th percentile). 3. df['revenue'].quantile(0.5) → same as median. 4. Compare: if mean >> median, the distribution is right-skewed. 5. Skewness: df['revenue'].skew() — values >1 indicate significant right skew.",
    example: "Retail revenue: mean = $186, median = $150. The mean exceeds the median by 24%, indicating right-skew (a few large orders pull the mean up). Report median + IQR for central tendency and spread, not mean + std.",
    code: `mean_rev = df["revenue"].mean()
median_rev = df["revenue"].median()

print(f"Mean:   \${mean_rev:.2f}")
print(f"Median: \${median_rev:.2f}")
print(f"Difference: {((mean_rev - median_rev) / median_rev * 100):.1f}%")

# Skewness
print(f"Skewness: {df['revenue'].skew():.3f}")

# For skewed data, report median + IQR
q1 = df["revenue"].quantile(0.25)
q3 = df["revenue"].quantile(0.75)
print(f"IQR: \${q3 - q1:.2f} (Q1=\${q1:.2f}, Q3=\${q3:.2f})")`,
    interpretation: "If mean ≈ median, the distribution is roughly symmetric — either statistic works. If mean > median (right-skewed), report the median as the 'typical' value and note the skew. If mean < median (left-skewed), a few small values drag the mean down — investigate whether they're errors.",
    mistakes: [
      "Defaulting to mean for everything — it's misleading for skewed data.",
      "Using mean + std for skewed data — both are outlier-sensitive. Use median + IQR instead.",
      "Assuming mean > median always means 'outlier' — it means 'right-skewed', which could be the natural shape of the data.",
    ],
    takeaway: "Mean is sensitive to outliers; median is robust. For skewed data (revenue, income, prices), report median + IQR. The gap between mean and median reveals the skew direction.",
    labLink: "stat-lab",
    demo: { kind: "describe-stats", defaultCol: "revenue" },
  },
  {
    id: "std-variance",
    category: "Statistics",
    title: "Variance and Standard Deviation",
    concept: "Variance measures the average squared deviation from the mean: σ² = Σ(xᵢ - x̄)² / (n-1) for sample variance (Pandas default, ddof=1). Standard deviation is the square root of variance: σ = √σ². Std is in the same units as the data, making it interpretable: 'revenue has a mean of $186 with a std of $120' means most orders fall within $66-$306.",
    why: "Variance/std tell you how spread out the data is. Two datasets with the same mean can have very different spreads: [48, 50, 52] has std=2, while [0, 50, 100] has std=50. Without spread, the mean is misleading. Std is used in Z-scores (standardization), outlier detection (3σ rule), and confidence intervals.",
    when: "Use std for symmetric distributions (normal-ish). Avoid std for heavily skewed data — it's pulled by the tail. Use IQR for skewed data instead. Pandas .std() uses sample std (ddof=1, denominator n-1) by default — matches most statistical tests. Use ddof=0 for population std (when your data IS the entire population).",
    how: "1. df['revenue'].var() → sample variance (n-1 denominator). 2. df['revenue'].std() → sample standard deviation. 3. df['revenue'].var(ddof=0) → population variance (n denominator). 4. Z-score: (df['revenue'] - df['revenue'].mean()) / df['revenue'].std(). 5. Empirical rule: ~68% of data falls within ±1 std of the mean (for normal distributions).",
    example: "Revenue has mean=$186, std=$120. A Z-score of +1.5 means an order with revenue = $186 + 1.5×$120 = $366. That's 1.5 standard deviations above the mean — high but not an outlier by the 3σ rule.",
    code: `mean = df["revenue"].mean()
std = df["revenue"].std()
var = df["revenue"].var()

print(f"Mean: {mean:.2f}")
print(f"Std:  {std:.2f}")
print(f"Var:  {var:.2f}")

# Z-scores (standardization)
df["revenue_z"] = (df["revenue"] - mean) / std

# 3-sigma outlier rule
outliers = df[abs(df["revenue_z"]) > 3]
print(f"Outliers (|z| > 3): {len(outliers)}")`,
    interpretation: "Std of $120 on a mean of $186 means the coefficient of variation (CV = std/mean) is 0.64 — relatively high variability. For comparison, employee salaries might have CV=0.15 (low variability). Z-scores tell you how many std deviations each value is from the mean — |z| > 3 is a common outlier threshold.",
    mistakes: [
      "Confusing sample std (ddof=1) with population std (ddof=0) — Pandas defaults to sample, NumPy defaults to population.",
      "Using std for heavily skewed data — both mean and std are pulled by the tail. Use median + IQR instead.",
      "Applying the 3σ rule to non-normal data — the empirical rule only holds for normal distributions.",
    ],
    takeaway: "Variance = average squared deviation. Std = √variance (same units as data). Use for symmetric data; use IQR for skewed data. Pandas defaults to sample std (ddof=1).",
    labLink: "stat-lab",
    demo: { kind: "describe-stats", defaultCol: "revenue" },
  },
  {
    id: "quantiles-iqr",
    category: "Statistics",
    title: "Quantiles, Quartiles, and the IQR",
    concept: "Quantiles divide sorted data into equal-sized pieces. The 0.25 quantile (Q1) is the value below which 25% of data falls. The 0.5 quantile (Q2) is the median. The 0.75 quantile (Q3) is the value below which 75% falls. The interquartile range (IQR) = Q3 - Q1, measuring the middle 50% of the data. IQR is robust to outliers because it depends on position, not magnitude.",
    why: "IQR is the robust alternative to std for measuring spread. Unlike std (which is pulled by extreme values), IQR only depends on the values at the 25th and 75th percentiles. Tukey's outlier fence uses IQR: values below Q1 - 1.5×IQR or above Q3 + 1.5×IQR are flagged as outliers. This is the standard outlier detection method in box plots.",
    when: "Use IQR for skewed data where std is misleading. Use quantiles for percentile reporting ('the 90th percentile salary is $X'). Use the Tukey fence for outlier detection — it's more robust than the 3σ rule for non-normal data. Pandas uses linear interpolation by default (matches numpy.percentile).",
    how: "1. df['revenue'].quantile(0.25) → Q1. 2. df['revenue'].quantile(0.5) → median. 3. df['revenue'].quantile(0.75) → Q3. 4. IQR = Q3 - Q1. 5. Lower fence = Q1 - 1.5×IQR. 6. Upper fence = Q3 + 1.5×IQR. 7. Outliers = df[(df['revenue'] < lower) | (df['revenue'] > upper)].",
    example: "Revenue: Q1=$80, Q3=$240, IQR=$160. Lower fence = $80 - 1.5×$160 = -$160 (no outliers below — can't have negative revenue). Upper fence = $240 + 1.5×$160 = $480. Orders above $480 are flagged as outliers — investigate whether they're bulk orders or data errors.",
    code: `q1 = df["revenue"].quantile(0.25)
q3 = df["revenue"].quantile(0.75)
iqr = q3 - q1

lower_fence = q1 - 1.5 * iqr
upper_fence = q3 + 1.5 * iqr

print(f"Q1: \${q1:.2f}")
print(f"Q3: \${q3:.2f}")
print(f"IQR: \${iqr:.2f}")
print(f"Outlier range: [{lower_fence:.2f}, {upper_fence:.2f}]")

# Tukey outliers
outliers = df[(df["revenue"] < lower_fence) | (df["revenue"] > upper_fence)]
print(f"Outliers: {len(outliers)} of {len(df)}")`,
    interpretation: "IQR of $160 means the middle 50% of orders span $80-$240. The upper fence at $480 flags orders above that as potential outliers. But 'outlier' doesn't mean 'error' — bulk orders may legitimately exceed $480. Investigate each outlier before deciding to drop, cap, or keep.",
    mistakes: [
      "Computing Q3 - Q1 in the wrong order (gets a negative IQR).",
      "Assuming outliers are errors — they may be legitimate extreme values.",
      "Using the 3σ rule instead of IQR for skewed data — the 3σ rule assumes normality.",
    ],
    takeaway: "Quantiles divide sorted data into equal pieces. IQR = Q3 - Q1 is a robust spread measure. Tukey's 1.5×IQR fence is the standard outlier detection method for non-normal data.",
    labLink: "stat-lab",
    demo: { kind: "describe-stats", defaultCol: "revenue" },
  },
  // ─── CORRELATION ────────────────────────────────────────────────
  {
    id: "pearson-correlation",
    category: "Correlation",
    title: "Pearson Correlation: Linear Association",
    concept: "Pearson correlation (r) measures the strength and direction of LINEAR association between two numeric variables. r ∈ [-1, +1]: +1 = perfect positive linear, -1 = perfect negative linear, 0 = no linear association. r is computed as cov(X,Y) / (std(X) × std(Y)), where covariance measures how the variables move together. Pearson is sensitive to outliers and only captures linear relationships — a strong nonlinear pattern can have r ≈ 0.",
    why: "Pearson answers: 'When X goes up, does Y tend to go up (r > 0), down (r < 0), or stay the same (r ≈ 0)?' It's the first step in understanding bivariate relationships. But r = 0 does NOT mean 'no relationship' — it means 'no LINEAR relationship'. A parabola (y = x²) has r ≈ 0 for symmetric x, despite a perfect deterministic relationship. Always plot the scatter before trusting r.",
    when: "Use Pearson when you suspect a linear relationship and the data is approximately normal without extreme outliers. Avoid Pearson for: heavily skewed data (use Spearman instead), categorical variables (use chi-square or Cramér's V), and nonlinear relationships (plot the scatter first). Never claim causation from correlation — a confounder may drive both variables.",
    how: "1. df['x'].corr(df['y']) → Pearson r (default method='pearson'). 2. df.corr() → full correlation matrix (numeric columns only). 3. r = cov(x,y) / (std(x) × std(y)). 4. Interpret: |r| < 0.3 weak, 0.3-0.5 moderate, 0.5-0.7 strong, > 0.7 very strong. 5. r² = proportion of variance explained (for linear regression).",
    example: "Advertising spend vs revenue: r = 0.78 (strong positive). This suggests that weeks with higher advertising tend to have higher revenue. But r = 0.78 ≠ 'advertising causes 78% of revenue'. A confounder (holiday_week) drives both up simultaneously — the true causal effect requires stratification or experimentation.",
    code: `# Pairwise Pearson correlation
r = df["advertising_spend"].corr(df["revenue"])
print(f"Pearson r = {r:.3f}")

# Full correlation matrix
corr_matrix = df[["advertising_spend", "revenue", "profit", "quantity"]].corr()
print(corr_matrix)

# Correlation heatmap
import seaborn as sns
sns.heatmap(corr_matrix, annot=True, cmap="coolwarm", center=0)`,
    interpretation: "r = 0.78 means strong positive linear association: weeks with higher ad spend tend to have higher revenue. But: (1) this is association, not causation; (2) a single outlier can inflate or deflate r dramatically; (3) if the relationship is nonlinear (e.g., diminishing returns), r understates the true association. Always verify with a scatter plot.",
    mistakes: [
      "Interpreting r = 0 as 'no relationship' — it means 'no LINEAR relationship'. The relationship could be nonlinear.",
      "Claiming causation from correlation — a confounder (third variable) may drive both.",
      "Not checking for outliers — a single extreme point can flip the sign of r.",
    ],
    takeaway: "Pearson r measures LINEAR association in [-1, 1]. Always plot the scatter before trusting r. r = 0 means no linear relationship, not no relationship. Correlation ≠ causation.",
    labLink: "stat-lab",
    demo: { kind: "scatter-corr", defaultX: "quantity", defaultY: "revenue" },
  },
  {
    id: "spearman-correlation",
    category: "Correlation",
    title: "Spearman Rank Correlation: Monotonic Association",
    concept: "Spearman ρ measures the strength and direction of MONOTONIC association — whether both variables tend to increase together (or one increases while the other decreases), even if the relationship is nonlinear. It's computed by applying Pearson correlation to the RANKS of the values, not the values themselves. This makes it robust to outliers (ranks cap their effect) and sensitive to any monotonic pattern (linear, exponential, logarithmic).",
    why: "Pearson misses nonlinear monotonic relationships. For y = x³ (a perfect monotonic relationship), Pearson r might be 0.95 (not 1.0) because the cubic curve isn't perfectly linear. Spearman ρ = 1.0 because the ranks are perfectly ordered. For y = x² with x centered at 0, Pearson r ≈ 0 (the parabola cancels out), but Spearman ρ depends on the sample's symmetry — it may also be near 0 for a symmetric sample because the ranks aren't monotonic.",
    when: "Use Spearman when: the data is skewed or ordinal, the relationship is monotonic but nonlinear, or outliers are present. Use Pearson when: the relationship is expected to be linear and the data is approximately normal. Report BOTH when the relationship shape is unclear — a large gap between them signals nonlinearity.",
    how: "1. df['x'].corr(df['y'], method='spearman') → Spearman ρ. 2. Internally: rank both x and y, then compute Pearson on the ranks. 3. Ties get average ranks (method='average' default). 4. Interpret: same scale as Pearson ([-1, 1]). 5. If Pearson ≈ Spearman, the relationship is approximately linear. If Pearson << Spearman, the relationship is nonlinear but monotonic.",
    example: "For y = x² with x ∈ [1, 2, 3, 4, 5]: Pearson r = 0.97 (high because the parabola is approximately linear over positive x). Spearman ρ = 1.0 (perfect monotonic — both x and x² are increasing). But for x ∈ [-2, -1, 0, 1, 2]: Pearson r ≈ 0 (symmetric parabola cancels), Spearman ρ ≈ 0 (ranks aren't monotonic — x goes -2,-1,0,1,2 but x² goes 4,1,0,1,4).",
    code: `# Pearson (linear)
pearson_r = df["advertising_spend"].corr(df["revenue"])

# Spearman (monotonic)
spearman_rho = df["advertising_spend"].corr(df["revenue"], method="spearman")

print(f"Pearson r:   {pearson_r:.3f}")
print(f"Spearman ρ: {spearman_rho:.3f}")

# If Pearson << Spearman, relationship is nonlinear but monotonic
gap = abs(pearson_r - spearman_rho)
if gap > 0.2:
    print("Large gap → nonlinear relationship. Use Spearman.")`,
    interpretation: "If Pearson r = 0.78 and Spearman ρ = 0.92, the gap signals nonlinearity — the relationship is monotonic but not linear. A monotonic transformation (e.g., log) might linearize it. If both are ≈ 0, there's no monotonic pattern — the relationship is either absent or non-monotonic (like a parabola).",
    mistakes: [
      "Assuming Spearman is always better — for truly linear data, Pearson has more statistical power.",
      "Interpreting Spearman ρ ≈ 0 as 'no relationship' — it means 'no monotonic relationship'. A parabola (non-monotonic) can have ρ ≈ 0.",
      "Forgetting that Spearman is based on ranks — ties get average ranks, which affects the result.",
    ],
    takeaway: "Spearman measures MONOTONIC association (any direction, not just linear). Robust to outliers. If Pearson << Spearman, the relationship is nonlinear but monotonic. If both ≈ 0, the relationship is non-monotonic or absent.",
    labLink: "stat-lab",
    demo: { kind: "scatter-corr", defaultX: "quantity", defaultY: "revenue" },
  },
  {
    id: "parabolic-relationship",
    category: "Correlation",
    title: "Parabolic Relationship (y = x²): Nonlinear Dependence",
    concept: "When y = x² and x is symmetric around zero, Pearson correlation ≈ 0 despite a perfect deterministic relationship. This happens because the positive and negative x values produce the same y, canceling the linear association. Spearman ρ is also ≈ 0 because the ranks aren't monotonic (x increases but y first decreases, then increases). This demonstrates that r = 0 does NOT mean 'no relationship' — it means 'no LINEAR (or monotonic) relationship'.",
    why: "This is the canonical example of why you must plot data before trusting correlation coefficients. A student who computes r = 0 and concludes 'advertising has no effect on revenue' would be wrong if the true relationship is U-shaped (low and high spend both produce high revenue, with a dip in the middle). Always scatter-plot before interpreting any correlation number.",
    when: "Whenever you compute a correlation near zero, check for nonlinear patterns. Parabolic (U-shaped), threshold (step function), and interaction (effect depends on another variable) relationships all produce r ≈ 0. If the business question is 'does X affect Y?', a scatter plot answers more honestly than a single r value.",
    how: "1. Generate x = [-2.5, -2, ..., 2, 2.5] (symmetric around 0). 2. y = x². 3. Pearson(x, y) ≈ 0 (positive and negative x cancel). 4. Spearman(x, y) ≈ 0 (ranks aren't monotonic). 5. The scatter shows a clear parabola — the relationship is perfect but non-monotonic. 6. Fix: add a polynomial feature x² to capture the curvature in a linear model.",
    example: "Marketing spend vs brand awareness: low spend → low awareness, moderate spend → high awareness, high spend → diminishing returns (saturation). The scatter looks like an inverted U. Pearson r ≈ 0, but the relationship is real. A polynomial feature (spend²) captures the diminishing returns.",
    code: `import numpy as np

x = np.array([-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5])
y = x ** 2  # Perfect parabolic relationship

# Pearson and Spearman
from scipy.stats import spearmanr
pearson_r = np.corrcoef(x, y)[0, 1]     # ≈ 0
spearman_rho, _ = spearmanr(x, y)      # also ≈ 0 (ranks aren't monotonic)

print(f"Pearson r:   {pearson_r:.3f}")   # ≈ 0.000
print(f"Spearman ρ: {spearman_rho:.3f}") # ≈ 0.000

# But the scatter shows a perfect parabola!
# Fix: add x² as a feature
df["x_squared"] = df["x"] ** 2
# Now a linear model can fit: y = β₁x + β₂x²`,
    interpretation: "Pearson r ≈ 0 for a symmetric parabola because the linear fit is flat — the positive and negative x values produce the same y, canceling the slope. This does NOT mean x and y are independent — they're deterministically related. The scatter plot reveals the true pattern. Adding x² as a feature lets a linear model capture the curvature.",
    mistakes: [
      "Concluding 'no relationship' from r ≈ 0 — the relationship is nonlinear, not absent.",
      "Not plotting the scatter before computing correlation — a single number can't reveal shape.",
      "Forgetting that Spearman also ≈ 0 for non-monotonic relationships — it's not a universal fix.",
    ],
    takeaway: "r = 0 means 'no linear relationship', not 'no relationship'. A perfect parabola can have r ≈ 0. Always plot the scatter. Add polynomial features (x², x³) to capture nonlinear patterns in linear models.",
    demo: { kind: "parabolic" },
  },
  {
    id: "outlier-distortion",
    category: "Correlation",
    title: "Outlier Distortion of Pearson Correlation",
    concept: "A single extreme outlier can dramatically change Pearson r — inflating, deflating, or even reversing its sign. This happens because Pearson uses the mean and std, both of which are pulled by extreme values. Spearman is more robust because it uses ranks, which cap the outlier's influence. The outlier's effect depends on its position: an outlier in the direction of the main cluster INCREASES r; an outlier perpendicular to the cluster DECREASES r.",
    why: "This demonstrates why Pearson is called 'non-robust' — a single data point can flip the sign of r. In practice, datasets often contain outliers (data-entry errors, extreme events, bulk orders). If you compute r without checking for outliers, you might report r = 0.85 when the true r (without the outlier) is 0.05. Always: (1) plot the scatter, (2) check for outliers, (3) compute r with and without suspected outliers.",
    when: "Whenever you compute Pearson r, check for outliers first. If the scatter shows a clear main cluster plus one or two extreme points, compute r with and without them. Report both values. Don't automatically drop outliers — they may be legitimate extreme events. If the outlier is a data error (e.g., revenue = $4.2M in a $50-average dataset), drop it. If it's legitimate (a bulk order), keep it and use robust statistics (Spearman, trimmed mean).",
    how: "1. Plot the scatter (always first). 2. Identify outliers visually or with Tukey's fence. 3. Compute r_full = Pearson(all data). 4. Compute r_clean = Pearson(without outlier). 5. If |r_full - r_clean| > 0.1, the outlier significantly distorts r. 6. Report both. 7. Use Spearman as a robustness check — it's less affected by the outlier's magnitude.",
    example: "30 clean points with r = 0.95 (strong positive linear) plus one outlier at (100, 5) → r drops to 0.35. The outlier is perpendicular to the cluster, pulling the regression line flat. Removing the outlier restores r = 0.95. But if the outlier were at (100, 200), it would INFLATE r to 0.99 — the outlier extends the linear pattern.",
    code: `import numpy as np

# 30 clean points: y ≈ x + noise
x = np.arange(30)
y = x + np.random.normal(0, 2, 30)

# Add one extreme outlier
x_with = np.append(x, 100)
y_with = np.append(y, 5)  # Perpendicular outlier

# Pearson with and without outlier
r_full = np.corrcoef(x_with, y_with)[0, 1]   # ≈ 0.35
r_clean = np.corrcoef(x, y)[0, 1]              # ≈ 0.95

print(f"r with outlier:    {r_full:.3f}")   # ≈ 0.35
print(f"r without outlier:  {r_clean:.3f}") # ≈ 0.95
print(f"Distortion: {abs(r_full - r_clean):.3f}")

# Spearman (robust)
from scipy.stats import spearmanr
rho, _ = spearmanr(x_with, y_with)  # Less affected by outlier`,
    interpretation: "If r drops from 0.95 to 0.35 with one outlier, the outlier is 'perpendicular' — it's far from the main cluster's direction. If r INCREASES with the outlier, the outlier 'extends' the linear pattern. Either way, report both values and explain the outlier's effect. Don't drop without investigating — the outlier might be a legitimate extreme event.",
    mistakes: [
      "Automatically dropping outliers without investigating — they may be legitimate.",
      "Reporting only r_full without mentioning the outlier's effect.",
      "Assuming outliers always decrease r — they can also inflate it, depending on position.",
      "Using Spearman as a 'fix' without understanding that it measures a different thing (monotonic, not linear).",
    ],
    takeaway: "A single outlier can flip Pearson r. Always: scatter plot first, compute r with and without outliers, report both. Spearman is more robust but measures monotonic (not linear) association. Don't drop outliers without investigating their legitimacy.",
    demo: { kind: "outlier-distortion" },
  },
  // ─── FEATURE ENGINEERING ────────────────────────────────────────
  {
    id: "log-transform",
    category: "Feature Engineering",
    title: "Log Transformation: Taming Long Tails",
    concept: "log1p(x) = log(1+x) compresses the right tail of a long-tailed distribution. A few extreme values (large orders, high incomes) that dominate the mean get pulled closer to the center. This makes the distribution more symmetric, which benefits linear regression (assumes normally-distributed residuals) and distance-based models (kNN, k-means — dominated by large-scale features). log1p(x) handles x=0 (log(1+0)=0), while log(x) is undefined at x=0.",
    why: "Long-tailed data violates the normality assumption of linear models and makes distance-based algorithms treat large-value features as dominant. After log1p, a $10 order and a $1000 order differ by 2× in log space instead of 100× — the model can learn the relative pattern rather than being overwhelmed by the absolute magnitude.",
    when: "Use log1p for: revenue, income, prices, counts (all typically right-skewed). Avoid for: negative values (log is undefined), already-symmetric data (no benefit), zero-inflated data (many zeros + a few large values — log1p makes zeros and small values indistinguishable). Always verify the transform helps by checking the distribution shape before and after.",
    how: "1. Check skewness: df['revenue'].skew() — >1 indicates right-skew. 2. Apply: df['log_revenue'] = np.log1p(df['revenue']). 3. Verify: df['log_revenue'].skew() should be closer to 0. 4. Interpret: a log_revenue of 5.3 means original revenue = exp(5.3) - 1 ≈ $199. 5. Inverse: np.expm1(log_revenue) recovers the original value.",
    example: "Revenue ranges from $4 to $895. Mean = $186, but median = $150 (right-skewed). After log1p: mean ≈ 4.8, median ≈ 4.7 (nearly symmetric). A linear regression on log_revenue produces better-calibrated predictions because the residuals are more normally distributed.",
    code: `import numpy as np

# Check skewness before
print(f"Skewness before: {df['revenue'].skew():.3f}")

# Apply log1p (handles 0 safely)
df["log_revenue"] = np.log1p(df["revenue"])

# Check skewness after
print(f"Skewness after:  {df['log_revenue'].skew():.3f}")

# Inverse transform (to recover original values)
df["revenue_back"] = np.expm1(df["log_revenue"])

# For model predictions: predict log_revenue, then expm1
predictions = np.expm1(model.predict(X_test))`,
    interpretation: "If skewness drops from 1.5 to 0.2, the transform worked — the distribution is now nearly symmetric. If skewness barely changes, the data might be bimodal or zero-inflated, and log1p isn't the right tool. Always compare the before/after histograms.",
    mistakes: [
      "Using log(x) instead of log1p(x) on data with zeros — log(0) = -Inf.",
      "Forgetting to inverse-transform predictions — model outputs are in log space.",
      "Applying log to already-symmetric data — adds unnecessary complexity.",
      "Not checking the before/after distribution — the transform might not help.",
    ],
    takeaway: "log1p compresses right tails, making skewed data more symmetric. Use for revenue/income/prices. Always check skewness before and after. Inverse with expm1 to recover original-scale predictions.",
    labLink: "fe-lab",
    demo: { kind: "transform", defaultCol: "revenue", defaultTransform: "log1p" },
  },
  {
    id: "one-hot-encoding",
    category: "Feature Engineering",
    title: "One-Hot Encoding: Representing Categories",
    concept: "One-hot encoding converts a categorical column with k distinct values into k binary (0/1) columns — one per category. Each row gets a 1 in the column matching its category and 0 in all others. pd.get_dummies() does this in Pandas; sklearn's OneHotEncoder does it in a pipeline-friendly way (handles unseen categories at inference). For linear models, use drop_first=True (k-1 columns) to avoid perfect multicollinearity with the intercept.",
    why: "Most ML models can't handle string categories directly — they need numeric inputs. One-hot is the most faithful representation for NOMINAL categories (no ordering): 'North', 'South', 'East', 'West' become 4 binary columns with no implied ordering. Alternative encodings (ordinal, label, target) impose an ordering that may not exist, misleading linear/distance-based models.",
    when: "Use one-hot for: nominal categories with low cardinality (< 20 distinct values). Avoid for: high-cardinality columns (k > 50 creates too many sparse columns — use frequency or target encoding instead). For tree models, one-hot is unnecessary (trees split on categories natively). For linear models, use drop_first=True to avoid multicollinearity.",
    how: "1. pd.get_dummies(df, columns=['region']) → adds region_North, region_South, etc. 2. pd.get_dummies(df, columns=['region'], drop_first=True) → k-1 columns (drops the first category as reference). 3. sklearn: OneHotEncoder(handle_unknown='ignore', sparse_output=False) → pipeline-friendly, ignores unseen categories at inference. 4. The encoded matrix has shape (n_rows, n_new_columns).",
    example: "A 'region' column with 5 values (North, South, East, West, Central) → 5 new columns. A row with region='East' gets region_East=1, all others=0. With drop_first=True, only 4 columns (region_South, region_East, region_West, region_Central) — North is the reference (all zeros = North).",
    code: `# Pandas one-hot (simple)
df_encoded = pd.get_dummies(df, columns=["region"], prefix="region")

# With drop_first (for linear models)
df_encoded = pd.get_dummies(df, columns=["region"], drop_first=True)

# scikit-learn (pipeline-friendly, handles unseen categories)
from sklearn.preprocessing import OneHotEncoder
enc = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
enc.fit(X_train[["region"]])  # fit on TRAIN ONLY
X_train_enc = enc.transform(X_train[["region"]])
X_test_enc  = enc.transform(X_test[["region"]])
# Unseen categories in test → all zeros (handle_unknown='ignore')`,
    interpretation: "The encoded dataset has more columns (original + k new binary columns, minus 1 if drop_first=True). Each row has exactly one 1 in the one-hot block (or all zeros for the reference category). The column count tells you the memory cost: a 5000-category column produces 5000 sparse columns — consider frequency encoding instead.",
    mistakes: [
      "Using one-hot for high-cardinality columns (>20 categories) — explodes dimensionality.",
      "Forgetting drop_first=True for linear models — the k dummy columns sum to 1, creating perfect multicollinearity with the intercept.",
      "Fitting the encoder on the full dataset before train/test split — leakage! Fit on train only.",
      "Not handling unseen categories at inference — OneHotEncoder(handle_unknown='ignore') maps unseen to all-zeros.",
    ],
    takeaway: "One-hot converts nominal categories to binary columns. Use drop_first=True for linear models. Avoid for high-cardinality (>20). Use OneHotEncoder(handle_unknown='ignore') in pipelines. Fit on train only.",
    labLink: "fe-lab",
    demo: { kind: "encoding", defaultCol: "region", defaultMethod: "onehot" },
  },
  {
    id: "standardization",
    category: "Feature Engineering",
    title: "Standardization (Z-score Scaling)",
    concept: "Standardization rescales a column to mean=0 and std=1: z = (x - mean) / std. The result is a Z-score — the number of standard deviations from the mean. A Z-score of +2 means the value is 2 std above the mean. Standardization is sensitive to outliers (mean and std both inflate). For robust scaling, use (x - median) / IQR instead.",
    why: "Distance-based models (kNN, k-means, SVM-RBF) and gradient-based models (logistic regression, neural nets) are sensitive to feature scales. If revenue is in $100s and quantity is in single digits, the distance metric is dominated by revenue — quantity is effectively ignored. Standardization puts all features on the same scale, so the model weighs them equally by default.",
    when: "Standardize for: logistic regression, neural networks, kNN, k-means, SVM. Don't standardize for: tree-based models (Random Forest, XGBoost, LightGBM — they split on values, not distances, and are scale-invariant). Always fit the scaler on TRAIN ONLY and apply the same parameters to test — fitting on the full dataset is leakage.",
    how: "1. sklearn: StandardScaler().fit(X_train) → learns mean and std from train. 2. scaler.transform(X_train) → applies (x - mean) / std. 3. scaler.transform(X_test) → applies the SAME mean and std. 4. Verify: mean of transformed train ≈ 0, std ≈ 1. 5. For robust scaling: RobustScaler() uses median + IQR instead.",
    example: "Revenue has mean=$186, std=$120. After standardization, a $306 order has z = (306 - 186) / 120 = 1.0 — one std above average. A $66 order has z = -1.0. The model now treats revenue and quantity (also standardized) on the same scale, so neither dominates the distance metric.",
    code: `from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression

# Fit scaler on TRAIN ONLY
scaler = StandardScaler()
scaler.fit(X_train[["revenue", "quantity"]])

# Apply to both train and test
X_train_scaled = scaler.transform(X_train[["revenue", "quantity"]])
X_test_scaled  = scaler.transform(X_test[["revenue", "quantity"]])

# In a pipeline (leakage-safe)
pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression()),
])
pipe.fit(X_train, y_train)  # scaler fits on train only`,
    interpretation: "After standardization, check that the transformed train data has mean ≈ 0 and std ≈ 1. The test data won't have exactly mean=0 or std=1 — that's correct, because it uses the TRAIN-fitted parameters. If you accidentally fit on the full dataset, the test mean would be ≈ 0 too — that's leakage.",
    mistakes: [
      "Fitting the scaler on the full dataset (train + test) before splitting — leakage!",
      "Standardizing tree-based model features — unnecessary, wastes compute.",
      "Using StandardScaler on data with extreme outliers — mean and std both inflate. Use RobustScaler instead.",
      "Forgetting to standardize new features at inference — the model expects the same scale.",
    ],
    takeaway: "Standardization: z = (x - mean) / std → mean=0, std=1. Required for distance/gradient models. Fit on TRAIN ONLY. Use RobustScaler for outlier-heavy data. Skip for tree models.",
    labLink: "fe-lab",
    demo: { kind: "scaling", defaultCol: "revenue", defaultScaler: "standardize" },
  },
  // ─── ML PREPARATION ────────────────────────────────────────────
  {
    id: "train-test-split",
    category: "ML Preparation",
    title: "Train/Test Split: The Sacred Boundary",
    concept: "The train/test split divides data into a training set (for fitting models and transformers) and a held-out test set (for the final unbiased evaluation). Typical ratios: 70/30 or 80/20. For classification, use stratify=y to preserve class proportions. For time-series, split chronologically — never shuffle. The test set must NEVER influence training decisions (feature selection, hyperparameter tuning, preprocessing).",
    why: "Without a held-out test set, you can't detect overfitting — the model memorises the training data and scores well on it but fails on new data. The test set provides an unbiased estimate of generalisation performance. If you use the test set during training (e.g., feature selection on full data), it becomes a second validation set — your reported test score is optimistically biased.",
    when: "Always split before any ML work. Use a three-way split (train/val/test) when you need to tune hyperparameters: train for fitting, val for tuning, test for the final report. Touch the test set exactly ONCE — at the very end. For time-series, use TimeSeriesSplit (chronological, no shuffle). For class-imbalanced classification, use stratify=y.",
    how: "1. sklearn: train_test_split(X, y, test_size=0.3, random_state=42, stratify=y). 2. Fit every transformer (imputer, scaler, encoder) on X_train only. 3. Apply the fitted transformers to X_test. 4. Fit the model on the transformed X_train. 5. Evaluate on the transformed X_test. 6. Use a Pipeline to enforce this automatically.",
    example: "A retail dataset with 240 rows: 168 train / 72 test (70/30 split, seed=42). For classification (attrition yes/no), use stratify=y to ensure both splits have the same yes-rate. If 20% of employees have attrition='yes', both train and test should have ~20% yes — without stratify, the test set might randomly have 5% or 35%.",
    code: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# Split FIRST (before any preprocessing)
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.3,
    random_state=42,
    stratify=y,  # preserve class proportions
)

# Pipeline: scaler + model (leakage-safe)
pipe = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression()),
])

# Fit on TRAIN ONLY (scaler + model)
pipe.fit(X_train, y_train)

# Evaluate on TEST (held out)
score = pipe.score(X_test, y_test)
print(f"Test accuracy: {score:.4f}")`,
    interpretation: "After the split, verify: train rows + test rows = total rows (no overlap). For classification, check that y_train.value_counts(normalize=True) ≈ y_test.value_counts(normalize=True). If they differ significantly, use stratify=y. The test score is your best estimate of real-world performance — but only if the test set was truly held out.",
    mistakes: [
      "Fitting preprocessing on the full dataset before splitting — classic leakage.",
      "Scoring on the test set during model iteration — overfits to the test set.",
      "Using random split for time-series data — future data leaks into training.",
      "Forgetting stratify for imbalanced classification — rare class might have 0 samples in test.",
    ],
    takeaway: "Split FIRST. Fit everything on TRAIN ONLY. Touch test ONCE at the end. Use stratify for classification, chronological for time-series. A Pipeline enforces leakage-safety automatically.",
    demo: { kind: "train-test-split" },
  },
  {
    id: "data-leakage",
    category: "ML Preparation",
    title: "Data Leakage: The Silent Model Killer",
    concept: "Data leakage occurs when information from the test/validation set influences the training procedure. Common sources: (1) fitting preprocessing (imputer, scaler, encoder) on the full dataset, (2) target encoding computed on the full dataset, (3) feature selection on the full dataset, (4) time-based splits that put future data in training. Leakage inflates CV scores — the model appears to perform well but fails on truly unseen data.",
    why: "Leakage is the most insidious ML bug because it produces GOOD scores that are WRONG. You won't know until the model is deployed and real-world performance is terrible. The fix is always the same: fit every transformer on the TRAINING fold only, inside a Pipeline that enforces this. Cross-validation must also be leakage-safe — use Pipeline + cross_val_score, not manual fit/transform.",
    when: "Check for leakage whenever you: fit a transformer (scaler, imputer, encoder) — does it use only train data? Do feature selection — does it use only train data? Use target encoding — does the encoding use only train targets? Split time-series — does training data precede test data chronologically? If any answer is 'no', you have leakage.",
    how: "1. Always split first: train_test_split BEFORE any preprocessing. 2. Use Pipeline: Pipeline([('scaler', StandardScaler()), ('model', LogisticRegression())]). 3. For target encoding: compute category means on X_train only, map onto X_test with global-mean fallback. 4. For time-series: use TimeSeriesSplit (chronological, no shuffle). 5. For CV: cross_val_score(pipe, X, y) — the pipeline ensures each fold fits transformers on the inner train only.",
    example: "You fit StandardScaler on the full dataset (240 rows), then split into train/test. The scaler's mean and std include test rows — the model has 'seen' the test distribution. CV score = 0.92. But on truly unseen data, the score drops to 0.78. Fix: fit the scaler inside a Pipeline, which automatically fits on train only within each CV fold.",
    code: `# WRONG — leakage!
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)  # fits on ALL data (train + test)
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y)

# RIGHT — leakage-safe
X_train, X_test, y_train, y_test = train_test_split(X, y)
pipe = Pipeline([
    ("scaler", StandardScaler()),  # fits on train only
    ("model", LogisticRegression()),
])
pipe.fit(X_train, y_train)
pipe.score(X_test, y_test)

# Cross-validation (leakage-safe with Pipeline)
from sklearn.model_selection import cross_val_score
scores = cross_val_score(pipe, X, y, cv=5)  # each fold: fit on inner train only`,
    interpretation: "If your CV score is suspiciously high (>0.95 on a complex task), check for leakage. Compare: (1) CV score with Pipeline (leakage-safe) vs (2) CV score with manual fit/transform (potentially leaky). If they differ significantly, you have leakage. The Pipeline score is the honest one.",
    mistakes: [
      "Fitting preprocessing on the full dataset before splitting — the most common leakage.",
      "Computing target encoding on the full dataset — test targets leak into features.",
      "Re-fitting the scaler on the test set — different params, broken model.",
      "Using random split for time-series — future data in training.",
    ],
    takeaway: "Leakage: test information influences training. Fix: Pipeline + fit-on-train-only + cross_val_score. If CV scores seem too good to be true, check for leakage. Target encoding requires a trainMask — never compute on full data.",
    demo: { kind: "train-test-split" },
  },
  // ─── TIME SERIES ────────────────────────────────────────────────
  {
    id: "datetime-conversion",
    category: "Time Series",
    title: "DateTime Conversion and .dt Accessors",
    concept: "pd.to_datetime() converts string dates to datetime64[ns] objects. Once converted, the .dt accessor unlocks: .dt.year, .dt.month, .dt.day, .dt.day_name(), .dt.quarter, .dt.is_weekend. errors='coerce' turns invalid dates into NaT (null), preventing crashes. After conversion, you can resample, roll, and shift — all time-series operations require datetime64 dtype.",
    why: "Dates stored as strings ('2023-04-17') can't be used for time-series analysis — you can't resample, compute month-over-month growth, or rolling averages. Converting to datetime unlocks the entire time-series toolkit. Invalid dates ('2023-13-45', 'garbage') would crash the conversion without errors='coerce' — coerce nulls them silently so you can investigate later.",
    when: "Convert dates immediately after loading data. Always use errors='coerce' and then check .isna().sum() to see how many dates were invalid. Use .dt accessors to extract features (month, day_name, quarter) for grouping and seasonality analysis. Use resample('ME') for monthly aggregation, rolling(7) for 7-day moving averages.",
    how: "1. Convert: df['order_date'] = pd.to_datetime(df['order_date'], errors='coerce'). 2. Extract: df['month'] = df['order_date'].dt.month. 3. Day name: df['weekday'] = df['order_date'].dt.day_name(). 4. Quarter: df['quarter'] = df['order_date'].dt.quarter. 5. Check invalids: df['order_date'].isna().sum(). 6. Resample: df.resample('ME', on='order_date')['revenue'].sum().",
    example: "After converting order_date to datetime, you can answer: 'What's the monthly revenue trend?' → df.resample('ME', on='order_date')['revenue'].sum(). 'Which weekday has the most orders?' → df.groupby(df['order_date'].dt.day_name())['order_id'].count(). Both require datetime — they fail on string dates.",
    code: `# Convert strings to datetime
df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")

# Check for invalid dates (NaT = Not a Time)
invalid_count = df["order_date"].isna().sum()
print(f"Invalid dates: {invalid_count}")

# Extract features
df["year"] = df["order_date"].dt.year
df["month"] = df["order_date"].dt.month
df["quarter"] = df["order_date"].dt.quarter
df["weekday"] = df["order_date"].dt.day_name()
df["is_weekend"] = df["order_date"].dt.dayofweek >= 5

# Monthly revenue
monthly = df.resample("ME", on="order_date")["revenue"].sum()`,
    interpretation: "After conversion, check .isna().sum() — if 3 dates were invalid, they're now NaT. Investigate: were they '2023-13-45' (invalid month/day) or 'garbage' (not a date at all)? NaT rows can be dropped (df.dropna(subset=['order_date'])) or investigated. The .dt accessor produces integer features (1-12 for month) useful for grouping and seasonality detection.",
    mistakes: [
      "Using errors='raise' (default) — crashes on the first invalid date.",
      "Forgetting to check .isna() after coerce — invalid dates silently become NaT.",
      "Leaving dates as strings — all time-series operations (.dt, resample, rolling) require datetime.",
    ],
    takeaway: "pd.to_datetime(errors='coerce') converts string dates to datetime, invalidating bad values. The .dt accessor extracts year, month, day, weekday, quarter. Always check for NaT after coercion.",
    demo: { kind: "monthly-trend", defaultMetric: "revenue" },
  },
  {
    id: "rolling-pct-change",
    category: "Time Series",
    title: "Rolling Averages and Percentage Change",
    concept: "rolling(window=n).mean() computes a moving average over a sliding window of n periods. It smooths short-term noise to reveal the underlying trend. pct_change() computes the percentage change between consecutive periods: (current - previous) / previous. When the previous value is 0, pct_change returns NaN (not Inf) — we never divide by zero silently. shift(n) lags a column by n periods for period-over-period comparisons.",
    why: "Raw monthly revenue is noisy — a single bad month can obscure the trend. A 3-month rolling average smooths the noise, making the trend direction clear. pct_change answers 'how much did revenue grow month-over-month?' A value of 0.05 = +5% growth. A value of -0.03 = -3% decline. But when the previous month's revenue is 0 (returns, launch, gap), the growth is undefined — investigate, don't impute.",
    when: "Use rolling for: trend visualization, noise reduction, moving-average models. Use pct_change for: growth reporting (MoM, YoY), anomaly detection (large pct_change = anomaly). Use shift for: lagged features, period-over-period comparisons (current vs. previous month). For cumulative totals: expanding().mean() or cumsum().",
    how: "1. Set datetime index: df = df.set_index('order_date'). 2. Monthly: monthly = df.resample('ME')['revenue'].sum(). 3. Rolling: monthly.rolling(3).mean() → 3-month moving average. 4. pct_change: monthly.pct_change() → (current - previous) / previous. 5. Cumulative: monthly.cumsum() → running total. 6. Shift: monthly.shift(1) → previous month's value.",
    example: "Monthly revenue: [Jan=$10k, Feb=$12k, Mar=$0k (returns), Apr=$15k]. 3-month rolling average for Mar = ($10k + $12k + $0k) / 3 = $7.3k (smoothed down by the returns month). pct_change for Apr = ($15k - $0k) / $0k = NaN (undefined — investigate the $0k month, don't report 'infinite growth').",
    code: `# Set datetime index
df = df.set_index("order_date")

# Monthly revenue
monthly = df.resample("ME")["revenue"].sum()

# 3-month rolling average (smooths noise)
monthly_rolling = monthly.rolling(3).mean()

# Month-over-month growth
mom_growth = monthly.pct_change()  # (current - prev) / prev

# Year-over-year growth (shift 12 months)
yoy_growth = monthly.pct_change(periods=12)

# Cumulative total
cumulative = monthly.cumsum()

# Previous month's value (for comparison)
prev_month = monthly.shift(1)`,
    interpretation: "The rolling average smooths the noise — if raw revenue jumps from $10k to $20k to $5k, the 3-month rolling average goes $10k → $13.3k → $11.7k (more stable). pct_change of 0.5 means +50% growth from the previous period. NaN in pct_change means the previous value was 0 (undefined growth) — investigate the zero, don't impute.",
    mistakes: [
      "Computing pct_change when the previous period is 0 — produces NaN, not Inf. Investigate the zero.",
      "Using rolling(window=1) — that's just the value itself, no smoothing.",
      "Forgetting the first window-1 values of rolling are NaN — there aren't enough previous values to average.",
      "Using pct_change on non-time-series data — it computes sequential differences, which may not be meaningful.",
    ],
    takeaway: "rolling(n).mean() smooths noise. pct_change() computes growth (undefined when previous=0 → NaN). shift(n) lags for comparisons. Always investigate NaN in pct_change — it means the denominator was zero.",
    demo: { kind: "monthly-trend", defaultMetric: "revenue" },
  },
  // ─── GROUPING & AGGREGATION ─────────────────────────────────────
  {
    id: "groupby-agg",
    category: "Grouping & Aggregation",
    title: "groupby + agg: Split-Apply-Combine",
    concept: "groupby splits a DataFrame into groups by one or more categorical keys, applies an aggregation function to each group independently, and combines the results back into a new DataFrame. It is the workhorse of analytical Pandas — every 'revenue by region', 'count by category', or 'average order value by customer segment' question is a groupby + agg. The result has one row per group, indexed by the grouping key(s), with the aggregated metric as a column.",
    why: "Raw transaction-level data is too granular to answer business questions directly. 'Total revenue by region' cannot be read off a 240-row orders table — you must aggregate. groupby is the canonical Pandas pattern for this, mirroring SQL's GROUP BY but with far richer aggregation: you can apply different functions to different columns in a single call, name the output columns, and chain with sort_values or filter. Without groupby, every analytical question requires manual loops, which are slow and error-prone.",
    when: "Use groupby whenever you need a per-group summary: total revenue by region, average order value by customer segment, count of orders by product, distinct customers by month. Use a single grouping column for one-dimension summaries ('revenue by region'). Use multiple grouping columns for two-dimension summaries ('revenue by region and category'). For wider two-dimension tables with one metric in cells, use pivot_table instead; for pure count frequency tables, use crosstab.",
    how: "1. df.groupby('region')['revenue'].sum() → one metric, one group, one function. 2. df.groupby(['region', 'category'])['revenue'].sum() → two-level grouping. 3. df.groupby('region').agg(total_revenue=('revenue', 'sum'), avg_profit=('profit', 'mean'), orders=('order_id', 'count')) → named aggregation, multiple metrics. 4. df.groupby('region')['revenue'].agg(['sum', 'mean', 'count']) → multiple functions on one column. 5. Always .reset_index() to convert the group key back to a regular column for downstream joins.",
    example: "On the retail dataset, df.groupby('region')['revenue'].sum() returns 5 rows (one per region) with the total revenue per region. The East region might total $18,420 across 47 orders, while Central totals $9,180 across 32 orders. Adding a second grouping column (df.groupby(['region', 'category'])['revenue'].sum()) produces 5 regions × 6 categories = up to 30 rows, revealing which product categories drive revenue in each region.",
    code: `# Single group, single metric, single function
revenue_by_region = df.groupby("region")["revenue"].sum().reset_index()
print(revenue_by_region)
#   region   revenue
# 0  Central   9180.42
# 1    East   18420.55
# 2    North  ...

# Two-level grouping
by_region_cat = df.groupby(["region", "category"])["revenue"].sum().reset_index()

# Named aggregation (multiple metrics, multiple functions)
summary = df.groupby("region").agg(
    total_revenue=("revenue", "sum"),
    avg_profit=("profit", "mean"),
    orders=("order_id", "count"),
    distinct_customers=("customer_id", "nunique"),
).reset_index()

# Multiple functions on one column
multi = df.groupby("region")["revenue"].agg(["sum", "mean", "count", "std"])`,
    interpretation: "The result is a DataFrame with one row per group. Check the row count matches the number of distinct group keys (5 regions → 5 rows; if you get fewer, some regions had no rows and were dropped silently). Always reset_index() to convert the group key from an index back to a column — downstream merges and visualizations expect columns, not indices.",
    mistakes: [
      "Forgetting .reset_index() — leaves the group key as the DataFrame index, breaking downstream merges and charts.",
      "Using .mean() when the question asks for totals — sum for totals (revenue, profit), mean for averages (AOV), count for volumes, nunique for distinct customers.",
      "Applying sum() to non-additive metrics — summing rates, percentages, or unit prices produces meaningless numbers; use mean instead.",
      "Grouping by a high-cardinality column (customer_id) without intending to — produces one row per customer, often a very large DataFrame.",
    ],
    takeaway: "groupby + agg is the split-apply-combine pattern. Use named aggregation for multiple metrics. Always reset_index() to flatten the group key back to a column. Pick the function that matches the question: sum for totals, mean for averages, count for volumes, nunique for distinct values.",
    labLink: "module-5",
    demo: { kind: "groupby-summary", defaultGroup: "region", defaultMetric: "revenue", defaultAgg: "sum" },
  },
  {
    id: "transform-vs-agg",
    category: "Grouping & Aggregation",
    title: "transform vs agg: Broadcast vs Reduce",
    concept: "transform applies a function to each group and broadcasts the result back to the original DataFrame's shape — every row keeps its identity but gets a group-level statistic attached. agg reduces each group to a single row. Same groupby mechanics, opposite output shape. Use transform for 'add the regional average revenue to every order row'; use agg for 'show me one summary row per region'.",
    why: "Many analytical questions require attaching a group-level statistic back to individual rows: 'is this order above the regional average?', 'what percentile is this customer within their segment?', 'how does this product compare to its category peers?'. transform does this in one call without manual joins. Without transform, you'd groupby + agg, then merge the result back onto the original DataFrame — three operations instead of one, and the merge can multiply rows if the keys aren't unique.",
    when: "Use transform whenever you need to enrich each row with a group-level statistic: df['regional_avg'] = df.groupby('region')['revenue'].transform('mean'). Use agg when you want a summary table (one row per group). Use filter (the third groupby method) when you want to keep or drop entire groups based on a group-level predicate: df.groupby('region').filter(lambda g: g['revenue'].sum() > 10000) keeps only regions with sufficient revenue.",
    how: "1. df['region_avg_revenue'] = df.groupby('region')['revenue'].transform('mean') — every row gets its region's average. 2. df['revenue_vs_region'] = df['revenue'] - df.groupby('region')['revenue'].transform('mean') — deviation from regional mean. 3. df['pct_of_region'] = df['revenue'] / df.groupby('region')['revenue'].transform('sum') — each row's share of regional total. 4. df.groupby('region').filter(lambda g: g['revenue'].mean() > 100) — keep only high-AOV regions. 5. transform never changes row count; agg always reduces to one row per group; filter keeps or drops whole groups.",
    example: "You want to flag high-value orders — those above their regional average. Without transform: compute regional averages via groupby + agg, merge back onto the original DataFrame, then compare. With transform: df['is_high_value'] = df['revenue'] > df.groupby('region')['revenue'].transform('mean'). One line, no merge, no risk of row multiplication. The resulting column has the same length as the original DataFrame (240 rows), with True/False per row.",
    code: `# transform broadcasts the group statistic back to each row
df["region_avg_revenue"] = df.groupby("region")["revenue"].transform("mean")
df["is_high_value"] = df["revenue"] > df["region_avg_revenue"]

# Each row's share of its regional total
df["pct_of_region"] = df["revenue"] / df.groupby("region")["revenue"].transform("sum")

# Rank within group (no broadcasting, but same length as input)
df["rank_in_region"] = df.groupby("region")["revenue"].rank(method="dense", ascending=False)

# filter: keep only regions where total revenue exceeds a threshold
big_regions = df.groupby("region").filter(lambda g: g["revenue"].sum() > 10000)`,
    interpretation: "transform preserves the row count — the output has the same 240 rows as the input, each enriched with its group's statistic. agg produces 5 rows (one per region). filter produces a subset of the original rows (only those in qualifying groups). Verify the output shape after every groupby operation: if you expected transform and got 5 rows, you called agg by mistake.",
    mistakes: [
      "Using agg when you wanted transform — produces 5 rows instead of 240, breaking any downstream column assignment.",
      "Forgetting that transform's output is index-aligned with the input — if you sorted or filtered between, the alignment breaks.",
      "Using transform with a function that returns a different length than the input — transform requires the output to be either a scalar (broadcast) or same-length as the group.",
      "Confusing filter (group-level predicate) with boolean indexing (row-level predicate) — filter keeps whole groups; boolean indexing keeps individual rows.",
    ],
    takeaway: "transform broadcasts a group statistic to every row (preserves shape). agg reduces to one row per group. filter keeps or drops whole groups based on a group-level predicate. Pick the verb that matches your output-shape intent.",
    labLink: "module-5",
    demo: { kind: "groupby-summary", defaultGroup: "region", defaultMetric: "revenue", defaultAgg: "mean" },
  },
  {
    id: "pivot-table",
    category: "Grouping & Aggregation",
    title: "pivot_table: Two-Dimensional Aggregation",
    concept: "pivot_table produces a two-dimensional summary table: one categorical on the rows (index), another on the columns, and an aggregated metric in the cells. It is the Pandas equivalent of an Excel pivot table or a SQL GROUP BY on two keys with the second pivoted to columns. margins=True adds row and column subtotals. Missing index×column combinations produce NaN (not zero) — investigate before filling.",
    why: "Two-dimension summaries are the most common analytical deliverable: 'monthly revenue by region', 'order count by category and weekday', 'average profit margin by segment and tier'. groupby on two keys produces the same data in long format (one row per index×column combination); pivot_table produces it in wide format (a grid), which is far easier to read, chart, and share. The wide format also enables matrix operations (row/column percentages, marginal totals) that are awkward in long format.",
    when: "Use pivot_table whenever you have two categorical dimensions and one metric to summarize: revenue by region×category, order count by month×weekday, average AOV by segment×tier. Use groupby when you have one dimension or three+ dimensions (pivot_table gets unwieldy beyond two). Use crosstab when the cell metric is a count (no aggregation needed) — crosstab is convenience for pivot_table with aggfunc='count'. Use melt to go from wide back to long.",
    how: "1. pd.pivot_table(df, index='region', columns='category', values='revenue', aggfunc='sum') → wide table. 2. Add margins=True → row/column subtotals labeled 'All'. 3. Multiple metrics: values=['revenue', 'profit'], aggfunc={'revenue': 'sum', 'profit': 'mean'}. 4. Multiple index levels: index=['region', 'segment'] for hierarchical rows. 5. Fill NaN: .fillna(0) only if zero is the correct semantic value (often it isn't — NaN means 'no data for this combination', which is different from 'zero'). 6. Inverse: df.melt(id_vars=['region'], value_vars=['Apparel', 'Electronics']) converts wide back to long.",
    example: "Monthly revenue by region: pd.pivot_table(df, index='month', columns='region', values='revenue', aggfunc='sum', margins=True). The result is a 12-row (months) × 6-column (5 regions + All) table, with each cell showing the total revenue for that month×region combination, and the 'All' column showing monthly totals across all regions. Missing month×region combinations (e.g., no Central sales in March) appear as NaN — investigate before assuming zero.",
    code: `# Two-dimension summary: revenue by region × category
pivot = pd.pivot_table(
    df,
    index="region",
    columns="category",
    values="revenue",
    aggfunc="sum",
    margins=True,         # adds 'All' row + column
    margins_name="Total",
)
print(pivot)
# category  Accessories  Apparel  Electronics  ...   Total
# region
# Central       1820.50  4210.00       980.00  ...  9180.42
# East          3140.25  6800.00      2150.00  ... 18420.55
# ...

# Multiple metrics with different functions
multi = pd.pivot_table(
    df, index="region", columns="category",
    values=["revenue", "profit"],
    aggfunc={"revenue": "sum", "profit": "mean"},
)

# Row proportions (each cell / row total)
row_pct = pivot.div(pivot.iloc[:, -1], axis=0).iloc[:, :-1]

# Inverse: wide → long
long_df = pivot.reset_index().melt(id_vars="region", value_name="revenue")`,
    interpretation: "The pivot table is a grid — rows are one categorical, columns are another, cells hold the aggregated metric. Check for NaN cells: each one means 'no orders for this region×category combination' — investigate whether that's a data gap (missing rows) or a real business fact (Central region doesn't sell Electronics). Use margins=True for subtotals; use div() with the marginal total to convert to row or column proportions.",
    mistakes: [
      "Assuming NaN in a cell means zero — it means 'no data for this combination', which is semantically different. Filling with 0 hides the distinction.",
      "Forgetting margins=True when subtotals are needed — you compute them separately with groupby, doubling the work.",
      "Using pivot (not pivot_table) when the data has duplicate index×column combinations — pivot fails; pivot_table aggregates them.",
      "Pivoting a high-cardinality column to columns — a 'product' column with 50 distinct values produces a 50-column wide table that's unreadable.",
    ],
    takeaway: "pivot_table produces a two-dimension summary grid. margins=True adds subtotals. NaN cells mean 'no data for this combination' — investigate, don't auto-fill with zero. Use crosstab when the cell metric is a count. Use melt to convert wide back to long.",
    labLink: "module-5",
    demo: { kind: "pivot-table", defaultIndex: "region", defaultCols: "category", defaultMetric: "revenue" },
  },
  {
    id: "crosstab-proportions",
    category: "Grouping & Aggregation",
    title: "crosstab: Frequency Tables and Proportions",
    concept: "crosstab computes a frequency table of two (or more) categorical variables — the count of observations in each combination. It is convenience for pivot_table with aggfunc='count'. normalize='index' converts each row to proportions (summing to 1.0 per row), normalize='columns' converts each column to proportions, normalize='all' converts the entire table to proportions (summing to 1.0 overall). Proportions enable fair comparison when the groups have different sizes.",
    why: "Raw counts mislead when groups have different sizes. '100 churned customers in segment A vs 50 in segment B' sounds like A churns more — but if A has 1000 customers and B has 200, the churn rates are 10% and 25% respectively. crosstab with normalize='index' produces the row-wise percentages that reveal the true pattern. Without normalization, every cross-tab comparison is confounded by group size.",
    when: "Use crosstab whenever you need to compare the distribution of one categorical across another: customer segment × churn status, region × product category, weekday × return status. Use normalize='index' to compare the distribution of the column variable within each row (e.g., 'what fraction of each segment churns?'). Use normalize='columns' to compare the row distribution within each column (e.g., 'what fraction of churners come from each segment?'). Use normalize='all' for the overall cell probability.",
    how: "1. pd.crosstab(df['segment'], df['region']) → raw counts. 2. pd.crosstab(df['segment'], df['region'], normalize='index') → row proportions (each row sums to 1.0). 3. pd.crosstab(df['segment'], df['region'], normalize='columns') → column proportions. 4. pd.crosstab(df['segment'], df['region'], normalize='all') → overall proportions (entire table sums to 1.0). 5. pd.crosstab(df['segment'], df['region'], margins=True, normalize='index') → row proportions + an 'All' row for the overall distribution. 6. Add a third variable: pd.crosstab([df['segment'], df['tier']], df['region']) for hierarchical rows.",
    example: "Comparing the product mix across regions: pd.crosstab(df['region'], df['category'], normalize='index') produces a table where each row sums to 1.0. If the East row shows Apparel=0.45, Electronics=0.12, Accessories=0.20, etc., you can directly compare: 'East sells 45% Apparel, while Central sells only 25% Apparel'. Raw counts would make East look like it sells more of everything simply because it has more orders.",
    code: `# Raw counts
counts = pd.crosstab(df["region"], df["category"])
# category  Accessories  Apparel  Electronics  Home  Stationery  Toys
# region
# Central           12       28            7     9          11    8
# East              22       45           18    14          19   15

# Row proportions (each row sums to 1.0) — compare product mix per region
row_pct = pd.crosstab(df["region"], df["category"], normalize="index")
# East sells 45% Apparel vs Central's 25% — East over-indexes on Apparel

# Column proportions (each column sums to 1.0) — which region dominates each category
col_pct = pd.crosstab(df["region"], df["category"], normalize="columns")

# Overall proportions (entire table sums to 1.0)
overall = pd.crosstab(df["region"], df["category"], normalize="all")

# With subtotals
with_margins = pd.crosstab(
    df["region"], df["category"],
    margins=True, margins_name="Total",
    normalize="index",
)`,
    interpretation: "Row proportions answer 'within each row, how is the column variable distributed?' — compare rows to see if the distribution differs (e.g., East's product mix vs Central's). Column proportions answer 'within each column, how is the row variable distributed?' — compare columns to see which row dominates each column. Overall proportions answer 'what fraction of the total is in each cell?'. Always state which normalization you used when reporting.",
    mistakes: [
      "Reporting raw counts without checking whether groups have different sizes — counts confound group size with distribution.",
      "Confusing normalize='index' (row proportions) with normalize='columns' (column proportions) — they answer different questions.",
      "Forgetting to state which normalization was used when reporting — 'East has 45%' is meaningless without 'of what'.",
      "Using crosstab on continuous variables without binning first — produces a huge sparse table.",
    ],
    takeaway: "crosstab computes frequency tables. normalize='index' gives row proportions (compare distributions across rows), 'columns' gives column proportions, 'all' gives overall proportions. Always normalize when groups have different sizes — raw counts confound size with distribution.",
    labLink: "module-5",
    demo: { kind: "crosstab", defaultIndex: "region", defaultCols: "category" },
  },
  // ─── FEATURE SELECTION ──────────────────────────────────────────
  {
    id: "variance-threshold",
    category: "Feature Selection",
    title: "Variance Threshold: Drop Near-Constant Features",
    concept: "Variance threshold is the simplest filter feature-selection method: drop features whose sample variance falls below a threshold. A feature with variance ≈ 0 is near-constant — it carries almost no information because nearly every row has the same value. VarianceThreshold(threshold=0.0) drops only perfectly constant columns; threshold=0.01 drops columns where >99% of values are identical. The method is model-agnostic and unsupervised — it doesn't look at the target.",
    why: "Near-constant features add noise without signal. A column that is 99% the same value cannot distinguish between observations — the model wastes capacity learning nothing. Worse, in linear models, near-constant features have inflated variance in their coefficient estimates (small denominator in the normal equation). In tree models, near-constant features are rarely split on but slow training. Removing them reduces dimensionality, speeds training, and avoids numerical instability — all without losing predictive signal.",
    when: "Use variance threshold as a first-pass filter before any model-based selection. It's especially valuable for high-dimensional data (one-hot encoded categoricals, text features) where many columns are sparse and near-constant. Set the threshold based on the data: 0.0 drops only perfectly constant; 0.01 drops >99%-constant; 0.05 drops >95%-constant. Always fit VarianceThreshold on the TRAINING fold only — the test fold might have a different variance profile, and using it would be leakage.",
    how: "1. from sklearn.feature_selection import VarianceThreshold. 2. selector = VarianceThreshold(threshold=0.01). 3. X_train_filtered = selector.fit_transform(X_train) — fits on train only. 4. X_test_filtered = selector.transform(X_test) — applies the SAME mask to test (no re-fitting). 5. selector.get_support() returns a Boolean mask of which features survived. 6. In Pandas: df.var() > 0.01 produces the same mask manually. 7. Always inspect the dropped features — a low-variance feature might be rare-but-important (e.g., a 'is_fraud' indicator that's 0.1% True).",
    example: "After one-hot encoding a 'product' column with 50 distinct values, you have 50 binary columns. Some products appear in only 1-2 orders — their variance is ~0.008 (well below 0.01). VarianceThreshold(threshold=0.01) drops those rare-product columns, reducing dimensionality from 50 to ~15 features that actually have signal. But check the dropped columns: if 'is_return' was dropped because returns are 0.5% of orders, you've lost an important signal — manually retain it.",
    code: `from sklearn.feature_selection import VarianceThreshold

# Fit on TRAIN only (leakage-safe)
selector = VarianceThreshold(threshold=0.01)
X_train_filtered = selector.fit_transform(X_train)
X_test_filtered = selector.transform(X_test)  # apply same mask

# Inspect which features were dropped
mask = selector.get_support()
kept_features = [f for f, keep in zip(feature_names, mask) if keep]
dropped_features = [f for f, keep in zip(feature_names, mask) if not keep]
print(f"Dropped {len(dropped_features)} near-constant features:")
print(dropped_features)

# Manual Pandas equivalent (same computation)
variances = df[feature_cols].var()
mask = variances > 0.01
kept = variances[mask].index.tolist()`,
    interpretation: "The selector reports which features survived. Check the dropped list — if it contains features you know are important (rare events, fraud indicators, niche products), lower the threshold or manually retain them. Variance threshold is unsupervised — it doesn't know which low-variance features are predictive; it only knows they carry little information about the data's distribution. Use it as a first pass, not the final selection.",
    mistakes: [
      "Fitting VarianceThreshold on the full dataset (train + test) — the test variance profile leaks into the mask. Always fit on train only.",
      "Setting the threshold too high — drops rare-but-important features (fraud, returns, niche categories).",
      "Using variance threshold as the only selection method — it's unsupervised and ignores the target; pair with a supervised method (ANOVA F, tree importance) for the final selection.",
      "Forgetting that variance is scale-dependent — a feature with values 0/1 has variance ≤ 0.25; a feature with values 0/10000 has variance in the millions. Standardize before comparing variances across features with different scales.",
    ],
    takeaway: "Variance threshold drops near-constant features — unsupervised, model-agnostic, fast. Fit on train only. Always inspect the dropped list for rare-but-important features. Use as a first pass before supervised selection.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "correlation-select",
    category: "Feature Selection",
    title: "Correlation-based Selection: Drop Redundant Predictors",
    concept: "Correlation-based selection drops features that are highly correlated with each other (multicollinearity) or weakly correlated with the target (low predictive signal). For each pair of features with |corr| > threshold (e.g., 0.85), drop the one with weaker target correlation. Then drop features whose |corr(feature, target)| < threshold (e.g., 0.05). This is a filter method — no model is trained.",
    why: "Multicollinearity destabilizes linear models — coefficients swing wildly with small data changes, and individual feature attribution becomes unreliable. Removing one of each highly-correlated pair restores stability without losing predictive signal (the surviving feature carries the same information). Low-target-correlation features add noise: a feature with |corr|=0.01 to the target cannot meaningfully predict it. Dropping both kinds reduces dimensionality and improves model interpretability.",
    when: "Use correlation-based selection for linear models (regression, logistic regression) where multicollinearity is a real concern. Avoid for tree-based models — trees handle correlated features natively (they pick one at each split). Use it as a sanity check on the correlation matrix BEFORE model-based selection. Set the inter-feature threshold at 0.85 (strict) or 0.90 (lenient); set the feature-target threshold at 0.05 (lenient) or 0.10 (strict). Always compute on the TRAINING fold only — the test correlation profile is leakage.",
    how: "1. corr_matrix = X_train.corr() — full pairwise correlation matrix. 2. Identify pairs with |corr| > 0.85: corr_matrix.abs() > 0.85. 3. For each pair, drop the feature with weaker |corr(feature, y)|. 4. Compute target correlations: X_train.corrwith(y_train). 5. Drop features with |corr(feature, y)| < 0.05. 6. The surviving features are your filtered set. 7. Always inspect the dropped features — sometimes a low-correlation feature captures a nonlinear relationship that Pearson misses (see the parabolic-relationship topic).",
    example: "Your feature set includes 'revenue' and 'revenue_per_unit' which have corr = 0.98 (revenue_per_unit = revenue / quantity, and quantity is nearly constant). Both have target correlations of 0.45 and 0.43 respectively. The correlation-select method drops 'revenue_per_unit' (weaker target corr in the redundant pair), retaining 'revenue' (the simpler, more interpretable feature). The filtered set is smaller, less collinear, and equally predictive.",
    code: `# Compute the correlation matrix on TRAIN only
corr_matrix = X_train.corr()

# Find highly-correlated pairs (|corr| > 0.85)
high_corr_pairs = []
for i in range(len(corr_matrix.columns)):
    for j in range(i + 1, len(corr_matrix.columns)):
        if abs(corr_matrix.iloc[i, j]) > 0.85:
            high_corr_pairs.append((corr_matrix.columns[i], corr_matrix.columns[j], corr_matrix.iloc[i, j]))

# Target correlations
target_corr = X_train.corrwith(y_train).abs()

# For each pair, drop the one with weaker target correlation
to_drop = set()
for a, b, _ in high_corr_pairs:
    if target_corr[a] < target_corr[b]:
        to_drop.add(a)
    else:
        to_drop.add(b)

# Also drop features with very low target correlation
low_signal = target_corr[target_corr < 0.05].index.tolist()
to_drop.update(low_signal)

# Surviving features
selected = [f for f in X_train.columns if f not in to_drop]
print(f"Selected {len(selected)} of {len(X_train.columns)} features")`,
    interpretation: "The selected feature set excludes redundant pairs (one of each high-correlation pair survives) and low-signal features (weak target correlation). Check the dropped list — if a known-important feature was dropped, it may have been penalized for collinearity with a stronger feature; consider dropping the partner instead. Pearson correlation only captures linear relationships — a low-corr feature might be non-linearly predictive (verify with a scatter plot or a tree importance check).",
    mistakes: [
      "Computing the correlation matrix on the full dataset — leakage. Always use train only.",
      "Dropping BOTH features in a high-correlation pair — drop ONE (the weaker target-correlated one); the other carries the same signal.",
      "Using Pearson for nonlinear relationships — Pearson misses parabolic and threshold patterns; consider mutual information for any × any.",
      "Setting the threshold too low (e.g., 0.5) — drops features that are merely related, not redundant. 0.85+ is the standard for 'redundant'.",
    ],
    takeaway: "Correlation-based selection drops redundant features (high inter-feature corr) and low-signal features (low target corr). Fit on train only. Drop ONE of each pair, not both. Pair with mutual information to catch nonlinear relationships Pearson misses.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "anova-f-select",
    category: "Feature Selection",
    title: "ANOVA F (SelectKBest): Numeric × Categorical Target",
    concept: "ANOVA F-statistic measures how strongly a numeric feature distinguishes between classes of a categorical target. For each feature, it computes the ratio of between-class variance to within-class variance: F = MSBetween / MSWithin. A high F means the feature's values differ meaningfully across target classes — it's predictive. SelectKBest(score_func=f_classif, k=10) keeps the top-10 features by F-statistic. This is a filter method — fast, model-agnostic, supervised.",
    why: "For classification with numeric features, ANOVA F is the standard filter: it answers 'does this feature's distribution differ across classes?'. A feature with F=0.5 barely distinguishes classes; F=50 strongly distinguishes them. Unlike correlation (which assumes linearity), ANOVA F captures any difference in means across classes — including threshold and step patterns. SelectKBest wraps the scoring and selection in one call, returning exactly k features ranked by F.",
    when: "Use ANOVA F whenever you have a classification problem (categorical target) with numeric features. Use chi² instead when both X and y are categorical. Use mutual information when the relationship may be non-monotonic or non-linear. Set k based on domain knowledge or cross-validation; common values are 10, 15, 20, or sqrt(n_samples). Always fit SelectKBest on the TRAINING fold only — the test fold's F profile is leakage. For regression targets, use f_regression (which is essentially Pearson correlation).",
    how: "1. from sklearn.feature_selection import SelectKBest, f_classif. 2. selector = SelectKBest(score_func=f_classif, k=10). 3. X_train_selected = selector.fit_transform(X_train, y_train) — fits on train only. 4. X_test_selected = selector.transform(X_test) — applies the SAME mask. 5. selector.scores_ gives the F-statistic per feature. 6. selector.get_support() returns the Boolean selection mask. 7. Inspect the dropped features — a low-F feature might still be useful in interaction with another.",
    example: "Predicting customer churn (yes/no) from 30 numeric features (tenure, monthly_charge, total_charge, etc.). SelectKBest(f_classif, k=10) computes the F-statistic for each feature against the churn label. 'tenure' might have F=45 (long-tenured customers churn less), 'monthly_charge' F=22 (high-charge customers churn more), while 'zip_code' has F=0.3 (no churn signal). The selector retains the top 10 features by F, dropping the 20 weakest.",
    code: `from sklearn.feature_selection import SelectKBest, f_classif

# Fit on TRAIN only (leakage-safe)
selector = SelectKBest(score_func=f_classif, k=10)
X_train_selected = selector.fit_transform(X_train, y_train)
X_test_selected = selector.transform(X_test)

# Inspect the scores
scores = pd.DataFrame({
    "feature": feature_names,
    "f_stat": selector.scores_,
    "p_value": selector.pvalues_,
    "selected": selector.get_support(),
}).sort_values("f_stat", ascending=False)
print(scores.head(15))

# For regression targets, use f_regression (essentially Pearson)
from sklearn.feature_selection import f_regression
selector_reg = SelectKBest(score_func=f_regression, k=10)`,
    interpretation: "The score table shows each feature's F-statistic and p-value. A high F with low p (< 0.05) means the feature's distribution differs significantly across classes — it's predictive. Check the dropped features: if a domain-expert believes a feature should matter but it has low F, the relationship may be nonlinear (try mutual info) or interaction-dependent (try tree importance). SelectKBest is a starting point, not the final answer.",
    mistakes: [
      "Fitting SelectKBest on the full dataset — the test fold's F profile leaks into the selection. Always fit on train only.",
      "Using f_classif for regression targets — use f_regression instead (it's essentially Pearson r²).",
      "Setting k too high — keeps noise features. Set k based on domain knowledge or cross-validation.",
      "Treating F-statistic as importance — F measures group-mean differences, not predictive power per se. A high-F feature may still be redundant with another high-F feature.",
    ],
    takeaway: "ANOVA F (SelectKBest with f_classif) ranks numeric features by how strongly they distinguish categorical target classes. Fit on train only. Use f_regression for regression targets. Inspect both kept and dropped features — low-F features may be nonlinearly predictive.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "mutual-info-select",
    category: "Feature Selection",
    title: "Mutual Information: Any × Any Relationships",
    concept: "Mutual information (MI) measures how much knowing one variable reduces uncertainty about another — it captures ANY relationship (linear, nonlinear, threshold, interaction) without assuming a functional form. MI(X; Y) = Σ p(x,y) · log₂(p(x,y) / (p(x)·p(y))). For continuous features, MI discretizes X into bins first. SelectKBest(score_func=mutual_info_classif, k=10) keeps the top-10 features by MI. Unlike Pearson/ANOVA, MI catches parabolic and threshold patterns that linear methods miss.",
    why: "Pearson correlation and ANOVA F assume linear or mean-difference relationships — they miss parabolas, thresholds, and interactions. A feature with Pearson r = 0 can still have high MI (e.g., y = x² has r ≈ 0 but MI > 0). MI is the most general filter: it detects any statistically dependent relationship. The cost is computational (slower than Pearson) and the estimator is noisier (the discretization introduces variance). Use MI as a second filter after Pearson/ANOVA to catch what they missed.",
    when: "Use mutual information when you suspect nonlinear relationships (parabolic, threshold, saturation) or when the feature distributions are non-normal. Use it as a robustness check after Pearson/ANOVA — if MI and Pearson disagree for a feature, the relationship is likely nonlinear. For classification, use mutual_info_classif; for regression, mutual_info_regression. Always fit on the TRAINING fold only. Set k via cross-validation; the absolute MI values are not directly comparable across problems.",
    how: "1. from sklearn.feature_selection import SelectKBest, mutual_info_classif. 2. selector = SelectKBest(score_func=mutual_info_classif, k=10). 3. X_train_selected = selector.fit_transform(X_train, y_train). 4. X_test_selected = selector.transform(X_test). 5. selector.scores_ gives MI per feature. 6. Compare with Pearson: features where MI is high but Pearson is low are likely nonlinear. 7. The MI estimator is noisy — run with multiple random seeds (mutual_info_classif has a random_state parameter) and average to stabilize.",
    example: "Predicting revenue from 'advertising_spend' where the true relationship is diminishing returns (low spend → low revenue, moderate spend → high revenue, high spend → diminishing). Pearson r might be 0.4 (the parabola cancels the linear fit), but MI is 0.8 (the relationship is strong, just non-monotonic). SelectKBest with MI retains 'advertising_spend'; with Pearson (via f_regression), it might drop it. The MI-selected model performs better because it captures the true relationship.",
    code: `from sklearn.feature_selection import SelectKBest, mutual_info_classif

# Fit on TRAIN only
selector = SelectKBest(score_func=mutual_info_classif, k=10, random_state=42)
X_train_selected = selector.fit_transform(X_train, y_train)
X_test_selected = selector.transform(X_test)

# Compare MI with Pearson to find nonlinear features
mi_scores = selector.scores_
from sklearn.feature_selection import f_classif
f_scores, _ = f_classif(X_train, y_train)

comparison = pd.DataFrame({
    "feature": feature_names,
    "mutual_info": mi_scores,
    "anova_f": f_scores,
    "selected": selector.get_support(),
})
comparison["nonlinear_flag"] = (
    (comparison["mutual_info"] > comparison["mutual_info"].median())
    & (comparison["anova_f"] < comparison["anova_f"].median())
)
print(comparison.sort_values("mutual_info", ascending=False))`,
    interpretation: "The comparison table flags features where MI is high but ANOVA F is low — those are likely nonlinear relationships. Inspect them with scatter plots: if the scatter shows a parabola, threshold, or saturation curve, MI is right and Pearson/ANOVA missed it. The MI estimator is noisy (discretization-based) — for important features, verify with a permutation test or a tree-based importance check.",
    mistakes: [
      "Treating MI as a stable estimator — it's discretization-based and noisy. Average over multiple seeds.",
      "Forgetting random_state — MI gives different scores each run without a seed.",
      "Using MI as the only filter — it catches nonlinearity but is slower and noisier than Pearson/ANOVA. Use both.",
      "Interpreting MI as a correlation coefficient — MI is in 'bits' (log₂ units), not in [-1, 1]. MI ≥ 0 always.",
    ],
    takeaway: "Mutual information catches ANY relationship (linear, nonlinear, threshold) without assuming a functional form. Use as a robustness check after Pearson/ANOVA — features with high MI but low Pearson are nonlinear. Set random_state for reproducibility.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "tree-importance",
    category: "Feature Selection",
    title: "Tree Importance: Model-Based Ranking",
    concept: "Tree-based models (DecisionTree, RandomForest, ExtraTrees, GradientBoosting) compute feature_importances_ — a per-feature score summing to 1.0 that measures how much each feature contributes to the model's splits. A feature with importance 0.40 was used in splits that reduced impurity by 40% of the total reduction. SelectFromModel(estimator=RandomForestClassifier(), threshold='median') keeps features whose importance exceeds the median.",
    why: "Unlike filter methods (which score features in isolation), tree importance scores features in the context of a fitted model — it captures interactions (feature A matters only when feature B is high) and nonlinearity automatically. A feature that's weak in isolation but strong in combination with another gets a high importance score. This is the most accurate model-based ranking for tabular data, and it's the standard for industry feature selection.",
    when: "Use tree importance as the default model-based selection for tabular data. Use RandomForest or ExtraTrees for stability (averaging over many trees reduces variance); use GradientBoosting or XGBoost for the highest accuracy but more instability. Set threshold='median' (keep top 50%) or threshold='2*mean' (keep top ~25%) or use SelectFromModel with max_features=10 for an exact count. Always fit on the TRAINING fold only.",
    how: "1. from sklearn.ensemble import RandomForestClassifier. 2. from sklearn.feature_selection import SelectFromModel. 3. rf = RandomForestClassifier(n_estimators=100, random_state=42). 4. selector = SelectFromModel(rf, threshold='median'). 5. X_train_selected = selector.fit_transform(X_train, y_train). 6. X_test_selected = selector.transform(X_test). 7. rf.feature_importances_ gives the raw importances. 8. selector.get_support() returns the Boolean mask. 9. For stability, fit multiple RFs with different seeds and average the importances.",
    example: "Predicting customer churn with 25 features. A RandomForest fits and reports: 'tenure' importance=0.28, 'monthly_charge'=0.18, 'contract_type'=0.15, 'total_charge'=0.10, 'tenure × contract_type interaction'=0.05 (if you engineered it), and 20 features each <0.05. SelectFromModel(threshold='median') keeps the top ~12 features, dropping the 13 weakest. The retained feature set often performs nearly as well as the full set with much lower dimensionality.",
    code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectFromModel

# Fit a RandomForest on TRAIN only
rf = RandomForestClassifier(n_estimators=100, random_state=42)
selector = SelectFromModel(rf, threshold="median")  # keep top 50%
X_train_selected = selector.fit_transform(X_train, y_train)
X_test_selected = selector.transform(X_test)

# Inspect the importances
importances = pd.Series(rf.feature_importances_, index=feature_names).sort_values(ascending=False)
print(importances.head(15))

# For stability, fit multiple RFs and average
importances_list = []
for seed in [42, 7, 123, 2024, 99]:
    rf = RandomForestClassifier(n_estimators=100, random_state=seed).fit(X_train, y_train)
    importances_list.append(rf.feature_importances_)
avg_importance = pd.DataFrame(importances_list, columns=feature_names).mean().sort_values(ascending=False)
print(avg_importance.head(15))

# Keep top 10 by average importance
top_10 = avg_importance.head(10).index.tolist()`,
    interpretation: "The importance ranking shows which features the trees actually used. A feature with importance 0.40 was the dominant splitter; a feature with importance 0.01 was rarely or never used. Check the dropped list — if a domain-expert feature is dropped, it may have been 'shielded' by a correlated feature (trees pick one at each split; the other gets low importance despite being equally predictive). Average over multiple seeds to stabilize.",
    mistakes: [
      "Fitting the selector on the full dataset — leakage. Always fit on train only.",
      "Trusting a single RF's importances — RF importance is unstable with correlated features (one is picked, the other starves). Average over multiple seeds.",
      "Using tree importance with high-cardinality categoricals — trees bias toward high-cardinality features (more split points). One-hot encode or use permutation importance instead.",
      "Confusing importance with causation — a feature can have high importance because it's correlated with the true cause, not because it causes the outcome.",
    ],
    takeaway: "Tree importance ranks features by their contribution to a fitted model's splits. Captures interactions and nonlinearity automatically. Fit on train only. Average over multiple seeds for stability. Watch for high-cardinality bias — use permutation importance as a cross-check.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "lasso-importance",
    category: "Feature Selection",
    title: "Lasso (L1) Importance: Zero-Out Weak Features",
    concept: "Lasso regression (L1-penalized linear regression) shrinks some coefficients to exactly zero, performing feature selection as a side effect of regularization. The penalty term λ · Σ|β| pushes small coefficients to zero while keeping large ones. The surviving features are the Lasso's selection. Stronger λ → more zeros (more selection); weaker λ → fewer zeros (less selection). ElasticNet blends L1 and L2, retaining Lasso's selection property while stabilizing with correlated features.",
    why: "Lasso is the only method that performs selection AS PART of model training — the selection is endogenous, not a separate filter. This avoids the train/val mismatch that plagues filter methods (you select on what you train on). Lasso is also interpretable: each surviving feature has a coefficient, and the coefficient's sign tells you the direction of the effect. For high-dimensional linear problems (genomics, text features), Lasso is the workhorse.",
    when: "Use Lasso for linear problems where interpretability matters: sparse regression, feature selection for linear models, genomic / text feature selection. Avoid Lasso when features are highly correlated — it picks one and zeros out the others arbitrarily (use ElasticNet with l1_ratio=0.5 instead). Avoid Lasso for nonlinear problems (use tree importance instead). Tune λ via LassoCV (cross-validated); never use the test set to pick λ.",
    how: "1. from sklearn.linear_model import LassoCV. 2. lasso = LassoCV(cv=5, random_state=42) — cross-validates λ automatically. 3. lasso.fit(X_train, y_train). 4. selected = X_train.columns[lasso.coef_ != 0]. 5. Inspect the coefficient magnitudes — |β| measures importance. 6. For ElasticNet: from sklearn.linear_model import ElasticNetCV; en = ElasticNetCV(l1_ratio=[0.1, 0.5, 0.9], cv=5). 7. SelectFromModel(lasso) wraps the selection in a sklearn-compatible transformer.",
    example: "Predicting house prices from 50 features (square footage, bedrooms, bathrooms, location dummies, etc.). LassoCV picks λ via 5-fold CV and reports 12 non-zero coefficients. 'sqft' has β=210, 'bedrooms' β=-15000 (each bedroom reduces price when holding sqft constant — smaller rooms), 'location_downtown' β=45000. The other 38 features have β=0 — Lasso determined they don't add signal beyond the 12 selected. The model is interpretable and sparse.",
    code: `from sklearn.linear_model import LassoCV
from sklearn.feature_selection import SelectFromModel

# Cross-validate the L1 strength on TRAIN only
lasso = LassoCV(cv=5, random_state=42, max_iter=10000)
lasso.fit(X_train, y_train)

# Surviving features (non-zero coefficients)
selected_mask = lasso.coef_ != 0
selected_features = [f for f, keep in zip(feature_names, selected_mask) if keep]
print(f"Lasso selected {len(selected_features)} of {len(feature_names)} features")
print(f"Best alpha: {lasso.alpha_}")

# Coefficient magnitudes = importance
coefs = pd.DataFrame({
    "feature": feature_names,
    "coef": lasso.coef_,
    "abs_coef": np.abs(lasso.coef_),
}).sort_values("abs_coef", ascending=False)
print(coefs.head(15))

# Wrap in SelectFromModel for pipeline compatibility
selector = SelectFromModel(LassoCV(cv=5, random_state=42))
X_train_selected = selector.fit_transform(X_train, y_train)`,
    interpretation: "The coefficient table shows which features survived (non-zero) and their magnitudes (importance). A coefficient of 0 means Lasso determined the feature adds no signal beyond what the others already provide. Check the dropped list: if a domain-expert feature was zeroed, it may be collinear with a stronger feature (use ElasticNet to retain groups of correlated features). The best alpha tells you the L1 strength that generalized best in CV — use it, don't second-guess.",
    mistakes: [
      "Picking λ by hand — always use LassoCV; the optimal λ depends on the data.",
      "Fitting Lasso on the full dataset — leakage. Always fit on train only.",
      "Using Lasso with highly-correlated features — Lasso picks one and zeros the rest arbitrarily. Use ElasticNet (l1_ratio=0.5) instead.",
      "Forgetting to standardize features before Lasso — the L1 penalty treats all coefficients equally, but unstandardized features have incomparable scales. Always StandardScaler first (inside a Pipeline).",
    ],
    takeaway: "Lasso performs feature selection AS PART of training by zeroing out weak coefficients. Use LassoCV to tune λ. Use ElasticNet for correlated features. Always standardize first (inside a Pipeline). Coefficients give both selection AND direction.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "permutation-importance",
    category: "Feature Selection",
    title: "Permutation Importance: Drop-in-Score Measurement",
    concept: "Permutation importance measures how much a fitted model's score drops when a feature's values are randomly shuffled. The model is fit once on train; then, for each feature, the feature's column is shuffled across rows in the validation set, the model is re-scored, and the drop in score is recorded. A large drop = the model relied on this feature. A small drop = the feature is not important to the model's predictions. Unlike tree importance, permutation importance works with ANY model.",
    why: "Tree importance is model-specific (only tree-based models expose feature_importances_) and biased toward high-cardinality features. Permutation importance is model-agnostic — it works for linear models, neural networks, kNN, anything. It also measures the feature's importance TO THE FITTED MODEL, not its standalone predictive power — capturing interactions automatically. The cost is computational: one re-fit per feature (or several for stability).",
    when: "Use permutation importance as a robustness check after tree importance or Lasso. Use it when the model is non-tree (linear, kNN, neural net) and you still need feature importance. Use it when you suspect high-cardinality bias in tree importance. Always compute on the VALIDATION fold (not test, not train — train overstates importance because the model overfit). Run with multiple random seeds and average — the shuffle is random.",
    how: "1. from sklearn.inspection import permutation_importance. 2. Fit the model on train: model.fit(X_train, y_train). 3. Compute on val: result = permutation_importance(model, X_val, y_val, n_repeats=10, random_state=42, scoring='f1'). 4. result.importances_mean gives the mean drop per feature. 5. result.importances_std gives the stability across repeats. 6. Sort by importances_mean to rank. 7. A negative importance means shuffling the feature IMPROVED the score — the feature is noise; drop it.",
    example: "A RandomForest trained to predict churn has 'zip_code' with high feature_importance_ (high cardinality bias). Permutation importance on the validation set shows zip_code's shuffle drops the F1 by only 0.001 — the model didn't actually rely on it. But 'tenure' has a permutation importance of 0.08 — shuffling tenure drops F1 by 8 percentage points. The permutation ranking is more honest than the tree importance ranking for this problem.",
    code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance

# Fit on train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Permutation importance on VALIDATION (not test, not train)
result = permutation_importance(
    model, X_val, y_val,
    n_repeats=10,        # 10 shuffles per feature for stability
    random_state=42,
    scoring="f1",        # use the metric you care about
)

importance_df = pd.DataFrame({
    "feature": feature_names,
    "importance_mean": result.importances_mean,
    "importance_std": result.importances_std,
}).sort_values("importance_mean", ascending=False)
print(importance_df)

# Drop features with non-positive importance (noise)
to_drop = importance_df[importance_df["importance_mean"] <= 0]["feature"].tolist()`,
    interpretation: "The permutation importance table shows each feature's mean score-drop and its standard deviation across repeats. A high mean with low std = robustly important. A high mean with high std = unstable importance (correlated features cause this — when you shuffle one, the correlated others compensate). A negative mean = the feature is noise; shuffling it improves the model. Always use n_repeats ≥ 5 for stability.",
    mistakes: [
      "Computing permutation importance on the TRAINING set — overstates importance because the model overfit. Always use validation.",
      "Using n_repeats=1 — too noisy. Use ≥ 5 (10 is standard).",
      "Ignoring the std — a feature with mean=0.05 and std=0.08 is unstable; a feature with mean=0.05 and std=0.001 is robust.",
      "Interpreting permutation importance as causal — it measures how much the MODEL relies on the feature, not whether the feature causes the outcome.",
    ],
    takeaway: "Permutation importance measures the drop in a fitted model's score when a feature is shuffled. Model-agnostic. Compute on validation (not train, not test). Use n_repeats ≥ 5. Watch for correlated features (high std). Drop features with non-positive importance.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  {
    id: "rfe-wrapper",
    category: "Feature Selection",
    title: "RFE / RFECV / SFS: Wrapper Methods",
    concept: "Wrapper methods evaluate feature subsets by repeatedly fitting a model and scoring it. RFE (Recursive Feature Elimination) starts with all features, fits a model, drops the lowest-importance feature, refits, and repeats until n_features_to_select remain. RFECV adds cross-validation to pick the optimal count automatically. SFS (Sequential Forward Selection) starts empty and greedily adds the feature that most improves the score. SBS (Sequential Backward Selection) is the reverse.",
    why: "Wrapper methods directly optimize the metric you care about (accuracy, F1, RMSE) — they don't rely on a proxy like correlation or importance. RFECV is the gold standard for 'what's the optimal number of features?' — it tries every subset size from k down to 1 and picks the size with the best CV score. The cost is computational: RFE is O(k²) fits; SFS is O(k²) fits; RFECV is O(k² × cv) fits. For small-to-medium feature sets (< 50), this is feasible.",
    when: "Use RFECV when you want the optimal feature count chosen automatically. Use RFE with a fixed n_features_to_select when you have a hard constraint (e.g., 'we can only collect 5 features in production'). Use SFS when starting from scratch (no features) and greedily adding is more natural. Use SBS when starting from all features and greedily removing is more natural. Always use a Pipeline + cross_val_score so each CV fold fits the wrapper on the inner train only — never run RFECV on the full dataset.",
    how: "1. from sklearn.feature_selection import RFECV. 2. from sklearn.ensemble import RandomForestClassifier. 3. rf = RandomForestClassifier(random_state=42). 4. selector = RFECV(rf, step=1, cv=5, scoring='f1', min_features_to_select=1). 5. selector.fit(X_train, y_train). 6. selector.support_ returns the Boolean mask. 7. selector.ranking_ returns the rank (1 = selected first; higher = eliminated earlier). 8. selector.cv_results_ gives the CV score for each subset size — inspect to verify the chosen count is a clear maximum, not noise.",
    example: "Predicting churn with 30 features. RFECV with a 5-fold CV tries every subset size from 1 to 30, fitting a RandomForest each time. The CV results show F1 peaks at 12 features (F1=0.84) and declines for larger subsets (overfitting). RFECV selects those 12 features. The ranking shows which features were eliminated first (rank 30 = dropped first, rank 1 = kept). The selected set is the model's optimal subset for this CV setup.",
    code: `from sklearn.feature_selection import RFECV, RFE, SequentialFeatureSelector
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold

# RFECV — pick the optimal feature count automatically
rf = RandomForestClassifier(n_estimators=50, random_state=42)
selector = RFECV(
    rf,
    step=1,                       # drop 1 feature per iteration
    cv=StratifiedKFold(5),        # 5-fold stratified CV
    scoring="f1",
    min_features_to_select=1,
)
selector.fit(X_train, y_train)

print(f"Optimal feature count: {selector.n_features_}")
selected_features = [f for f, keep in zip(feature_names, selector.support_) if keep]
print(f"Selected: {selected_features}")

# Inspect the CV curve
cv_scores = selector.cv_results_["mean_test_score"]
print(f"CV scores per subset size: {cv_scores}")

# RFE with a fixed count (when you have a hard constraint)
rfe = RFE(rf, n_features_to_select=10)
rfe.fit(X_train, y_train)
ranking = pd.DataFrame({
    "feature": feature_names,
    "rank": rfe.ranking_,        # 1 = selected; higher = eliminated earlier
    "selected": rfe.support_,
}).sort_values("rank")

# Sequential Forward Selection (greedy add)
sfs = SequentialFeatureSelector(rf, n_features_to_select=10, direction="forward", cv=5)
sfs.fit(X_train, y_train)`,
    interpretation: "The CV curve (cv_results_['mean_test_score']) shows F1 for each subset size. The optimal is the size with the highest mean CV score — verify it's a clear maximum, not noise (if the curve is flat, feature count doesn't matter much). The ranking shows the elimination order: features eliminated early (high rank) are weakest; features kept (rank 1) are strongest. Check the ranking for stability — features ranked 5-15 may swap places across different seeds.",
    mistakes: [
      "Running RFECV on the full dataset — leakage. Always use a CV split so each fold fits on inner train only.",
      "Picking n_features_to_select by hand — that defeats the point of RFECV. Let the CV decide.",
      "Ignoring the CV curve — if the curve is flat, feature selection isn't helping; reconsider whether you need it.",
      "Using RFECV with a high-variance estimator (single DecisionTree) — the rankings are unstable. Use RandomForest or LinearRegression for stability.",
    ],
    takeaway: "Wrapper methods (RFE, RFECV, SFS, SBS) directly optimize the model's score by repeatedly fitting and scoring. RFECV picks the optimal feature count via CV. Always run inside a CV loop (leakage-safe). Inspect the CV curve — if it's flat, feature selection isn't helping.",
    labLink: "fs-lab",
    demo: { kind: "feature-selection", defaultTarget: "revenue" },
  },
  // ─── FEATURE ENGINEERING EXTENSIONS ─────────────────────────────
  {
    id: "feature-interactions",
    category: "Feature Engineering",
    title: "Feature Interactions: Capturing Combinations",
    concept: "An interaction feature is the product (or ratio, sum, difference) of two or more existing features. A linear model can only learn additive effects: y = β₁·x₁ + β₂·x₂. But many real effects are multiplicative: revenue = quantity × unit_price. Adding the interaction feature x₁·x₂ lets the linear model learn the combined effect directly. Polynomial features (x², x³, x₁·x₂, x₁²·x₂) extend this to curvature and higher-order interactions.",
    why: "Without interaction features, a linear model misses combined effects. 'Advertising spend' and 'holiday_week' each have a small main effect, but together they have a large effect (holiday + advertising = compounding). Without the interaction term, the linear model underestimates holiday ad campaigns. Tree models discover interactions automatically (they split on combinations); linear models need them engineered. The cost: feature count explodes — k features generate k(k-1)/2 pairwise interactions.",
    when: "Engineer interaction features for linear models whenever you suspect combined effects: quantity × price for revenue, holiday × ad_spend for marketing, age × income for credit risk. Avoid for tree models — they already discover interactions and adding them adds noise. Avoid for very high-dimensional data — k² features is intractable. Use PolynomialFeatures(degree=2) for a systematic sweep; use manual interaction features for domain-specific combinations.",
    how: "1. Manual: df['revenue'] = df['quantity'] * df['unit_price']. 2. PolynomialFeatures: from sklearn.preprocessing import PolynomialFeatures; poly = PolynomialFeatures(degree=2, interaction_only=False, include_bias=False); X_poly = poly.fit_transform(X_train). 3. interaction_only=True drops the squared terms (x²), keeping only x₁·x₂, x₁·x₃, etc. 4. Inspect the feature names: poly.get_feature_names_out(). 5. Use SelectFromModel after polynomial expansion — most interaction features are noise, so select the useful ones. 6. Always fit PolynomialFeatures on train only.",
    example: "Predicting house prices with 'sqft' and 'bedrooms'. A linear model without interactions: price = β₁·sqft + β₂·bedrooms. With interactions: price = β₁·sqft + β₂·bedrooms + β₃·(sqft × bedrooms). The interaction term β₃ captures 'larger bedrooms add more value per square foot' — a combined effect the additive model misses. For 2 features, you get 1 interaction; for 10 features, you get 45 — manage dimensionality with selection.",
    code: `# Manual interaction feature
df["revenue"] = df["quantity"] * df["unit_price"]
df["profit_per_unit"] = df["profit"] / df["quantity"]

# PolynomialFeatures (systematic)
from sklearn.preprocessing import PolynomialFeatures
poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
X_train_poly = poly.fit_transform(X_train)
X_test_poly = poly.transform(X_test)
print(poly.get_feature_names_out(X_train.columns))
# ['quantity' 'unit_price' 'quantity unit_price']

# Inside a Pipeline (leakage-safe)
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
pipe = Pipeline([
    ("poly", PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)),
    ("model", LinearRegression()),
])
pipe.fit(X_train, y_train)

# Domain-specific interactions
df["holiday_ad_spend"] = df["is_holiday"] * df["ad_spend"]`,
    interpretation: "The interaction feature's coefficient tells you the combined effect's direction and magnitude. A positive β₃ for sqft × bedrooms means larger bedrooms amplify the sqft effect. PolynomialFeatures with interaction_only=True is the standard for 'add pairwise combinations without curvature'. After expansion, use SelectFromModel to drop the noisy interactions — most pairwise features are not predictive.",
    mistakes: [
      "Adding interaction features for tree models — trees already discover interactions; adding them is redundant noise.",
      "Forgetting interaction_only=True — generates x² terms too, which may not be what you want and explode dimensionality.",
      "Fitting PolynomialFeatures on the full dataset — leakage. Always fit on train only.",
      "Not selecting after expansion — k(k-1)/2 features is too many; use SelectFromModel or permutation importance to retain the useful interactions.",
    ],
    takeaway: "Interaction features (x₁ × x₂) let linear models learn combined effects they'd otherwise miss. Use PolynomialFeatures(degree=2, interaction_only=True) for systematic pairwise expansion. Fit on train only. Select afterward — most interactions are noise. Avoid for tree models (they discover interactions automatically).",
    labLink: "fe-lab",
    demo: { kind: "describe-stats", defaultCol: "revenue" },
  },
  {
    id: "polynomial-features",
    category: "Feature Engineering",
    title: "Polynomial Features: Capturing Curvature",
    concept: "Polynomial features add powers of existing features (x², x³) and cross-terms (x₁·x₂, x₁²·x₂) so a linear model can fit nonlinear curves. A linear regression on [x, x²] can fit any parabola; on [x, x², x³] any cubic; on [x₁, x₂, x₁·x₂, x₁², x₂²] any quadratic surface. PolynomialFeatures(degree=d) generates all monomials up to degree d. The model is still linear in the coefficients — it's a linear model on a nonlinear feature space.",
    why: "Without polynomial features, a linear model cannot fit a parabola (y = x²), a saturation curve (y = √x), or any nonlinear pattern. Adding x² as a feature lets the linear model fit: y = β₀ + β₁·x + β₂·x². For a symmetric parabola (Pearson r ≈ 0 between x and y), the polynomial expansion makes the relationship capturable (β₂ > 0). The cost: feature count explodes — degree=3 with k features produces (k+1)(k+2)(k+3)/6 features.",
    when: "Use polynomial features when the relationship is known to be polynomial (physics, geometry) or when a scatter plot reveals curvature. Use degree=2 for parabolic patterns; degree=3 for S-curves. Avoid for high-dimensional data (explosion). Always standardize before polynomial expansion — x² dominates x when x is large, breaking the model. Always select after expansion — most polynomial features are noise.",
    how: "1. from sklearn.preprocessing import PolynomialFeatures. 2. poly = PolynomialFeatures(degree=2, include_bias=False). 3. X_train_poly = poly.fit_transform(X_train). 4. Inspect names: poly.get_feature_names_out(). 5. Standardize first: pipe = Pipeline([('scaler', StandardScaler()), ('poly', PolynomialFeatures(degree=2)), ('model', LinearRegression())]). 6. Use SelectFromModel(LassoCV()) after expansion to retain only useful polynomial features. 7. Always fit on train only.",
    example: "Predicting revenue from advertising_spend where the true relationship is diminishing returns (low spend → low revenue, moderate spend → high revenue, high spend → diminishing). A linear model on x = ad_spend fits a straight line that misses the curve. With polynomial features [x, x²], the model fits y = β₀ + β₁·x + β₂·x² with β₂ < 0 — a parabola that captures the saturation. The R² jumps from 0.4 (linear) to 0.85 (quadratic).",
    code: `import numpy as np
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

# Generate data with a parabolic relationship
np.random.seed(42)
x = np.linspace(-5, 5, 100)
y = 2 + 3 * x - 1.5 * x**2 + np.random.normal(0, 2, 100)  # parabola + noise

# Linear model alone — fits a flat line (Pearson r ≈ 0)
from sklearn.metrics import r2_score
model_linear = LinearRegression().fit(x.reshape(-1, 1), y)
print(f"Linear R²: {r2_score(y, model_linear.predict(x.reshape(-1, 1))):.3f}")

# Polynomial model (degree=2) — captures the parabola
pipe = Pipeline([
    ("poly", PolynomialFeatures(degree=2, include_bias=False)),
    ("model", LinearRegression()),
])
pipe.fit(x.reshape(-1, 1), y)
print(f"Polynomial R²: {r2_score(y, pipe.predict(x.reshape(-1, 1))):.3f}")

# Inspect the polynomial features
poly = PolynomialFeatures(degree=2, include_bias=False)
poly.fit(x.reshape(-1, 1))
print(poly.get_feature_names_out(["ad_spend"]))
# ['ad_spend' 'ad_spend^2']`,
    interpretation: "The polynomial model's R² should be substantially higher than the linear model's if the relationship is truly curved. Inspect the coefficients: β₂ (the squared term) being negative indicates a downward-opening parabola (saturation); positive indicates upward (acceleration). Always pair polynomial expansion with regularization (Lasso, Ridge) — without it, the high-dimensional feature space overfits.",
    mistakes: [
      "Using high degree (4+) — overfits badly. Degree 2 or 3 is almost always enough.",
      "Not standardizing before polynomial expansion — x² dominates x for large x, breaking the linear model.",
      "Forgetting regularization — polynomial expansion creates many features; Lasso or Ridge is essential to avoid overfitting.",
      "Using polynomial features for tree models — trees handle curvature natively; adding polynomial features adds noise.",
    ],
    takeaway: "Polynomial features (x², x³, x₁·x₂) let linear models fit nonlinear curves. Degree 2 or 3 is enough. Standardize first, regularize after, select the useful features. Avoid for tree models.",
    labLink: "fe-lab",
    demo: { kind: "transform", defaultCol: "revenue", defaultTransform: "square" },
  },
  {
    id: "ordinal-encoding",
    category: "Feature Engineering",
    title: "Ordinal & Label Encoding: Ordered Integer Codes",
    concept: "Ordinal encoding maps each category to an integer that respects the category's natural order: 'low' → 0, 'medium' → 1, 'high' → 2. Label encoding maps each category to an arbitrary integer (the order is by appearance or alphabet) — useful for tree models that don't interpret integer order, but misleading for linear models. pd.factorize() does label encoding; sklearn's OrdinalEncoder does domain-defined ordinal encoding with a categories parameter.",
    why: "For genuinely ordinal categories (satisfaction: low/medium/high; tier: bronze/silver/gold), one-hot encoding loses the order information — the model can't learn that 'high' > 'medium'. Ordinal encoding preserves the order as integer codes, letting linear models learn a monotonic effect. For nominal categories (region: North/South/East/West), ordinal encoding imposes a false order — the model learns 'West' > 'East' > 'South' > 'North' just because of the integer codes, which is meaningless.",
    when: "Use ordinal encoding when the category has a natural order (satisfaction, tier, education level, severity). Use one-hot encoding when the category is nominal (region, color, product type). Use label encoding (factorize) only for tree models — they don't interpret integer order, so the arbitrary codes don't mislead them. Never use label encoding for linear or distance-based models — the arbitrary order misleads them. Always map categories via a domain-defined mapping (don't trust alphabetical order).",
    how: "1. Domain-defined: df['tier_code'] = df['tier'].map({'bronze': 0, 'silver': 1, 'gold': 2}). 2. sklearn: from sklearn.preprocessing import OrdinalEncoder; oe = OrdinalEncoder(categories=[['bronze', 'silver', 'gold']]); df['tier_code'] = oe.fit_transform(df[['tier']]). 3. Label encoding: df['region_code'], uniques = pd.factorize(df['region']) — returns codes + the unique values. 4. For unseen categories at inference: use OrdinalEncoder with handle_unknown='use_encoded_value', unknown_value=-1. 5. Always fit on train only.",
    example: "Customer satisfaction has three ordered levels: 'unsatisfied', 'neutral', 'satisfied'. Mapping to {0, 1, 2} lets the linear model learn 'each level of satisfaction increases revenue by $X'. One-hot encoding would lose the order — the model would have to learn three separate coefficients with no monotonicity constraint. But for 'region' (nominal), ordinal encoding would impose a false order (North=0, South=1, ...) — the model would learn 'South > North' just because 1 > 0.",
    code: `# Domain-defined ordinal mapping (always specify the order explicitly)
satisfaction_order = {"unsatisfied": 0, "neutral": 1, "satisfied": 2}
df["satisfaction_code"] = df["satisfaction"].map(satisfaction_order)

# sklearn OrdinalEncoder with explicit categories
from sklearn.preprocessing import OrdinalEncoder
oe = OrdinalEncoder(
    categories=[["bronze", "silver", "gold"], ["low", "medium", "high"]],
    handle_unknown="use_encoded_value",
    unknown_value=-1,
    encoded_missing_value=-1,
)
df[["tier_code", "severity_code"]] = oe.fit_transform(df[["tier", "severity"]])

# Label encoding (factorize) — for tree models only
df["region_code"], region_uniques = pd.factorize(df["region"])
print(region_uniques)  # Index(['North', 'South', 'East', ...]) — order is arbitrary

# Inside a Pipeline (leakage-safe)
from sklearn.pipeline import Pipeline
pipe = Pipeline([
    ("ordinal", OrdinalEncoder(categories=[["bronze", "silver", "gold"]])),
    ("model", LogisticRegression()),
])`,
    interpretation: "The ordinal codes preserve the category order as integers. For a linear model, the coefficient on 'satisfaction_code' tells you the per-level effect (e.g., +$15 per satisfaction level). For one-hot encoding, you'd get separate coefficients per level, losing the monotonicity. Check the mapping: if 'gold' is mapped to 0 and 'bronze' to 2, the model learns the wrong direction — always inspect the mapping after encoding.",
    mistakes: [
      "Using ordinal encoding for nominal categories — imposes a false order that misleads linear models.",
      "Trusting alphabetical order — 'bronze' < 'gold' < 'silver' alphabetically, which is wrong. Always specify the order explicitly.",
      "Using label encoding (factorize) for linear models — the arbitrary integer order misleads them. Use it only for tree models.",
      "Forgetting handle_unknown='use_encoded_value' — production data will have unseen categories; without this, OrdinalEncoder crashes.",
    ],
    takeaway: "Ordinal encoding preserves category order for genuinely ordinal variables (satisfaction, tier). Always specify the order explicitly — never trust alphabetical. Use one-hot for nominal. Use label encoding (factorize) only for tree models. Handle unseen categories at inference.",
    labLink: "module-10",
    demo: { kind: "encoding", defaultCol: "category", defaultMethod: "label" },
  },
  {
    id: "target-encoding",
    category: "Feature Engineering",
    title: "Target Encoding: Category → Mean Target",
    concept: "Target encoding replaces each category with the mean of the target variable for that category, computed on the TRAINING fold only. For a binary classification target: 'North' → 0.42 if 42% of North training rows are positive. For a regression target: 'North' → $185 if North training rows average $185. This compresses high-cardinality categoricals into a single numeric feature that's directly predictive, avoiding the dimensionality blowup of one-hot.",
    why: "For high-cardinality categoricals (zip_code with 10000 values, product_id with 5000), one-hot encoding produces 5000-10000 sparse columns — intractable for most models. Target encoding produces ONE column that captures the category's predictive signal. The risk is severe leakage: if you compute category means on the full dataset, the encoding contains the target for each row — the model 'knows' the answer. The fix: compute means on the TRAINING fold only, with smoothing toward the global mean for rare categories.",
    when: "Use target encoding for high-cardinality categoricals (> 20 distinct values) where one-hot is intractable. Avoid for low-cardinality categoricals (< 10) — one-hot is safer and more interpretable. Always use with leakage-safe fitting: fit on train only, apply to test with global-mean fallback for unseen categories. Use smoothing (Bayesian average) for rare categories: encoded = (n_cat * cat_mean + alpha * global_mean) / (n_cat + alpha), where alpha controls smoothing strength.",
    how: "1. from sklearn.model_selection import train_test_split FIRST. 2. X_train, X_test, y_train, y_test = train_test_split(...). 3. Compute category means on X_train + y_train ONLY: means = X_train.assign(y=y_train).groupby('category')['y'].mean(). 4. Apply to X_train: X_train['cat_encoded'] = X_train['category'].map(means). 5. Apply to X_test with global-mean fallback for unseen: X_test['cat_encoded'] = X_test['category'].map(means).fillna(y_train.mean()). 6. Use category_encoders.TargetEncoder for production-grade smoothing and CV-fold encoding.",
    example: "Predicting customer churn with 'zip_code' (5000 distinct values). One-hot produces 5000 columns — intractable. Target encoding produces one column: each zip code is replaced by the churn rate of training customers in that zip code. '90210' → 0.12 (low churn), '10001' → 0.34 (medium), '60601' → 0.45 (high). The model now has a single predictive feature. The leakage-safe version uses train-only means — test rows with unseen zip codes fall back to the global churn rate (0.25).",
    code: `from sklearn.model_selection import train_test_split

# Split FIRST (before any encoding)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Compute category means on TRAIN ONLY
train_with_y = X_train.assign(_target_=y_train)
cat_means = train_with_y.groupby("zip_code")["_target_"].mean()
global_mean = y_train.mean()

# Apply to train (no leakage — uses train means)
X_train["zip_encoded"] = X_train["zip_code"].map(cat_means)

# Apply to test with global-mean fallback for unseen categories
X_test["zip_encoded"] = X_test["zip_code"].map(cat_means).fillna(global_mean)

# Smoothed version (Bayesian average — shrinks rare categories toward global mean)
alpha = 50  # smoothing strength
cat_stats = train_with_y.groupby("zip_code")["_target_"].agg(["mean", "count"])
smoothed = (cat_stats["count"] * cat_stats["mean"] + alpha * global_mean) / (cat_stats["count"] + alpha)
X_train["zip_encoded_smoothed"] = X_train["zip_code"].map(smoothed)
X_test["zip_encoded_smoothed"] = X_test["zip_code"].map(smoothed).fillna(global_mean)

# Production-grade: category_encoders.TargetEncoder (CV-fold encoding built in)
# from category_encoders import TargetEncoder
# te = TargetEncoder(min_samples_leaf=50, smoothing=10)
# X_train["zip_encoded"] = te.fit_transform(X_train["zip_code"], y_train)
# X_test["zip_encoded"] = te.transform(X_test["zip_code"])`,
    interpretation: "The encoded column has one numeric value per row, representing the category's average target in the training set. A high value means the category is associated with a high target (positive class for classification, high value for regression). Compare train and test distributions of the encoded column — if they differ, the test set has different category proportions, and you should investigate. The smoothed version reduces overfitting for rare categories (a zip code with 2 training rows shouldn't get a 0% or 100% churn rate).",
    mistakes: [
      "Computing category means on the full dataset — SEVERE leakage. The encoding contains the target for each row. Always split first.",
      "Not using global-mean fallback for unseen test categories — production data will have unseen categories; without fallback, the encoded value is NaN.",
      "Not smoothing rare categories — a category with 2 training rows has an unreliable mean. Use Bayesian smoothing.",
      "Using target encoding for low-cardinality categoricals — one-hot is safer and more interpretable when tractable.",
    ],
    takeaway: "Target encoding compresses high-cardinality categoricals into one predictive numeric column. SEVERE leakage risk — always fit on train only with global-mean fallback. Smooth rare categories toward the global mean. Use category_encoders.TargetEncoder for production-grade CV-fold encoding.",
    labLink: "module-10",
    demo: { kind: "target-encoding", defaultCol: "region", defaultTarget: "revenue" },
  },
  {
    id: "frequency-encoding",
    category: "Feature Engineering",
    title: "Frequency Encoding: Category → Count",
    concept: "Frequency encoding replaces each category with its frequency (count) in the dataset: 'North' → 47 if 47 rows are North. This is unsupervised (no target needed), making it leakage-safe by construction — you can compute frequencies on the full dataset. Variants include rank encoding (replace with the rank of the frequency: rarest = 1, most common = k) and normalized frequency (count / total).",
    why: "For high-cardinality categoricals where one-hot is intractable and target encoding is too leaky, frequency encoding is a safe middle ground. It captures the 'popularity' of each category — popular categories get high values, rare ones get low. Some models (especially trees) can use this popularity as a predictive signal (e.g., 'rare products have higher return rates'). It's also a fast fallback when target encoding is risky.",
    when: "Use frequency encoding when: (a) the category is high-cardinality, (b) you don't want the leakage risk of target encoding, (c) the category's frequency itself is predictive (popular items behave differently from rare ones). Avoid when the category is genuinely nominal and frequency isn't a meaningful signal — one-hot is better. Use rank encoding when you want ordinal-like behavior (rare = 1, common = k) without imposing arbitrary order.",
    how: "1. freq = df['category'].value_counts() — counts per category. 2. df['cat_freq'] = df['category'].map(freq) — replace each category with its count. 3. Normalized: df['cat_freq_norm'] = df['category'].map(freq) / len(df). 4. Rank encoding: df['cat_rank'] = df['category'].map(freq.rank(method='dense', ascending=False)). 5. For leakage-safe fitting (production), compute frequencies on train only and map unseen test categories to a sentinel (e.g., 0 or 1).",
    example: "A 'product_id' column has 5000 distinct products. One-hot produces 5000 columns — intractable. Target encoding is leaky without careful CV-fold setup. Frequency encoding produces one column: popular products get high values (a product appearing in 200 orders → 200), rare products get low values (a product in 2 orders → 2). If popular products have different churn patterns than rare ones, the model can learn this from the frequency column.",
    code: `# Frequency encoding (count per category)
freq = df["product_id"].value_counts()
df["product_freq"] = df["product_id"].map(freq)

# Normalized frequency (count / total — proportion)
df["product_freq_norm"] = df["product_id"].map(freq) / len(df)

# Rank encoding (rarest = 1, most common = k)
rank = freq.rank(method="dense", ascending=False)
df["product_rank"] = df["product_id"].map(rank)

# Leakage-safe version (fit on train only, fallback for unseen)
train_freq = X_train["product_id"].value_counts()
X_train["product_freq"] = X_train["product_id"].map(train_freq).fillna(0)
X_test["product_freq"] = X_test["product_id"].map(train_freq).fillna(0)  # unseen → 0`,
    interpretation: "The encoded column has one integer per row, representing the category's training-set frequency. A high value means the category is common; a low value means it's rare. Check the distribution — if a few categories dominate (e.g., top 5 products account for 80% of orders), the frequency encoding is highly skewed; consider log1p to compress. Compare train and test frequencies — if they differ, the test set has different category proportions.",
    mistakes: [
      "Assuming frequency is always predictive — for many problems, popularity has no signal. Check whether the model improves with the frequency feature.",
      "Not handling unseen test categories — they map to NaN without fallback. Fill with 0 or 1.",
      "Confusing frequency encoding with count encoding of a different column — frequency is per-category, not per-row.",
      "Using frequency encoding when target encoding would work — target encoding is more predictive when the category-target relationship is strong and leakage is handled.",
    ],
    takeaway: "Frequency encoding replaces each category with its count — unsupervised and leakage-safe. Use for high-cardinality categoricals where one-hot is intractable and target encoding is too leaky. Check whether popularity is actually predictive. Handle unseen test categories with a sentinel.",
    labLink: "module-10",
    demo: { kind: "encoding", defaultCol: "region", defaultMethod: "frequency" },
  },
  // ─── SCALING EXTENSIONS ─────────────────────────────────────────
  {
    id: "minmax-scaling",
    category: "Feature Engineering",
    title: "MinMax Scaling: Bounded [0, 1] Range",
    concept: "MinMax scaling linearly maps each feature to a bounded range (default [0, 1]): x_scaled = (x - min) / (max - min). The minimum becomes 0, the maximum becomes 1, and everything else is in between. Custom ranges like [-1, 1] or [0, 100] are supported via the feature_range parameter. MinMax preserves the original distribution's shape — only the scale changes.",
    why: "Some models require bounded inputs: neural networks with sigmoid/tanh activations work best with [0, 1] or [-1, 1] inputs; image pixels are naturally [0, 255] and are minmax-scaled to [0, 1] for deep learning. MinMax is also useful for interpretability — a value of 0.75 means '75% of the way from min to max'. Unlike standardization, MinMax preserves the original units (a [0, 1] feature is still 'proportion of max'). The cost: extreme sensitivity to outliers — one outlier shifts the min/max and compresses everyone else.",
    when: "Use MinMax for: neural networks (bounded inputs), image processing ([0, 1] pixels), interpretability ([0, 1] = 'proportion of max'). Avoid for: data with significant outliers (use RobustScaler), linear models with normally-distributed features (StandardScaler is better), distance-based models with mixed-scale features (StandardScaler is more uniform). Always fit on the TRAINING fold only — the test fold's min/max would be leakage.",
    how: "1. from sklearn.preprocessing import MinMaxScaler. 2. scaler = MinMaxScaler(feature_range=(0, 1)). 3. X_train_scaled = scaler.fit_transform(X_train). 4. X_test_scaled = scaler.transform(X_test) — apply the SAME fitted min/max to test. 5. Inspect: scaler.data_min_ and scaler.data_max_ show the fitted min/max per feature. 6. For custom range: MinMaxScaler(feature_range=(-1, 1)). 7. Inside a Pipeline for leakage safety.",
    example: "Image pixel values range [0, 255]. MinMaxScaler(feature_range=(0, 1)) maps 0 → 0, 255 → 1, and 128 → 0.5. A neural network trained on the scaled inputs learns faster because all features are in the same bounded range, matching the sigmoid/tanh activation ranges. Without scaling, the network's gradients would be dominated by the high-magnitude pixel values.",
    code: `from sklearn.preprocessing import MinMaxScaler
from sklearn.pipeline import Pipeline

# Fit on TRAIN only (leakage-safe)
scaler = MinMaxScaler(feature_range=(0, 1))
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)  # apply SAME fitted min/max

# Inspect the fitted parameters
print(f"Train min per feature: {scaler.data_min_}")
print(f"Train max per feature: {scaler.data_max_}")

# Custom range [-1, 1]
scaler_neg = MinMaxScaler(feature_range=(-1, 1))

# Inside a Pipeline
pipe = Pipeline([
    ("scaler", MinMaxScaler()),
    ("model", LogisticRegression()),
])
pipe.fit(X_train, y_train)
pipe.score(X_test, y_test)

# Manual computation (matches sklearn)
mins = X_train.min(axis=0)
maxs = X_train.max(axis=0)
X_train_scaled = (X_train - mins) / (maxs - mins)`,
    interpretation: "After MinMax scaling, every feature has min=0 and max=1 on the training set. The test set's scaled values may fall outside [0, 1] if the test set has values beyond the training min/max — this is expected and not a problem. Inspect scaler.data_min_ and data_max_ to verify the fitted parameters are sensible (no outliers distorting the range). Compare with StandardScaler's mean=0, std=1 — MinMax preserves boundedness; StandardScaler preserves normality.",
    mistakes: [
      "Fitting MinMaxScaler on the full dataset — leakage. Always fit on train only.",
      "Using MinMax on data with outliers — a single extreme value compresses everyone else into a narrow range. Use RobustScaler instead.",
      "Re-fitting the scaler on the test set — different min/max, breaking the model. Use transform(), not fit_transform(), on test.",
      "Forgetting feature_range for non-default ranges — the default is [0, 1]; specify (-1, 1) or (0, 100) explicitly.",
    ],
    takeaway: "MinMax scaling maps features to a bounded range (default [0, 1]). Use for neural networks and interpretability. Sensitive to outliers — use RobustScaler instead. Fit on train only. Apply the same fitted min/max to test.",
    labLink: "module-12",
    demo: { kind: "scaling", defaultCol: "revenue", defaultScaler: "minmax" },
  },
  {
    id: "robust-scaling",
    category: "Feature Engineering",
    title: "RobustScaler: Median + IQR (Outlier-Resistant)",
    concept: "RobustScaler centers features at the median and scales by the interquartile range (IQR = Q3 - Q1): x_scaled = (x - median) / IQR. Unlike StandardScaler (mean + std, both inflated by outliers) and MinMaxScaler (min + max, both distorted by outliers), RobustScaler uses statistics that are robust to extreme values. The median is the 50th percentile — unaffected by the most extreme 50% of values. The IQR is the middle 50% — unaffected by the most extreme 25% on either side.",
    why: "Outliers wreck StandardScaler and MinMaxScaler. A single revenue of $4.2M in a $50-average dataset shifts StandardScaler's mean and std dramatically (everyone else gets compressed near zero) and shifts MinMaxScaler's max to $4.2M (everyone else gets compressed near 0). RobustScaler's median and IQR ignore the outlier — the bulk of the data is scaled correctly, and the outlier becomes a large but finite value. For real datasets with measurement errors, bulk orders, or extreme events, RobustScaler is the safe default.",
    when: "Use RobustScaler whenever the data has visible outliers (check the histogram + Tukey fence). Use it as the default for skewed financial data (revenue, prices, transaction amounts), sensor data with occasional spikes, and any dataset where outliers are real but shouldn't dominate the scaling. Avoid for: data known to be outlier-free (StandardScaler is fine), data where the mean is meaningful (e.g., test scores with a normal distribution). Always fit on train only.",
    how: "1. from sklearn.preprocessing import RobustScaler. 2. scaler = RobustScaler(with_centering=True, with_scaling=True, quantile_range=(25, 75)). 3. X_train_scaled = scaler.fit_transform(X_train). 4. X_test_scaled = scaler.transform(X_test). 5. Inspect: scaler.center_ is the median per feature; scaler.scale_ is the IQR per feature. 6. The scaled values are not bounded — outliers become large values, but the bulk of the data is centered at 0 with IQR=1. 7. Custom quantile range: RobustScaler(quantile_range=(10, 90)) for a wider band.",
    example: "Revenue has 240 orders averaging $200, but one order is $4.2M (a bulk purchase). StandardScaler's mean shifts to $19,500 (the bulk order pulls it up) and std shifts to $270,000 (the bulk order inflates it). Every normal order gets scaled to a value near 0 — useless. RobustScaler's median is $185 (unaffected by the bulk order) and IQR is $130 (Q3-Q1 of the normal orders). The bulk order gets scaled to a large but finite value (4.2M / 130 ≈ 32,000), while the normal orders are scaled correctly to values near 0.",
    code: `from sklearn.preprocessing import RobustScaler

# Fit on TRAIN only
scaler = RobustScaler(with_centering=True, with_scaling=True, quantile_range=(25, 75))
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Inspect the fitted parameters
print(f"Median per feature: {scaler.center_}")
print(f"IQR per feature:    {scaler.scale_}")

# Compare with StandardScaler to see outlier distortion
from sklearn.preprocessing import StandardScaler
std_scaler = StandardScaler().fit(X_train)
print(f"Mean per feature:   {std_scaler.mean_}")
print(f"Std per feature:    {std_scaler.scale_}")

# Custom quantile range (wider band for less aggressive scaling)
robust_wide = RobustScaler(quantile_range=(10, 90))

# Inside a Pipeline
pipe = Pipeline([
    ("scaler", RobustScaler()),
    ("model", LinearRegression()),
])`,
    interpretation: "After RobustScaler, the median is 0 and the IQR is 1 on the training set. The bulk of the data (Q1 to Q3, the middle 50%) falls in [-1, 1]. Outliers become large values (e.g., the $4.2M bulk order → 32,000) but don't distort the scaling of the other rows. Compare scaler.center_ (median) vs StandardScaler's mean_ — if they differ significantly, the data is skewed and RobustScaler is the right choice.",
    mistakes: [
      "Fitting RobustScaler on the full dataset — leakage. Always fit on train only.",
      "Using RobustScaler on data without outliers — StandardScaler is more efficient for clean data (median + IQR are noisier estimators than mean + std for normal distributions).",
      "Forgetting that RobustScaler doesn't bound outliers — it just doesn't let them distort the scaling. The outlier value is still in the scaled data; consider clipping or log-transforming if needed.",
      "Confusing RobustScaler with MaxAbsScaler — RobustScaler centers at the median; MaxAbsScaler centers at 0 (preserves sparsity).",
    ],
    takeaway: "RobustScaler centers at the median and scales by the IQR — outlier-resistant. Use as the default for data with outliers or skew. Fit on train only. Outliers remain in the scaled data (large but finite) — they don't distort the bulk.",
    labLink: "module-12",
    demo: { kind: "scaling", defaultCol: "revenue", defaultScaler: "robust" },
  },
  {
    id: "maxabs-scaling",
    category: "Feature Engineering",
    title: "MaxAbsScaler: [-1, 1] with Sparsity Preserved",
    concept: "MaxAbsScaler divides each feature by its maximum absolute value: x_scaled = x / max(|x|). The result is in [-1, 1], with the maximum-magnitude value becoming ±1. Unlike MinMaxScaler (which shifts to [0, 1] and destroys sparsity) and StandardScaler (which centers at 0 and destroys sparsity), MaxAbsScaler preserves zeros — sparse features stay sparse. This is critical for high-dimensional sparse data (text TF-IDF, one-hot encoded categoricals).",
    why: "Sparse data (mostly zeros) is stored efficiently in sparse matrix format — but only if the zeros are preserved. MinMaxScaler shifts every value, turning zeros into non-zeros (the [0,1] mapping moves the original 0 to (0-min)/(max-min) ≠ 0). StandardScaler centers at the mean, also turning zeros into non-zeros. MaxAbsScaler only divides — zeros stay zero, sparsity is preserved, the sparse matrix stays small. For text classification with 10000 TF-IDF features, this is the difference between 100MB and 10GB of memory.",
    when: "Use MaxAbsScaler for sparse data (TF-IDF, one-hot encoded categoricals, count features). Use it when preserving zeros is important (the absence of a feature is meaningful). Avoid for dense data where MinMax or StandardScaler would work — MaxAbsScaler is sensitive to outliers (the max is an extreme value). For sparse data with outliers, consider clipping before MaxAbsScaler. Always fit on train only.",
    how: "1. from sklearn.preprocessing import MaxAbsScaler. 2. scaler = MaxAbsScaler(). 3. X_train_scaled = scaler.fit_transform(X_train). 4. X_test_scaled = scaler.transform(X_test). 5. Inspect: scaler.max_abs_ shows the max absolute value per feature. 6. The scaled values are in [-1, 1], with zeros preserved (0 / max = 0). 7. The output is a sparse matrix if the input was sparse — verify with isinstance(X_train_scaled, scipy.sparse.csr_matrix).",
    example: "A TF-IDF matrix has 5000 documents × 10000 terms, with 99% zeros (sparse). MaxAbsScaler divides each term column by its max TF-IDF value. The zeros stay zero (preserving sparsity); the non-zero values map to (0, 1]. A term with TF-IDF=0.8 (max in the column) becomes 1.0; a term with TF-IDF=0.4 becomes 0.5. The matrix stays sparse and tractable. MinMaxScaler would shift every zero to -min/(max-min), turning the 99% zeros into non-zeros and blowing up memory.",
    code: `from sklearn.preprocessing import MaxAbsScaler
from scipy.sparse import csr_matrix

# Sparse input (TF-IDF, one-hot, etc.)
X_train_sparse = csr_matrix(X_train)  # 99% zeros
X_test_sparse = csr_matrix(X_test)

# Fit on TRAIN only (leakage-safe)
scaler = MaxAbsScaler()
X_train_scaled = scaler.fit_transform(X_train_sparse)  # stays sparse
X_test_scaled = scaler.transform(X_test_sparse)         # stays sparse

# Inspect the fitted parameters
print(f"Max abs per feature: {scaler.max_abs_}")

# Verify sparsity is preserved
print(f"Density before: {X_train_sparse.nnz / (X_train_sparse.shape[0] * X_train_sparse.shape[1]):.4f}")
print(f"Density after:  {X_train_scaled.nnz / (X_train_scaled.shape[0] * X_train_scaled.shape[1]):.4f}")

# Manual computation (matches sklearn)
max_abs = X_train.abs().max(axis=0)
X_train_scaled = X_train / max_abs
X_test_scaled = X_test / max_abs  # apply same fitted max`,
    interpretation: "After MaxAbsScaler, every feature has max absolute value = 1 on the training set. The output stays sparse if the input was sparse — verify by checking the density (nnz / (rows × cols)) before and after; they should be identical. The scaled values are in [-1, 1] with zeros preserved. Watch for outliers in the max — if scaler.max_abs_ has an extreme value, it compresses everyone else; consider clipping first.",
    mistakes: [
      "Fitting MaxAbsScaler on the full dataset — leakage. Always fit on train only.",
      "Converting sparse input to dense before scaling — defeats the purpose. Pass the sparse matrix directly.",
      "Using MaxAbsScaler on dense data with outliers — the max is an extreme value that compresses everyone else. Use RobustScaler instead.",
      "Forgetting that MaxAbsScaler doesn't center — the mean is not 0. For models that need centered data, use StandardScaler (but you lose sparsity).",
    ],
    takeaway: "MaxAbsScaler maps to [-1, 1] by dividing by max(|x|) — preserves zeros and sparsity. Use for sparse data (TF-IDF, one-hot, count features). Fit on train only. Sensitive to outliers in the max — consider clipping first.",
    labLink: "module-12",
    demo: { kind: "scaling", defaultCol: "revenue", defaultScaler: "maxabs" },
  },
  // ─── ML PREPARATION EXTENSIONS ──────────────────────────────────
  {
    id: "pipeline-builder",
    category: "ML Preparation",
    title: "sklearn Pipeline: Leakage-Safe Composition",
    concept: "A Pipeline chains transformers (imputer, scaler, encoder, selector) and a final estimator (model) into a single fit-able object. pipe.fit(X_train, y_train) fits every transformer on the training data in sequence, then fits the model on the transformed data. pipe.predict(X_test) applies the SAME fitted transformers to the test data, then predicts. This guarantees leakage-safe preprocessing — there is no way to accidentally fit a transformer on the test set.",
    why: "Without a Pipeline, the typical workflow is: fit imputer on train, transform train, transform test, fit scaler on transformed train, transform train, transform test, fit encoder on transformed train, ... — manual, error-prone, and leakage-prone (one slip of fit_transform on test = leakage). A Pipeline automates this and cross_val_score(pipe, X, y) extends the safety to CV: each fold fits all transformers on the inner train only, then evaluates on the inner val. This is the only correct way to do CV with preprocessing.",
    when: "Always use a Pipeline whenever preprocessing is involved. Use make_pipeline(imputer, scaler, model) for quick construction; use Pipeline([('step1', transformer), ('step2', model)]) for named steps. Use ColumnTransformer inside a Pipeline when columns need different preprocessing (numerics scaled, categoricals one-hot encoded). For hyperparameter tuning, use Pipeline + GridSearchCV — the param names are 'step__param' (e.g., 'scaler__with_mean').",
    how: "1. from sklearn.pipeline import Pipeline, make_pipeline. 2. from sklearn.impute import SimpleImputer; from sklearn.preprocessing import StandardScaler; from sklearn.linear_model import LogisticRegression. 3. pipe = Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler()), ('model', LogisticRegression())]). 4. pipe.fit(X_train, y_train) — fits all transformers on train, then the model. 5. pipe.predict(X_test) — transforms test with fitted transformers, then predicts. 6. pipe.score(X_test, y_test) — accuracy (or R² for regression). 7. cross_val_score(pipe, X, y, cv=5) — leakage-safe CV.",
    example: "A classification pipeline: impute missing numerics with median → standardize → logistic regression. Without a Pipeline: imputer.fit(X_train); X_train_imp = imputer.transform(X_train); X_test_imp = imputer.transform(X_test); scaler.fit(X_train_imp); ... — 6 lines per transformer, easy to mess up. With a Pipeline: pipe = Pipeline([('imputer', SimpleImputer()), ('scaler', StandardScaler()), ('model', LogisticRegression())]); pipe.fit(X_train, y_train); pipe.score(X_test, y_test). 3 lines, no leakage possible.",
    code: `from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

# Named-step Pipeline (recommended for clarity)
pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(C=1.0, max_iter=1000)),
])

# Fit + score (leakage-safe — transformers fit on train only)
pipe.fit(X_train, y_train)
print(f"Test accuracy: {pipe.score(X_test, y_test):.4f}")

# Cross-validation (leakage-safe — each fold fits transformers on inner train only)
scores = cross_val_score(pipe, X, y, cv=5, scoring="f1")
print(f"CV F1: {scores.mean():.4f} ± {scores.std():.4f}")

# Hyperparameter tuning with GridSearchCV
from sklearn.model_selection import GridSearchCV
param_grid = {
    "imputer__strategy": ["mean", "median"],
    "scaler__with_mean": [True, False],
    "model__C": [0.01, 0.1, 1.0, 10.0],
}
grid = GridSearchCV(pipe, param_grid, cv=5, scoring="f1")
grid.fit(X_train, y_train)
print(f"Best params: {grid.best_params_}")

# Quick construction (anonymous steps)
quick_pipe = make_pipeline(SimpleImputer(), StandardScaler(), LogisticRegression())`,
    interpretation: "The Pipeline object exposes named steps (pipe.named_steps['scaler']) for inspection. After fit, you can inspect each step's fitted parameters: pipe.named_steps['scaler'].mean_ gives the fitted means. The CV scores are leakage-safe because each fold fits all transformers on the inner train only — there is no way to leak the inner val into the transformers. The GridSearchCV best_params_ tells you the optimal hyperparameters across all steps.",
    mistakes: [
      "Calling fit_transform on X_test — leakage. Always use transform() on test (fit_transform is for train only).",
      "Building a Pipeline without the model as the last step — every step except the last must be a transformer; the last must be an estimator.",
      "Forgetting that cross_val_score without a Pipeline is leakage-prone — if you pass a raw model and pre-transformed X, the transformers were fit on the full dataset.",
      "Naming two steps the same — step names must be unique within a Pipeline.",
    ],
    takeaway: "A Pipeline chains transformers + a final estimator, guaranteeing leakage-safe preprocessing. Use cross_val_score(pipe, X, y, cv=5) for leakage-safe CV. Use GridSearchCV(pipe, param_grid) for hyperparameter tuning. Always the last step is the model; every other step is a transformer.",
    labLink: "module-14",
    demo: { kind: "train-test-split" },
  },
  {
    id: "column-transformer",
    category: "ML Preparation",
    title: "ColumnTransformer: Heterogeneous Column Preprocessing",
    concept: "Real datasets have mixed column types: numerics (need imputation + scaling), categoricals (need imputation + one-hot encoding), dates (need feature extraction), text (need TF-IDF), identifiers (drop). A ColumnTransformer applies different transformers to different column subsets, then concatenates the results into a single matrix. numeric transformer for numeric columns, categorical transformer for categorical columns, all in one fit-able object.",
    why: "Without ColumnTransformer, you'd manually split the DataFrame into numeric and categorical subsets, fit separate transformers, transform each, then concatenate (hstack) the results — error-prone and breaks the Pipeline abstraction (you can't put a ColumnTransformer inside a regular Pipeline if you're doing manual hstack). ColumnTransformer integrates heterogeneous preprocessing into the Pipeline, keeping the leakage-safe contract intact. It's the standard for production ML pipelines.",
    when: "Use ColumnTransformer whenever your dataset has mixed column types. Use it inside a Pipeline: pipe = Pipeline([('preprocessor', ColumnTransformer([...])), ('model', LogisticRegression())]). Specify columns by name (recommended) or by position. Use 'drop' for columns you want to discard (identifiers, leaked features); use 'passthrough' for columns you want unchanged. Handle unseen categories at inference with handle_unknown='ignore' on the OneHotEncoder.",
    how: "1. from sklearn.compose import ColumnTransformer. 2. from sklearn.pipeline import Pipeline. 3. numeric_features = ['age', 'income', 'tenure']. 4. categorical_features = ['region', 'segment', 'tier']. 5. preprocessor = ColumnTransformer([('num', Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())]), numeric_features), ('cat', Pipeline([('imputer', SimpleImputer(strategy='constant', fill_value='missing')), ('onehot', OneHotEncoder(handle_unknown='ignore'))]), categorical_features), ('drop_ids', 'drop', ['customer_id', 'order_id'])]). 6. pipe = Pipeline([('preprocessor', preprocessor), ('model', LogisticRegression())]). 7. pipe.fit(X_train, y_train) — fits each transformer on its column subset of train.",
    example: "Customer churn dataset: numerics (age, income, tenure), categoricals (region, segment, tier), identifier (customer_id). The ColumnTransformer applies: median imputation + standardization to numerics, constant-fill + one-hot encoding to categoricals, drop to customer_id. The result is a single matrix with standardized numerics and one-hot encoded categoricals, ready for the model. The same fitted transformers are applied to test data — leakage-safe. The OneHotEncoder(handle_unknown='ignore') handles unseen test categories without crashing.",
    code: `from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

numeric_features = ["age", "income", "tenure"]
categorical_features = ["region", "segment", "tier"]
identifier_features = ["customer_id"]

preprocessor = ColumnTransformer(
    transformers=[
        # Numeric: impute + scale
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), numeric_features),
        # Categorical: impute + one-hot (handle unseen at inference)
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), categorical_features),
        # Identifier: drop (would be target leakage if kept)
        ("drop_ids", "drop", identifier_features),
    ],
    remainder="drop",  # drop any other columns
)

# Full pipeline
pipe = Pipeline([
    ("preprocessor", preprocessor),
    ("model", LogisticRegression(max_iter=1000)),
])

pipe.fit(X_train, y_train)
print(f"Test accuracy: {pipe.score(X_test, y_test):.4f}")

# Inspect the fitted transformers
numeric_transformer = pipe.named_steps["preprocessor"].named_transformers_["num"]
print(f"Numeric scaler means: {numeric_transformer.named_steps['scaler'].mean_}")`,
    interpretation: "The ColumnTransformer applies each sub-pipeline to its column subset, then hstacks the results. The fitted parameters (medians, means, one-hot categories) are accessible via named_transformers_. The output matrix has standardized numerics + one-hot encoded categoricals, ready for the model. Check the column count after fit — it should be len(numeric_features) + sum(one-hot categories per categorical feature). Use pipe.named_steps['preprocessor'].get_feature_names_out() to see the output column names.",
    mistakes: [
      "Forgetting handle_unknown='ignore' on OneHotEncoder — production data will have unseen categories; without this, the encoder crashes.",
      "Including identifiers in the 'passthrough' or numeric transformer — identifiers leak the target (each row's ID is unique and predicts the target perfectly in training).",
      "Mixing column-name and column-index specifications — pick one convention and stick with it.",
      "Not putting the ColumnTransformer inside a Pipeline — leaks the test set into the transformers when you call fit_transform on the full dataset.",
    ],
    takeaway: "ColumnTransformer applies different transformers to different column subsets in one fit-able object. Use inside a Pipeline for leakage-safe heterogeneous preprocessing. Always handle_unknown='ignore' on OneHotEncoder. Drop identifiers — they leak the target.",
    labLink: "module-14",
    demo: { kind: "encoding", defaultCol: "region", defaultMethod: "onehot" },
  },
  {
    id: "simple-imputer",
    category: "ML Preparation",
    title: "SimpleImputer: Train-Only Filling",
    concept: "SimpleImputer replaces missing values with a statistic computed on the TRAINING fold: strategy='mean' uses the train mean, 'median' the train median, 'most_frequent' the train mode, 'constant' a fixed value. The fitted statistic is then applied to both train and test (no re-fit on test). This guarantees leakage-safe imputation — the test fold's distribution never influences the fill values. Add an indicator column (df['col_is_missing'] = df['col'].isna()) to preserve the 'was missing' signal.",
    why: "Mean/median imputation reduces variance and biases distributions — but it's the simplest and most common approach. The leakage-safe form (fit on train, apply to test) ensures the test set's distribution doesn't leak into the fill values. Without an indicator column, imputation erases the 'was missing' signal — but the fact that a value was missing may itself be predictive (e.g., 'income is missing' may correlate with 'prefers not to disclose' which correlates with churn). Add the indicator to preserve this signal.",
    when: "Use SimpleImputer for: numeric columns with low missingness (< 20%) — strategy='median' (robust to outliers) or 'mean' (clean data). For categorical columns — strategy='most_frequent' or 'constant' with fill_value='missing'. Avoid for: high missingness (> 50%) — the imputed values dominate and the column is mostly noise; consider dropping. For time-series — use forward-fill or interpolation, not SimpleImputer (it ignores temporal structure). Always pair with a missing indicator: df['col_is_missing'] = df['col'].isna() before imputation.",
    how: "1. Add missing indicator FIRST: df['income_is_missing'] = df['income'].isna().astype(int). 2. from sklearn.impute import SimpleImputer. 3. imputer = SimpleImputer(strategy='median'). 4. X_train['income'] = imputer.fit_transform(X_train[['income']]). 5. X_test['income'] = imputer.transform(X_test[['income']]) — apply SAME fitted median. 6. Inspect: imputer.statistics_ shows the fitted median per column. 7. Inside a Pipeline for leakage safety. 8. For categoricals: SimpleImputer(strategy='constant', fill_value='missing').",
    example: "Income has 12% missing values. The train median is $52,000. SimpleImputer(strategy='median') fills the 12% missing with $52,000 in both train and test (test fold never influenced the median). The indicator column 'income_is_missing' has 1 for the originally-missing rows and 0 for the rest — preserving the 'was missing' signal. The model can now learn 'missing income is associated with X' separately from 'income value is associated with Y'.",
    code: `import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

# Add missing indicator BEFORE imputation (preserves the 'was missing' signal)
df["income_is_missing"] = df["income"].isna().astype(int)

# Fit on TRAIN only (leakage-safe)
imputer = SimpleImputer(strategy="median")
X_train["income"] = imputer.fit_transform(X_train[["income"]])
X_test["income"] = imputer.transform(X_test[["income"]])  # apply SAME fitted median

# Inspect the fitted median
print(f"Train median income: {imputer.statistics_[0]}")

# For categorical columns (use 'most_frequent' or 'constant')
cat_imputer = SimpleImputer(strategy="constant", fill_value="missing")
X_train["region"] = cat_imputer.fit_transform(X_train[["region"]])
X_test["region"] = cat_imputer.transform(X_test[["region"]])

# Inside a Pipeline (leakage-safe + CV-safe)
pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
    ("model", LogisticRegression()),
])
pipe.fit(X_train, y_train)

# Multiple strategies via ColumnTransformer
from sklearn.compose import ColumnTransformer
preprocessor = ColumnTransformer([
    ("num_median", SimpleImputer(strategy="median"), ["age", "income"]),
    ("num_mean", SimpleImputer(strategy="mean"), ["tenure"]),
    ("cat_const", SimpleImputer(strategy="constant", fill_value="missing"), ["region"]),
])`,
    interpretation: "After imputation, the column has no missing values — every originally-missing cell is filled with the train median/mean/mode. Check imputer.statistics_ to verify the fill values are sensible (a median of $0 for income suggests bad data). The indicator column preserves which rows were originally missing — check its mean to verify the missingness rate. Compare model performance with and without the indicator: if the indicator has a non-zero coefficient, missingness itself is predictive.",
    mistakes: [
      "Imputing with the full-dataset mean/median — leakage. Always fit on train only.",
      "Forgetting the missing indicator — erases the 'was missing' signal, which may be predictive.",
      "Using 'mean' on skewed data — the mean is pulled by outliers. Use 'median' for skewed distributions.",
      "Imputing categoricals with 'mean' — mean doesn't exist for strings. Use 'most_frequent' or 'constant'.",
    ],
    takeaway: "SimpleImputer fills missing values with a train-fold statistic (mean/median/mode/constant). Always fit on train only. Add a missing indicator to preserve the 'was missing' signal. Use 'median' for skewed numerics, 'constant' for categoricals.",
    labLink: "module-14",
    demo: { kind: "missing-values" },
  },
];

/**
 * Get topics by category.
 */
export function getTopicsByCategory(category: TopicCategory): InteractiveTopic[] {
  return TOPICS.filter((t) => t.category === category);
}

/**
 * Get all categories that have at least one topic.
 */
export function getActiveCategories(): TopicCategory[] {
  return CATEGORIES.map((c) => c.id).filter((id) => TOPICS.some((t) => t.category === id));
}
