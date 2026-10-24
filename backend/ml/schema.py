"""The explicit API-to-notebook schema, shared by training and inference."""
FEATURE_MAP = {
    "age": "Age", "gender": "Gender", "tenure": "Tenure",
    "usage_frequency": "Usage Frequency", "support_calls": "Support Calls",
    "payment_delay": "Payment Delay", "subscription_type": "Subscription Type",
    "contract_length": "Contract Length", "total_spend": "Total Spend",
    "last_interaction": "Last Interaction",
}
FEATURES = list(FEATURE_MAP)
CATEGORICAL = ["gender", "subscription_type", "contract_length"]
NUMERIC = [f for f in FEATURES if f not in CATEGORICAL]
CSV_MAP = {"customer_id": "CustomerID", **FEATURE_MAP}


def normalize_frame(frame):
    frame = frame.rename(columns={v: k for k, v in CSV_MAP.items()})
    if frame.columns.duplicated().any():
        raise ValueError("Dataset contains duplicate or ambiguous feature columns.")
    missing = set(FEATURES + ["Churn"]) - set(frame.columns)
    if missing:
        raise ValueError(f"Missing dataset columns: {', '.join(sorted(missing))}")
    return frame
