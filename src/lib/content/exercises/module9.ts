/**
 * Module 9 exercises — Feature Engineering Fundamentals.
 * Validators compute real values from the retail dataset.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";
import { buildRetailSales } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import { mean } from "@/lib/data/stats";

const retail = buildRetailSales();
const df = DataFrame.fromRows(retail.rows);

// Compute the same answer used in both validator + solution template.
const withMargin = df.withColumn("profit_margin", (r) => {
  const rev = r.revenue; const prof = r.profit;
  if (typeof rev !== "number" || typeof prof !== "number") return null;
  if (rev === 0) return null;
  return (prof / rev) * 100;
});
const MARGIN_VALUES = withMargin.column("profit_margin").filter((v): v is number => typeof v === "number" && Number.isFinite(v));
const MEAN_MARGIN = mean(MARGIN_VALUES);
const ZERO_REVENUE_COUNT = df.rows.filter((r) => r.revenue === 0).length;

export const MODULE9_EXERCISES: ExerciseSpec[] = [
  {
    id: "m9-zero-denominator",
    tier: "beginner",
    moduleId: "feature-engineering-fundamentals",
    question: "You compute profit_margin = profit / revenue * 100. Some rows have revenue = 0 (returns). What does the naive form produce for those rows?",
    task: "Pick the correct output for revenue=0.",
    type: "mcq",
    options: [
      { value: "zero", label: "0 (silently treated as zero margin)." },
      { value: "nan", label: "NaN or ±Inf — division by zero is undefined; the safe form should produce NaN." },
      { value: "skip", label: "The rows are automatically dropped." },
      { value: "warning", label: "Pandas raises and stops execution." },
    ],
    validator: (answer) => {
      const correct = answer === "nan";
      return {
        correct,
        explanation: correct
          ? `Correct — profit / 0 raises a division-by-zero that Pandas represents as ±Inf (or NaN if 0/0). The safe form (master spec §21) replaces 0 in revenue with NaN FIRST: df["profit"].div(df["revenue"].replace(0, np.nan)).mul(100). The result is NaN, which forces the analyst to decide what to do with each NaN rather than silently imputing.`
          : `Not quite. Pandas does not silently treat division-by-zero as zero, does not auto-drop rows, and does not raise — it produces Inf or NaN. The safe form explicitly nulls the zero denominators first.`,
      };
    },
    hint: "Pandas division by zero produces Inf (or NaN if 0/0). The safe form replaces zero denominators with NaN before dividing.",
    solution: `import numpy as np\ndf["profit_margin"] = (\n    df["profit"]\n        .div(df["revenue"].replace(0, np.nan))\n        .mul(100)\n)\n# Add an indicator for the rows you nulled:\ndf["is_zero_revenue"] = df["revenue"] == 0`,
    commonMistakes: [
      "Computing profit/revenue without handling zero denominators — produces Inf that propagates through downstream calculations.",
      "Dropping the zero-revenue rows silently — destroys the 'returns' signal. Add an indicator instead.",
    ],
    concept: "Feature engineering",
    nextLessonId: "categorical-encoding",
  },

  {
    id: "m9-rfm-recency",
    tier: "intermediate",
    moduleId: "feature-engineering-fundamentals",
    question: "You want to compute customer 'recency' = days since the customer's last order, using a snapshot date. What's the right groupby expression?",
    task: "Pick the right Pandas expression.",
    type: "mcq",
    options: [
      { value: "wrong", label: "df.groupby('customer_id')['order_date'].max() - snapshot_date" },
      { value: "right", label: "snapshot_date - df.groupby('customer_id')['order_date'].max()" },
      { value: "diff", label: "(df.groupby('customer_id')['order_date'].max() - snapshot_date).dt.days" },
      { value: "today", label: "snapshot_date = pd.Timestamp.today(); recency = (snapshot_date - df.groupby('customer_id')['order_date'].max()).dt.days" },
    ],
    validator: (answer) => {
      const correct = answer === "today";
      return {
        correct,
        explanation: correct
          ? "Correct — the full idiom: define the snapshot date, group by customer, take max(order_date) per customer, subtract from the snapshot, and extract days with .dt.days. The order of subtraction matters: snapshot - max_date gives positive days."
          : "Not quite. The subtraction order is wrong (you want snapshot - max_date, not the reverse), and you need .dt.days to get integer days. Also, the snapshot date should be explicit, not pd.Timestamp.today() run repeatedly — that makes results non-reproducible across runs.",
      };
    },
    hint: "Subtract the customer's last order date FROM the snapshot date, then extract days with .dt.days. Define the snapshot explicitly.",
    solution: `snapshot_date = df["order_date"].max()  # use the last date in the data as snapshot\nrecency = (snapshot_date - df.groupby("customer_id")["order_date"].max()).dt.days\nfrequency = df.groupby("customer_id")["order_id"].count()\nmonetary = df.groupby("customer_id")["revenue"].sum()\nrfm = pd.concat([recency, frequency, monetary], axis=1)`,
    commonMistakes: [
      "Subtracting in the wrong order — produces negative recency.",
      "Using pd.Timestamp.today() as the snapshot — non-reproducible across runs.",
      "Forgetting .dt.days — produces a timedelta column.",
    ],
    concept: "Feature engineering",
    nextLessonId: "categorical-encoding",
  },

  {
    id: "m9-log-transform-purpose",
    tier: "intermediate",
    moduleId: "feature-engineering-fundamentals",
    question: "Why apply log1p (log(1+x)) to a long-tailed variable like revenue before fitting a linear regression?",
    task: "Pick the most accurate reason.",
    type: "mcq",
    options: [
      { value: "memory", label: "To reduce memory usage — log values are smaller." },
      { value: "normal", label: "To compress the long tail and make the distribution more symmetric — linear regression assumes normally-distributed residuals." },
      { value: "negative", label: "To allow negative values in the regression." },
      { value: "categorical", label: "To convert revenue into a categorical feature." },
    ],
    validator: (answer) => {
      const correct = answer === "normal";
      return {
        correct,
        explanation: correct
          ? "Correct — long-tailed revenue (like most retail / income / price data) violates the normal-residual assumption of linear regression. log1p compresses the tail, making the distribution closer to normal. Use log1p (not log) to handle zero values — log(0) is undefined, log(1+0)=0 is defined."
          : "Not quite. Log does NOT reduce memory (a float is a float), does NOT produce negative values from positives, and does NOT categorize. It compresses the long tail to make the distribution more symmetric — that's the regression assumption.",
      };
    },
    hint: "Linear regression assumes normally-distributed residuals. Long-tailed features produce skewed residuals. log1p compresses the tail.",
    solution: `import numpy as np\ndf["log_revenue"] = np.log1p(df["revenue"])\n# log1p(x) = log(1+x) — handles 0 (log(1)=0).\n# Then fit linear regression on the log-transformed feature.`,
    commonMistakes: [
      "Using np.log on data with zeros — produces -Inf. Use np.log1p instead.",
      "Forgetting to invert the transform when interpreting predictions (np.expm1 reverses log1p).",
    ],
    concept: "Feature transformation",
    nextLessonId: "categorical-encoding",
  },

  {
    id: "m9-interaction-feature",
    tier: "advanced",
    moduleId: "feature-engineering-fundamentals",
    question: "You fit a linear regression on quantity and unit_price as separate features to predict revenue. The fit is poor. Why?",
    task: "Pick the correct explanation.",
    type: "mcq",
    options: [
      { value: "wrong", label: "Linear regression cannot fit revenue data — switch to a tree model." },
      { value: "interaction", label: "Revenue = quantity × unit_price is a multiplicative interaction. The linear form β₀ + β₁·quantity + β₂·unit_price has no multiplicative term — you must add an interaction feature quantity × unit_price explicitly." },
      { value: "scaling", label: "The features need to be scaled first." },
      { value: "missing", label: "There are missing values in the data." },
    ],
    validator: (answer) => {
      const correct = answer === "interaction";
      return {
        correct,
        explanation: correct
          ? "Correct — revenue IS the product of quantity and unit_price. Linear regression can only learn a linear combination β₀ + β₁·quantity + β₂·unit_price; it cannot represent a product. Add the interaction feature quantity × unit_price explicitly, and the linear regression will fit perfectly."
          : "Not quite. Linear regression CAN fit revenue data — it just needs the interaction feature. Scaling wouldn't fix the missing multiplicative term. There are no missing values in our retail dataset (revenue is always defined).",
      };
    },
    hint: "Linear regression fits β₀ + β₁·x₁ + β₂·x₂ — no multiplicative terms. Revenue = quantity × unit_price is purely multiplicative.",
    solution: `# Add the interaction feature explicitly:\ndf["qty_x_price"] = df["quantity"] * df["unit_price"]\n\nX = df[["quantity", "unit_price", "qty_x_price"]]\ny = df["revenue"]\n# Now linear regression fits perfectly (revenue = the interaction term, by construction).`,
    commonMistakes: [
      "Switching to a tree model when an interaction feature would suffice — tree models auto-discover interactions via splits, but linear models need them added explicitly.",
      "Adding many interaction features blindly — increases dimensionality and risks overfitting; add only domain-meaningful interactions.",
    ],
    concept: "Feature engineering",
    nextLessonId: "categorical-encoding",
  },

  {
    id: "m9-target-leakage",
    tier: "advanced",
    moduleId: "feature-engineering-fundamentals",
    question: "You build a feature 'profit_margin' = profit/revenue*100 and use it to predict revenue. What's wrong?",
    task: "Pick the issue.",
    type: "mcq",
    options: [
      { value: "noise", label: "profit_margin is noisy and won't add signal." },
      { value: "leakage", label: "Target leakage: profit_margin = profit/revenue*100 contains the target (revenue) in its formula. The model learns profit_margin → revenue = profit_margin × revenue / 100, which is trivial." },
      { value: "missing", label: "profit_margin has too many missing values." },
      { value: "scaling", label: "profit_margin is on a different scale and needs normalization." },
    ],
    validator: (answer) => {
      const correct = answer === "leakage";
      return {
        correct,
        explanation: correct
          ? "Correct — using a feature derived from the target to predict the target is leakage. profit_margin contains revenue in its formula; using it to predict revenue gives a model that 'learns' the trivial relationship. Drop profit_margin (and any other feature derived from revenue) before modelling."
          : "Not quite. profit_margin is a perfectly good feature in itself — it's only a problem because it's DERIVED FROM THE TARGET (revenue). That's the definition of target leakage. Noise, missing values, and scaling are not the issue.",
      };
    },
    hint: "If a feature is computed using the target column, using it to predict the target is leakage.",
    solution: `# LEAKAGE: don't use features derived from the target\n# profit_margin = profit / revenue * 100 — contains revenue.\n# Drop it (and any other revenue-derived feature) before modelling:\nX = df.drop(columns=["revenue", "profit_margin", "profit"])  # profit too: it depends on revenue\n# Or be very careful about feature provenance.`,
    commonMistakes: [
      "Including 'computed-from-target' features because they have high correlation with the target — that's the giveaway of leakage.",
      "Forgetting that profit depends on revenue too (revenue * margin) — both leak.",
    ],
    concept: "Data leakage",
    nextLessonId: "categorical-encoding",
  },
];
