#!/usr/bin/env python3
"""Attach demo specs to interactive topics that don't yet have one.

Reads interactive-topics.ts, finds each topic's closing brace, and inserts
a `demo:` field based on the topic id. Writes the modified file in place.
"""
import re
import sys
from pathlib import Path

# Map topic id -> demo spec source string (the TS object literal, without
# the trailing comma). Topics not in this map are left alone.
DEMOS = {
    # Pandas Fundamentals — already attached in earlier edits
    "dataframe-structure": '{ kind: "shape-info" }',
    "loc-iloc": '{ kind: "shape-info" }',
    "boolean-filtering": '{ kind: "value-counts", defaultCol: "region" }',
    "sorting-ranking": '{ kind: "describe-stats", defaultCol: "revenue" }',

    # Data Exploration
    "shape-dimensions": '{ kind: "shape-info" }',
    "dtypes-type-system": '{ kind: "dtypes" }',

    # Data Cleaning
    "missing-values": '{ kind: "missing-values" }',
    "duplicates": '{ kind: "duplicates" }',

    # Statistics
    "mean-vs-median": '{ kind: "describe-stats", defaultCol: "revenue" }',
    "std-variance": '{ kind: "describe-stats", defaultCol: "revenue" }',
    "quantiles-iqr": '{ kind: "describe-stats", defaultCol: "revenue" }',

    # Correlation
    "pearson-correlation": '{ kind: "scatter-corr", defaultX: "quantity", defaultY: "revenue" }',
    "spearman-correlation": '{ kind: "scatter-corr", defaultX: "quantity", defaultY: "revenue" }',
    "parabolic-relationship": '{ kind: "parabolic" }',
    "outlier-distortion": '{ kind: "outlier-distortion" }',

    # Feature Engineering (existing)
    "log-transform": '{ kind: "transform", defaultCol: "revenue", defaultTransform: "log1p" }',
    "one-hot-encoding": '{ kind: "encoding", defaultCol: "region", defaultMethod: "onehot" }',
    "standardization": '{ kind: "scaling", defaultCol: "revenue", defaultScaler: "standardize" }',

    # Feature Engineering (new)
    "feature-interactions": '{ kind: "describe-stats", defaultCol: "revenue" }',
    "polynomial-features": '{ kind: "transform", defaultCol: "revenue", defaultTransform: "square" }',
    "ordinal-encoding": '{ kind: "encoding", defaultCol: "category", defaultMethod: "label" }',
    "target-encoding": '{ kind: "target-encoding", defaultCol: "region", defaultTarget: "revenue" }',
    "frequency-encoding": '{ kind: "encoding", defaultCol: "region", defaultMethod: "frequency" }',

    # Scaling (new)
    "minmax-scaling": '{ kind: "scaling", defaultCol: "revenue", defaultScaler: "minmax" }',
    "robust-scaling": '{ kind: "scaling", defaultCol: "revenue", defaultScaler: "robust" }',
    "maxabs-scaling": '{ kind: "scaling", defaultCol: "revenue", defaultScaler: "maxabs" }',

    # ML Preparation (existing)
    "train-test-split": '{ kind: "train-test-split" }',
    "data-leakage": '{ kind: "train-test-split" }',

    # ML Preparation (new)
    "pipeline-builder": '{ kind: "train-test-split" }',
    "column-transformer": '{ kind: "encoding", defaultCol: "region", defaultMethod: "onehot" }',
    "simple-imputer": '{ kind: "missing-values" }',

    # Time Series
    "datetime-conversion": '{ kind: "monthly-trend", defaultMetric: "revenue" }',
    "rolling-pct-change": '{ kind: "monthly-trend", defaultMetric: "revenue" }',

    # Grouping & Aggregation (new)
    "groupby-agg": '{ kind: "groupby-summary", defaultGroup: "region", defaultMetric: "revenue", defaultAgg: "sum" }',
    "transform-vs-agg": '{ kind: "groupby-summary", defaultGroup: "region", defaultMetric: "revenue", defaultAgg: "mean" }',
    "pivot-table": '{ kind: "pivot-table", defaultIndex: "region", defaultCols: "category", defaultMetric: "revenue" }',
    "crosstab-proportions": '{ kind: "crosstab", defaultIndex: "region", defaultCols: "category" }',

    # Feature Selection (new)
    "variance-threshold": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "correlation-select": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "anova-f-select": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "mutual-info-select": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "tree-importance": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "lasso-importance": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "permutation-importance": '{ kind: "feature-selection", defaultTarget: "revenue" }',
    "rfe-wrapper": '{ kind: "feature-selection", defaultTarget: "revenue" }',
}

src = Path("/home/z/my-project/src/lib/content/interactive-topics.ts").read_text()

# For each topic id, find its takeaway line. If the topic doesn't already
# have a demo field, insert one immediately after the takeaway line.
# We detect "already has demo" by checking if the next ~3 lines after
# takeaway contain "demo:".
inserted = 0
for topic_id, demo_src in DEMOS.items():
    # Find the topic by id
    id_pattern = f'id: "{topic_id}",'
    id_idx = src.find(id_pattern)
    if id_idx < 0:
        print(f"WARN: topic {topic_id} not found", file=sys.stderr)
        continue
    # Find the takeaway after this id
    takeaway_idx = src.find("    takeaway:", id_idx)
    if takeaway_idx < 0:
        print(f"WARN: takeaway not found for {topic_id}", file=sys.stderr)
        continue
    # Find the end of the takeaway line
    takeaway_end = src.find("\n", takeaway_idx)
    if takeaway_end < 0:
        print(f"WARN: takeaway end not found for {topic_id}", file=sys.stderr)
        continue
    # Check the next 200 chars for an existing demo:
    next_chunk = src[takeaway_end:takeaway_end + 300]
    if "    demo:" in next_chunk[:200] or '    demo: {' in next_chunk[:200]:
        continue  # already has demo
    # Also handle the case where labLink is between takeaway and the closing brace
    # We want to insert demo: AFTER labLink if present, otherwise immediately after takeaway.
    # Find the next "  }," (topic closing brace) after takeaway
    close_idx = src.find("\n  },", takeaway_end)
    if close_idx < 0:
        print(f"WARN: closing brace not found for {topic_id}", file=sys.stderr)
        continue
    # Insert just before the closing brace
    insertion = f"\n    demo: {demo_src},"
    src = src[:close_idx] + insertion + src[close_idx:]
    inserted += 1

Path("/home/z/my-project/src/lib/content/interactive-topics.ts").write_text(src)
print(f"Inserted {inserted} demo fields")
