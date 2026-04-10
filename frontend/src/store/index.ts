import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BaseLayerType, ActiveTool, LayerConfig,
  MiningLease, Vehicle, VehicleAlert,
  MeasurementResult, BufferResult, ConflictResult,
  SearchResult, SpatialBookmark,
} from '../types'

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

  // ─── Draw / Lease Form state ──────────────────────────────
  drawBoundaryMode: boolean
  drawnBoundaryGeoJSON: object | null
  leaseFormOpen: boolean
  leaseFormEditId: string | null

  // ─── UI state ─────────────────────────────────────────────
  leaseInfoPanelOpen: boolean
  vehicleTrackingPanelOpen: boolean
  layerPanelOpen: boolean
  reportModalOpen: boolean

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
  toggleVehiclesVisible: () => void
  selectVehicle: (id: number | null) => void
  addVehicleAlert: (alert: VehicleAlert) => void
  markAlertsRead: () => void

  setLeaseInfoPanelOpen: (open: boolean) => void
  setVehicleTrackingPanelOpen: (open: boolean) => void
  setLayerPanelOpen: (open: boolean) => void
  setReportModalOpen: (open: boolean) => void

  // Draw/form actions
  setDrawBoundaryMode: (active: boolean) => void
  setDrawnBoundaryGeoJSON: (geojson: object | null) => void
  openLeaseCreateForm: (boundary?: object) => void
  openLeaseEditForm: (leaseId: string) => void
  closeLeaseForm: () => void
  
  triggerMapRefresh: () => void
}

const DEFAULT_LAYERS: LayerConfig[] = [
  {
    id: 'mining_leases',
    label: 'Mining Leases',
    geoserverLayer: 'minegis_ts:mining_leases',
    visible: true,
    opacity: 0.85,
    color: '#2563A8',
    category: 'lease',
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
    id: 'admin_boundary',
    label: 'Administrative Boundaries',
    geoserverLayer: 'minegis_ts:spatial_layers',
    visible: false,
    opacity: 0.8,
    color: '#6366F1',
    category: 'regulatory',
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
]

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      // ─── Initial state ─────────────────────────────────────
      baseLayer: 'osm',
      zoom: 8,
      center: [79.5, 18.0],
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

      vehicles: [],
      vehiclesVisible: true,
      selectedVehicleId: null,
      vehicleAlerts: [],
      unreadAlertCount: 0,

      drawBoundaryMode: false,
      drawnBoundaryGeoJSON: null,
      leaseFormOpen: false,
      leaseFormEditId: null,

      leaseInfoPanelOpen: false,
      vehicleTrackingPanelOpen: false,
      layerPanelOpen: true,
      reportModalOpen: false,
      
      mapRefreshTrigger: Date.now(),

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

      setDrawBoundaryMode: (drawBoundaryMode) => set({ drawBoundaryMode }),
      setDrawnBoundaryGeoJSON: (drawnBoundaryGeoJSON) => set({ drawnBoundaryGeoJSON }),
      openLeaseCreateForm: (boundary) => set({
        leaseFormOpen: true,
        leaseFormEditId: null,
        drawnBoundaryGeoJSON: boundary ?? null,
        drawBoundaryMode: false,
      }),
      openLeaseEditForm: (leaseId) => set({
        leaseFormOpen: true,
        leaseFormEditId: leaseId,
        drawBoundaryMode: false,
      }),
      closeLeaseForm: () => set({
        leaseFormOpen: false,
        leaseFormEditId: null,
        drawnBoundaryGeoJSON: null,
        drawBoundaryMode: false,
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
      setUser: (user) => set({ user, isAuthenticated: user !== null }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'minegis-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
