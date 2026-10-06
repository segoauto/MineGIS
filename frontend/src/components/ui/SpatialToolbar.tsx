import { useState } from 'react'
import { Ruler, AreaChart, Shield, AlertCircle, X, PenLine, MapPin, Upload, Activity } from 'lucide-react'
import { useMapStore, useAuthStore } from '../../store'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tool = 'measure_distance' | 'measure_area' | 'buffer' | 'conflict'

const TOOLS: { id: Tool; label: string; icon: React.ElementType; title: string }[] = [
  { id: 'measure_distance', label: 'Distance',  icon: Ruler,       title: 'Measure distance (client-side, Turf.js)' },
  { id: 'measure_area',     label: 'Area',      icon: AreaChart,   title: 'Measure area (client-side, Turf.js)' },
  { id: 'buffer',           label: 'Buffer',    icon: Shield,      title: 'Buffer analysis (server-side, PostGIS)' },
  { id: 'conflict',         label: 'Conflicts', icon: AlertCircle, title: 'Conflict detection (server-side, PostGIS)' },
]

import { getRolePermissions } from '../../utils/rbac'

export default function SpatialToolbar() {
  const { activeTool, setActiveTool, measurementResult, selectedLeaseId, drawBoundaryMode, setDrawBoundaryMode, openLeaseCreateForm } = useMapStore()
  const { user } = useAuthStore()

  const role = user?.profile?.role || ''
  const perms = getRolePermissions(role)
  const canManageLeases = perms.canCreateLease || perms.canDrawBoundaries || Boolean(user?.is_staff)

  const handleTool = (id: Tool) => {
    if (id === 'buffer' || id === 'conflict') {
      if (!selectedLeaseId) {
        useMapStore.getState().selectLease('TS-KGM-COAL-001')
        toast.success('Selected Singareni Collieries OCP-IV for PostGIS spatial analysis.', { icon: '⛏️' })
      }
      useMapStore.getState().setLeaseInfoPanelOpen(true)
    }
    if (activeTool === id) {
      setActiveTool(null)
    } else {
      setActiveTool(id)
    }
  }

  const handleDrawBoundary = () => {
    if (drawBoundaryMode) {
      setDrawBoundaryMode(false)
    } else {
      setDrawBoundaryMode('polygon')
      setActiveTool(null)
    }
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-md">
        {TOOLS.map(({ id, label, icon: Icon, title }) => {
          const isActive = activeTool === id

          return (
            <button
              key={id}
              onClick={() => handleTool(id)}
              title={title}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer',
                isActive
                  ? 'bg-gov-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon size={13} className={isActive ? 'text-white' : 'text-gov-600'} />
              {label}
              {(id === 'buffer' || id === 'conflict') && <span className="text-[10px] opacity-70">(PostGIS)</span>}
            </button>
          )
        })}

        {/* Sentinel-2 Spectral NDVI / WI Button */}
        <button
          onClick={() => {
            useMapStore.setState((s) => ({
              layerVisibility: {
                ...s.layerVisibility,
                ndvi_analysis: true,
                wi_analysis: true,
              },
              spectralAnalysisOpen: true,
            }))
            toast.success('🛰️ Sentinel-2 NDVI & NDWI spectral analysis opened.', { icon: '🌱' })
          }}
          title="Sentinel-2 NDVI Vegetation Health & Water Index Analysis"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs cursor-pointer"
        >
          <Activity size={13} className="text-emerald-700" />
          <span>NDVI / WI</span>
        </button>

        {/* Divider */}
        {canManageLeases && <div className="w-px h-5 bg-slate-200 mx-1" />}

        {/* New Lease (Draw Boundary) */}
        {canManageLeases && (
          <>
            <button
              onClick={handleDrawBoundary}
              title="Digitize boundary on map to demarcate a new lease"
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all border cursor-pointer',
                drawBoundaryMode
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
              )}
            >
              <PenLine size={13} />
              {drawBoundaryMode ? 'Demarcating…' : 'New Demarcation'}
            </button>

            <button
              onClick={() => useMapStore.getState().setBulkUploadModalOpen(true)}
              title="Bulk Upload Mining Data & Cadastral Ingestion (CSV / XLSX)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold transition-all border bg-gov-50 hover:bg-gov-100 text-gov-800 border-gov-300 shadow-2xs cursor-pointer"
            >
              <Upload size={13} className="text-gov-700" />
              <span>Bulk Upload</span>
            </button>
          </>
        )}

        {/* Close active tool */}
        {activeTool && (
          <button
            onClick={() => setActiveTool(null)}
            className="ml-1 p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            title="Close tool"
          >
            <X size={14} />
          </button>
        )}

        {/* Generate Report Button (Visible only when Lease is selected) */}
        {selectedLeaseId && (
          <div className="ml-1 pl-1 border-l border-slate-200">
            <button
              onClick={() => useMapStore.getState().setReportModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gov-50 hover:bg-gov-100 text-gov-800 rounded text-xs font-bold transition-all border border-gov-300 shadow-2xs"
              title="Generate Official Statutory Compliance Report"
            >
              <AlertCircle size={13} className="text-gov-700" />
              Compliance Report
            </button>
          </div>
        )}

        {/* Result display */}
        {measurementResult && (
          <div className="ml-1 pl-1 border-l border-slate-200">
            <span className="text-gov-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-xs font-mono font-bold">
              {measurementResult.formatted}
            </span>
          </div>
        )}
      </div>

      {/* Draw mode instruction banner */}
      {drawBoundaryMode && (
        <div className="flex items-center gap-2 bg-white border border-emerald-500 text-emerald-900 rounded-full px-4 py-1 shadow-md animate-fade-in text-xs font-medium">
          <MapPin size={13} className="text-emerald-700" />
          <span>Click on map to mark lease boundary vertices · Double-click to complete · Esc to cancel</span>
        </div>
      )}

      {/* Measurement instruction banners */}
      {activeTool === 'measure_distance' && (
        <div className="flex items-center gap-2 bg-white border border-blue-500 text-blue-900 rounded-full px-4 py-1 shadow-md animate-fade-in text-xs font-medium">
          <Ruler size={13} className="text-blue-700" />
          <span>Click on map to measure distance · Double-click to finish · Esc to cancel</span>
        </div>
      )}

      {activeTool === 'measure_area' && (
        <div className="flex items-center gap-2 bg-white border border-blue-500 text-blue-900 rounded-full px-4 py-1 shadow-md animate-fade-in text-xs font-medium">
          <AreaChart size={13} className="text-blue-700" />
          <span>Click on map to mark area polygon vertices · Double-click to complete · Esc to cancel</span>
        </div>
      )}
    </div>
  )
}

