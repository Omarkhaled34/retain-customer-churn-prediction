from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import RegisterSerializer, ProfileSerializer, LoginSerializer, DetailSerializer, CSRFSerializer


class CSRFView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "read"

    @extend_schema(responses=CSRFSerializer)
    def get(self, request):
        return Response({"csrf_token": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(request=RegisterSerializer, responses={201: ProfileSerializer, 400: DetailSerializer, 403: DetailSerializer, 429: DetailSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(ProfileSerializer(user).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    @extend_schema(request=LoginSerializer, responses={200: ProfileSerializer, 400: DetailSerializer, 403: DetailSerializer, 429: DetailSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None:
            return Response({"detail": "Invalid username or password."}, status=400)
        login(request, user)
        return Response(ProfileSerializer(user).data)


class LogoutView(APIView):
    throttle_scope = "auth"

    @extend_schema(request=None, responses={200: DetailSerializer, 403: DetailSerializer})
    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out."})


class ProfileView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer
    throttle_scope = "read"

    def get_object(self):
        return self.request.user
