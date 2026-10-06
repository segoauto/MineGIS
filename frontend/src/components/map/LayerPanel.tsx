import { useState } from 'react'
import { Layers, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useMapStore } from '../../store'
import clsx from 'clsx'

const LAYER_CATEGORIES = [
  { id: 'lease',          label: 'Mining Leases',         icon: '⛏️' },
  { id: 'environmental',  label: 'Spectral & Environmental (NDVI / WI)', icon: '🛰️' },
  { id: 'regulatory',     label: 'Regulatory Layers',     icon: '🌿' },
  { id: 'survey',         label: 'Survey Data',           icon: '📍' },
]

export default function LayerPanel() {
  const { layers, layerVisibility, layerOpacity, toggleLayer, setLayerOpacity, layerPanelOpen, setLayerPanelOpen } = useMapStore()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['lease', 'environmental', 'regulatory'])
  )

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!layerPanelOpen) {
    return (
      <button
        onClick={() => setLayerPanelOpen(true)}
        className="absolute top-4 left-4 z-20 bg-white border border-slate-300 rounded-md p-2 text-slate-700 hover:bg-slate-100 transition-colors shadow-md flex items-center gap-1.5 text-xs font-bold"
        title="Open Spatial Layer Catalog"
      >
        <Layers size={16} className="text-gov-600" />
        <span>Layers</span>
      </button>
    )
  }

  return (
    <div className="absolute top-4 left-4 z-20 w-72 bg-white border border-slate-300 rounded-md shadow-xl animate-fade-in overflow-hidden">
      {/* Official Government Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gov-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-gov-700" />
          <div>
            <span className="text-slate-900 font-bold text-xs uppercase tracking-wide">Spatial Layers</span>
            <div className="text-[10px] text-slate-500 font-medium">GeoServer WMS / PostGIS</div>
          </div>
        </div>
        <button
          onClick={() => setLayerPanelOpen(false)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Layer groups */}
      <div className="py-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {LAYER_CATEGORIES.map((cat) => {
          const catLayers = layers.filter((l) => l.category === cat.id)
          if (catLayers.length === 0) return null
          const isExpanded = expandedCategories.has(cat.id)

          return (
            <div key={cat.id} className="border-b border-slate-100 last:border-0">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left"
              >
                {isExpanded ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
                <span className="text-xs">{cat.icon}</span>
                <span className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  {cat.label}
                </span>
              </button>

              {/* Layer items */}
              {isExpanded && (
                <div className="py-1 bg-white divide-y divide-slate-50">
                  {catLayers.map((layer) => {
                    const visible = layerVisibility[layer.id] ?? layer.visible
                    const opacity = layerOpacity[layer.id] ?? layer.opacity

                    return (
                      <div key={layer.id} className="px-3 py-1.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Color swatch */}
                          <div
                            className="w-3.5 h-3.5 rounded-xs flex-shrink-0 border border-black/10 shadow-2xs"
                            style={{ backgroundColor: layer.color }}
                          />
                          {/* Layer name */}
                          <span
                            className={clsx(
                              'text-xs flex-1 truncate font-medium',
                              visible ? 'text-slate-900 font-semibold' : 'text-slate-400'
                            )}
                          >
                            {layer.label}
                          </span>
                          {/* Visibility toggle */}
                          <button
                            onClick={() => toggleLayer(layer.id)}
                            className={clsx(
                              'p-1 rounded transition-colors flex-shrink-0',
                              visible ? 'text-gov-700 hover:bg-gov-50' : 'text-slate-400 hover:text-slate-600'
                            )}
                            title={visible ? 'Hide layer' : 'Show layer'}
                          >
                            {visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </div>

                        {/* Opacity slider */}
                        {visible && (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={opacity}
                              onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                              className="w-full h-1 bg-slate-200 rounded-full accent-gov-600 cursor-pointer"
                              title={`Opacity: ${Math.round(opacity * 100)}%`}
                            />
                            <span className="text-[10px] text-slate-500 font-mono w-7 text-right">
                              {Math.round(opacity * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Official Government Legend */}
      <div className="border-t border-slate-200 px-3.5 py-2.5 bg-slate-50 space-y-2">
        <div>
          <p className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1">Official Lease Status</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { color: '#0B3C5D', label: 'Active Lease' },
              { color: '#64748B', label: 'Expired' },
              { color: '#B45309', label: 'Pending Grant' },
              { color: '#DC2626', label: 'Suspended' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-xs border border-black/10" style={{ backgroundColor: color }} />
                <span className="text-slate-600 text-[10px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NDVI Spectral Scale */}
        <div className="pt-1.5 border-t border-slate-200">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 mb-0.5">
            <span>🌱 NDVI Vegetation Index</span>
            <span className="font-mono text-emerald-700">-0.1 → +0.8</span>
          </div>
          <div className="h-2 rounded-xs w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-700 border border-black/10" />
          <div className="flex justify-between text-[9px] text-slate-500 font-medium mt-0.5">
            <span>Barren Pit</span>
            <span>Scrub</span>
            <span>Dense Forest</span>
          </div>
        </div>

        {/* WI / NDWI Water Scale */}
        <div>
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 mb-0.5">
            <span>💧 NDWI Water Index</span>
            <span className="font-mono text-cyan-700">-0.5 → +0.6</span>
          </div>
          <div className="h-2 rounded-xs w-full bg-gradient-to-r from-amber-600 via-sky-300 to-blue-700 border border-black/10" />
          <div className="flex justify-between text-[9px] text-slate-500 font-medium mt-0.5">
            <span>Dry Quarry</span>
            <span>Moist Sand</span>
            <span>Water Body</span>
          </div>
        </div>
      </div>
    </div>
  )
}
