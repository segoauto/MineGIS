// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface MiningLease {
  id: number
  lease_id: string
  mine_name: string
  mineral_type: MineralType
  mineral_display?: string
  leaseholder_name: string
  leaseholder_pan?: string
  leaseholder_contact?: string
  leaseholder_email?: string
  state: string
  district: string
  mandal: string
  village: string
  survey_number?: string
  area_hectares: number
  centroid_lon: number | null
  centroid_lat: number | null
  boundary_geojson?: GeoJSONGeometry | null
  grant_date: string
  commencement_date: string
  valid_from: string
  valid_till: string
  status: LeaseStatus
  status_display?: string
  royalty_due: number
  last_payment_date?: string | null
  days_remaining: number
  is_expiring_soon: boolean
  created_at?: string
  updated_at?: string
}

export type MineralType = 'COAL' | 'IRON_ORE' | 'GRANITE' | 'LIMESTONE' | 'FLUORITE' | 'DOLOMITE' | 'SAND' | 'OTHER'
export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'SUSPENDED' | 'SURRENDERED'

export interface Vehicle {
  id: number
  netradyne_device_id: string
  vehicle_number: string
  vehicle_type: VehicleType
  vehicle_type_display: string
  driver_name: string
  driver_license?: string
  assigned_district: string
  assigned_officer_name: string | null
  last_lon: number | null
  last_lat: number | null
  last_seen: string | null
  current_speed_kmh: number
  current_heading: number
  is_online: boolean
  engine_on: boolean
  current_lease_id: string | null
  current_lease_name: string | null
}

export type VehicleType = 'INSPECTION' | 'ENFORCEMENT' | 'SURVEY' | 'TRANSPORT' | 'OFFICIAL'

export interface VehicleAlert {
  id: number
  vehicle_number: string
  driver_name: string
  alert_type: AlertType
  alert_type_display: string
  severity: AlertSeverity
  alert_lon: number | null
  alert_lat: number | null
  lease_id: string | null
  mine_name: string | null
  timestamp: string
  description: string
  is_resolved: boolean
  resolved_by_name: string | null
  resolved_at: string | null
}

export type AlertType =
  | 'GEOFENCE_ENTRY' | 'GEOFENCE_EXIT' | 'GEOFENCE_UNAUTHORIZED'
  | 'OVERSPEEDING' | 'HARSH_BRAKING' | 'IDLE_ENGINE'
  | 'ROUTE_DEVIATION' | 'NETRADYNE_ALERT'

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW'

export interface VehicleLocationPoint {
  id: number
  lon: number
  lat: number
  timestamp: string
  speed_kmh: number
  heading: number
  altitude: number | null
  accuracy: number
  engine_on: boolean
  harsh_braking: boolean
  harsh_acceleration: boolean
  overspeeding: boolean
}

export interface SpatialLayer {
  id: number
  layer_type: 'FOREST' | 'WATER' | 'ECO' | 'ADMIN' | 'TRANSPORT'
  name: string
  geometry: GeoJSONGeometry
  properties: Record<string, unknown>
  source: string
  last_updated: string
}

export interface DGPSSurveyPoint {
  id: number
  survey_id: string
  lease_id: string
  mine_name: string
  lon: number
  lat: number
  accuracy_meters: number
  survey_date: string
  surveyor_name: string
  elevation: number | null
  notes: string
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface GeoJSONFeatureCollection<T = Record<string, unknown>> {
  type: 'FeatureCollection'
  features: GeoJSONFeature<T>[]
  totalCount?: number
}

export interface GeoJSONFeature<T = Record<string, unknown>> {
  type: 'Feature'
  id?: number | string
  geometry: GeoJSONGeometry | null
  properties: T
}

export type GeoJSONGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][]  }

export interface AuthTokens {
  access: string
  refresh: string
  user: AuthUser
}

export interface AuthUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  is_staff: boolean
  profile: UserProfile | null
}

export interface UserProfile {
  role: string
  district: string
  phone: string
  designation: string
  employee_id: string | null
  mfa_enabled: boolean
}

// ─── Map / UI State Types ─────────────────────────────────────────────────────

export type BaseLayerType = 'osm' | 'satellite' | 'terrain'

export type ActiveTool =
  | 'identify' | 'measure_distance' | 'measure_area'
  | 'buffer' | 'conflict' | 'annotate' | null

export interface LayerConfig {
  id: string
  label: string
  geoserverLayer: string
  visible: boolean
  opacity: number
  color: string
  category: 'lease' | 'regulatory' | 'survey' | 'vehicle'
}

export interface MeasurementResult {
  type: 'distance' | 'area'
  value: number
  unit: string
  formatted: string
}

export interface BufferResult {
  lease_id: string
  radius_meters: number
  buffer_geojson: GeoJSONGeometry | null
  layers_in_buffer: SpatialLayerConflict[]
  leases_in_buffer: LeaseConflict[]
}

export interface ConflictResult {
  lease_id: string
  conflicts: {
    spatial_layers: SpatialLayerConflict[]
    other_leases: LeaseConflict[]
  }
  has_conflicts: boolean
}

export interface SpatialLayerConflict {
  id: number
  name: string
  layer_type: string
  source: string
}

export interface LeaseConflict {
  lease_id: string
  mine_name: string
  leaseholder_name: string
  status: LeaseStatus
}

export interface SpatialBookmark {
  id: string
  label: string
  lon: number
  lat: number
  zoom: number
  createdAt: string
}

export interface SearchResult {
  type: 'lease' | 'district' | 'mandal'
  id: number | string
  label: string
  sublabel: string
  lon?: number
  lat?: number
  lease_id?: string
}

// ─── WebSocket Message Types ──────────────────────────────────────────────────

export interface WSVehicleUpdate {
  type: 'VEHICLE_UPDATE'
  vehicles: GeoJSONFeatureCollection<VehicleProperties>
  timestamp: string
  snapshot?: boolean
}

export interface WSVehicleAlert {
  type: 'VEHICLE_ALERT'
  alert: VehicleAlert
}

export interface VehicleProperties {
  vehicle_id: number
  netradyne_device_id: string
  vehicle_number: string
  vehicle_type: VehicleType
  driver_name: string
  assigned_district: string
  current_speed_kmh: number
  current_heading: number
  is_online: boolean
  engine_on: boolean
  last_seen: string | null
  current_lease_id: string | null
}

export type WSMessage = WSVehicleUpdate | WSVehicleAlert
