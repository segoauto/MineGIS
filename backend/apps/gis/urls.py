from django.urls import path
from . import views

urlpatterns = [
    path('gis/layers/', views.layers_list, name='gis-layers-list'),
    path('gis/layers/<str:layer_type>/geojson/', views.layer_geojson, name='gis-layer-geojson'),
    path('gis/dgps-points/', views.dgps_points, name='gis-dgps-points'),
    path('gis/compliance-report/<path:lease_id>/', views.compliance_report, name='gis-compliance-report'),
    path('geoserver/wms/', views.geoserver_wms_proxy, name='geoserver-wms-proxy'),
]
