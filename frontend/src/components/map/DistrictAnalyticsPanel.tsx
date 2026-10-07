import { useState, useEffect, useMemo } from 'react'
import {
  BarChart2, X, Filter, Building2, MapPin, TrendingUp,
  Download, RefreshCw, Layers, CheckCircle2
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore, useMapStore } from '../../store'
import { TELANGANA_DISTRICT_NAMES, getUserJurisdiction } from '../../utils/districts'

interface MineralStat {
  mineral: string
  mineCount: number
  production: number
  dispatch: number
  ets: number
  notice: number
}

interface DistrictAnalyticsPanelProps {
  onClose: () => void
}

export default function DistrictAnalyticsPanel({ onClose }: DistrictAnalyticsPanelProps) {
  const { user } = useAuthStore()
  const { setMapFlyToTarget } = useMapStore()

  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isRestricted = jurisdiction.name !== 'Statewide'

  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    isRestricted ? jurisdiction.name : 'ALL'
  )
  const [selectedMandal, setSelectedMandal] = useState<string>('ALL')
  const [rawMines, setRawMines] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeMetricTab, setActiveMetricTab] = useState<'ALL' | 'PRODUCTION' | 'DISPATCH' | 'ETS'>('ALL')

  // Load real mines data
  useEffect(() => {
    fetch('/data/gis/mines_points.geojson')
      .then((res) => res.json())
      .then((geojson) => {
        setRawMines(geojson.features || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load mines for analytics:', err)
        setLoading(false)
      })
  }, [])

  // Filtered dataset
  const filteredMines = useMemo(() => {
    return rawMines.filter((feat) => {
      const p = feat.properties || {}
      if (selectedDistrict !== 'ALL' && p.District !== selectedDistrict) {
        return false
      }
      if (selectedMandal !== 'ALL' && p.Mandal !== selectedMandal) {
        return false
      }
      return true
    })
  }, [rawMines, selectedDistrict, selectedMandal])

  // Mandals for selected district
  const availableMandals = useMemo(() => {
    const set = new Set<string>()
    rawMines.forEach((feat) => {
      const p = feat.properties || {}
      if (selectedDistrict === 'ALL' || p.District === selectedDistrict) {
        if (p.Mandal) set.add(p.Mandal)
      }
    })
    return Array.from(set).sort()
  }, [rawMines, selectedDistrict])

  // Aggregate stats by mineral
  const mineralBreakdown = useMemo<MineralStat[]>(() => {
    const map = new Map<string, MineralStat>()

    filteredMines.forEach((feat) => {
      const p = feat.properties || {}
      const mineral = p.Mineral || 'Other Mineral'
      if (!map.has(mineral)) {
        map.set(mineral, {
          mineral,
          mineCount: 0,
          production: 0,
          dispatch: 0,
          ets: 0,
          notice: 0,
        })
      }
      const item = map.get(mineral)!
      item.mineCount += 1
      item.production += Number(p.Production) || 0
      item.dispatch += Number(p.Dispatch) || 0
      item.ets += Number(p.ETS) || 0
      item.notice += Number(p.Notice) || 0
    })

    return Array.from(map.values()).sort((a, b) => b.production - a.production)
  }, [filteredMines])

  // Overall Totals
  const totalProduction = mineralBreakdown.reduce((sum, item) => sum + item.production, 0)
  const totalDispatch = mineralBreakdown.reduce((sum, item) => sum + item.dispatch, 0)
  const totalEts = mineralBreakdown.reduce((sum, item) => sum + item.ets, 0)

  // Max value for chart scaling
  const maxMetricVal = useMemo(() => {
    return Math.max(1, ...mineralBreakdown.map((m) => Math.max(m.production, m.dispatch, m.ets)))
  }, [mineralBreakdown])

  const handleDistrictChange = (d: string) => {
    setSelectedDistrict(d)
    setSelectedMandal('ALL')
  }

  const formatCompact = (val: number) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`
    if (val >= 100000) return `${(val / 100000).toFixed(1)} L`
    if (val >= 1000) return `${(val / 1000).toFixed(1)} K`
    return val.toLocaleString('en-IN')
  }

  return (
    <div className="absolute top-16 right-4 z-20 w-96 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-gov-400" />
          <div>
            <div className="text-xs font-bold tracking-wide">District &amp; Mineral Analytics</div>
            <div className="text-[10px] text-slate-400">Production, Dispatch &amp; ETS Comparison</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Close Analytics"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3.5 space-y-3 overflow-y-auto custom-scrollbar flex-1 text-xs">
        {/* District & Mandal Selectors */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">District</label>
            <select
              disabled={isRestricted}
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-gov-600 disabled:bg-slate-100"
            >
              {!isRestricted && <option value="ALL">All Districts (33)</option>}
              {TELANGANA_DISTRICT_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Mandal</label>
            <select
              value={selectedMandal}
              onChange={(e) => setSelectedMandal(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-gov-600"
            >
              <option value="ALL">All Mandals ({availableMandals.length})</option>
              {availableMandals.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
            <span className="text-[9px] uppercase font-bold text-emerald-800 block">Production</span>
            <span className="font-mono font-bold text-xs text-emerald-950 block">{formatCompact(totalProduction)} MT</span>
          </div>
          <div className="bg-sky-50 border border-sky-200 rounded p-2">
            <span className="text-[9px] uppercase font-bold text-sky-800 block">Dispatch</span>
            <span className="font-mono font-bold text-xs text-sky-950 block">{formatCompact(totalDispatch)} MT</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-2">
            <span className="text-[9px] uppercase font-bold text-amber-800 block">ETS Passes</span>
            <span className="font-mono font-bold text-xs text-amber-950 block">{formatCompact(totalEts)}</span>
          </div>
        </div>

        {/* Chart Legend & Metric Filter */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
          <span className="font-bold text-slate-700">By Mineral Category:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" />
              <span className="text-[10px] text-slate-600">Prod</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7]" />
              <span className="text-[10px] text-slate-600">Disp</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]" />
              <span className="text-[10px] text-slate-600">ETS</span>
            </div>
          </div>
        </div>

        {/* Mineral Horizontal Comparison Bars */}
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading analytics...</div>
        ) : mineralBreakdown.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No active leases found for selected area.</div>
        ) : (
          <div className="space-y-3 pt-1">
            {mineralBreakdown.map((item) => {
              const prodPct = Math.min(100, (item.production / maxMetricVal) * 100)
              const dispPct = Math.min(100, (item.dispatch / maxMetricVal) * 100)
              const etsPct = Math.min(100, (item.ets / maxMetricVal) * 100)

              return (
                <div key={item.mineral} className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] truncate">
                      {item.mineral}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                      {item.mineCount} Mine{item.mineCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Production Bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Production</span>
                      <span>{item.production.toLocaleString('en-IN')} MT</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#10b981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, prodPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Dispatch Bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Dispatch</span>
                      <span>{item.dispatch.toLocaleString('en-IN')} MT</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, dispPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* ETS Bar */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>ETS Transit</span>
                      <span>{item.ets.toLocaleString('en-IN')} Slips</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#f59e0b] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, etsPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
