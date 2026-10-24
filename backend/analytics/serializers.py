from rest_framework import serializers


class TrendSerializer(serializers.Serializer):
    date = serializers.DateField()
    total = serializers.IntegerField()
    churn = serializers.IntegerField()
    retained = serializers.IntegerField()


class RiskSerializer(serializers.Serializer):
    risk_level = serializers.CharField()
    count = serializers.IntegerField()


class SubscriptionSerializer(serializers.Serializer):
    subscription_type = serializers.CharField()
    total = serializers.IntegerField()
    churn = serializers.IntegerField()
    average_probability = serializers.FloatField()


class OverviewSerializer(serializers.Serializer):
    total_predictions = serializers.IntegerField()
    total_customers = serializers.IntegerField()
    predicted_churn = serializers.IntegerField()
    predicted_retained = serializers.IntegerField()
    average_probability = serializers.FloatField(allow_null=True)
    high_risk_percentage = serializers.FloatField()
    trends = TrendSerializer(many=True)
    risk_distribution = RiskSerializer(many=True)
    subscriptions = SubscriptionSerializer(many=True)
