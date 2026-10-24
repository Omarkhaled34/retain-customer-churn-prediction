"""Evaluation uses a fitted pipeline; no preprocessing is refit."""
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix


def evaluate(pipeline, x, y):
    prediction = pipeline.predict(x)
    churn_index = list(pipeline.classes_).index(1)
    probability = pipeline.predict_proba(x)[:, churn_index]
    return {
        "rows": len(y), "accuracy": accuracy_score(y, prediction),
        "precision": precision_score(y, prediction, zero_division=0),
        "recall": recall_score(y, prediction, zero_division=0),
        "f1": f1_score(y, prediction, zero_division=0),
        "roc_auc": roc_auc_score(y, probability) if len(set(y)) == 2 else None,
        "confusion_matrix": confusion_matrix(y, prediction, labels=[0, 1]).tolist(),
    }
