import { X, Layers, CheckSquare, Square, RotateCcw } from 'lucide-react'
import { useMapStore } from '../../store'
import { DEFAULT_MINERALS } from '../../store'

interface MineralFilterPanelProps {
  onClose: () => void
}

const MINERAL_METADATA: { name: string; color: string; count: number }[] = [
  { name: 'Road Metal',      color: '#2563eb', count: 313 },
  { name: 'Black Granite',   color: '#f43f5e', count: 240 },
  { name: 'Colour Granite',  color: '#e11d48', count: 213 },
  { name: 'Feldspar',        color: '#8b5cf6', count: 22  },
  { name: 'Quartz',          color: '#ef4444', count: 9   },
  { name: 'Limestone Slabs', color: '#f59e0b', count: 7   },
  { name: 'Laterite',        color: '#d946ef', count: 7   },
  { name: 'Mosaic Chips',    color: '#ec4899', count: 2   },
  { name: 'Limestone',       color: '#10b981', count: 1   },
  { name: 'Gravel',          color: '#06b6d4', count: 1   },
  { name: '53/P & 743/P',    color: '#64748b', count: 1   },
]

export default function MineralFilterPanel({ onClose }: MineralFilterPanelProps) {
  const { visibleMinerals, toggleMineral, resetMinerals, triggerMapRefresh } = useMapStore()

  const activeCount = Object.values(visibleMinerals).filter(Boolean).length
  const totalMinesVisible = MINERAL_METADATA.reduce((sum, item) => {
    return sum + (visibleMinerals[item.name] !== false ? item.count : 0)
  }, 0)

  const handleToggle = (name: string) => {
    toggleMineral(name)
    triggerMapRefresh()
  }

  const handleSelectAll = (all: boolean) => {
    resetMinerals(all)
    triggerMapRefresh()
  }

  return (
    <div className="absolute top-16 right-4 z-20 w-80 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-gov-400" />
          <div>
            <div className="text-xs font-bold tracking-wide">Mineral Symbology &amp; Filter</div>
            <div className="text-[10px] text-slate-400">815 Active Telangana Mining Leases</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Close Filter"
        >
          <X size={16} />
        </button>
      </div>

      {/* Overview Stat Strip */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">
          Showing: <strong className="text-slate-900 font-mono">{totalMinesVisible}</strong> / 815 Mines
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={() => handleSelectAll(true)}
            className="text-gov-700 font-bold hover:underline cursor-pointer"
          >
            Select All
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => handleSelectAll(false)}
            className="text-slate-500 font-medium hover:underline cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Mineral List */}
      <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar flex-1 text-xs">
        {MINERAL_METADATA.map(({ name, color, count }) => {
          const isChecked = visibleMinerals[name] !== false

          return (
            <label
              key={name}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(name)}
                  className="rounded text-gov-600 focus:ring-0 cursor-pointer"
                />
                <div
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {count}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
