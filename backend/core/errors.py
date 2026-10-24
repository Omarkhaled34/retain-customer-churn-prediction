from django.http import JsonResponse
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, ValidationError):
        response.data = {"detail": "Please check the submitted data.", "errors": response.data}
    return response


def csrf_failure(request, reason=""):
    return JsonResponse({"detail": "CSRF verification failed. Refresh the page and try again."}, status=403)
