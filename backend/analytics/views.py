from datetime import timedelta
from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.serializers import OverviewSerializer
from prediction.models import Prediction


class OverviewView(APIView):
    throttle_scope = "read"

    @extend_schema(parameters=[OpenApiParameter("days", int, description="Limit all statistics to 7, 30, or 90 days; omit for all time.")], responses=OverviewSerializer)
    def get(self, request):
        records = Prediction.objects.filter(user=request.user)
        days = request.query_params.get("days")
        if days:
            if days not in {"7", "30", "90"}:
                raise ValidationError({"days": "Choose 7, 30, or 90."})
            records = records.filter(created_at__gte=timezone.now() - timedelta(days=int(days)))
        summary = records.aggregate(total_predictions=Count("id"), total_customers=Count("customer__customer_id", distinct=True),
            predicted_churn=Count("id", filter=Q(prediction=1)), predicted_retained=Count("id", filter=Q(prediction=0)),
            average_probability=Avg("churn_probability"), high_risk=Count("id", filter=Q(risk_level="High")))
        summary["high_risk_percentage"] = summary.pop("high_risk") / summary["total_predictions"] * 100 if summary["total_predictions"] else 0
        summary["trends"] = list(records.order_by().annotate(date=TruncDate("created_at")).values("date").annotate(
            total=Count("id"), churn=Count("id", filter=Q(prediction=1)), retained=Count("id", filter=Q(prediction=0))).order_by("date"))
        summary["risk_distribution"] = list(records.order_by().values("risk_level").annotate(count=Count("id")))
        summary["subscriptions"] = [{"subscription_type": row.pop("customer__subscription_type"), **row}
            for row in records.order_by().values("customer__subscription_type").annotate(total=Count("id"), churn=Count("id", filter=Q(prediction=1)), average_probability=Avg("churn_probability"))]
        return Response(summary)
