import math

from rest_framework import serializers
from ml.schema import CSV_MAP
from prediction.models import Prediction
from prediction.services.predictor import get_predictor


class CustomerInputSerializer(serializers.Serializer):
    customer_id = serializers.CharField(max_length=80)
    age = serializers.IntegerField(min_value=1, max_value=120)
    gender = serializers.CharField(max_length=40)
    tenure = serializers.IntegerField(min_value=0, max_value=1200)
    usage_frequency = serializers.IntegerField(min_value=0, max_value=1000000)
    support_calls = serializers.IntegerField(min_value=0, max_value=1000000)
    payment_delay = serializers.IntegerField(min_value=0, max_value=1000000)
    subscription_type = serializers.CharField(max_length=40)
    contract_length = serializers.CharField(max_length=40)
    total_spend = serializers.FloatField(min_value=0, max_value=1000000000000)
    last_interaction = serializers.IntegerField(min_value=0, max_value=1000000)

    def validate_total_spend(self, value):
        if not math.isfinite(value):
            raise serializers.ValidationError("Enter a finite number.")
        return value

    def validate(self, attrs):
        unknown = set(self.initial_data) - set(CSV_MAP)
        if unknown:
            raise serializers.ValidationError({key: "Unknown field." for key in unknown})
        get_predictor().validate(attrs)
        return attrs


class PredictionSerializer(serializers.ModelSerializer):
    customer_id = serializers.CharField(source="customer.customer_id", read_only=True)
    customer = serializers.SerializerMethodField()
    retention_probability = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()

    class Meta:
        model = Prediction
        fields = ["id", "customer_id", "customer", "prediction", "churn_probability", "retention_probability", "risk_level", "model_version", "batch_id", "created_at", "message"]

    def get_customer(self, obj) -> dict:
        return {key: getattr(obj.customer, key) for key in CSV_MAP}

    def get_retention_probability(self, obj) -> float:
        return 1 - obj.churn_probability

    def get_message(self, obj) -> str:
        return "The customer is predicted to churn." if obj.prediction else "The customer is predicted to stay."


class CSVUploadSerializer(serializers.Serializer):
    file = serializers.FileField(help_text="UTF-8 CSV, max 5 MiB and 1,000 records. Use API snake_case or exact notebook headers.")


class BatchErrorSerializer(serializers.Serializer):
    row = serializers.IntegerField()
    errors = serializers.DictField()


class BatchResponseSerializer(serializers.Serializer):
    batch_id = serializers.UUIDField()
    total = serializers.IntegerField()
    processed = serializers.IntegerField()
    rejected = serializers.IntegerField()
    predicted_churn = serializers.IntegerField()
    results = PredictionSerializer(many=True)
    errors = BatchErrorSerializer(many=True)
    download_url = serializers.CharField()
