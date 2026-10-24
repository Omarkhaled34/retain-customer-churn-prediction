from functools import lru_cache
from threading import Lock
import logging

import joblib
import numpy as np
import pandas as pd
import sklearn
from django.conf import settings
from rest_framework.exceptions import APIException, ValidationError

from ml.schema import FEATURES, CATEGORICAL, NUMERIC


class ModelUnavailable(APIException):
    status_code = 503
    default_detail = "Model unavailable. Train the pipeline and restart the backend."


class Predictor:
    def __init__(self, path):
        try:
            artifact = joblib.load(path)
            self.pipeline = artifact["pipeline"]
            self.metadata = artifact["metadata"]
            self.churn_index = list(self.pipeline.classes_).index(1)
            if self.metadata["features"] != FEATURES:
                raise ValueError("Artifact schema does not match the application.")
            if set(self.pipeline.classes_) != {0, 1}:
                raise ValueError("Artifact must predict binary classes 0 and 1.")
            if self.metadata["sklearn_version"] != sklearn.__version__:
                raise ValueError("Artifact and runtime Scikit-learn versions must match.")
        except Exception as exc:
            logging.getLogger(__name__).error("Unable to load configured model artifact: %s", type(exc).__name__)
            raise ModelUnavailable() from exc

    def validate(self, record):
        errors = {}
        for feature in FEATURES:
            value = record.get(feature)
            if value is None:
                errors[feature] = "This field is required."
            elif feature in CATEGORICAL and value not in self.metadata["categories"][feature]:
                errors[feature] = f"Choose one of: {', '.join(self.metadata['categories'][feature])}."
            elif feature in NUMERIC:
                try:
                    if isinstance(value, bool) or not np.isfinite(float(value)) or float(value) < 0:
                        errors[feature] = "Enter a finite, non-negative number."
                except (TypeError, ValueError, OverflowError):
                    errors[feature] = "Enter a valid number."
        if errors:
            raise ValidationError(errors)

    def predict_many(self, records):
        for record in records:
            self.validate(record)
        frame = pd.DataFrame(records).reindex(columns=FEATURES)
        predictions = self.pipeline.predict(frame)
        probabilities = self.pipeline.predict_proba(frame)[:, self.churn_index]
        return [{"prediction": int(label), "churn_probability": float(prob),
                 "retention_probability": float(1 - prob),
                 "risk_level": "High" if prob >= 0.7 else "Medium" if prob >= 0.4 else "Low",
                 "model_version": self.metadata["version"],
                 "message": "The customer is predicted to churn." if label == 1 else "The customer is predicted to stay."}
                for label, prob in zip(predictions, probabilities)]

    def predict(self, record):
        return self.predict_many([record])[0]


_load_lock = Lock()


@lru_cache(maxsize=1)
def _load(path):
    return Predictor(path)


def get_predictor():
    # Serialize the initial load; lru_cache alone can evaluate concurrent misses twice.
    with _load_lock:
        return _load(str(settings.MODEL_PATH))
