from django.db import connection
from drf_spectacular.utils import extend_schema, OpenApiTypes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from prediction.services.predictor import get_predictor, ModelUnavailable


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(responses={200: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT})
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            get_predictor()
        except Exception:
            return Response({"status": "unavailable"}, status=503)
        return Response({"status": "ok"})
