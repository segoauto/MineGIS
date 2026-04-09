import { useState } from 'react'
import { Ruler, AreaChart, Shield, AlertCircle, X } from 'lucide-react'
import { useMapStore } from '../../store'
import clsx from 'clsx'

type Tool = 'measure_distance' | 'measure_area' | 'buffer' | 'conflict'

const TOOLS: { id: Tool; label: string; icon: React.ElementType; title: string }[] = [
  { id: 'measure_distance', label: 'Distance',  icon: Ruler,       title: 'Measure distance (client-side, Turf.js)' },
  { id: 'measure_area',     label: 'Area',      icon: AreaChart,   title: 'Measure area (client-side, Turf.js)' },
  { id: 'buffer',           label: 'Buffer',    icon: Shield,      title: 'Buffer analysis (server-side, PostGIS)' },
  { id: 'conflict',         label: 'Conflicts', icon: AlertCircle, title: 'Conflict detection (server-side, PostGIS)' },
]

export default function SpatialToolbar() {
  const { activeTool, setActiveTool, measurementResult, bufferResult, conflictResult, selectedLeaseId } = useMapStore()

  const handleTool = (id: Tool) => {
    if (activeTool === id) {
      setActiveTool(null)
    } else {
      setActiveTool(id)
    }
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-map-panel/95 backdrop-blur-md border border-map-border rounded-xl px-2 py-1.5 shadow-xl">
      {TOOLS.map(({ id, label, icon: Icon, title }) => {
        const isActive = activeTool === id
        const needsLease = id === 'buffer' || id === 'conflict'
        const disabled = needsLease && !selectedLeaseId

        return (
          <button
            key={id}
            onClick={() => !disabled && handleTool(id)}
            title={disabled ? 'Select a lease first' : title}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isActive
                ? 'bg-gov-600 text-white shadow-sm'
                : disabled
                ? 'text-map-border cursor-not-allowed'
                : 'text-map-muted hover:text-map-text hover:bg-map-border/60'
            )}
          >
            <Icon size={12} />
            {label}
            {needsLease && <span className="text-xs opacity-60">(PostGIS)</span>}
          </button>
        )
      })}

      {/* Close active tool */}
      {activeTool && (
        <button
          onClick={() => setActiveTool(null)}
          className="ml-1 p-1.5 text-map-muted hover:text-map-text hover:bg-map-border rounded-lg transition-colors"
          title="Close tool"
        >
          <X size={13} />
        </button>
      )}

      {/* Generate Report Button (Visible only when Lease is selected) */}
      {selectedLeaseId && (
        <div className="ml-2 pl-2 border-l border-map-border">
          <button
            onClick={() => useMapStore.getState().setReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-600/20 text-gov-400 hover:bg-gov-600 hover:text-white rounded-lg text-xs font-semibold transition-all border border-gov-600/30 hover:border-gov-600"
            title="Generate Spatial Compliance Report for selected lease"
          >
            <AlertCircle size={12} />
            Generate Report
          </button>
        </div>
      )}

      {/* Result display */}
      {measurementResult && (
        <div className="ml-2 pl-2 border-l border-map-border">
          <span className="text-gov-300 text-xs font-mono font-semibold">
            {measurementResult.formatted}
          </span>
        </div>
      )}
    </div>
  )
}
