import csv
import io
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, SimpleTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from rest_framework.throttling import ScopedRateThrottle

from customers.models import Customer
from ml.schema import CSV_MAP, FEATURES
from prediction.models import Prediction
from prediction.services.predictor import Predictor, ModelUnavailable, get_predictor

# A real customer from the user's training CSV, row 1. Not a synthetic model fixture.
CUSTOMER = {"customer_id": "2", "age": 30, "gender": "Female", "tenure": 39,
    "usage_frequency": 14, "support_calls": 5, "payment_delay": 18,
    "subscription_type": "Standard", "contract_length": "Annual", "total_spend": 932, "last_interaction": 17}


def csv_upload(rows, notebook_headers=False):
    out = io.StringIO(newline="")
    writer = csv.writer(out)
    writer.writerow(list(CSV_MAP.values()) if notebook_headers else CSV_MAP)
    for row in rows:
        writer.writerow([row.get(key, "") for key in CSV_MAP])
    return SimpleUploadedFile("customers.csv", out.getvalue().encode(), content_type="text/csv")


class MLTests(SimpleTestCase):
    def test_artifact_load_is_cached(self):
        self.assertIs(get_predictor(), get_predictor())
        self.assertNotIn("customer_id", get_predictor().metadata["features"])

    def test_service_agrees_with_actual_pipeline_and_classes(self):
        service = get_predictor()
        frame = pd.DataFrame([CUSTOMER])[FEATURES]
        result = service.predict(CUSTOMER)
        self.assertEqual(result["prediction"], int(service.pipeline.predict(frame)[0]))
        self.assertAlmostEqual(result["churn_probability"], service.pipeline.predict_proba(frame)[0, list(service.pipeline.classes_).index(1)])
        self.assertAlmostEqual(result["churn_probability"] + result["retention_probability"], 1)

    def test_feature_order_is_invariant(self):
        self.assertEqual(get_predictor().predict(CUSTOMER), get_predictor().predict(dict(reversed(list(CUSTOMER.items())))))

    def test_identifier_does_not_affect_prediction(self):
        self.assertEqual(get_predictor().predict(CUSTOMER), get_predictor().predict({**CUSTOMER, "customer_id": "999999999"}))

    def test_preprocessing_never_refits(self):
        pipeline = get_predictor().pipeline
        scaler = pipeline.named_steps["preprocessor"].named_transformers_["numeric"]
        before = scaler.mean_.copy()
        samples = scaler.n_samples_seen_
        get_predictor().predict({**CUSTOMER, "total_spend": 100000})
        np.testing.assert_array_equal(before, scaler.mean_)
        self.assertEqual(samples, scaler.n_samples_seen_)
        self.assertEqual(int(samples), get_predictor().metadata["training_rows"])

    def test_unknown_category_rejected(self):
        with self.assertRaises(ValidationError):
            get_predictor().predict({**CUSTOMER, "gender": "Unseen"})

    def test_missing_feature_rejected(self):
        with self.assertRaises(ValidationError):
            get_predictor().predict({key: value for key, value in CUSTOMER.items() if key != "age"})

    def test_nonfinite_rejected(self):
        for value in [float("nan"), float("inf"), -1, True]:
            with self.assertRaises(ValidationError):
                get_predictor().predict({**CUSTOMER, "total_spend": value})

    def test_missing_artifact_returns_service_unavailable(self):
        with self.assertRaises(ModelUnavailable):
            Predictor(Path(settings.BASE_DIR) / "does-not-exist.joblib")


class APITests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username="analyst", password="Str0ng-pass!271")
        self.other = get_user_model().objects.create_user(username="other", password="An0ther-pass!271")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def predict(self, customer=None):
        response = self.client.post("/api/predict/", customer or CUSTOMER, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_prediction_persists_and_matches_model(self):
        result = self.predict()
        self.assertEqual(Prediction.objects.count(), 1)
        self.assertEqual(Customer.objects.get().user, self.user)
        self.assertAlmostEqual(result["churn_probability"], get_predictor().predict(CUSTOMER)["churn_probability"])
        self.assertEqual(self.client.get(f'/api/predictions/{result["id"]}/').status_code, 200)

    def test_invalid_inputs_do_not_write_records(self):
        for values in [{**CUSTOMER, "age": -2}, {**CUSTOMER, "gender": "Unseen"}, {**CUSTOMER, "age": 12.5},
                       {**CUSTOMER, "unexpected": "value"}, {key: value for key, value in CUSTOMER.items() if key != "tenure"}]:
            response = self.client.post("/api/predict/", values, format="json")
            self.assertEqual(response.status_code, 400, response.data)
            self.assertIn("errors", response.data)
        self.assertEqual(Prediction.objects.count(), 0)
        self.assertEqual(Customer.objects.count(), 0)

    def test_immutable_customer_snapshots(self):
        first = self.predict()
        self.predict({**CUSTOMER, "total_spend": 999})
        self.assertEqual(self.client.get(f'/api/predictions/{first["id"]}/').data["customer"]["total_spend"], 932)
        self.assertEqual(Customer.objects.count(), 2)

    def test_ownership_is_enforced_everywhere(self):
        batch = self.client.post("/api/predict/batch/", {"file": csv_upload([CUSTOMER])}, format="multipart")
        self.assertEqual(batch.status_code, 201, batch.data)
        record_id = batch.data["results"][0]["id"]
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/predictions/").data["count"], 0)
        self.assertEqual(self.client.get(f"/api/predictions/{record_id}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/predictions/{record_id}/").status_code, 404)
        self.assertEqual(self.client.get("/api/analytics/overview/").data["total_predictions"], 0)
        exported = self.client.get(f'/api/predictions/export/?batch_id={batch.data["batch_id"]}')
        self.assertEqual(len(list(csv.reader(io.StringIO(exported.content.decode())))), 1)

    def test_batch_reports_invalid_rows_and_exports_real_results(self):
        response = self.client.post("/api/predict/batch/", {"file": csv_upload([CUSTOMER, {**CUSTOMER, "age": "invalid"}], True)}, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual((response.data["processed"], response.data["rejected"]), (1, 1))
        self.assertEqual(response.data["errors"][0]["row"], 3)
        result = response.data["results"][0]
        self.assertAlmostEqual(result["churn_probability"], get_predictor().predict(CUSTOMER)["churn_probability"])
        export = self.client.get(response.data["download_url"])
        rows = list(csv.DictReader(io.StringIO(export.content.decode())))
        self.assertEqual(len(rows), 1)
        self.assertAlmostEqual(float(rows[0]["churn_probability"]), result["churn_probability"])

    def test_csv_headers_malformed_and_empty_files_rejected(self):
        for content in [b"age\n30\n", b"", b"age,age\n30,30\n", b"\xff\xfe"]:
            response = self.client.post("/api/predict/batch/", {"file": SimpleUploadedFile("customers.csv", content)}, format="multipart")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Prediction.objects.count(), 0)

    @override_settings(MAX_BATCH_ROWS=1)
    def test_batch_row_limit_rejects_whole_upload(self):
        response = self.client.post("/api/predict/batch/", {"file": csv_upload([CUSTOMER, CUSTOMER])}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Prediction.objects.exists())

    @override_settings(MAX_CSV_BYTES=10)
    def test_file_size_limit(self):
        self.assertEqual(self.client.post("/api/predict/batch/", {"file": csv_upload([CUSTOMER])}, format="multipart").status_code, 400)

    def test_formula_in_customer_identifier_is_escaped_on_export(self):
        response = self.client.post("/api/predict/batch/", {"file": csv_upload([{**CUSTOMER, "customer_id": "=1+1"}])}, format="multipart")
        export = self.client.get(response.data["download_url"])
        self.assertEqual(list(csv.DictReader(io.StringIO(export.content.decode())))[0]["customer_id"], "'=1+1")

    def test_analytics_and_filters(self):
        self.predict()
        second = self.predict({**CUSTOMER, "customer_id": "another"})
        data = self.client.get("/api/analytics/overview/?days=7").data
        self.assertEqual((data["total_predictions"], data["total_customers"]), (2, 2))
        self.assertEqual(data["predicted_churn"] + data["predicted_retained"], 2)
        self.assertEqual(sum(row["total"] for row in data["trends"]), 2)
        self.assertEqual(self.client.get("/api/predictions/?search=another").data["count"], 1)
        self.assertEqual(self.client.get(f'/api/predictions/?risk_level={second["risk_level"]}').data["count"], 2)
        self.assertEqual(self.client.get("/api/analytics/overview/?days=invalid").status_code, 400)

    def test_delete_cleans_input_snapshot(self):
        data = self.predict()
        self.assertEqual(self.client.delete(f'/api/predictions/{data["id"]}/').status_code, 204)
        self.assertFalse(Prediction.objects.exists())
        self.assertFalse(Customer.objects.exists())

    def test_authentication_required(self):
        self.client.force_authenticate(None)
        for endpoint in ["/api/predictions/", "/api/analytics/overview/", "/api/model/"]:
            self.assertEqual(self.client.get(endpoint).status_code, 403)
        self.assertEqual(self.client.post("/api/predict/", CUSTOMER, format="json").status_code, 403)

    def test_throttling(self):
        with patch.dict(ScopedRateThrottle.THROTTLE_RATES, {"prediction": "1/min"}):
            self.predict()
            self.assertEqual(self.client.post("/api/predict/", CUSTOMER, format="json").status_code, 429)

    def test_model_info_and_health(self):
        self.assertEqual(self.client.get("/api/model/").data["version"], get_predictor().metadata["version"])
        self.assertEqual(self.client.get("/api/health/").status_code, 200)


class AuthenticationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)

    def csrf(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_X_CSRFTOKEN=self.client.cookies["csrftoken"].value)

    def test_full_session_flow_including_csrf(self):
        values = {"username": "newanalyst", "email": "analyst@example.com", "first_name": "Analyst", "password": "R3tention-Amazing!271"}
        self.assertEqual(self.client.post("/api/auth/register/", values).status_code, 403)
        self.csrf()
        self.assertEqual(self.client.post("/api/auth/register/", values).status_code, 201)
        self.assertTrue(get_user_model().objects.get().check_password(values["password"]))
        self.assertEqual(self.client.get("/api/auth/profile/").data["username"], values["username"])
        # Login rotates the CSRF secret; the old header must fail.
        self.assertEqual(self.client.post("/api/predict/", CUSTOMER, format="json").status_code, 403)
        self.csrf()
        prediction = self.client.post("/api/predict/", CUSTOMER, format="json")
        self.assertEqual(prediction.status_code, 201, prediction.data)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/profile/").status_code, 403)
        self.csrf()
        self.assertEqual(self.client.post("/api/auth/login/", {"username": values["username"], "password": "bad"}).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/login/", {"username": values["username"], "password": values["password"]}).status_code, 200)

    def test_weak_password_is_rejected(self):
        self.csrf()
        self.assertEqual(self.client.post("/api/auth/register/", {"username": "analyst", "email": "a@example.com", "password": "password"}).status_code, 400)

    def test_login_requires_csrf_even_for_anonymous_user(self):
        self.assertEqual(self.client.post("/api/auth/login/", {"username": "x", "password": "x"}).status_code, 403)
