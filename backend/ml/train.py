"""Run from backend: python -m ml.train --train-csv PATH --test-csv PATH."""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

from ml.evaluate import evaluate
from ml.schema import CATEGORICAL, NUMERIC, FEATURES, normalize_frame


def make_pipeline(include_id=False):
    numeric = (["customer_id"] if include_id else []) + NUMERIC
    return Pipeline([
        ("preprocessor", ColumnTransformer([
            ("numeric", StandardScaler(), numeric),
            ("categorical", OrdinalEncoder(handle_unknown="error"), CATEGORICAL),
        ], remainder="drop")),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
    ])


def read_data(path):
    raw = normalize_frame(pd.read_csv(path))
    frame = raw.dropna(subset=FEATURES + ["Churn"]).copy()
    for col in NUMERIC + ["Churn"]:
        frame[col] = pd.to_numeric(frame[col], errors="raise")
        if not np.isfinite(frame[col]).all():
            raise ValueError(f"{col} contains non-finite numbers.")
    if not set(frame["Churn"].unique()).issubset({0, 1}) or len(frame["Churn"].unique()) != 2:
        raise ValueError("Churn must contain both binary classes 0 and 1.")
    return frame, len(raw) - len(frame)


def train(train_csv, test_csv=None, output=None):
    output = Path(output or Path(__file__).parent / "artifacts")
    output.mkdir(parents=True, exist_ok=True)
    data, dropped = read_data(train_csv)
    x_train, x_val, y_train, y_val = train_test_split(data.drop(columns="Churn"), data["Churn"].astype(int), test_size=0.2, random_state=42)
    pipeline = make_pipeline()
    pipeline.fit(x_train[FEATURES], y_train)
    digest = hashlib.sha256(Path(train_csv).read_bytes()).hexdigest()
    metadata = {
        "version": f"lr-v1-{digest[:10]}", "trained_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "Logistic Regression", "features": FEATURES,
        "categorical_features": CATEGORICAL, "numeric_features": NUMERIC,
        "categories": {k: [str(v) for v in values] for k, values in zip(CATEGORICAL, pipeline.named_steps["preprocessor"].named_transformers_["categorical"].categories_)},
        "preprocessing": "StandardScaler on seven numerical features; OrdinalEncoder on three categorical features. Both fitted on training partition only.",
        "methodology": "80/20 split, random_state=42, no stratification (matching the notebook). CustomerID is excluded. LogisticRegression max_iter=1000 for convergence.",
        "customer_id_policy": "Identifier only; excluded from all production training and inference.",
        "training_rows": len(x_train), "validation_rows": len(x_val), "dropped_missing_rows": dropped,
        "training": evaluate(pipeline, x_train[FEATURES], y_train),
        "validation": evaluate(pipeline, x_val[FEATURES], y_val), "test": None,
        "source_sha256": digest, "sklearn_version": sklearn.__version__,
        "risk_thresholds": {"low_below": 0.4, "high_at_least": 0.7},
    }
    # Measure the identifier's effect using the same held-out split, never select on test data.
    if "customer_id" in x_train and x_train["customer_id"].notna().all():
        baseline = make_pipeline(include_id=True).fit(x_train, y_train)
        metadata["identifier_comparison"] = {"validation_with_customer_id": evaluate(baseline, x_val, y_val),
            "identifier_unique_ratio": float(data["customer_id"].nunique() / len(data)),
            "note": "Notebook-style comparison only. This identifier-based pipeline is not served."}
    if test_csv:
        test, test_dropped = read_data(test_csv)
        metadata["test"] = evaluate(pipeline, test[FEATURES], test["Churn"].astype(int))
        metadata["test"]["dropped_missing_rows"] = test_dropped
        metadata["test_source_sha256"] = hashlib.sha256(Path(test_csv).read_bytes()).hexdigest()
    joblib.dump({"pipeline": pipeline, "metadata": metadata}, output / "churn.joblib.tmp")
    os.replace(output / "churn.joblib.tmp", output / "churn.joblib")
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    return pipeline, metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train-csv", required=True)
    parser.add_argument("--test-csv")
    parser.add_argument("--output")
    args = parser.parse_args()
    train(args.train_csv, args.test_csv, args.output)
