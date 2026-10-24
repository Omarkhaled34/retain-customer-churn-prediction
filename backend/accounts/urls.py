from django.urls import path
from accounts.views import CSRFView, RegisterView, LoginView, LogoutView, ProfileView

urlpatterns = [
    path("csrf/", CSRFView.as_view()), path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()), path("logout/", LogoutView.as_view()),
    path("profile/", ProfileView.as_view()),
]
