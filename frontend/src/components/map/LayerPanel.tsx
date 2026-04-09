import { useState } from 'react'
import { Layers, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useMapStore } from '../../store'
import clsx from 'clsx'

const LAYER_CATEGORIES = [
  { id: 'lease',      label: 'Mining Leases',    icon: '⛏️' },
  { id: 'regulatory', label: 'Regulatory Layers', icon: '🌿' },
  { id: 'survey',     label: 'Survey Data',       icon: '📍' },
]

export default function LayerPanel() {
  const { layers, layerVisibility, layerOpacity, toggleLayer, setLayerOpacity, layerPanelOpen, setLayerPanelOpen } = useMapStore()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['lease', 'regulatory'])
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
        className="absolute top-4 left-4 z-20 bg-map-panel border border-map-border rounded-lg p-2.5 text-map-text hover:bg-map-border transition-colors shadow-xl"
        title="Open layer panel"
      >
        <Layers size={18} />
      </button>
    )
  }

  return (
    <div className="absolute top-4 left-4 z-20 w-64 bg-map-panel/95 backdrop-blur-md border border-map-border rounded-xl shadow-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-map-border">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-gov-300" />
          <span className="text-map-text font-semibold text-sm">Layers</span>
        </div>
        <button
          onClick={() => setLayerPanelOpen(false)}
          className="text-map-muted hover:text-map-text transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* Layer groups */}
      <div className="py-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {LAYER_CATEGORIES.map((cat) => {
          const catLayers = layers.filter((l) => l.category === cat.id)
          if (catLayers.length === 0) return null
          const isExpanded = expandedCategories.has(cat.id)

          return (
            <div key={cat.id} className="mb-1">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-map-border/50 transition-colors"
              >
                {isExpanded ? <ChevronDown size={12} className="text-map-muted" /> : <ChevronRight size={12} className="text-map-muted" />}
                <span className="text-xs">{cat.icon}</span>
                <span className="text-map-muted text-xs font-medium uppercase tracking-wider">
                  {cat.label}
                </span>
              </button>

              {/* Layer items */}
              {isExpanded && (
                <div className="pb-1">
                  {catLayers.map((layer) => {
                    const visible = layerVisibility[layer.id] ?? layer.visible
                    const opacity = layerOpacity[layer.id] ?? layer.opacity

                    return (
                      <div key={layer.id} className="px-4 py-2">
                        <div className="flex items-center gap-2 mb-1.5">
                          {/* Color swatch */}
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: layer.color }}
                          />
                          {/* Layer name */}
                          <span
                            className={clsx(
                              'text-xs flex-1 truncate',
                              visible ? 'text-map-text' : 'text-map-muted'
                            )}
                          >
                            {layer.label}
                          </span>
                          {/* Visibility toggle */}
                          <button
                            onClick={() => toggleLayer(layer.id)}
                            className="text-map-muted hover:text-map-text transition-colors flex-shrink-0"
                            title={visible ? 'Hide layer' : 'Show layer'}
                          >
                            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        </div>

                        {/* Opacity slider */}
                        {visible && (
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                            className="w-full h-1 rounded-full accent-gov-500 cursor-pointer"
                            title={`Opacity: ${Math.round(opacity * 100)}%`}
                          />
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

      {/* Legend footer */}
      <div className="border-t border-map-border px-4 py-3">
        <p className="text-map-muted text-xs font-medium mb-2">Lease Status Legend</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { color: '#2563A8', label: 'Active' },
            { color: '#6B7280', label: 'Expired' },
            { color: '#CA8A04', label: 'Pending' },
            { color: '#DC2626', label: 'Suspended' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.7 }} />
              <span className="text-map-muted text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
