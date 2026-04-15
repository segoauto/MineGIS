from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .user_views import UserManagementViewSet

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user-management')

urlpatterns = [
    path('login/', views.login_view, name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', views.logout_view, name='auth-logout'),
    path('sso/authorize/', views.sso_authorize, name='auth-sso-authorize'),
    path('sso/callback/', views.sso_callback, name='auth-sso-callback'),
    path('me/', views.me_view, name='auth-me'),
    path('debug-login/', views.debug_login, name='auth-debug-login'),
    path('', include(router.urls)),
]
