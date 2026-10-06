import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, useMapStore } from '../store'
import { authApi } from '../api/auth'
import TopBar from '../components/ui/TopBar'
import Sidebar, { type PortalTab } from '../components/layout/Sidebar'
import DashboardPage from './DashboardPage'
import MapView from '../components/map/MapView'
import Map3DView from '../components/map/Map3DView'
import LayerPanel from '../components/map/LayerPanel'
import SpatialToolbar from '../components/ui/SpatialToolbar'
import TemporalSlider from '../components/ui/TemporalSlider'
import LeaseInfoPanel from '../components/panels/LeaseInfoPanel'
import VehicleTrackingPanel from '../components/vehicle/VehicleTrackingPanel'
import LeaseFormPanel from '../components/panels/LeaseFormPanel'
import ComplianceReportModal from '../components/reports/ComplianceReportModal'
import ImageryComparisonModal from '../components/ui/ImageryComparisonModal'
import SpectralAnalysisModal from '../components/analysis/SpectralAnalysisModal'
import TenderDemoModal from '../components/ui/TenderDemoModal'
import BulkLeaseUploadModal from '../components/leases/BulkLeaseUploadModal'
import LeaseDirectory from '../components/leases/LeaseDirectory'
import FleetSurveillanceView from '../components/fleet/FleetSurveillanceView'
import WeighbridgeANPRView from '../components/weighbridge/WeighbridgeANPRView'
import GeofenceManager from '../components/geofence/GeofenceManager'
import ComplaintsView from '../components/complaints/ComplaintsView'
import HROfficersView from '../components/hro/HROfficersView'
import AnomalyHubPage from './AnomalyHubPage'
import GovernancePage from './GovernancePage'
import { getRolePermissions, isTabAllowed } from '../utils/rbac'
import type { MiningLease, Vehicle } from '../types'
import { Layers, Ruler, Truck, ShieldAlert, PenLine, CheckCircle2, X, Box } from 'lucide-react'
import clsx from 'clsx'

export default function PortalLayout() {
  const { user, setUser, logout } = useAuthStore()
  const {
    reportModalOpen,
    setReportModalOpen,
    layerPanelOpen,
    setLayerPanelOpen,
    vehicleTrackingPanelOpen,
    setVehicleTrackingPanelOpen,
    activeTool,
    setActiveTool,
    drawBoundaryMode,
    setDrawBoundaryMode,
    drawTarget,
    drawnGeofenceGeoJSON,
    setDrawnGeofenceGeoJSON,
    selectVehicle,
    selectLease,
    setMapFlyToTarget,
    bulkUploadModalOpen,
    setBulkUploadModalOpen,
    triggerMapRefresh,
    vehiclesVisible,
    setVehiclesVisible,
    mapMode,
    setMapMode,
  } = useMapStore()

  const location = useLocation()
  const navigate = useNavigate()

  // Track sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [spatialToolsOpen, setSpatialToolsOpen] = useState(false)

  // Revalidate session on mount
  useEffect(() => {
    authApi.getMe()
      .then(setUser)
      .catch((err) => {
        if (err?.response?.status === 401) {
          logout()
          window.location.href = '/login'
        }
      })
  }, [setUser, logout])


  // Derive active tab from route
  const getTabFromPath = (path: string): PortalTab => {
    if (path.includes('/dashboard')) return 'dashboard'
    if (path.includes('/leases')) return 'leases'
    if (path.includes('/fleet')) return 'fleet'
    if (path.includes('/weighbridge') || path.includes('/anpr')) return 'weighbridge'
    if (path.includes('/geofences') || path.includes('/geofence')) return 'geofences'
    if (path.includes('/alerts') || path.includes('/anomaly')) return 'alerts'
    if (path.includes('/complaints') || path.includes('/pgrs') || path.includes('/grievance')) return 'complaints'
    if (path.includes('/hro') || path.includes('/officers') || path.includes('/zonal')) return 'hro'
    if (path.includes('/governance')) return 'governance'
    if (path.includes('/reports')) return 'reports'
    if (path.includes('/map')) return 'map'
    // Default root page
    return 'dashboard'
  }

  const role = user?.profile?.role
  const perms = getRolePermissions(role)

  const rawTab = getTabFromPath(location.pathname)
  // Ensure the current tab is allowed for the user's role
  const resolvedTab = isTabAllowed(role, rawTab) ? rawTab : (perms.allowedTabs[0] || 'map')
  const [activeTab, setActiveTab] = useState<PortalTab>(resolvedTab)

  useEffect(() => {
    const currentRawTab = getTabFromPath(location.pathname)
    if (!isTabAllowed(role, currentRawTab)) {
      const fallbackTab = perms.allowedTabs[0] || 'map'
      setActiveTab(fallbackTab)
      const routeMap: Record<PortalTab, string> = {
        dashboard: '/dashboard',
        map: '/map',
        leases: '/leases',
        fleet: '/fleet',
        weighbridge: '/weighbridge',
        geofences: '/geofences',
        alerts: '/alerts',
        complaints: '/complaints',
        hro: '/hro',
        reports: '/reports',
        governance: '/governance',
      }
      navigate(routeMap[fallbackTab], { replace: true })
    } else {
      setActiveTab(currentRawTab)
    }
  }, [location.pathname, role])

  const handleSelectTab = (tab: PortalTab) => {
    if (!isTabAllowed(role, tab)) {
      return
    }

    if (tab === 'reports') {
      setReportModalOpen(true)
      return
    }

    setActiveTab(tab)
    const routeMap: Record<PortalTab, string> = {
      dashboard: '/dashboard',
      map: '/map',
      leases: '/leases',
      fleet: '/fleet',
      weighbridge: '/weighbridge',
      geofences: '/geofences',
      alerts: '/alerts',
      complaints: '/complaints',
      hro: '/hro',
      reports: '/reports',
      governance: '/governance',
    }
    navigate(routeMap[tab])
  }

  // Quick navigation handlers from child components into the map
  const handleInspectLeaseOnMap = (lease: MiningLease) => {
    selectLease(lease.lease_id, lease)
    handleSelectTab('map')
    if (lease.centroid_lon && lease.centroid_lat) {
      setMapFlyToTarget({ lon: lease.centroid_lon, lat: lease.centroid_lat, zoom: 14, ping: true })
    }
  }

  const handleTrackVehicleOnMap = (vehicle: Vehicle) => {
    selectVehicle(vehicle.id)
    setVehicleTrackingPanelOpen(true)
    handleSelectTab('map')
    if (vehicle.last_lon && vehicle.last_lat) {
      setMapFlyToTarget({ lon: vehicle.last_lon, lat: vehicle.last_lat, zoom: 15, ping: true })
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 font-sans text-slate-800">
      {/* ── Official Government Top Bar ── */}
      <TopBar />

      {/* ── Main Application Body (Sidebar + Content View) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Dynamic Center View Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-100">
          {/* 1. EXECUTIVE DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <DashboardPage
              embed={true}
              onNavigateToMap={() => handleSelectTab('map')}
            />
          )}

          {/* 2. LIVE GIS CADASTRAL MAP VIEW */}
          {activeTab === 'map' && (
            <div className="flex-1 relative overflow-hidden bg-map-bg">
              {/* Map Rendering (2D Cadastral or 3D Terrain Model) */}
              {mapMode === '3D' ? <Map3DView /> : <MapView />}

              {/* Clean Map Tool Dock (Top-Right Pill Strip) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg p-1.5 shadow-md">
                {/* 3D Map Toggle Button */}
                <button
                  onClick={() => setMapMode(mapMode === '3D' ? '2D' : '3D')}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer',
                    mapMode === '3D'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm border border-amber-400'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  title="Toggle between 2D Cadastral GIS Map and 3D Open-Cast Pit Terrain"
                >
                  <Box size={14} className={mapMode === '3D' ? 'text-slate-950' : 'text-amber-600'} />
                  <span>{mapMode === '3D' ? '3D Active' : '3D Terrain'}</span>
                </button>

                <button
                  onClick={() => setLayerPanelOpen(!layerPanelOpen)}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all',
                    layerPanelOpen
                      ? 'bg-gov-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  title="Toggle Spatial Layer Catalog"
                >
                  <Layers size={14} />
                  <span>Layers</span>
                </button>

                <button
                  onClick={() => {
                    setSpatialToolsOpen(!spatialToolsOpen)
                    if (spatialToolsOpen && activeTool) setActiveTool(null)
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all',
                    spatialToolsOpen || activeTool
                      ? 'bg-gov-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  title="Toggle Measure & Spatial Analysis Tools"
                >
                  <Ruler size={14} />
                  <span>Measure & Tools</span>
                </button>

                <button
                  onClick={() => {
                    if (drawBoundaryMode) {
                      setDrawBoundaryMode(false)
                    } else {
                      setDrawBoundaryMode('polygon', 'geofence')
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all',
                    drawBoundaryMode && drawTarget === 'geofence'
                      ? 'bg-emerald-600 text-white shadow-2xs animate-pulse'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  title="Draw boundary directly on map"
                >
                  <PenLine size={14} className={drawBoundaryMode && drawTarget === 'geofence' ? 'text-white' : 'text-emerald-600'} />
                  <span>{drawBoundaryMode && drawTarget === 'geofence' ? 'Finish Drawing' : 'Draw Boundary'}</span>
                </button>

                <button
                  onClick={() => {
                    const next = !vehiclesVisible
                    setVehiclesVisible(next)
                    setVehicleTrackingPanelOpen(next)
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all',
                    vehiclesVisible
                      ? 'bg-gov-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                  title={vehiclesVisible ? 'Hide trucks from map' : 'Show live trucks on map'}
                >
                  <Truck size={14} />
                  <span>Trucks</span>
                </button>

                <button
                  onClick={() => handleSelectTab('geofences')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all border-l border-slate-200 pl-3 ml-1"
                  title="Go to Boundary Alerts"
                >
                  <ShieldAlert size={14} className="text-gov-600" />
                  <span>Boundary Alerts</span>
                </button>
              </div>

              {/* On-Map Interactive Drawing Guidance Banner */}
              {drawBoundaryMode && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 text-white px-5 py-2.5 rounded-lg shadow-2xl border border-emerald-500/80 flex items-center gap-3 animate-fade-in text-xs font-semibold backdrop-blur-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                  <span>
                    {drawTarget === 'geofence'
                      ? '📍 Click on map to add boundary points. Double-click or click the start point to finish.'
                      : '📍 Click on map to draw boundary lines. Double-click to finish.'}
                  </span>
                  <button
                    onClick={() => setDrawBoundaryMode(false)}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold ml-2 transition-colors cursor-pointer"
                  >
                    Cancel (Esc)
                  </button>
                </div>
              )}

              {/* Floating Banner when Polygon is Captured */}
              {!drawBoundaryMode && drawnGeofenceGeoJSON && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 text-white px-5 py-2.5 rounded-lg shadow-2xl border border-emerald-500 flex items-center gap-3 animate-fade-in text-xs font-semibold backdrop-blur-xs">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>
                    ✓ Geofence polygon captured ({((drawnGeofenceGeoJSON as any)?.coordinates?.[0]?.length || 0)} vertices)!
                  </span>
                  <button
                    onClick={() => handleSelectTab('geofences')}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded font-bold transition-colors cursor-pointer"
                  >
                    Configure Geofence →
                  </button>
                  <button
                    onClick={() => setDrawnGeofenceGeoJSON(null)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Spatial analysis toolbar (when toggled on) */}
              {(spatialToolsOpen || activeTool) && <SpatialToolbar />}

              {/* Temporal Slider for Time-Lapse (bottom center, active on satellite) */}
              <TemporalSlider />

              {/* Layer panel (docked on left side) */}
              <LayerPanel />

              {/* Lease info panel (right side, slide-in) */}
              <LeaseInfoPanel />

              {/* Vehicle tracking panel (bottom, resizable) */}
              <VehicleTrackingPanel />

              {/* Lease form panel (right side, slide-in) */}
              <LeaseFormPanel />
            </div>
          )}

          {/* 3. MINING LEASES DIRECTORY */}
          {activeTab === 'leases' && (
            <LeaseDirectory onInspectLeaseOnMap={handleInspectLeaseOnMap} />
          )}

          {/* 4. FLEET SURVEILLANCE DIRECTORY */}
          {activeTab === 'fleet' && (
            <FleetSurveillanceView
              onTrackVehicleOnMap={handleTrackVehicleOnMap}
              onOpenGeofenceSetup={() => handleSelectTab('geofences')}
            />
          )}

          {/* 5. WEIGHBRIDGE & IN-MINE ANPR CONSOLE */}
          {activeTab === 'weighbridge' && (
            <WeighbridgeANPRView />
          )}

          {/* 6. GEOFENCE SETUP CONSOLE */}
          {activeTab === 'geofences' && (
            <GeofenceManager
              onOpenMap={() => handleSelectTab('map')}
              onOpenMapToDraw={() => {
                handleSelectTab('map')
                setDrawBoundaryMode('polygon', 'geofence')
              }}
            />
          )}

          {/* 6. ALERTS & ANOMALIES */}
          {activeTab === 'alerts' && (
            <AnomalyHubPage embed={true} />
          )}

          {/* 7. PUBLIC COMPLAINTS & GRIEVANCE REDRESSAL */}
          {activeTab === 'complaints' && (
            <ComplaintsView onNavigateToMap={() => handleSelectTab('map')} />
          )}

          {/* 8. HRO & ZONAL MINING OFFICERS DIRECTORY */}
          {activeTab === 'hro' && (
            <HROfficersView onNavigateToMap={() => handleSelectTab('map')} />
          )}

          {/* 9. GOVERNANCE & AUDIT */}
          {activeTab === 'governance' && (
            <GovernancePage embed={true} />
          )}
        </div>
      </div>

      {/* Global Compliance Report Modal */}
      <ComplianceReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      {/* Satellite Imagery Comparison & Excavation Change Detection Modal */}
      <ImageryComparisonModal />

      {/* Sentinel-2 Spectral Environmental Assessment (NDVI / WI) Modal */}
      <SpectralAnalysisModal />

      {/* 1-Click End-to-End Tender Demonstration Guide & Runner */}
      <TenderDemoModal />

      {/* Global Bulk Mining Data Ingestion Modal */}
      <BulkLeaseUploadModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onSuccess={() => triggerMapRefresh()}
      />
    </div>
  )
}
