"""
GeoServer auto-configuration via REST API.
Called on backend startup: configures workspace, PostGIS data store, layers, and SLD styles.
"""
import logging
import time
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class GeoServerConfigurator:
    def __init__(self):
        self.base_url = settings.GEOSERVER_URL.rstrip('/')
        self.auth = (settings.GEOSERVER_ADMIN_USER, settings.GEOSERVER_ADMIN_PASSWORD)
        self.workspace = settings.GEOSERVER_WORKSPACE
        self.db_name = settings.DATABASES['default']['NAME']
        self.db_user = settings.DATABASES['default']['USER']
        self.db_password = settings.DATABASES['default']['PASSWORD']
        self.db_host = settings.DATABASES['default']['HOST']
        self.db_port = settings.DATABASES['default'].get('PORT', '5432')
        self.rest_url = f"{self.base_url}/rest"

    def _get(self, path: str) -> requests.Response:
        return requests.get(
            f"{self.rest_url}{path}",
            auth=self.auth,
            headers={'Accept': 'application/json'},
            timeout=30,
        )

    def _post(self, path: str, data: dict | str, content_type: str = 'application/json') -> requests.Response:
        headers = {'Content-Type': content_type}
        if isinstance(data, dict):
            import json
            data = json.dumps(data)
        return requests.post(
            f"{self.rest_url}{path}",
            auth=self.auth,
            data=data,
            headers=headers,
            timeout=30,
        )

    def _put(self, path: str, data: dict | str, content_type: str = 'application/json') -> requests.Response:
        headers = {'Content-Type': content_type}
        if isinstance(data, dict):
            import json
            data = json.dumps(data)
        return requests.put(
            f"{self.rest_url}{path}",
            auth=self.auth,
            data=data,
            headers=headers,
            timeout=30,
        )

    def wait_for_geoserver(self, max_attempts: int = 100) -> bool:
        """Poll GeoServer until it's ready."""
        for i in range(max_attempts):
            try:
                r = self._get('/workspaces')
                if r.status_code == 200:
                    logger.info("GeoServer is ready")
                    return True
            except Exception:
                pass
            logger.info(f"Waiting for GeoServer... ({i+1}/{max_attempts})")
            time.sleep(5)
        logger.error("GeoServer did not become ready")
        return False

    def configure_all(self):
        """Run full GeoServer setup sequence."""
        if not self.wait_for_geoserver():
            return

        try:
            self.create_workspace()
            self.create_postgis_datastore()
            self.create_layers()
            self.create_styles()
            logger.info("GeoServer configuration complete")
        except Exception as e:
            logger.error(f"GeoServer configuration error: {e}")

    def create_workspace(self):
        """Create the minegis_ts workspace."""
        r = self._get(f'/workspaces/{self.workspace}')
        if r.status_code == 200:
            logger.info(f"Workspace '{self.workspace}' already exists")
            return

        payload = {
            "workspace": {
                "name": self.workspace,
                "isolated": False,
            }
        }
        r = self._post('/workspaces', payload)
        if r.status_code in (200, 201):
            logger.info(f"Created workspace: {self.workspace}")
        else:
            logger.warning(f"Workspace creation: {r.status_code} {r.text}")

    def create_postgis_datastore(self):
        """Create PostGIS data store connected to our database."""
        store_name = 'minegis_postgis'
        r = self._get(f'/workspaces/{self.workspace}/datastores/{store_name}')
        if r.status_code == 200:
            logger.info(f"DataStore '{store_name}' already exists")
            return

        payload = {
            "dataStore": {
                "name": store_name,
                "description": "MineGIS-TS PostGIS Database",
                "type": "PostGIS",
                "enabled": True,
                "connectionParameters": {
                    "entry": [
                        {"@key": "host",     "$": self.db_host},
                        {"@key": "port",     "$": self.db_port},
                        {"@key": "database", "$": self.db_name},
                        {"@key": "user",     "$": self.db_user},
                        {"@key": "passwd",   "$": self.db_password},
                        {"@key": "dbtype",   "$": "postgis"},
                        {"@key": "schema",   "$": "public"},
                        {"@key": "Expose primary keys", "$": "true"},
                        {"@key": "validate connections", "$": "true"},
                        {"@key": "fetch size", "$": "1000"},
                        {"@key": "Connection timeout", "$": "20"},
                        {"@key": "max connections", "$": "10"},
                        {"@key": "min connections", "$": "1"},
                        {"@key": "Estimated extends", "$": "false"},
                    ]
                }
            }
        }
        r = self._post(f'/workspaces/{self.workspace}/datastores', payload)
        if r.status_code in (200, 201):
            logger.info(f"Created datastore: {store_name}")
        else:
            logger.warning(f"DataStore creation: {r.status_code} {r.text}")

    def create_layers(self):
        """Publish all PostGIS tables as GeoServer layers."""
        layers = [
            {
                'table': 'leases_mininglease',
                'name': 'mining_leases',
                'title': 'Mining Leases — Telangana',
                'srs': 'EPSG:4326',
                'geom_field': 'boundary',
            },
            {
                'table': 'minegis_gis_spatiallayer',
                'name': 'spatial_layers',
                'title': 'Spatial Regulatory Layers',
                'srs': 'EPSG:4326',
                'geom_field': 'geometry',
            },
            {
                'table': 'minegis_gis_dgpssurveypoint',
                'name': 'dgps_survey_points',
                'title': 'DGPS Survey Points',
                'srs': 'EPSG:4326',
                'geom_field': 'location',
            },
            {
                'table': 'minegis_gis_etssurveypoint',
                'name': 'ets_survey_points',
                'title': 'ETS Survey Points',
                'srs': 'EPSG:4326',
                'geom_field': 'location',
            },
            {
                'table': 'minegis_gis_approvedmineplan',
                'name': 'approved_mine_plans',
                'title': 'Approved Mine Plans',
                'srs': 'EPSG:4326',
                'geom_field': 'boundary',
            },
        ]

        store_name = 'minegis_postgis'
        for layer in layers:
            self._publish_layer(store_name, layer)

        # Publish vehicle locations as SQL View
        self._publish_vehicle_sql_view(store_name)

    def _publish_layer(self, store_name: str, layer_config: dict):
        """Publish a PostGIS table as a GeoServer layer."""
        layer_name = layer_config['name']
        r = self._get(f'/workspaces/{self.workspace}/datastores/{store_name}/featuretypes/{layer_name}')
        if r.status_code == 200:
            logger.info(f"Layer '{layer_name}' already published")
            return

        payload = {
            "featureType": {
                "name": layer_name,
                "nativeName": layer_config['table'],
                "title": layer_config['title'],
                "srs": layer_config['srs'],
                "enabled": True,
                "advertised": True,
                "nativeBoundingBox": {
                    "minx": 77.0, "maxx": 81.5,
                    "miny": 15.8, "maxy": 19.9,
                    "crs": "EPSG:4326",
                },
                "latLonBoundingBox": {
                    "minx": 77.0, "maxx": 81.5,
                    "miny": 15.8, "maxy": 19.9,
                    "crs": "EPSG:4326",
                },
            }
        }
        r = self._post(
            f'/workspaces/{self.workspace}/datastores/{store_name}/featuretypes',
            payload
        )
        if r.status_code in (200, 201):
            logger.info(f"Published layer: {layer_name}")
        else:
            logger.warning(f"Layer '{layer_name}' publish: {r.status_code} {r.text[:200]}")

    def _publish_vehicle_sql_view(self, store_name: str):
        """Publish vehicle locations as a SQL view (auto-refreshed)."""
        layer_name = 'vehicle_locations'
        r = self._get(f'/workspaces/{self.workspace}/datastores/{store_name}/featuretypes/{layer_name}')
        if r.status_code == 200:
            logger.info(f"Layer '{layer_name}' already published")
            return

        sql_view = (
            "SELECT v.id, v.vehicle_number, v.vehicle_type, "
            "v.current_speed_kmh, v.is_online, "
            "v.last_location as geom, v.last_seen, v.driver_name "
            "FROM vehicle_tracking_vehicle v "
            "WHERE v.last_location IS NOT NULL"
        )

        payload = {
            "featureType": {
                "name": layer_name,
                "nativeName": layer_name,
                "title": "Vehicle Live Locations",
                "srs": "EPSG:4326",
                "enabled": True,
                "metadata": {
                    "entry": [
                        {
                            "@key": "JDBC_VIRTUAL_TABLE",
                            "virtualTable": {
                                "name": layer_name,
                                "sql": sql_view,
                                "escapeSql": False,
                                "geometry": {
                                    "name": "geom",
                                    "type": "Point",
                                    "srid": 4326,
                                }
                            }
                        }
                    ]
                },
                "nativeBoundingBox": {
                    "minx": 77.0, "maxx": 81.5,
                    "miny": 15.8, "maxy": 19.9,
                    "crs": "EPSG:4326",
                },
                "latLonBoundingBox": {
                    "minx": 77.0, "maxx": 81.5,
                    "miny": 15.8, "maxy": 19.9,
                    "crs": "EPSG:4326",
                },
            }
        }
        r = self._post(
            f'/workspaces/{self.workspace}/datastores/{store_name}/featuretypes',
            payload
        )
        if r.status_code in (200, 201):
            logger.info(f"Published SQL view layer: {layer_name}")
        else:
            logger.warning(f"Vehicle SQL view: {r.status_code} {r.text[:200]}")

    def create_styles(self):
        """Create SLD styles for each layer."""
        styles = {
            'mining_leases_style': self._mining_leases_sld(),
            'forest_style': self._forest_sld(),
            'water_style': self._water_sld(),
            'eco_style': self._eco_sld(),
            'admin_style': self._admin_sld(),
            'transport_style': self._transport_sld(),
            'dgps_style': self._dgps_sld(),
            'ets_style': self._ets_sld(),
            'approved_plan_style': self._approved_plan_sld(),
            'vehicle_online_style': self._vehicle_sld(),
        }

        for style_name, sld in styles.items():
            r = self._get(f'/styles/{style_name}')
            if r.status_code == 200:
                continue
            r = self._post('/styles', f'<style><name>{style_name}</name><filename>{style_name}.sld</filename></style>',
                           content_type='application/xml')
            if r.status_code in (200, 201):
                self._put(f'/styles/{style_name}', sld, content_type='application/vnd.ogc.sld+xml')
                logger.info(f"Created style: {style_name}")

    def _mining_leases_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc">
  <NamedLayer><Name>mining_leases</Name>
  <UserStyle><Title>Mining Leases</Title>
  <FeatureTypeStyle><Rule>
    <Name>Active</Name>
    <ogc:Filter><ogc:PropertyIsEqualTo>
      <ogc:PropertyName>status</ogc:PropertyName><ogc:Literal>ACTIVE</ogc:Literal>
    </ogc:PropertyIsEqualTo></ogc:Filter>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#2563A8</CssParameter>
        <CssParameter name="fill-opacity">0.30</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#1E4D8C</CssParameter>
        <CssParameter name="stroke-width">2</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule><Rule>
    <Name>Expired</Name>
    <ogc:Filter><ogc:PropertyIsEqualTo>
      <ogc:PropertyName>status</ogc:PropertyName><ogc:Literal>EXPIRED</ogc:Literal>
    </ogc:PropertyIsEqualTo></ogc:Filter>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#6B7280</CssParameter>
        <CssParameter name="fill-opacity">0.20</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#4B5563</CssParameter>
        <CssParameter name="stroke-width">1</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule><Rule>
    <Name>Pending</Name>
    <ogc:Filter><ogc:PropertyIsEqualTo>
      <ogc:PropertyName>status</ogc:PropertyName><ogc:Literal>PENDING</ogc:Literal>
    </ogc:PropertyIsEqualTo></ogc:Filter>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#CA8A04</CssParameter>
        <CssParameter name="fill-opacity">0.30</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#A16207</CssParameter>
        <CssParameter name="stroke-width">2</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule><Rule>
    <Name>Suspended</Name>
    <ogc:Filter><ogc:PropertyIsEqualTo>
      <ogc:PropertyName>status</ogc:PropertyName><ogc:Literal>SUSPENDED</ogc:Literal>
    </ogc:PropertyIsEqualTo></ogc:Filter>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#DC2626</CssParameter>
        <CssParameter name="fill-opacity">0.25</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#B91C1C</CssParameter>
        <CssParameter name="stroke-width">2</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule>
  </FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _forest_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>forest</Name><UserStyle><Title>Forest Boundary</Title>
  <FeatureTypeStyle><Rule>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#16A34A</CssParameter>
        <CssParameter name="fill-opacity">0.20</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#15803D</CssParameter>
        <CssParameter name="stroke-width">2</CssParameter>
        <CssParameter name="stroke-dasharray">5 3</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _water_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>water</Name><UserStyle><Title>Water Body</Title>
  <FeatureTypeStyle><Rule>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#0EA5E9</CssParameter>
        <CssParameter name="fill-opacity">0.35</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#0284C7</CssParameter>
        <CssParameter name="stroke-width">1.5</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _eco_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>eco</Name><UserStyle><Title>Eco-Sensitive Zone</Title>
  <FeatureTypeStyle><Rule>
    <PolygonSymbolizer>
      <Fill><CssParameter name="fill">#F97316</CssParameter>
        <CssParameter name="fill-opacity">0.20</CssParameter></Fill>
      <Stroke><CssParameter name="stroke">#EA580C</CssParameter>
        <CssParameter name="stroke-width">2</CssParameter>
        <CssParameter name="stroke-dasharray">8 4</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _dgps_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>dgps</Name><UserStyle><Title>DGPS Survey Points</Title>
  <FeatureTypeStyle><Rule>
    <PointSymbolizer>
      <Graphic>
        <Mark><WellKnownName>circle</WellKnownName>
          <Fill><CssParameter name="fill">#DC2626</CssParameter></Fill>
          <Stroke><CssParameter name="stroke">#FFFFFF</CssParameter>
            <CssParameter name="stroke-width">1.5</CssParameter></Stroke>
        </Mark>
        <Size>12</Size>
      </Graphic>
    </PointSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _ets_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>ets</Name><UserStyle><Title>ETS Survey Points</Title>
  <FeatureTypeStyle><Rule>
    <PointSymbolizer>
      <Graphic>
        <Mark><WellKnownName>triangle</WellKnownName>
          <Fill><CssParameter name="fill">#8B5CF6</CssParameter></Fill>
          <Stroke><CssParameter name="stroke">#FFFFFF</CssParameter>
            <CssParameter name="stroke-width">1</CssParameter></Stroke>
        </Mark>
        <Size>12</Size>
      </Graphic>
    </PointSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _approved_plan_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>approved_plan</Name><UserStyle><Title>Approved Mine Plan</Title>
  <FeatureTypeStyle><Rule>
    <PolygonSymbolizer>
      <Stroke><CssParameter name="stroke">#10B981</CssParameter>
        <CssParameter name="stroke-width">3</CssParameter>
        <CssParameter name="stroke-dasharray">10 5</CssParameter></Stroke>
    </PolygonSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _admin_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>admin</Name><UserStyle><Title>Administrative Boundary</Title>
  <FeatureTypeStyle><Rule>
    <LineSymbolizer>
      <Stroke><CssParameter name="stroke">#6366F1</CssParameter>
        <CssParameter name="stroke-width">2</CssParameter>
        <CssParameter name="stroke-dasharray">15 10 5 10</CssParameter></Stroke>
    </LineSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _transport_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld">
  <NamedLayer><Name>transport</Name><UserStyle><Title>Transportation Network</Title>
  <FeatureTypeStyle><Rule>
    <LineSymbolizer>
      <Stroke><CssParameter name="stroke">#374151</CssParameter>
        <CssParameter name="stroke-width">3</CssParameter></Stroke>
    </LineSymbolizer>
    <LineSymbolizer>
      <Stroke><CssParameter name="stroke">#FBBF24</CssParameter>
        <CssParameter name="stroke-width">1</CssParameter>
        <CssParameter name="stroke-dasharray">6 6</CssParameter></Stroke>
    </LineSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''

    def _vehicle_sld(self) -> str:
        return '''<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc">
  <NamedLayer><Name>vehicles</Name><UserStyle><Title>Vehicles</Title>
  <FeatureTypeStyle><Rule>
    <Name>Online</Name>
    <ogc:Filter><ogc:PropertyIsEqualTo>
      <ogc:PropertyName>is_online</ogc:PropertyName><ogc:Literal>true</ogc:Literal>
    </ogc:PropertyIsEqualTo></ogc:Filter>
    <PointSymbolizer>
      <Graphic>
        <Mark><WellKnownName>circle</WellKnownName>
          <Fill><CssParameter name="fill">#22C55E</CssParameter></Fill>
          <Stroke><CssParameter name="stroke">#FFFFFF</CssParameter>
            <CssParameter name="stroke-width">2</CssParameter></Stroke>
        </Mark><Size>12</Size>
      </Graphic>
    </PointSymbolizer>
  </Rule><Rule>
    <Name>Offline</Name>
    <ogc:Filter><ogc:PropertyIsEqualTo>
      <ogc:PropertyName>is_online</ogc:PropertyName><ogc:Literal>false</ogc:Literal>
    </ogc:PropertyIsEqualTo></ogc:Filter>
    <PointSymbolizer>
      <Graphic>
        <Mark><WellKnownName>circle</WellKnownName>
          <Fill><CssParameter name="fill">#9CA3AF</CssParameter></Fill>
          <Stroke><CssParameter name="stroke">#FFFFFF</CssParameter>
            <CssParameter name="stroke-width">1.5</CssParameter></Stroke>
        </Mark><Size>10</Size>
      </Graphic>
    </PointSymbolizer>
  </Rule></FeatureTypeStyle></UserStyle></NamedLayer>
</StyledLayerDescriptor>'''
