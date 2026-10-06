from django.urls import path

from users.views import (
    login_view,
    logout_view,
    me_view,
    user_admin_list,
    user_assign_district,
    user_create,
    user_reset_password,
    user_toggle_active,
)

urlpatterns = [
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('me/', me_view, name='current-user'),
    path('users/', user_admin_list, name='users-list'),
    path('users/create/', user_create, name='users-create'),
    path('users/<int:user_id>/toggle-active/', user_toggle_active, name='users-toggle-active'),
    path('users/<int:user_id>/reset-password/', user_reset_password, name='users-reset-password'),
    path('users/<int:user_id>/assign-district/', user_assign_district, name='users-assign-district'),
]
