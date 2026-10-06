import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { REAL_NETRADYNE_VEHICLES } from '../data/realVehicles'
import type {
  BaseLayerType, ActiveTool, LayerConfig,
  MiningLease, Vehicle, VehicleAlert,
  MeasurementResult, BufferResult, ConflictResult,
  SearchResult, SpatialBookmark, SpectralAnalysisResult,
} from '../types'
export type { VehicleAlert } from '../types'
import { getUserJurisdiction } from '../utils/districts'

export interface ActiveGeofenceAlertPopup {
  id: string | number
  vehicleNumber: string
  driverName?: string
  eventType: 'ENTRY' | 'EXIT' | 'TRESPASS'
  zoneName: string
  zoneType?: string
  district?: string
  speedKmh?: number
  timestamp: string
  lon: number
  lat: number
  severity: 'CRITICAL' | 'HIGH' | 'WARNING'
  vehicleId?: number
}

interface MapStore {
  // ─── Map state ────────────────────────────────────────────
  baseLayer: BaseLayerType
  zoom: number
  center: [number, number]
  cursorCoords: [number, number] | null
  temporalDate: string

  // ─── Layer control ────────────────────────────────────────
  layers: LayerConfig[]
  layerVisibility: Record<string, boolean>
  layerOpacity: Record<string, number>

  // ─── Selection ────────────────────────────────────────────
  selectedLeaseId: string | null
  selectedLeaseData: MiningLease | null

  // ─── Tool state ───────────────────────────────────────────
  activeTool: ActiveTool
  measurementResult: MeasurementResult | null
  bufferResult: BufferResult | null
  conflictResult: ConflictResult | null

  // ─── Search ───────────────────────────────────────────────
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean

  // ─── Bookmarks ────────────────────────────────────────────
  bookmarks: SpatialBookmark[]

  // ─── Vehicles ─────────────────────────────────────────────
  vehicles: Vehicle[]
  vehiclesVisible: boolean
  selectedVehicleId: number | null
  vehicleAlerts: VehicleAlert[]
  unreadAlertCount: number

  // ─── Draw / Lease / Geofence state ────────────────────────
  drawBoundaryMode: 'polygon' | 'point' | false
  drawTarget: 'lease' | 'geofence' | null
  drawnBoundaryGeoJSON: object | null
  drawnGeofenceGeoJSON: object | null
  drawnPointCoords: [number, number] | null
  leaseFormOpen: boolean
  leaseFormEditId: string | null

  // ─── UI state ─────────────────────────────────────────────
  leaseInfoPanelOpen: boolean
  vehicleTrackingPanelOpen: boolean
  layerPanelOpen: boolean
  reportModalOpen: boolean
  compareImageryOpen: boolean
  tenderDemoModalOpen: boolean
  bulkUploadModalOpen: boolean
  spectralAnalysisOpen: boolean
  spectralAnalysisResult: SpectralAnalysisResult | null
  activeGeofenceAlertPopup: ActiveGeofenceAlertPopup | null
  setActiveGeofenceAlertPopup: (alert: ActiveGeofenceAlertPopup | null) => void
  triggerGeofenceBreachDemo: (customZone?: string, customVehicleNumber?: string) => void
  mapFlyToTarget: { lon: number; lat: number; zoom?: number; ping?: boolean } | null

  // ─── GeoServer Cache Busting ──────────────────────────────
  mapRefreshTrigger: number

  // ─── Actions ──────────────────────────────────────────────
  setBaseLayer: (layer: BaseLayerType) => void
  setZoom: (zoom: number) => void
  setCenter: (center: [number, number]) => void
  setCursorCoords: (coords: [number, number] | null) => void
  setTemporalDate: (date: string) => void

  toggleLayer: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void

  selectLease: (leaseId: string | null, data?: MiningLease) => void
  setActiveTool: (tool: ActiveTool) => void
  setMeasurementResult: (result: MeasurementResult | null) => void
  setBufferResult: (result: BufferResult | null) => void
  setConflictResult: (result: ConflictResult | null) => void

  setSearchQuery: (q: string) => void
  setSearchResults: (results: SearchResult[]) => void
  setIsSearching: (searching: boolean) => void

  addBookmark: (bookmark: SpatialBookmark) => void
  removeBookmark: (id: string) => void

  setVehicles: (vehicles: Vehicle[]) => void
  setVehiclesVisible: (visible: boolean) => void
  toggleVehiclesVisible: () => void
  selectVehicle: (id: number | null) => void
  addVehicleAlert: (alert: VehicleAlert) => void
  markAlertsRead: () => void

  setLeaseInfoPanelOpen: (open: boolean) => void
  setVehicleTrackingPanelOpen: (open: boolean) => void
  setLayerPanelOpen: (open: boolean) => void
  setReportModalOpen: (open: boolean) => void
  setCompareImageryOpen: (open: boolean) => void
  setTenderDemoModalOpen: (open: boolean) => void
  setBulkUploadModalOpen: (open: boolean) => void
  setSpectralAnalysisOpen: (open: boolean) => void
  setSpectralAnalysisResult: (result: SpectralAnalysisResult | null) => void
  setMapFlyToTarget: (target: { lon: number; lat: number; zoom?: number; ping?: boolean } | null) => void
  resetDemoData: () => void

  // Draw/form actions
  setDrawBoundaryMode: (mode: 'polygon' | 'point' | false, target?: 'lease' | 'geofence') => void
  setDrawTarget: (target: 'lease' | 'geofence' | null) => void
  setDrawnBoundaryGeoJSON: (geojson: object | null) => void
  setDrawnGeofenceGeoJSON: (geojson: object | null) => void
  setDrawnPointCoords: (coords: [number, number] | null) => void
  openLeaseCreateForm: (boundary?: object, point?: [number, number] | null) => void
  openLeaseEditForm: (leaseId: string) => void
  closeLeaseForm: () => void
  
  triggerMapRefresh: () => void
}

const DEFAULT_LAYERS: LayerConfig[] = [
  {
    id: 'mining_leases',
    label: 'Mining Leases (815 Mines)',
    geoserverLayer: 'minegis_ts:mining_leases',
    visible: true,
    opacity: 0.85,
    color: '#E11D48',
    category: 'lease',
  },
  {
    id: 'mines_points',
    label: 'Mine Centers & Points',
    geoserverLayer: 'minegis_ts:mines_points',
    visible: true,
    opacity: 0.9,
    color: '#F42A5F',
    category: 'lease',
  },
  {
    id: 'districts',
    label: 'Districts Boundary',
    geoserverLayer: 'minegis_ts:districts',
    visible: true,
    opacity: 0.8,
    color: '#15803D',
    category: 'regulatory',
  },
  {
    id: 'mandals',
    label: 'Mandals Boundary',
    geoserverLayer: 'minegis_ts:mandals',
    visible: false,
    opacity: 0.7,
    color: '#3B82F6',
    category: 'regulatory',
  },
  {
    id: 'state_boundary',
    label: 'Telangana State Boundary',
    geoserverLayer: 'minegis_ts:state',
    visible: true,
    opacity: 0.9,
    color: '#1F4A8A',
    category: 'regulatory',
  },
  {
    id: 'forest',
    label: 'Forest Boundaries',
    geoserverLayer: 'minegis_ts:spatial_layers',
    visible: true,
    opacity: 0.7,
    color: '#16A34A',
    category: 'regulatory',
  },
  {
    id: 'water',
    label: 'Water Bodies',
    geoserverLayer: 'minegis_ts:spatial_layers',
    visible: true,
    opacity: 0.7,
    color: '#0EA5E9',
    category: 'regulatory',
  },
  {
    id: 'eco',
    label: 'Eco-Sensitive Zones',
    geoserverLayer: 'minegis_ts:spatial_layers',
    visible: false,
    opacity: 0.6,
    color: '#F97316',
    category: 'regulatory',
  },
  {
    id: 'dgps_survey_points',
    label: 'DGPS Survey Points',
    geoserverLayer: 'minegis_ts:dgps_survey_points',
    visible: false,
    opacity: 1.0,
    color: '#DC2626',
    category: 'survey',
  },
  {
    id: 'ets_survey_points',
    label: 'ETS Survey Points',
    geoserverLayer: 'minegis_ts:ets_survey_points',
    visible: false,
    opacity: 1.0,
    color: '#8B5CF6',
    category: 'survey',
  },
  {
    id: 'approved_mine_plans',
    label: 'Approved Mine Plans',
    geoserverLayer: 'minegis_ts:approved_mine_plans',
    visible: false,
    opacity: 1.0,
    color: '#10B981',
    category: 'lease',
  },
  {
    id: 'transport_networks',
    label: 'Transportation Networks',
    geoserverLayer: 'minegis_ts:spatial_layers',
    visible: false,
    opacity: 1.0,
    color: '#374151',
    category: 'regulatory',
  },
  {
    id: 'ndvi_analysis',
    label: 'NDVI Vegetation Health (Sentinel-2)',
    geoserverLayer: 'minegis_ts:ndvi_spectral',
    visible: false,
    opacity: 0.75,
    color: '#22C55E',
    category: 'environmental',
  },
  {
    id: 'wi_analysis',
    label: 'WI Water & Moisture Index (NDWI)',
    geoserverLayer: 'minegis_ts:wi_spectral',
    visible: false,
    opacity: 0.75,
    color: '#06B6D4',
    category: 'environmental',
  },
]

export const INITIAL_VEHICLE_ALERTS: VehicleAlert[] = [
  {
    id: 9001,
    vehicle_number: 'TG07U1889',
    driver_name: 'Transit Driver (TG-07)',
    alert_type: 'GEOFENCE_EXIT',
    alert_type_display: 'Geofence Trespass [TG07U1889]: Unauthorized Egress from Godavari Sand Reach 7',
    severity: 'HIGH',
    alert_lon: 77.556427,
    alert_lat: 16.526802,
    lease_id: 'TS-NZB-SAND-022',
    mine_name: 'Godavari Reach-7 Sand Extraction Geofence',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    description: 'Vehicle TG07U1889 exited authorized sand extraction perimeter outside permitted haul hours (after 18:00 hrs). Vigilance flying squad alerted.',
    is_resolved: false,
    resolved_by_name: null,
    resolved_at: null,
  },
  {
    id: 9002,
    vehicle_number: 'TS05UE3699',
    driver_name: 'Transit Driver (TG-05A)',
    alert_type: 'OVERSPEEDING',
    alert_type_display: 'Over-speeding [TS05UE3699]: Eco-Sensitive Transit Corridor (68 km/h)',
    severity: 'HIGH',
    alert_lon: 77.096092,
    alert_lat: 15.188594,
    lease_id: 'TS-MBN-QTZ-005',
    mine_name: 'Bellary - Badepally Highway Transit Corridor',
    timestamp: new Date(Date.now() - 42 * 60000).toISOString(),
    description: 'Vehicle TS05UE3699 clocked at 68 km/h in designated 40 km/h restricted mineral transport corridor. Automated notice generated.',
    is_resolved: true,
    resolved_by_name: 'District Mineral Officer',
    resolved_at: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: 9003,
    vehicle_number: 'TS05UE0999',
    driver_name: 'Transit Driver (TG-05)',
    alert_type: 'GEOFENCE_ENTRY',
    alert_type_display: 'Prohibited Eco-Buffer Penetration [TS05UE0999]',
    severity: 'HIGH',
    alert_lon: 78.518944,
    alert_lat: 17.341644,
    lease_id: 'TS-RGD-STN-003',
    mine_name: 'Ibrahimpatnam Stone Quarry Zone',
    timestamp: new Date(Date.now() - 110 * 60000).toISOString(),
    description: 'Vehicle TS05UE0999 penetrated 100m restricted environmental buffer zone along natural water drainage course without statutory permit.',
    is_resolved: true,
    resolved_by_name: 'Assistant Director, Mines & Geology',
    resolved_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 9004,
    vehicle_number: 'TS12UD9828',
    driver_name: 'Transit Driver (TG-12)',
    alert_type: 'ROUTE_DEVIATION',
    alert_type_display: 'Route Deviation [TS12UD9828]: Coal Dispatch Corridor (>1.2km Off Route)',
    severity: 'MEDIUM',
    alert_lon: 78.579422,
    alert_lat: 17.340033,
    lease_id: 'TS-KGM-COAL-001',
    mine_name: 'Singareni Collieries OCP-IV',
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
    description: 'Vehicle TS12UD9828 deviated by > 1.2 km from mandated weighbridge corridor into rural bypass road.',
    is_resolved: true,
    resolved_by_name: 'District Mineral Officer',
    resolved_at: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    id: 9005,
    vehicle_number: 'TG05T8099',
    driver_name: 'Patrol Driver (TG-05)',
    alert_type: 'GEOFENCE_UNAUTHORIZED',
    alert_type_display: 'Unauthorized Nighttime Sand Movement [TG05T8099]',
    severity: 'HIGH',
    alert_lon: 80.563973,
    alert_lat: 18.218651,
    lease_id: 'TS-NZB-SAND-022',
    mine_name: 'Palaigudem Sand Reach (Mulugu)',
    timestamp: new Date(Date.now() - 320 * 60000).toISOString(),
    description: 'Unscheduled movement detected for Vehicle TG05T8099 at 23:45 hrs. Rule 24 of TS Minor Mineral Concession Rules prohibits night haulage.',
    is_resolved: true,
    resolved_by_name: 'State Vigilance Flying Squad',
    resolved_at: new Date(Date.now() - 120 * 60000).toISOString(),
  },
]

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      // ─── Initial state ─────────────────────────────────────
      baseLayer: 'osm',
      zoom: 8.5,
      center: [78.9, 17.6],
      cursorCoords: null,
      temporalDate: '2024-04-01',

      layers: DEFAULT_LAYERS,
      layerVisibility: Object.fromEntries(DEFAULT_LAYERS.map((l) => [l.id, l.visible])),
      layerOpacity: Object.fromEntries(DEFAULT_LAYERS.map((l) => [l.id, l.opacity])),

      selectedLeaseId: null,
      selectedLeaseData: null,

      activeTool: null,
      measurementResult: null,
      bufferResult: null,
      conflictResult: null,

      searchQuery: '',
      searchResults: [],
      isSearching: false,

      bookmarks: [],

      vehicles: REAL_NETRADYNE_VEHICLES,
      vehiclesVisible: false,
      selectedVehicleId: null,
      vehicleAlerts: INITIAL_VEHICLE_ALERTS,
      unreadAlertCount: 4,

      drawBoundaryMode: false,
      drawTarget: null,
      drawnBoundaryGeoJSON: null,
      drawnGeofenceGeoJSON: null,
      leaseFormOpen: false,
      leaseFormEditId: null,

      leaseInfoPanelOpen: false,
      vehicleTrackingPanelOpen: false,
      layerPanelOpen: false,
      drawnPointCoords: null,
      reportModalOpen: false,
      compareImageryOpen: false,
      tenderDemoModalOpen: false,
      bulkUploadModalOpen: false,
      spectralAnalysisOpen: false,
      spectralAnalysisResult: null,
      mapFlyToTarget: null,
      activeGeofenceAlertPopup: null,
      mapRefreshTrigger: 0,

      // ─── Actions ──────────────────────────────────────────
      setBaseLayer: (layer) => set({ baseLayer: layer }),
      setZoom: (zoom) => set({ zoom }),
      setCenter: (center) => set({ center }),
      setCursorCoords: (cursorCoords) => set({ cursorCoords }),
      setTemporalDate: (temporalDate) => set({ temporalDate }),

      toggleLayer: (layerId) =>
        set((state) => ({
          layerVisibility: {
            ...state.layerVisibility,
            [layerId]: !state.layerVisibility[layerId],
          },
        })),

      setLayerOpacity: (layerId, opacity) =>
        set((state) => ({
          layerOpacity: { ...state.layerOpacity, [layerId]: opacity },
        })),

      selectLease: (leaseId, data) =>
        set({
          selectedLeaseId: leaseId,
          selectedLeaseData: data ?? null,
          leaseInfoPanelOpen: leaseId !== null,
        }),

      setActiveTool: (activeTool) =>
        set({
          activeTool,
          measurementResult: null,
          bufferResult: null,
          conflictResult: null,
        }),

      setMeasurementResult: (measurementResult) => set({ measurementResult }),
      setBufferResult: (bufferResult) => set({ bufferResult }),
      setConflictResult: (conflictResult) => set({ conflictResult }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchResults: (searchResults) => set({ searchResults }),
      setIsSearching: (isSearching) => set({ isSearching }),

      addBookmark: (bookmark) =>
        set((state) => ({ bookmarks: [...state.bookmarks, bookmark] })),
      removeBookmark: (id) =>
        set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) })),

      setVehicles: (vehicles) => set({ vehicles }),
      setVehiclesVisible: (vehiclesVisible) => set({ vehiclesVisible }),
      toggleVehiclesVisible: () => set((state) => ({ vehiclesVisible: !state.vehiclesVisible })),
      selectVehicle: (selectedVehicleId) => set({ selectedVehicleId }),

      addVehicleAlert: (alert) =>
        set((state) => ({
          vehicleAlerts: [alert, ...state.vehicleAlerts].slice(0, 100),
          unreadAlertCount: state.unreadAlertCount + 1,
        })),

      markAlertsRead: () => set({ unreadAlertCount: 0 }),

      setLeaseInfoPanelOpen: (leaseInfoPanelOpen) => set({ leaseInfoPanelOpen }),
      setVehicleTrackingPanelOpen: (vehicleTrackingPanelOpen) => set({ vehicleTrackingPanelOpen }),
      setLayerPanelOpen: (layerPanelOpen) => set({ layerPanelOpen }),
      setReportModalOpen: (reportModalOpen) => set({ reportModalOpen }),
      setCompareImageryOpen: (compareImageryOpen) => set({ compareImageryOpen }),
      setTenderDemoModalOpen: (tenderDemoModalOpen) => set({ tenderDemoModalOpen }),
      setBulkUploadModalOpen: (bulkUploadModalOpen) => set({ bulkUploadModalOpen }),
      setSpectralAnalysisOpen: (spectralAnalysisOpen) => set({ spectralAnalysisOpen }),
      setSpectralAnalysisResult: (spectralAnalysisResult) => set({ spectralAnalysisResult }),
      setMapFlyToTarget: (mapFlyToTarget) => set({ mapFlyToTarget }),
      setActiveGeofenceAlertPopup: (activeGeofenceAlertPopup) => set({ activeGeofenceAlertPopup }),

      triggerGeofenceBreachDemo: (customZone, customVehicleNumber) => {
        const state = useMapStore.getState()
        const veh = (customVehicleNumber ? state.vehicles.find((v) => v.vehicle_number === customVehicleNumber) : null)
          || state.vehicles.find((v) => v.id === 4134066)
          || state.vehicles[0]
          || {
            id: 4134066,
            vehicle_number: 'TG07U1889',
            driver_name: 'Transit Driver (TG-07)',
            assigned_district: 'Mahabubnagar',
            last_lon: 77.556427,
            last_lat: 16.526802,
            current_speed_kmh: 54,
          }

        const lon = veh.last_lon || 77.556427
        const lat = veh.last_lat || 16.526802
        const zone = customZone || 'Godavari Reach-7 Sand Extraction Geofence'

        const alertPopup: ActiveGeofenceAlertPopup = {
          id: Date.now(),
          vehicleNumber: veh.vehicle_number,
          driverName: veh.driver_name || 'Designated Driver',
          eventType: 'TRESPASS',
          zoneName: zone,
          zoneType: 'High-Security Mining Perimeter & Transit Corridor',
          district: veh.assigned_district || 'Telangana State',
          speedKmh: veh.current_speed_kmh || 52,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          lon,
          lat,
          severity: 'CRITICAL',
          vehicleId: veh.id,
        }

        const vehicleAlert: VehicleAlert = {
          id: Date.now(),
          vehicle_number: veh.vehicle_number,
          driver_name: veh.driver_name || 'Designated Driver',
          alert_type: 'GEOFENCE_EXIT',
          alert_type_display: `Geofence Trespass [${veh.vehicle_number}]: Unauthorized Egress from ${zone}`,
          severity: 'HIGH',
          alert_lon: lon,
          alert_lat: lat,
          lease_id: 'TS-GEOF-ALERT',
          mine_name: zone,
          timestamp: new Date().toISOString(),
          description: `Telemetry Alert: Vehicle ${veh.vehicle_number} breached restricted boundary at ${zone}. Flying Squad alerted.`,
          is_resolved: false,
          resolved_by_name: null,
          resolved_at: null,
        }

        set({
          activeGeofenceAlertPopup: alertPopup,
          selectedVehicleId: veh.id,
          mapFlyToTarget: { lon, lat, zoom: 15, ping: true },
        })
        state.addVehicleAlert(vehicleAlert)
      },

      resetDemoData: () => set({
        baseLayer: 'osm',
        zoom: 11,
        center: [80.1, 17.5],
        selectedLeaseId: null,
        selectedLeaseData: null,
        activeTool: null,
        measurementResult: null,
        bufferResult: null,
        conflictResult: null,
        searchQuery: '',
        searchResults: [],
        selectedVehicleId: null,
        vehicleAlerts: [],
        unreadAlertCount: 0,
        drawBoundaryMode: false,
        drawTarget: null,
        drawnBoundaryGeoJSON: null,
        drawnGeofenceGeoJSON: null,
        drawnPointCoords: null,
        leaseFormOpen: false,
        leaseFormEditId: null,
        leaseInfoPanelOpen: false,
        vehicleTrackingPanelOpen: false,
        layerPanelOpen: true,
        reportModalOpen: false,
        compareImageryOpen: false,
        tenderDemoModalOpen: false,
        bulkUploadModalOpen: false,
        activeGeofenceAlertPopup: null,
        mapFlyToTarget: { lon: 80.1, lat: 17.5, zoom: 11 },
      }),


      setDrawBoundaryMode: (mode, target = 'lease') => set({ drawBoundaryMode: mode, drawTarget: mode ? target : null }),
      setDrawTarget: (drawTarget) => set({ drawTarget }),
      setDrawnBoundaryGeoJSON: (geojson) => set({ drawnBoundaryGeoJSON: geojson }),
      setDrawnGeofenceGeoJSON: (geojson) => set({ drawnGeofenceGeoJSON: geojson }),
      setDrawnPointCoords: (coords) => set({ drawnPointCoords: coords }),
      
      openLeaseCreateForm: (boundary, point) => set({
        leaseFormOpen: true,
        leaseFormEditId: null,
        drawnBoundaryGeoJSON: boundary ?? null,
        drawnPointCoords: point ?? null,
        drawBoundaryMode: false,
        drawTarget: null,
      }),
      openLeaseEditForm: (leaseId) => set({
        leaseFormOpen: true,
        leaseFormEditId: leaseId,
        drawBoundaryMode: false,
        drawTarget: null,
      }),
      closeLeaseForm: () => set({
        leaseFormOpen: false,
        leaseFormEditId: null,
        drawnBoundaryGeoJSON: null,
        drawnPointCoords: null,
        drawBoundaryMode: false,
        drawTarget: null,
      }),
      
      triggerMapRefresh: () => set({ mapRefreshTrigger: Date.now() }),
    }),
    {
      name: 'minegis-map-state',
      partialize: (state) => ({
        baseLayer: state.baseLayer,
        layerVisibility: state.layerVisibility,
        layerOpacity: state.layerOpacity,
        bookmarks: state.bookmarks,
        vehiclesVisible: state.vehiclesVisible,
      }),
    }
  )
)

// ─── Auth Store ───────────────────────────────────────────────────────────────
import type { AuthUser } from '../types'

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => {
        set({ user, isAuthenticated: user !== null })
        if (user?.profile?.district) {
          const jur = getUserJurisdiction(user.profile.district)
          if (jur.name !== 'Telangana State') {
            useMapStore.setState({
              center: jur.center,
              zoom: jur.defaultZoom,
              mapFlyToTarget: { lon: jur.center[0], lat: jur.center[1], zoom: jur.defaultZoom }
            })
          }
        }
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'minegis-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
