import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { buffer as turfBuffer } from '@turf/buffer';
import { booleanIntersects } from '@turf/boolean-intersects';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import 'maplibre-gl/dist/maplibre-gl.css';
import { basemaps, basemapOptions } from './config/basemaps';
import { geoserverConfig } from './config/geoserver';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
const mineralCategories = [
  '53/P & 743/P',
  'Black Granite',
  'Colour Granite',
  'Gravel',
  'Laterite',
  'Limestone',
  'Limestone Slabs',
  'Mosaic Chips',
  'Quartz',
  'Quartz & Feldspar',
  'Road & Metal',
];

const mineralMetrics = [
  { key: 'production', label: 'Production' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'ets', label: 'ETS' },
];

const formatCompactNumber = (value) => new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const getMineralLayerId = (index) => `mines-mineral-${index}-layer`;

const createMeasurementData = (points, mode) => ({
  type: 'FeatureCollection',
  features: points.length > 1 ? [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: mode === 'area' && points.length > 2 ? 'Polygon' : 'LineString',
      coordinates: mode === 'area' && points.length > 2 ? [[...points, points[0]]] : points,
    },
  }] : [],
});

const measureDistance = (points) => points.slice(1).reduce((total, point, index) => {
  const [longitude1, latitude1] = points[index];
  const [longitude2, latitude2] = point;
  const radians = Math.PI / 180;
  const latitudeDelta = (latitude2 - latitude1) * radians;
  const longitudeDelta = (longitude2 - longitude1) * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1 * radians) * Math.cos(latitude2 * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return total + 6371008.8 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}, 0);

const measureArea = (points) => {
  if (points.length < 3) return 0;
  const radians = Math.PI / 180;
  return Math.abs(points.reduce((total, point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    return total + (nextPoint[0] - point[0]) * radians
      * (2 + Math.sin(point[1] * radians) + Math.sin(nextPoint[1] * radians));
  }, 0) * 6371008.8 ** 2 / 2);
};

const formatDistance = (meters) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;

const getDistrictFeatureCollection = (district) => ({
  type: 'FeatureCollection',
  features: district?.geometry ? [{
    type: 'Feature',
    properties: { name: district.name },
    geometry: district.geometry,
  }] : [],
});

const getMandalFeatureCollection = (mandal) => ({
  type: 'FeatureCollection',
  features: mandal?.geometry ? [{
    type: 'Feature',
    properties: { name: mandal.name },
    geometry: mandal.geometry,
  }] : [],
});

const getGeometryExtent = (geometry) => {
  const coordinates = [];
  const collect = (value) => {
    if (Array.isArray(value) && typeof value[0] === 'number') {
      coordinates.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    }
  };
  collect(geometry.coordinates);
  return coordinates.length ? [
    Math.min(...coordinates.map(([longitude]) => longitude)),
    Math.min(...coordinates.map(([, latitude]) => latitude)),
    Math.max(...coordinates.map(([longitude]) => longitude)),
    Math.max(...coordinates.map(([, latitude]) => latitude)),
  ] : null;
};

const queryMinesInBuffer = async (center, distance, unit, minerals, districtName) => {
  const bufferFeature = turfBuffer({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [center.lng, center.lat] },
  }, distance, { units: unit });
  if (!bufferFeature) throw new Error('Could not create the requested buffer.');

  const extent = getGeometryExtent(bufferFeature.geometry);
  const filters = [
    `BBOX(geom,${extent.join(',')},'EPSG:4326')`,
    `(${minerals.map((mineral) => `Mineral='${mineral.replace(/'/g, "''")}'`).join(' OR ')})`,
  ];
  if (districtName) filters.push(`District='${districtName.replace(/'/g, "''")}'`);

  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: `${geoserverConfig.workspace}:Mines`,
    maxFeatures: '5000',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    CQL_FILTER: filters.join(' AND '),
  });
  const response = await fetch(`${geoserverConfig.wfsUrl}?${params.toString()}`);
  if (!response.ok) throw new Error('Mine features could not be loaded.');
  const payload = await response.json();
  const candidates = payload.features || [];
  return {
    bufferFeature,
    mines: candidates.filter((feature) => booleanIntersects(bufferFeature, feature)),
    candidatesTruncated: candidates.length >= 5000,
  };
};

const formatMineInfoValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not available';
  return typeof value === 'number' ? value.toLocaleString('en-IN') : String(value);
};

const createMinePopupContent = (properties) => {
  const content = document.createElement('div');
  content.className = 'mine-info-window';

  const heading = document.createElement('h3');
  heading.textContent = properties.Company || 'Mine details';
  content.appendChild(heading);

  const subtitle = document.createElement('p');
  subtitle.className = 'mine-info-subtitle';
  subtitle.textContent = [properties.Mineral, properties.District].filter(Boolean).join(' · ');
  content.appendChild(subtitle);

  const details = document.createElement('dl');
  [
    ['Mandal', properties.Mandal],
    ['Survey number', properties.SurveyNumb],
    ['Mineral type', properties.MineralTyp],
    ['Land type', properties.LandType],
    ['Production', properties.Production],
    ['Dispatch', properties.Dispatch],
    ['ETS', properties.ETS],
    ['Notice', properties.Notice],
    ['Registered from', properties.Reg_From],
    ['Registered to', properties.Reg_To],
    ['Address', properties.Address],
  ].forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = formatMineInfoValue(value);
    details.append(term, description);
  });
  content.appendChild(details);
  return content;
};

function MapToolbarIcon({ name }) {
  const shapes = {
    basemap: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    district: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /><circle cx="12" cy="11" r="2" /></>,
    measure: <><path d="m21 3-18 18" /><path d="m15 3 6 6M3 15l6 6" /><path d="m17 7-2 2m-2-4-2 2m-2-4-2 2M7 17l2-2m2 4 2-2m2 4 2-2" /></>,
    magnifier: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    swipe: <><path d="M12 3v18M5 7l-4 5 4 5M19 7l4 5-4 5" /><path d="M8 12h8" /></>,
  };

  return <svg className="map-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

const getGeoServerLayerUrl = (layerName, opacity = 0.7, cqlFilter = null) => {
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: `${geoserverConfig.workspace}:${layerName}`,
    styles: '',
    format: 'image/png',
    transparent: 'true',
    width: '256',
    height: '256',
    srs: 'EPSG:3857',
    opacity: String(opacity),
  });
  if (cqlFilter) params.set('CQL_FILTER', cqlFilter);
  return `${geoserverConfig.wmsUrl}?${params.toString()}&bbox={bbox-epsg-3857}`;
};

const getCsrfToken = () => {
  const csrfCookie = document.cookie.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('csrftoken='));
  return csrfCookie ? decodeURIComponent(csrfCookie.slice('csrftoken='.length)) : '';
};

async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method) && !headers['X-CSRFToken']) {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || payload.message || 'Request failed.');
  }

  return response.status === 204 ? null : response.json();
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      onLogin(payload.user);
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Telangana Mining GIS Dashboard</h1>
        <p>Secure login for state and district users</p>
        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="hyderabad" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Hyderabad123" />
          </label>
          {error ? <div className="message error">{error}</div> : null}
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
      </div>
    </div>
  );
}

function DistrictAnalyticsPanel({ user, selectedMandalId, mandals, onSelectedMandalChange }) {
  const [stats, setStats] = useState({ total_districts: 0, total_mandals: 0, total_mines: 0, mineral_breakdown: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  useEffect(() => {
    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (selectedMandalId) params.set('mandal_id', selectedMandalId);
    else if (selectedDistrict) params.set('district_id', selectedDistrict);
    const query = params.size ? `?${params.toString()}` : '';
    apiRequest(`/api/dashboard/${query}`)
      .then((data) => {
        if (isCurrentRequest) setStats(data);
      })
      .catch((err) => {
        if (isCurrentRequest) setError(err.message);
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [selectedDistrict, selectedMandalId]);

  const mineralData = stats.mineral_breakdown || [];
  const chartHeight = Math.max(240, mineralData.length * 30);
  const metricTotal = (key) => mineralData.reduce((total, row) => total + (Number(row[key]) || 0), 0);
  const chartAreaLabel = stats.selected_mandal
    ? `${stats.selected_mandal.name}, ${stats.selected_mandal.district_name}`
    : user.role === 'DISTRICT_USER'
    ? user.district_name || stats.districts?.[0]?.name || 'assigned district'
    : selectedDistrict
      ? (stats.districts || []).find((district) => String(district.id) === selectedDistrict)?.name || 'selected district'
      : 'all districts';

  const handleDistrictChange = (event) => {
    setSelectedDistrict(event.target.value);
    onSelectedMandalChange('');
  };

  const handleMandalChange = (event) => {
    const mandalId = event.target.value;
    onSelectedMandalChange(mandalId);
    if (mandalId) {
      const mandal = mandals.find((item) => String(item.id) === mandalId);
      if (mandal) setSelectedDistrict(String(mandal.district));
    } else {
      setSelectedDistrict('');
    }
  };
  const visibleMandals = selectedDistrict
    ? mandals.filter((mandal) => String(mandal.district) === selectedDistrict)
    : mandals;

  return (
    <div className="sidebar-analytics-content">
        {user.role === 'STATE_ADMIN' ? (
          <label className="dashboard-district-select" htmlFor="dashboard-district">
            <span>Area</span>
            <select id="dashboard-district" value={selectedDistrict} onChange={handleDistrictChange}>
              <option value="">Statewide</option>
              {(stats.districts || []).map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
            </select>
          </label>
        ) : null}

        <label className="dashboard-district-select" htmlFor="analytics-mandal">
          <span>Mandal</span>
          <select id="analytics-mandal" value={selectedMandalId} onChange={handleMandalChange}>
            <option value="">All mandals</option>
            {user.role === 'STATE_ADMIN' && !selectedDistrict
              ? [...new Set(visibleMandals.map((mandal) => mandal.district_name))].map((districtName) => (
                <optgroup key={districtName} label={districtName}>
                  {visibleMandals.filter((mandal) => mandal.district_name === districtName).map((mandal) => (
                    <option key={mandal.id} value={mandal.id} disabled={!mandal.bounds}>{mandal.name}</option>
                  ))}
                </optgroup>
              ))
              : visibleMandals.map((mandal) => (
                <option key={mandal.id} value={mandal.id} disabled={!mandal.bounds}>{mandal.name}</option>
              ))}
          </select>
        </label>

        <p className="sidebar-analytics-scope">{chartAreaLabel}</p>

        {error ? <div className="message error">{error}</div> : null}

        {!loading ? (
          <>
            <div className="sidebar-analytics-stats">
            <div><span>Mines</span><strong>{stats.total_mines.toLocaleString('en-IN')}</strong></div>
            <div><span>Mandals</span><strong>{stats.total_mandals.toLocaleString('en-IN')}</strong></div>
            {mineralMetrics.map((metric) => (
              <div key={metric.key}>
                <span>{metric.label}</span>
                <strong>{metricTotal(metric.key).toLocaleString('en-IN')}</strong>
              </div>
            ))}
            </div>

            {mineralData.length ? (
              <section className="sidebar-mineral-chart">
                <h3>By mineral</h3>
                <div className="sidebar-analytics-chart" style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mineralData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid stroke="#e4e9ed" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={formatCompactNumber} tick={{ fill: '#dbe6ed', fontSize: 9 }} />
                      <YAxis type="category" dataKey="mineral" width={82} interval={0} tick={{ fill: '#f0f4f7', fontSize: 9 }} />
                      <Tooltip formatter={(value, name) => [Number(value).toLocaleString('en-IN'), name]} />
                      <Legend wrapperStyle={{ color: '#f0f4f7', fontSize: 9 }} />
                      <Bar dataKey="production" name="Production" fill="#43c4b5" maxBarSize={8} />
                      <Bar dataKey="dispatch" name="Dispatch" fill="#7cb9e8" maxBarSize={8} />
                      <Bar dataKey="ets" name="ETS" fill="#f2b84b" maxBarSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : !error ? (
              <div className="sidebar-analytics-empty">No mineral data available.</div>
            ) : null}
          </>
        ) : (
          <div className="sidebar-analytics-loading">Loading…</div>
        )}
    </div>
  );
}

function GISDashboardPage({ user, selectedMandalId, setSelectedMandalId, mandals, setMandals }) {
  return (
    <div className="gis-dashboard-page">
      <MapPage
        user={user}
        selectedMandalId={selectedMandalId}
        onSelectedMandalChange={setSelectedMandalId}
        onMandalsChange={setMandals}
      />
    </div>
  );
}

function MapPage({ user, selectedMandalId, onSelectedMandalChange, onMandalsChange }) {
  const mapLayoutRef = useRef(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const magnifierContainer = useRef(null);
  const magnifierMapRef = useRef(null);
  const swipeMapContainer = useRef(null);
  const swipeMapRef = useRef(null);
  const selectedDistrictRef = useRef(null);
  const previousValidViewRef = useRef(null);
  const restoringDistrictViewRef = useRef(false);
  const minePopupRef = useRef(null);
  const mineInfoRequestRef = useRef(0);
  const bufferRequestRef = useRef(0);
  const bufferSettingsRef = useRef({ active: false, distance: '1', unit: 'kilometers', minerals: [] });
  const selectedMandalRef = useRef(null);
  const measurementPointsRef = useRef([]);
  const measurementModeRef = useRef(null);
  const measurementTypeRef = useRef(null);
  const bufferOverlayRef = useRef({ polygon: null, center: null, mines: [] });
  const [activeBasemap, setActiveBasemap] = useState('osm');
  const [comparisonBasemap, setComparisonBasemap] = useState('satellite');
  const [openWidget, setOpenWidget] = useState(null);
  const [measurementMode, setMeasurementMode] = useState(null);
  const [measurementType, setMeasurementType] = useState(null);
  const [measurementPoints, setMeasurementPoints] = useState([]);
  const [bufferActive, setBufferActive] = useState(false);
  const [bufferDistance, setBufferDistance] = useState('1');
  const [bufferUnit, setBufferUnit] = useState('kilometers');
  const [bufferMinerals, setBufferMinerals] = useState(() => Object.fromEntries(mineralCategories.map((mineral) => [mineral, true])));
  const [bufferResults, setBufferResults] = useState(null);
  const [bufferLoading, setBufferLoading] = useState(false);
  const [bufferError, setBufferError] = useState('');
  const [magnifierActive, setMagnifierActive] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  const [swipeActive, setSwipeActive] = useState(false);
  const [swipePosition, setSwipePosition] = useState(50);
  const [districts, setDistricts] = useState([]);
  const [districtError, setDistrictError] = useState('');
  const [mandals, setMandals] = useState([]);
  const [mandalsLoading, setMandalsLoading] = useState(false);
  const [mandalError, setMandalError] = useState('');
  const selectedDistrictId = user.role === 'DISTRICT_USER' && user.district
    ? String(user.district)
    : String(mandals.find((mandal) => String(mandal.id) === selectedMandalId)?.district || '');
  const [visibleLayers, setVisibleLayers] = useState({
    Districts: true,
    Mandals: true,
    Mines: true,
    State: true,
  });
  const [visibleMinerals, setVisibleMinerals] = useState(() => Object.fromEntries(mineralCategories.map((mineral) => [mineral, true])));
  const visibleLayersRef = useRef(visibleLayers);
  const visibleMineralsRef = useRef(visibleMinerals);

  const zoomToBufferMine = (mine) => {
    const map = mapRef.current;
    const coordinates = mine.geometry?.type === 'Point' ? mine.geometry.coordinates : null;
    if (!map || !Array.isArray(coordinates) || coordinates.length < 2
      || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      setBufferError('This mine does not have a valid point location.');
      return;
    }

    const selectedId = mine.properties._bufferResultId;
    bufferOverlayRef.current.mines = bufferOverlayRef.current.mines.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        selected: feature.properties._bufferResultId === selectedId,
      },
    }));
    map.getSource('analysis-buffer-mines-source')?.setData({
      type: 'FeatureCollection',
      features: bufferOverlayRef.current.mines,
    });
    map.flyTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
      essential: true,
    });
  };

  useEffect(() => {
    visibleLayersRef.current = visibleLayers;
  }, [visibleLayers]);

  useEffect(() => {
    visibleMineralsRef.current = visibleMinerals;
  }, [visibleMinerals]);

  useEffect(() => {
    measurementPointsRef.current = measurementPoints;
  }, [measurementPoints]);

  useEffect(() => {
    measurementModeRef.current = measurementMode;
  }, [measurementMode]);

  useEffect(() => {
    measurementTypeRef.current = measurementType;
  }, [measurementType]);

  useEffect(() => {
    bufferSettingsRef.current = {
      active: bufferActive,
      distance: bufferDistance,
      unit: bufferUnit,
      minerals: mineralCategories.filter((mineral) => bufferMinerals[mineral]),
    };
  }, [bufferActive, bufferDistance, bufferUnit, bufferMinerals]);

  useEffect(() => {
    if (bufferActive) return;
    bufferOverlayRef.current = { polygon: null, center: null, mines: [] };
    mapRef.current?.getSource('analysis-buffer-source')?.setData({ type: 'FeatureCollection', features: [] });
    mapRef.current?.getSource('analysis-buffer-center-source')?.setData({ type: 'FeatureCollection', features: [] });
    mapRef.current?.getSource('analysis-buffer-mines-source')?.setData({ type: 'FeatureCollection', features: [] });
    setBufferResults(null);
    setBufferError('');
  }, [bufferActive]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          raster: {
            type: 'raster',
            tiles: [basemaps[activeBasemap].url],
            tileSize: 256,
            attribution: basemaps[activeBasemap].attribution,
          },
        },
        layers: [{ id: 'raster-layer', type: 'raster', source: 'raster' }],
      },
      center: [78.9629, 17.4065],
      zoom: 6.8,
      minZoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl({ container: mapContainer.current.parentElement }), 'top-right');
    map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    map.on('style.load', () => {
      map.addSource('measurement-source', {
        type: 'geojson',
        data: createMeasurementData(measurementPointsRef.current, measurementTypeRef.current),
      });
      map.addSource('analysis-buffer-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: bufferOverlayRef.current.polygon ? [bufferOverlayRef.current.polygon] : [] },
      });
      map.addSource('analysis-buffer-center-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: bufferOverlayRef.current.center ? [bufferOverlayRef.current.center] : [] },
      });
      map.addSource('analysis-buffer-mines-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: bufferOverlayRef.current.mines },
      });
      const layers = ['Districts', 'Mandals', 'State'];
      layers.forEach((layer) => {
        const sourceId = `${layer.toLowerCase()}-source`;
        const wmsUrl = getGeoServerLayerUrl(layer, 0.8);
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [wmsUrl],
          tileSize: 256,
        });

        map.addLayer({
          id: `${layer.toLowerCase()}-layer`,
          type: 'raster',
          source: sourceId,
          layout: { visibility: visibleLayersRef.current[layer] ? 'visible' : 'none' },
          paint: { 'raster-opacity': layer === 'Mines' ? 0.7 : 0.55 },
        });
      });

      mineralCategories.forEach((mineral, index) => {
        const sourceId = `mines-mineral-${index}-source`;
        const escapedMineral = mineral.replace(/'/g, "''");
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [getGeoServerLayerUrl('Mines', 0.8, `Mineral='${escapedMineral}'`)],
          tileSize: 256,
        });
        map.addLayer({
          id: getMineralLayerId(index),
          type: 'raster',
          source: sourceId,
          layout: {
            visibility: visibleLayersRef.current.Mines && visibleMineralsRef.current[mineral] ? 'visible' : 'none',
          },
          paint: { 'raster-opacity': 0.7 },
        });
      });

      map.addSource('selected-district-source', {
        type: 'geojson',
        data: getDistrictFeatureCollection(selectedDistrictRef.current),
      });
      map.addLayer({
        id: 'selected-district-outline-casing-layer',
        type: 'line',
        source: 'selected-district-source',
        paint: { 'line-color': '#fff', 'line-width': 5 },
      });
      map.addLayer({
        id: 'selected-district-outline-layer',
        type: 'line',
        source: 'selected-district-source',
        paint: { 'line-color': '#d1493f', 'line-width': 2.5 },
      });

      map.addSource('selected-mandal-source', {
        type: 'geojson',
        data: getMandalFeatureCollection(selectedMandalRef.current),
      });
      map.addLayer({
        id: 'selected-mandal-outline-casing-layer',
        type: 'line',
        source: 'selected-mandal-source',
        paint: { 'line-color': '#fff', 'line-width': 5 },
      });
      map.addLayer({
        id: 'selected-mandal-outline-layer',
        type: 'line',
        source: 'selected-mandal-source',
        paint: { 'line-color': '#006e70', 'line-width': 3 },
      });

      map.addLayer({
        id: 'measurement-fill-layer',
        type: 'fill',
        source: 'measurement-source',
        paint: { 'fill-color': '#f2a900', 'fill-opacity': 0.2 },
      });
      map.addLayer({
        id: 'measurement-line-layer',
        type: 'line',
        source: 'measurement-source',
        paint: { 'line-color': '#d88900', 'line-width': 3, 'line-dasharray': [2, 1] },
      });
      map.addLayer({
        id: 'analysis-buffer-fill-layer',
        type: 'fill',
        source: 'analysis-buffer-source',
        paint: { 'fill-color': '#f2b84b', 'fill-opacity': 0.2 },
      });
      map.addLayer({
        id: 'analysis-buffer-outline-layer',
        type: 'line',
        source: 'analysis-buffer-source',
        paint: { 'line-color': '#df8319', 'line-width': 2, 'line-dasharray': [2, 1] },
      });
      map.addLayer({
        id: 'analysis-buffer-mines-layer',
        type: 'circle',
        source: 'analysis-buffer-mines-source',
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'selected'], false], 10, 6],
          'circle-color': ['case', ['boolean', ['get', 'selected'], false], '#f2b84b', '#e43d62'],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': ['case', ['boolean', ['get', 'selected'], false], 3, 2],
          'circle-opacity': 0.96,
        },
      });
      map.addLayer({
        id: 'analysis-buffer-center-layer',
        type: 'circle',
        source: 'analysis-buffer-center-source',
        paint: {
          'circle-radius': 7,
          'circle-color': '#d1493f',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });
    });

    map.on('moveend', () => {
      const extent = selectedDistrictRef.current?.bounds;
      const view = { center: map.getCenter().toArray(), zoom: map.getZoom() };
      if (restoringDistrictViewRef.current) {
        restoringDistrictViewRef.current = false;
        previousValidViewRef.current = view;
        return;
      }
      if (!extent || extent.length !== 4) {
        previousValidViewRef.current = view;
        return;
      }

      const [[west, south], [east, north]] = map.getBounds().toArray();
      const intersectsDistrict = west <= extent[2] && east >= extent[0]
        && south <= extent[3] && north >= extent[1];
      if (intersectsDistrict) {
        previousValidViewRef.current = view;
        return;
      }

      const previousView = previousValidViewRef.current;
      restoringDistrictViewRef.current = true;
      if (previousView) {
        map.jumpTo(previousView);
      } else {
        map.fitBounds([[extent[0], extent[1]], [extent[2], extent[3]]], { padding: 5 });
      }
    });

    map.on('click', async (event) => {
      const bufferSettings = bufferSettingsRef.current;
      if (bufferSettings.active) {
        const requestId = ++bufferRequestRef.current;
        const distance = Number(bufferSettings.distance);
        const minerals = bufferSettings.minerals;
        const maximumMeters = 100000;
        const metersByUnit = { meters: 1, kilometers: 1000, miles: 1609.344 };
        if (!Number.isFinite(distance) || distance <= 0 || distance * metersByUnit[bufferSettings.unit] > maximumMeters) {
          setBufferError('Enter a positive distance no greater than 100 km.');
          setBufferResults(null);
          return;
        }
        if (!minerals.length) {
          setBufferError('Select at least one mineral.');
          setBufferResults(null);
          return;
        }

        setOpenWidget('buffer');
        setBufferLoading(true);
        setBufferError('');
        setBufferResults(null);
        bufferOverlayRef.current = { polygon: null, center: null, mines: [] };
        map.getSource('analysis-buffer-source')?.setData({ type: 'FeatureCollection', features: [] });
        map.getSource('analysis-buffer-center-source')?.setData({ type: 'FeatureCollection', features: [] });
        map.getSource('analysis-buffer-mines-source')?.setData({ type: 'FeatureCollection', features: [] });
        try {
          const result = await queryMinesInBuffer(event.lngLat, distance, bufferSettings.unit, minerals, user.role === 'DISTRICT_USER' ? user.district_name : null);
          if (requestId !== bufferRequestRef.current) return;
          const centerFeature = {
            type: 'Feature',
            properties: { kind: 'buffer-center' },
            geometry: { type: 'Point', coordinates: [event.lngLat.lng, event.lngLat.lat] },
          };
          const minePoints = result.mines.map((feature, index) => ({
            type: 'Feature',
            properties: { ...(feature.properties || {}), _bufferResultId: String(index), selected: false },
            geometry: feature.geometry,
          }));
          bufferOverlayRef.current = { polygon: result.bufferFeature, center: centerFeature, mines: minePoints };
          map.getSource('analysis-buffer-source')?.setData({ type: 'FeatureCollection', features: [result.bufferFeature] });
          map.getSource('analysis-buffer-center-source')?.setData({ type: 'FeatureCollection', features: [centerFeature] });
          map.getSource('analysis-buffer-mines-source')?.setData({ type: 'FeatureCollection', features: minePoints });
          const extent = getGeometryExtent(result.bufferFeature.geometry);
          if (extent) {
            map.fitBounds([[extent[0], extent[1]], [extent[2], extent[3]]], {
              padding: 40,
              duration: 700,
              maxZoom: 12,
              essential: true,
            });
          }
          setBufferResults({
            mines: minePoints,
            distance,
            unit: bufferSettings.unit,
            candidatesTruncated: result.candidatesTruncated,
          });
          minePopupRef.current?.remove();
          minePopupRef.current = null;
        } catch (error) {
          if (requestId === bufferRequestRef.current) setBufferError(error.message || 'Buffer analysis failed.');
        } finally {
          if (requestId === bufferRequestRef.current) setBufferLoading(false);
        }
        return;
      }

      if (measurementTypeRef.current && measurementModeRef.current) {
        setMeasurementPoints((current) => [...current, [event.lngLat.lng, event.lngLat.lat]]);
        return;
      }
      setOpenWidget(null);
      if (!visibleLayersRef.current.Mines) return;

      const activeMinerals = mineralCategories.filter((mineral) => visibleMineralsRef.current[mineral]);
      if (!activeMinerals.length) return;

      const requestId = ++mineInfoRequestRef.current;
      const bounds = map.getBounds().toArray().flat();
      const width = map.getContainer().clientWidth;
      const height = map.getContainer().clientHeight;
      const params = new URLSearchParams({
        service: 'WMS',
        version: '1.1.1',
        request: 'GetFeatureInfo',
        layers: `${geoserverConfig.workspace}:Mines`,
        query_layers: `${geoserverConfig.workspace}:Mines`,
        styles: '',
        format: 'image/png',
        info_format: 'application/json',
        srs: 'EPSG:4326',
        bbox: bounds.join(','),
        width: String(width),
        height: String(height),
        x: String(Math.max(0, Math.min(width - 1, Math.round(event.point.x)))),
        y: String(Math.max(0, Math.min(height - 1, Math.round(event.point.y)))),
        feature_count: '1',
        buffer: '4',
      });
      const filters = [];
      if (activeMinerals.length !== mineralCategories.length) {
        filters.push(`(${activeMinerals.map((mineral) => `Mineral='${mineral.replace(/'/g, "''")}'`).join(' OR ')})`);
      }
      if (user.role === 'DISTRICT_USER' && user.district_name) {
        filters.push(`District='${user.district_name.replace(/'/g, "''")}'`);
      }
      if (filters.length) params.set('CQL_FILTER', filters.join(' AND '));

      try {
        const response = await fetch(`${geoserverConfig.wmsUrl}?${params.toString()}`);
        if (!response.ok) throw new Error('Mine details could not be loaded.');
        const payload = await response.json();
        if (requestId !== mineInfoRequestRef.current) return;
        const feature = payload.features?.[0];
        if (!feature?.properties) {
          minePopupRef.current?.remove();
          minePopupRef.current = null;
          return;
        }
        minePopupRef.current?.remove();
        const popupContent = createMinePopupContent(feature.properties);
        popupContent.style.maxHeight = `${Math.max(100, Math.floor(height / 2) - 48)}px`;
        minePopupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: `${Math.max(220, Math.min(360, width - 24))}px`,
          anchor: event.point.y > height / 2 ? 'bottom' : 'top',
        })
          .setLngLat(event.lngLat)
          .setDOMContent(popupContent)
          .addTo(map);
      } catch {
        if (requestId !== mineInfoRequestRef.current) return;
        minePopupRef.current?.remove();
        const errorContent = document.createElement('div');
        errorContent.className = 'mine-info-error';
        errorContent.textContent = 'Mine details could not be loaded.';
        minePopupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(event.lngLat)
          .setDOMContent(errorContent)
          .addTo(map);
      }
    });

    map.on('mousemove', (event) => {
      const magnifierMap = magnifierMapRef.current;
      if (!magnifierMap) return;
      setMagnifierPosition({ x: event.point.x, y: event.point.y });
      magnifierMap.jumpTo({ center: event.lngLat, zoom: map.getZoom() + 1.5 });
    });

    map.on('mouseout', () => setMagnifierPosition((position) => ({ ...position, x: -200 })));

    mapRef.current = map;

    return () => {
      minePopupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;
    if (!selectedDistrictId) {
      setDistricts([]);
      selectedDistrictRef.current = null;
      previousValidViewRef.current = null;
      return () => {
        isCurrentRequest = false;
      };
    }

    selectedDistrictRef.current = null;
    previousValidViewRef.current = null;
    apiRequest(`/api/districts/?district_id=${encodeURIComponent(selectedDistrictId)}`)
      .then((data) => {
        if (isCurrentRequest) setDistricts(data.results || []);
      })
      .catch((error) => {
        if (isCurrentRequest) setDistrictError(error.message);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [selectedDistrictId]);

  useEffect(() => {
    let isCurrentRequest = true;
    setMandals([]);
    onMandalsChange([]);
    onSelectedMandalChange('');
    setMandalError('');
    setMandalsLoading(true);
    const districtQuery = user.role === 'DISTRICT_USER' && user.district
      ? `?district_id=${encodeURIComponent(user.district)}`
      : '';
    apiRequest(`/api/mandals/${districtQuery}`)
      .then((data) => {
        if (isCurrentRequest) {
          const results = data.results || [];
          const accessibleMandals = user.role === 'DISTRICT_USER' && user.district
            ? results.filter((mandal) => String(mandal.district) === String(user.district))
            : results;
          setMandals(accessibleMandals);
          onMandalsChange(accessibleMandals);
        }
      })
      .catch((error) => {
        if (isCurrentRequest) setMandalError(error.message);
      })
      .finally(() => {
        if (isCurrentRequest) setMandalsLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [user.district, user.role, onMandalsChange, onSelectedMandalChange]);

  useEffect(() => {
    const selectedDistrict = districts.find((district) => String(district.id) === selectedDistrictId);
    selectedDistrictRef.current = selectedDistrict || null;
    const source = mapRef.current?.getSource('selected-district-source');
    if (source) source.setData(getDistrictFeatureCollection(selectedDistrict));
    const map = mapRef.current;
    if (selectedDistrict && map) {
      const [[west, south], [east, north]] = map.getBounds().toArray();
      const extent = selectedDistrict.bounds;
      const intersectsDistrict = extent && west <= extent[2] && east >= extent[0]
        && south <= extent[3] && north >= extent[1];
      if (intersectsDistrict) {
        previousValidViewRef.current = { center: map.getCenter().toArray(), zoom: map.getZoom() };
      }
    }
  }, [districts, selectedDistrictId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('measurement-source');
    if (source) source.setData(createMeasurementData(measurementPoints, measurementType));
  }, [measurementPoints, measurementType, activeBasemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (measurementMode) {
      map.getCanvas().style.cursor = 'crosshair';
      map.doubleClickZoom.disable();
    } else {
      map.getCanvas().style.cursor = visibleLayers.Mines ? 'pointer' : '';
      map.doubleClickZoom.enable();
    }
  }, [measurementMode, visibleLayers.Mines]);

  useEffect(() => {
    if (activeBasemap === comparisonBasemap) {
      setComparisonBasemap(basemapOptions.find((key) => key !== activeBasemap));
    }
  }, [activeBasemap, comparisonBasemap]);

  useEffect(() => {
    if (!magnifierActive || !magnifierContainer.current || magnifierMapRef.current) return;
    const magnifierMap = new maplibregl.Map({
      container: magnifierContainer.current,
      style: {
        version: 8,
        sources: {
          comparison: {
            type: 'raster',
            tiles: [basemaps[comparisonBasemap].url],
            tileSize: 256,
            attribution: basemaps[comparisonBasemap].attribution,
          },
        },
        layers: [{ id: 'comparison-layer', type: 'raster', source: 'comparison' }],
      },
      center: mapRef.current?.getCenter() || [78.9629, 17.4065],
      zoom: (mapRef.current?.getZoom() || 6.8) + 1.5,
      interactive: false,
      attributionControl: false,
      renderWorldCopies: false,
    });
    magnifierMapRef.current = magnifierMap;
    return () => {
      magnifierMap.remove();
      magnifierMapRef.current = null;
    };
  }, [magnifierActive]);

  useEffect(() => {
    const map = magnifierMapRef.current;
    if (!map) return;
    map.setStyle({
      version: 8,
      sources: {
        comparison: {
          type: 'raster',
          tiles: [basemaps[comparisonBasemap].url],
          tileSize: 256,
          attribution: basemaps[comparisonBasemap].attribution,
        },
      },
      layers: [{ id: 'comparison-layer', type: 'raster', source: 'comparison' }],
    });
  }, [comparisonBasemap]);

  useEffect(() => {
    const mainMap = mapRef.current;
    const container = swipeMapContainer.current;
    if (!swipeActive || !mainMap || !container || swipeMapRef.current) return undefined;

    const swipeMap = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          comparison: {
            type: 'raster',
            tiles: [basemaps[comparisonBasemap].url],
            tileSize: 256,
            attribution: basemaps[comparisonBasemap].attribution,
          },
        },
        layers: [{ id: 'comparison-layer', type: 'raster', source: 'comparison' }],
      },
      center: mainMap.getCenter(),
      zoom: mainMap.getZoom(),
      bearing: mainMap.getBearing(),
      pitch: mainMap.getPitch(),
      interactive: false,
      attributionControl: false,
      renderWorldCopies: false,
    });
    swipeMapRef.current = swipeMap;

    const syncCamera = () => {
      swipeMap.jumpTo({
        center: mainMap.getCenter(),
        zoom: mainMap.getZoom(),
        bearing: mainMap.getBearing(),
        pitch: mainMap.getPitch(),
      });
    };
    mainMap.on('move', syncCamera);
    mainMap.on('resize', syncCamera);

    return () => {
      mainMap.off('move', syncCamera);
      mainMap.off('resize', syncCamera);
      swipeMap.remove();
      swipeMapRef.current = null;
    };
  }, [swipeActive]);

  useEffect(() => {
    const map = swipeMapRef.current;
    if (!map) return;
    map.setStyle({
      version: 8,
      sources: {
        comparison: {
          type: 'raster',
          tiles: [basemaps[comparisonBasemap].url],
          tileSize: 256,
          attribution: basemaps[comparisonBasemap].attribution,
        },
      },
      layers: [{ id: 'comparison-layer', type: 'raster', source: 'comparison' }],
    });
  }, [comparisonBasemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextStyle = {
      version: 8,
      sources: {
        raster: {
          type: 'raster',
          tiles: [basemaps[activeBasemap].url],
          tileSize: 256,
          attribution: basemaps[activeBasemap].attribution,
        },
      },
      layers: [{ id: 'raster-layer', type: 'raster', source: 'raster' }],
    };
    map.setStyle(nextStyle);
  }, [activeBasemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    Object.entries(visibleLayers).forEach(([layer, visible]) => {
      if (layer === 'Mines') return;
      const layerId = `${layer.toLowerCase()}-layer`;
      const layerStyle = map.getLayer(layerId);
      if (layerStyle) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }, [visibleLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    mineralCategories.forEach((mineral, index) => {
      const layerId = getMineralLayerId(index);
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibleLayers.Mines && visibleMinerals[mineral] ? 'visible' : 'none');
      }
    });
  }, [visibleLayers, visibleMinerals]);

  const toggleLayer = (name) => {
    setVisibleLayers((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const zoomToDistrict = (district) => {
    const map = mapRef.current;
    if (!map || !district?.bounds || district.bounds.length !== 4) return;
    const extent = district.bounds;
    map.fitBounds(
      [[extent[0], extent[1]], [extent[2], extent[3]]],
      { padding: 5 },
    );
  };

  const zoomToMandal = (mandal) => {
    const map = mapRef.current;
    if (!map || !mandal?.bounds || mandal.bounds.length !== 4) return;
    const extent = mandal.bounds;
    map.fitBounds(
      [[extent[0], extent[1]], [extent[2], extent[3]]],
      { padding: 5 },
    );
  };

  useEffect(() => {
    const selectedMandal = mandals.find((mandal) => String(mandal.id) === selectedMandalId);
    selectedMandalRef.current = selectedMandal || null;
    const source = mapRef.current?.getSource('selected-mandal-source');
    if (source) source.setData(getMandalFeatureCollection(selectedMandal));
    if (selectedMandal) zoomToMandal(selectedMandal);
  }, [mandals, selectedMandalId]);

  useEffect(() => {
    if (user.role !== 'DISTRICT_USER') return;
    const district = districts.find((item) => String(item.id) === String(user.district));
    if (!district) return;
    zoomToDistrict(district);
  }, [districts, user.district, user.role]);

  const selectMeasurementMode = (mode) => {
    setMeasurementPoints([]);
    setMeasurementType(mode);
    setMeasurementMode(mode);
    setMagnifierActive(false);
    setSwipeActive(false);
  };

  const finishMeasurement = () => setMeasurementMode(null);
  const clearMeasurement = () => {
    setMeasurementPoints([]);
    setMeasurementMode(null);
  };
  const measurementValue = measurementType === 'area'
    ? `${(measureArea(measurementPoints) / 10000).toFixed(2)} ha`
    : formatDistance(measureDistance(measurementPoints));

  return (
    <div
      ref={mapLayoutRef}
      className="map-layout"
      style={{ '--swipe-position': `${swipePosition}%` }}
    >
      <div className="map-toolbar">
        <div className="map-widget-buttons">
          <button
            type="button"
            className={`map-widget-toggle${openWidget === 'basemap' ? ' active' : ''}`}
            aria-expanded={openWidget === 'basemap'}
            aria-controls="basemap-controls"
            onClick={() => setOpenWidget((current) => current === 'basemap' ? null : 'basemap')}
          >
            <MapToolbarIcon name="basemap" />
            <span>Basemap</span>
          </button>
          <button
            type="button"
            className={`map-widget-toggle${openWidget === 'layers' ? ' active' : ''}`}
            aria-expanded={openWidget === 'layers'}
            aria-controls="layer-controls"
            onClick={() => setOpenWidget((current) => current === 'layers' ? null : 'layers')}
          >
            <MapToolbarIcon name="layers" />
            <span>Layers</span>
          </button>
          <button
            type="button"
            className={`map-widget-toggle${openWidget === 'mandal' ? ' active' : ''}`}
            aria-expanded={openWidget === 'mandal'}
            aria-controls="mandal-controls"
            onClick={() => setOpenWidget((current) => current === 'mandal' ? null : 'mandal')}
          >
            <MapToolbarIcon name="district" />
            <span>Mandal</span>
          </button>
          <button
            type="button"
            className={`map-widget-toggle${openWidget === 'measure' ? ' active' : ''}`}
            aria-expanded={openWidget === 'measure'}
            aria-controls="measure-controls"
            onClick={() => setOpenWidget((current) => current === 'measure' ? null : 'measure')}
          >
            <MapToolbarIcon name="measure" />
            <span>Measure</span>
          </button>
          <button
            type="button"
            className={`map-widget-toggle${openWidget === 'buffer' || bufferActive ? ' active' : ''}`}
            aria-expanded={openWidget === 'buffer'}
            aria-controls="buffer-controls"
            onClick={() => setOpenWidget((current) => current === 'buffer' ? null : 'buffer')}
          >
            <MapToolbarIcon name="district" />
            <span>Buffer</span>
          </button>
          <button
            type="button"
            className={`map-widget-toggle map-icon-button${magnifierActive ? ' active' : ''}`}
            aria-label={magnifierActive ? 'Turn off basemap magnifier' : 'Turn on basemap magnifier'}
            title="Basemap magnifier"
            aria-pressed={magnifierActive}
            onClick={() => {
              setMagnifierActive((active) => !active);
              setSwipeActive(false);
              setMeasurementMode(null);
            }}
          >
            <MapToolbarIcon name="magnifier" />
          </button>
          <button
            type="button"
            className={`map-widget-toggle${swipeActive ? ' active' : ''}`}
            aria-label={swipeActive ? 'Turn off basemap swipe' : 'Compare basemaps with swipe'}
            title="Compare basemaps with swipe"
            aria-pressed={swipeActive}
            onClick={() => {
              setSwipeActive((active) => !active);
              setMagnifierActive(false);
              setMeasurementMode(null);
              setOpenWidget('basemap');
            }}
          >
            <MapToolbarIcon name="swipe" />
            <span>Swipe</span>
          </button>
        </div>

        {openWidget === 'mandal' ? (
          <div className="map-widget-panel district-selector-panel" id="mandal-controls">
            {user.role === 'DISTRICT_USER' ? <strong>{user.district_name}</strong> : <span className="map-panel-title">All districts</span>}
            <label htmlFor="map-mandal-select">Zoom to mandal</label>
            <select id="map-mandal-select" value={selectedMandalId} onChange={(event) => onSelectedMandalChange(event.target.value)} disabled={mandalsLoading || mandals.length === 0}>
              <option value="">{mandalsLoading ? 'Loading mandals…' : 'Select a mandal'}</option>
              {user.role === 'STATE_ADMIN'
                ? [...new Set(mandals.map((mandal) => mandal.district_name))].map((districtName) => (
                  <optgroup key={districtName} label={districtName}>
                    {mandals.filter((mandal) => mandal.district_name === districtName).map((mandal) => (
                      <option key={mandal.id} value={mandal.id} disabled={!mandal.bounds}>{mandal.name}{mandal.bounds ? '' : ' (boundary unavailable)'}</option>
                    ))}
                  </optgroup>
                ))
                : mandals.map((mandal) => (
                  <option key={mandal.id} value={mandal.id} disabled={!mandal.bounds}>
                    {mandal.name}{mandal.bounds ? '' : ' (boundary unavailable)'}
                  </option>
                ))}
            </select>
            {districtError ? <span className="district-select-error">{districtError}</span> : null}
            {mandalError ? <span className="district-select-error">{mandalError}</span> : null}
          </div>
        ) : null}

        {openWidget === 'measure' ? (
          <div className="map-widget-panel control-block measurement-tools-panel" id="measure-controls">
            <span className="map-panel-title">Measurement</span>
            <div className="segmented-control">
              <button type="button" className={measurementType === 'distance' ? 'active' : ''} aria-pressed={measurementType === 'distance'} onClick={() => selectMeasurementMode('distance')}>Distance</button>
              <button type="button" className={measurementType === 'area' ? 'active' : ''} aria-pressed={measurementType === 'area'} onClick={() => selectMeasurementMode('area')}>Area</button>
            </div>
          </div>
        ) : null}

        {openWidget === 'buffer' ? (
          <div className="map-widget-panel buffer-controls-panel" id="buffer-controls">
            <div className="buffer-distance-row">
              <label htmlFor="buffer-distance">Distance</label>
              <input
                id="buffer-distance"
                type="number"
                min="0.01"
                step="any"
                value={bufferDistance}
                onChange={(event) => setBufferDistance(event.target.value)}
              />
              <select aria-label="Buffer distance unit" value={bufferUnit} onChange={(event) => setBufferUnit(event.target.value)}>
                <option value="meters">m</option>
                <option value="kilometers">km</option>
                <option value="miles">mi</option>
              </select>
            </div>
            <fieldset className="buffer-mineral-fieldset">
              <legend>Minerals</legend>
              <div className="buffer-mineral-list">
                {mineralCategories.map((mineral) => (
                  <label key={mineral}>
                    <input
                      type="checkbox"
                      checked={bufferMinerals[mineral]}
                      onChange={(event) => setBufferMinerals((current) => ({ ...current, [mineral]: event.target.checked }))}
                    />
                    {mineral}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              className="buffer-action-button"
              aria-pressed={bufferActive}
              onClick={() => {
                setBufferActive((active) => !active);
                setMeasurementMode(null);
                setMagnifierActive(false);
              }}
            >
              {bufferActive ? 'Stop buffer analysis' : 'Click map to analyze'}
            </button>
            {bufferError ? <span className="district-select-error">{bufferError}</span> : null}
            {bufferLoading ? <span className="buffer-status">Finding mines…</span> : null}
          </div>
        ) : null}

        {bufferResults ? (
          <div className="map-widget-panel buffer-results-panel" aria-live="polite">
            <strong>{bufferResults.mines.length} mines within {bufferResults.distance} {bufferResults.unit}</strong>
            {bufferResults.candidatesTruncated ? <span>Results limited to the first 5,000 candidates.</span> : null}
            {bufferResults.mines.length ? (
              <ul>
                {bufferResults.mines.slice(0, 25).map((mine) => (
                  <li key={mine.properties._bufferResultId}>
                    <button
                      type="button"
                      className="buffer-result-zoom"
                      aria-label={`Zoom to ${mine.properties.Company || 'mine'}`}
                      title={`Zoom to ${mine.properties.Company || 'mine'}`}
                      onClick={() => zoomToBufferMine(mine)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <circle cx="10.5" cy="10.5" r="6.5" />
                        <path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="buffer-result-details"
                      onClick={() => zoomToBufferMine(mine)}
                      aria-label={`Zoom to ${mine.properties.Company || 'mine'} point`}
                    >
                      <strong>{mine.properties.Company || 'Mine'}</strong>
                      <span>{[mine.properties.Mineral, mine.properties.District, mine.properties.Mandal].filter(Boolean).join(' · ')}</span>
                      <span>Production {formatMineInfoValue(mine.properties.Production)} · Dispatch {formatMineInfoValue(mine.properties.Dispatch)} · ETS {formatMineInfoValue(mine.properties.ETS)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <span>No selected minerals found in this buffer.</span>}
          </div>
        ) : null}

        {measurementMode || measurementPoints.length > 0 ? (
          <div className="map-widget-panel measurement-panel">
            <strong>{measurementType === 'area' ? 'Area' : 'Distance'}: {measurementValue}</strong>
            <span>{measurementPoints.length} points</span>
            <div className="measurement-actions">
              {measurementMode ? <button type="button" onClick={finishMeasurement}>Finish</button> : null}
              <button type="button" onClick={clearMeasurement}>Clear</button>
            </div>
          </div>
        ) : null}

        {magnifierActive ? (
          <div className="map-widget-panel comparison-panel">
            <label htmlFor="comparison-basemap">Compare with</label>
            <select id="comparison-basemap" value={comparisonBasemap} onChange={(event) => setComparisonBasemap(event.target.value)}>
              {basemapOptions.filter((key) => key !== activeBasemap).map((key) => (
                <option key={key} value={key}>{basemaps[key].label}</option>
              ))}
            </select>
            <span>Lens shows {basemaps[comparisonBasemap].label}; map shows {basemaps[activeBasemap].label}.</span>
          </div>
        ) : null}

        {openWidget === 'basemap' ? (
          <div className="map-widget-panel control-block" id="basemap-controls">
            <div className="segmented-control">
              {basemapOptions.map((key) => (
                <button
                  key={key}
                  className={key === activeBasemap ? 'active' : ''}
                  aria-pressed={key === activeBasemap}
                  onClick={() => setActiveBasemap(key)}
                >
                  {basemaps[key].label}
                </button>
              ))}
            </div>
            {swipeActive ? (
              <div className="swipe-basemap-select">
                <label htmlFor="swipe-comparison-basemap">Swipe comparison</label>
                <select
                  id="swipe-comparison-basemap"
                  value={comparisonBasemap}
                  onChange={(event) => setComparisonBasemap(event.target.value)}
                >
                  {basemapOptions.filter((key) => key !== activeBasemap).map((key) => (
                    <option key={key} value={key}>{basemaps[key].label}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}

        {openWidget === 'layers' ? (
          <div className="map-widget-panel control-block" id="layer-controls">
          <div className="layer-list">
            {Object.keys(visibleLayers).map((layer) => layer === 'Mines' ? (
              <div className="mines-layer-group" key={layer}>
                <label>
                  <input type="checkbox" checked={visibleLayers.Mines} onChange={() => toggleLayer('Mines')} />
                  Mines
                </label>
                <div className="mineral-type-list">
                  {mineralCategories.map((mineral) => (
                    <label key={mineral}>
                      <input
                        type="checkbox"
                        checked={visibleMinerals[mineral]}
                        disabled={!visibleLayers.Mines}
                        onChange={() => setVisibleMinerals((current) => ({ ...current, [mineral]: !current[mineral] }))}
                      />
                      {mineral}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <label key={layer}>
                <input type="checkbox" checked={visibleLayers[layer]} onChange={() => toggleLayer(layer)} />
                {layer}
              </label>
            ))}
          </div>
          </div>
        ) : null}
      </div>
      <div ref={mapContainer} className="map-surface" />
      {swipeActive ? (
        <>
          <div className="map-swipe-comparison" aria-hidden="true">
            <div ref={swipeMapContainer} className="map-swipe-surface" />
          </div>
          <div className="map-swipe-labels" aria-hidden="true">
            <span>{basemaps[comparisonBasemap].label}</span>
            <span>{basemaps[activeBasemap].label}</span>
          </div>
          <div className="map-swipe-divider">
            <div
              className="map-swipe-handle"
              role="slider"
              tabIndex={0}
              aria-label="Basemap swipe position"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={swipePosition}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                const bounds = mapLayoutRef.current?.getBoundingClientRect();
                if (bounds) setSwipePosition(Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)));
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const bounds = mapLayoutRef.current?.getBoundingClientRect();
                if (bounds) setSwipePosition(Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)));
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  setSwipePosition((position) => Math.max(0, position - 2));
                } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  setSwipePosition((position) => Math.min(100, position + 2));
                } else if (event.key === 'Home') {
                  setSwipePosition(0);
                } else if (event.key === 'End') {
                  setSwipePosition(100);
                }
              }}
            >
              <span aria-hidden="true">↔</span>
            </div>
          </div>
        </>
      ) : null}
      {magnifierActive ? (
        <div className="magnifier-lens" style={{ left: magnifierPosition.x, top: magnifierPosition.y }} aria-label={`${basemaps[comparisonBasemap].label} magnifier`}>
          <div ref={magnifierContainer} className="magnifier-map" />
          <span className="magnifier-label">{basemaps[comparisonBasemap].label}</span>
        </div>
      ) : null}
      {user.role === 'DISTRICT_USER' ? <div className="district-badge">District view: {user.district_name}</div> : null}
    </div>
  );
}

function UserManagementPage({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/auth/users/')
      .then((data) => setUsers(data.results || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (user.role !== 'STATE_ADMIN') {
    return <Navigate to="/map" replace />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h2>User Administration</h2>
          <p>Manage district users and state roles</p>
        </div>
      </div>
      {error ? <div className="message error">{error}</div> : null}
      {loading ? <div className="loading">Loading users…</div> : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>District</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.username}</td>
                  <td>{item.role}</td>
                  <td>{item.district_name || '—'}</td>
                  <td>{item.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AppShell({ user, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedMandalId, setSelectedMandalId] = useState('');
  const [mandals, setMandals] = useState([]);

  const navItems = [{ label: 'GIS Dashboard', path: '/map' }];

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout/', { method: 'POST' });
    } catch {
      // Ignore logout errors and clear session locally.
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-box">
          <div className="brand-mark">TM</div>
          <div>
            <h3>Mining Dept.</h3>
            <small>Telangana</small>
          </div>
        </div>

        <nav>
          {navItems.map((item) => (
            <Link key={item.path + item.label} to={item.path} className={location.pathname === item.path ? 'nav-item active' : 'nav-item'}>
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="sidebar-analytics-toggle"
          aria-expanded={analyticsOpen}
          aria-controls="district-analytics-panel"
          onClick={() => setAnalyticsOpen((open) => !open)}
        >
          <span>District analytics</span>
          <span aria-hidden="true">{analyticsOpen ? '−' : '+'}</span>
        </button>
        <div id="district-analytics-panel" hidden={!analyticsOpen}>
          {analyticsOpen ? (
            <DistrictAnalyticsPanel
              user={user}
              selectedMandalId={selectedMandalId}
              mandals={mandals}
              onSelectedMandalChange={setSelectedMandalId}
            />
          ) : null}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Telangana Mining GIS Dashboard</h1>
          </div>
          <div className="user-menu">
            <span>{user.username}</span>
            <span>Role: {user.role}</span>
            {user.district_name ? <span>District: {user.district_name}</span> : null}
            <button onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <Routes>
          <Route path="/dashboard" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={(
            <GISDashboardPage
              user={user}
              selectedMandalId={selectedMandalId}
              setSelectedMandalId={setSelectedMandalId}
              mandals={mandals}
              setMandals={setMandals}
            />
          )} />
          <Route path="/users" element={<UserManagementPage user={user} />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/auth/me/')
      .then((payload) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading dashboard…</div>;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <AppShell user={user} setUser={setUser} />
    </BrowserRouter>
  );
}

export default App;
