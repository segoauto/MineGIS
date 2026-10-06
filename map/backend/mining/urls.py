from django.urls import path

from mining.views import dashboard_view, districts_view, mandals_view, mines_view, search_view

urlpatterns = [
    path('dashboard/', dashboard_view, name='dashboard'),
    path('districts/', districts_view, name='districts'),
    path('mandals/', mandals_view, name='mandals'),
    path('mines/', mines_view, name='mines'),
    path('search/', search_view, name='search'),
]
