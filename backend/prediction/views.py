import csv
import uuid

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiTypes
from rest_framework import generics, mixins, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import DetailSerializer
from ml.schema import CSV_MAP
from prediction.models import Prediction
from prediction.serializers import CustomerInputSerializer, PredictionSerializer, CSVUploadSerializer, BatchResponseSerializer
from prediction.services.predictor import get_predictor
from prediction.services.records import save_predictions
from prediction.services.csv_files import read_upload, safe_csv_cell

INPUT_EXAMPLE = {"customer_id": "1001", "age": 35, "gender": "Male", "tenure": 12,
    "usage_frequency": 18, "support_calls": 3, "payment_delay": 5,
    "subscription_type": "Standard", "contract_length": "Monthly", "total_spend": 750.5, "last_interaction": 10}


class PredictView(APIView):
    throttle_scope = "prediction"

    @extend_schema(request=CustomerInputSerializer, responses={201: PredictionSerializer, 400: DetailSerializer, 403: DetailSerializer, 429: DetailSerializer, 503: DetailSerializer},
                   examples=[OpenApiExample("Customer input", value=INPUT_EXAMPLE, request_only=True)])
    def post(self, request):
        serializer = CustomerInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        result = get_predictor().predict(values)
        record = save_predictions(request.user, [values], [result])[0]
        return Response(PredictionSerializer(record).data, status=201)


class BatchPredictView(APIView):
    throttle_scope = "batch"
    parser_classes = [MultiPartParser]

    @extend_schema(request=CSVUploadSerializer, responses={201: BatchResponseSerializer, 400: DetailSerializer, 403: DetailSerializer, 429: DetailSerializer, 503: DetailSerializer})
    def post(self, request):
        upload = CSVUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        rows = read_upload(upload.validated_data["file"])
        inputs, errors = [], []
        for number, row in rows:
            if row is None:
                errors.append({"row": number, "errors": {"row": ["Column count does not match header."]}})
                continue
            serializer = CustomerInputSerializer(data=row)
            if serializer.is_valid():
                inputs.append(serializer.validated_data)
            else:
                errors.append({"row": number, "errors": serializer.errors})
        if not inputs:
            return Response({"detail": "No valid customer records.", "errors": errors}, status=400)
        batch_id = uuid.uuid4()
        results = get_predictor().predict_many(inputs)
        records = save_predictions(request.user, inputs, results, batch_id)
        return Response({"batch_id": batch_id, "total": len(rows), "processed": len(records), "rejected": len(errors),
            "predicted_churn": sum(item["prediction"] for item in results),
            "results": PredictionSerializer(records, many=True).data, "errors": errors,
            "download_url": f"/api/predictions/export/?batch_id={batch_id}"}, status=201)


class PredictionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = PredictionSerializer
    throttle_scope = "read"
    filterset_fields = ["risk_level", "prediction", "batch_id"]
    search_fields = ["customer__customer_id"]
    ordering_fields = ["created_at", "churn_probability", "customer__customer_id"]

    def get_queryset(self):
        return Prediction.objects.filter(user=self.request.user).select_related("customer") if not getattr(self, "swagger_fake_view", False) else Prediction.objects.none()

    def perform_destroy(self, instance):
        # The input snapshot is exclusive to this prediction.
        instance.customer.delete()


class ExportView(APIView):
    throttle_scope = "batch"

    @extend_schema(parameters=[OpenApiParameter("batch_id", OpenApiTypes.UUID, required=True)],
                   responses={(200, "text/csv"): OpenApiTypes.STR, 400: DetailSerializer})
    def get(self, request):
        try:
            batch_id = uuid.UUID(request.query_params.get("batch_id", ""))
        except (ValueError, AttributeError) as exc:
            raise ValidationError({"batch_id": "Provide a valid batch UUID."}) from exc
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="churn-results-{batch_id}.csv"'
        writer = csv.writer(response)
        writer.writerow([*CSV_MAP, "prediction", "churn_probability", "retention_probability", "risk_level", "model_version", "created_at"])
        records = Prediction.objects.filter(user=request.user, batch_id=batch_id).select_related("customer").order_by("id")
        for record in records.iterator():
            writer.writerow([*(safe_csv_cell(getattr(record.customer, key)) for key in CSV_MAP),
                record.prediction, record.churn_probability, 1 - record.churn_probability, record.risk_level, record.model_version, record.created_at.isoformat()])
        return response


class ModelInfoView(APIView):
    throttle_scope = "read"

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response(get_predictor().metadata)
