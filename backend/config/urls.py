from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from analytics.views import OverviewView
from core.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls), path("api/auth/", include("accounts.urls")),
    path("api/analytics/overview/", OverviewView.as_view()), path("api/health/", HealthView.as_view()),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/", include("prediction.urls")),
]
