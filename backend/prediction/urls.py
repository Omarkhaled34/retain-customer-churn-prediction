from django.urls import path, include
from rest_framework.routers import DefaultRouter
from prediction.views import PredictView, BatchPredictView, PredictionViewSet, ModelInfoView, ExportView

router = DefaultRouter()
router.register("predictions", PredictionViewSet, basename="prediction")
urlpatterns = [
    path("predict/", PredictView.as_view()), path("predict/batch/", BatchPredictView.as_view()),
    path("model/", ModelInfoView.as_view()), path("predictions/export/", ExportView.as_view()),
    path("", include(router.urls)),
]
