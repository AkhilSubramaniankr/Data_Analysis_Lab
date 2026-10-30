/**
 * Module 14 exercises — ML Preparation.
 */

import type { ExerciseSpec } from "@/components/data/ExerciseCard";

export const MODULE14_EXERCISES: ExerciseSpec[] = [
  {
    id: "m14-pipeline-purpose",
    tier: "beginner",
    moduleId: "ml-preparation",
    question: "What is the primary purpose of a scikit-learn Pipeline?",
    task: "Pick the most accurate answer.",
    type: "mcq",
    options: [
      { value: "speed", label: "To speed up model training." },
      { value: "leakage-safe", label: "To chain transformers + estimator into one unit, ensuring every fit() runs on the training fold only and the same fitted params are applied to val/test — leakage-safe by construction." },
      { value: "memory", label: "To reduce memory usage during training." },
      { value: "parallel", label: "To parallelize transformer + estimator fitting." },
    ],
    validator: (answer) => {
      const correct = answer === "leakage-safe";
      return {
        correct,
        explanation: correct
          ? "Correct — the primary benefit of a Pipeline is leakage safety. By chaining transformers + estimator into one object, you can call pipe.fit(X_train, y_train) and pipe.predict(X_test) and the framework guarantees every transformer's fit() runs only on the training data. Without a Pipeline, it's easy to accidentally fit your scaler on the full dataset (train+test) — leakage."
          : "Not quite. Pipelines don't speed up training, reduce memory, or parallelize fitting — they enforce leakage safety by making fit/predict a single unit.",
      };
    },
    hint: "Pipelines prevent the most common ML mistake: fitting transformers on the full dataset.",
    solution: `from sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\n\npipe = Pipeline([\n    ("scaler", StandardScaler()),\n    ("model", LogisticRegression()),\n])\npipe.fit(X_train, y_train)  # scaler fits on TRAIN ONLY\ny_pred = pipe.predict(X_test)  # scaler.transform(X_test) uses train-fit params`,
    commonMistakes: [
      "Fitting the scaler separately on the full dataset, then splitting — leakage.",
      "Calling fit_transform on test data — re-fits the transformer on test (also leakage).",
    ],
    concept: "Pipeline",
    nextLessonId: "capstone",
  },

  {
    id: "m14-columntransformer",
    tier: "intermediate",
    moduleId: "ml-preparation",
    question: "Why use ColumnTransformer instead of applying the same transformer to every column?",
    task: "Pick the correct reason.",
    type: "mcq",
    options: [
      { value: "speed", label: "ColumnTransformer is faster than applying transformers separately." },
      { value: "heterogeneous", label: "Different column types need different transformers: numeric → StandardScaler, categorical → OneHotEncoder. ColumnTransformer applies each transformer only to its specified columns." },
      { value: "memory", label: "ColumnTransformer uses less memory." },
      { value: "always", label: "You should always use ColumnTransformer, even with a single column type." },
    ],
    validator: (answer) => {
      const correct = answer === "heterogeneous";
      return {
        correct,
        explanation: correct
          ? "Correct — real datasets have mixed types. Numeric columns need imputation + scaling; categorical columns need imputation + one-hot encoding. ColumnTransformer applies each transformer to a specified subset of columns, concatenates the results, and is itself a single transformer that can be a step in a Pipeline (leakage-safe)."
          : "Not quite. ColumnTransformer exists for heterogeneous column types. For single-type datasets, applying one transformer to all columns is fine. Speed/memory are not the point.",
      };
    },
    hint: "Numeric vs categorical — different transformers. ColumnTransformer routes each column to the right one.",
    solution: `from sklearn.compose import ColumnTransformer\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler, OneHotEncoder\n\nnumeric_features = ["age", "income", "score"]\ncategorical_features = ["city", "segment"]\n\npreprocessor = ColumnTransformer(transformers=[\n    ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric_features),\n    ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical_features),\n])\n\npipe = Pipeline([("preprocessor", preprocessor), ("model", LogisticRegression())])`,
    commonMistakes: [
      "Applying StandardScaler to categorical columns — produces nonsense.",
      "Applying OneHotEncoder to numeric columns — explodes dimensionality.",
    ],
    concept: "Pipeline",
    nextLessonId: "capstone",
  },

  {
    id: "m14-leakage-imputer",
    tier: "intermediate",
    moduleId: "ml-preparation",
    question: "You fit SimpleImputer(strategy='median') on the full dataset, then split into train/test. What's the consequence?",
    task: "Pick the correct consequence.",
    type: "mcq",
    options: [
      { value: "none", label: "No consequence — median is robust." },
      { value: "leakage", label: "Data leakage — the median now includes test rows, so the imputed values for training rows are influenced by test data. The model has indirectly seen the test set's distribution during training." },
      { value: "speed", label: "The imputer will run slower." },
      { value: "shape", label: "Train and test will have mismatched shapes after imputation." },
    ],
    validator: (answer) => {
      const correct = answer === "leakage";
      return {
        correct,
        explanation: correct
          ? "Correct — fitting the imputer on the full dataset leaks the test distribution into the training-time imputation. The median for a column with NaN values now includes test rows' values, so the imputed values for training rows are influenced by the test set. Even though the leakage is subtle (just a single number per column), it can bias cross-validation scores. Always fit imputation on the TRAIN fold only — use a Pipeline."
          : "Not quite. The consequence is leakage. The median isn't robust to this — it's a single number per column, but that number now includes test rows. Always fit on train only.",
      };
    },
    hint: "The median is computed from the data. If test rows are in the data, the test distribution influenced the median.",
    solution: `# WRONG — leakage:\nimputer = SimpleImputer(strategy="median")\nimputer.fit(df)  # includes test rows!\nX_train_imputed = imputer.transform(X_train)\nX_test_imputed  = imputer.transform(X_test)\n\n# RIGHT — fit on train only:\nimputer = SimpleImputer(strategy="median")\nimputer.fit(X_train)  # TRAIN ONLY\nX_train_imputed = imputer.transform(X_train)\nX_test_imputed  = imputer.transform(X_test)  # apply train-fit median\n\n# Or — put the imputer in a Pipeline; the framework enforces this for you.`,
    commonMistakes: [
      "Calling imputer.fit(df) on the full dataset before splitting — classic leakage.",
      "Calling imputer.fit_transform(X_test) — re-fits on test (also leakage).",
    ],
    concept: "Data leakage",
    nextLessonId: "capstone",
  },

  {
    id: "m14-stratified-split",
    tier: "advanced",
    moduleId: "ml-preparation",
    question: "You have a binary classification target with 5% positive class. Why use stratify=y in train_test_split?",
    task: "Pick the correct reason.",
    type: "mcq",
    options: [
      { value: "speed", label: "Stratified splitting is faster." },
      { value: "balance", label: "Stratified splitting preserves the 5% positive rate in both train and test — without stratification, the test set could randomly have 0% positives (model can't be evaluated) or 10% (score is biased)." },
      { value: "memory", label: "Stratified splitting uses less memory." },
      { value: "determinism", label: "Stratified splitting makes the split deterministic." },
    ],
    validator: (answer) => {
      const correct = answer === "balance";
      return {
        correct,
        explanation: correct
          ? "Correct — for imbalanced classes (rare positives), random splitting could randomly put very few positives in the test set, making ROC-AUC undefined or wildly noisy. Stratified splitting preserves the per-class proportion in both train and test. The split is still deterministic with random_state; stratify just adds the class-proportion preservation."
          : "Not quite. Stratification preserves class proportions. Speed/memory/determinism are not affected (determinism comes from random_state, not stratify).",
      };
    },
    hint: "5% positive class — random split could put 0% in test by chance. Stratify prevents that.",
    solution: `from sklearn.model_selection import train_test_split\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y,\n    test_size=0.3,\n    random_state=42,\n    stratify=y,  # ← preserves the 5% positive rate in both splits\n)`,
    commonMistakes: [
      "Forgetting stratify on imbalanced classification — test set may have zero positives.",
      "Using stratify on regression targets — it's a classification tool; for regression use random_state only.",
    ],
    concept: "Cross-validation",
    nextLessonId: "capstone",
  },

  {
    id: "m14-leakage-test-set",
    tier: "advanced",
    moduleId: "ml-preparation",
    question: "How many times should you touch the TEST set during model development?",
    task: "Pick the correct rule.",
    type: "mcq",
    options: [
      { value: "many", label: "Many times — every model iteration should be evaluated on the test set." },
      { value: "once", label: "Exactly ONCE — at the very end, after the pipeline is finalised. Use a separate validation set (or CV) for all model iteration." },
      { value: "never", label: "Never — the test set should be deleted." },
      { value: "ten", label: "A maximum of 10 times." },
    ],
    validator: (answer) => {
      const correct = answer === "once";
      return {
        correct,
        explanation: correct
          ? "Correct — the test set is held out for the FINAL unbiased evaluation. If you score on the test set during model iteration (tuning hyperparameters, selecting features, etc.), the test set becomes a second validation set, and your reported test score is optimistically biased ('test set leakage'). Use a train/val/test split (or CV on the train fold) for everything except the final report."
          : "Not quite. The test set is touched exactly ONCE — for the final evaluation. Iterating on it makes it a second validation set; you'll overfit to it.",
      };
    },
    hint: "Test = final exam. You don't take the final exam every day — you take practice exams (validation) and only the final once.",
    solution: `# Three-way split: train / val / test\nX_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.4, random_state=42, stratify=y)\nX_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp)\n\n# Iterate on train/val (or CV); touch test ONCE:\nfinal_pipe.fit(X_train, y_train)  # uses train only\ny_pred = final_pipe.predict(X_test)  # ONLY at the very end\nfinal_score = roc_auc_score(y_test, y_pred)`,
    commonMistakes: [
      "Scoring on the test set after every model iteration — overfits to the test set.",
      "Using only train/test (no val) and tuning on test — same problem.",
    ],
    concept: "Train-test split",
    nextLessonId: "capstone",
  },
];
