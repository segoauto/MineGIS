import { useState } from 'react'
import { X, Calendar, Layers, Split, ArrowLeftRight, CheckCircle2, AlertTriangle, Eye, ShieldCheck, Download } from 'lucide-react'
import { useMapStore } from '../../store'
import clsx from 'clsx'

export default function ImageryComparisonModal() {
  const { compareImageryOpen, setCompareImageryOpen, selectedLeaseData, selectedLeaseId } = useMapStore()
  const [sliderPos, setSliderPos] = useState(50) // percentage 0-100
  const [baselineDate, setBaselineDate] = useState('2018-01-01')
  const [currentDate, setCurrentDate] = useState('2024-04-01')
  const [showExcavationOverlay, setShowExcavationOverlay] = useState(true)
  const [comparisonMode, setComparisonMode] = useState<'rgb' | 'ndvi' | 'wi'>('rgb')

  if (!compareImageryOpen) return null

  const leaseName = selectedLeaseData?.mine_name || 'Singareni Collieries OCP-IV (Mining Lease TS-KGM-COAL-001)'
  const districtName = selectedLeaseData?.district || 'Bhadradri Kothagudem'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs font-sans animate-fade-in">
      <div className="bg-slate-950 border border-slate-700 w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Split size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-100">
                  Satellite Change Detection &amp; Excavation Monitoring
                </span>
                <span className="text-[10px] font-bold bg-gov-900 text-blue-300 border border-gov-700 px-2 py-0.5 rounded">
                  Dual-Epoch Comparison
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target: <span className="text-slate-200 font-semibold">{leaseName}</span> ({districtName})
              </p>
            </div>
          </div>

          <button
            onClick={() => setCompareImageryOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close comparison"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar & Date Selector Strip */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
              <Calendar size={13} className="text-amber-400" />
              <span className="text-slate-400">Baseline Epoch:</span>
              <select
                value={baselineDate}
                onChange={(e) => setBaselineDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-200 outline-none cursor-pointer"
              >
                <option value="2018-01-01" className="bg-slate-900 text-white">2018-01-01 (Pre-Mining)</option>
                <option value="2019-06-15" className="bg-slate-900 text-white">2019-06-15 (Initial Phase)</option>
                <option value="2020-03-10" className="bg-slate-900 text-white">2020-03-10</option>
              </select>
            </div>

            <ArrowLeftRight size={14} className="text-slate-500" />

            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
              <Calendar size={13} className="text-emerald-400" />
              <span className="text-slate-400">Current Epoch:</span>
              <select
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent font-mono font-bold text-slate-200 outline-none cursor-pointer"
              >
                <option value="2024-04-01" className="bg-slate-900 text-white">2024-04-01 (Current Sentinel/Maxar)</option>
                <option value="2023-04-12" className="bg-slate-900 text-white">2023-04-12</option>
                <option value="2022-08-05" className="bg-slate-900 text-white">2022-08-05</option>
              </select>
            </div>

            <button
              onClick={() => setShowExcavationOverlay(!showExcavationOverlay)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded border font-semibold transition-all cursor-pointer',
                showExcavationOverlay
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-2xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              )}
            >
              <Eye size={13} />
              <span>Excavation Encroachment Overlay</span>
            </button>

            {/* Spectral Mode Selector */}
            <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
              <button
                onClick={() => setComparisonMode('rgb')}
                className={clsx(
                  'px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer',
                  comparisonMode === 'rgb' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                )}
              >
                RGB True-Color
              </button>
              <button
                onClick={() => setComparisonMode('ndvi')}
                className={clsx(
                  'px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer',
                  comparisonMode === 'ndvi' ? 'bg-emerald-800 text-emerald-200 shadow-2xs' : 'text-slate-400 hover:text-white'
                )}
              >
                🌱 NDVI
              </button>
              <button
                onClick={() => setComparisonMode('wi')}
                className={clsx(
                  'px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer',
                  comparisonMode === 'wi' ? 'bg-cyan-800 text-cyan-200 shadow-2xs' : 'text-slate-400 hover:text-white'
                )}
              >
                💧 WI / NDWI
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block">
            Drag vertical divider to compare Before vs. After
          </div>
        </div>

        {/* Split Screen Image Comparison Canvas */}
        <div className="relative flex-1 aspect-video min-h-[360px] max-h-[500px] bg-black select-none overflow-hidden">
          {/* BASELINE LAYER (Left / Underneath) */}
          <div className="absolute inset-0 bg-slate-900 overflow-hidden">
            {/* Simulated 2018 Imagery: Natural Vegetation / Minor Pit */}
            <div className="w-full h-full relative bg-gradient-to-br from-emerald-950 via-slate-900 to-stone-900 flex items-center justify-center">
              {/* Satellite Terrain Grid Texture */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute top-10 left-16 w-64 h-48 rounded-full bg-emerald-900/40 blur-2xl pointer-events-none" />
              
              {/* Approved Lease Demarcation Ring in 2018 */}
              <div className="w-72 h-56 border-2 border-dashed border-blue-400/70 rounded-2xl relative flex items-center justify-center p-4">
                <div className="w-24 h-16 bg-stone-700/60 rounded-xl border border-stone-500/40 flex items-center justify-center text-[10px] font-mono text-stone-300">
                  Initial Pit (4.2 Ha)
                </div>
              </div>

              {/* Water Body / Reserve nearby */}
              <div className="absolute bottom-8 right-16 w-32 h-20 bg-cyan-950/70 border border-cyan-700/40 rounded-full flex items-center justify-center text-[9px] text-cyan-300 font-mono">
                Buffer Lake (Protected)
              </div>

              <div className="absolute top-4 left-4 bg-black/75 px-3 py-1 rounded border border-amber-500/40 text-amber-400 font-mono text-xs font-bold">
                BASELINE: {baselineDate} {comparisonMode === 'ndvi' ? '• NDVI 0.68' : comparisonMode === 'wi' ? '• NDWI -0.05' : ''}
              </div>
            </div>
          </div>

          {/* CURRENT LAYER (Right / Clipped by sliderPos) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            {/* Simulated 2024 Imagery: Heavy Open Cast Pit & Material Stocks */}
            <div className="w-full h-full relative bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 flex items-center justify-center">
              {/* Satellite Terrain Grid Texture */}
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute top-12 left-16 w-80 h-64 rounded-full bg-amber-900/30 blur-2xl pointer-events-none" />

              {/* Approved Lease Boundary in 2024 */}
              <div className="w-72 h-56 border-2 border-dashed border-blue-400 rounded-2xl relative flex items-center justify-center p-4">
                {/* Expanded Excavation Pit (2024) */}
                <div className="w-56 h-40 bg-amber-950/70 rounded-xl border-2 border-amber-500/80 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-xs font-mono font-bold text-amber-300">Expanded Open Cast Pit</span>
                  <span className="text-[11px] font-mono text-amber-200 mt-0.5">19.0 Ha (+14.8 Ha Expansion)</span>
                  <span className="text-[9px] text-emerald-400 font-bold mt-1 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700">
                    WITHIN APPROVED CONCESSION
                  </span>
                </div>
              </div>

              {/* Water Body Boundary intact */}
              <div className="absolute bottom-8 right-16 w-32 h-20 bg-cyan-950/70 border border-cyan-500/60 rounded-full flex items-center justify-center text-[9px] text-cyan-300 font-mono">
                Buffer Lake (Protected)
              </div>

              {/* Excavation Encroachment Highlights */}
              {showExcavationOverlay && (
                <div className="absolute top-12 right-28 bg-red-950/90 border border-red-500 text-red-200 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse shadow-lg flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-red-400" />
                  <span>
                    {comparisonMode === 'ndvi'
                      ? '🌱 Sentinel-2 NDVI Loss: -34% | Crown Deforestation: 14.8 Ha'
                      : comparisonMode === 'wi'
                      ? '💧 Water Buffer Proximity: 45m | High Moisture Sand Shoal'
                      : 'NDVI Vegetation Loss: -34% | Depth: +22m'}
                  </span>
                </div>
              )}

              <div className="absolute top-4 right-4 bg-black/75 px-3 py-1 rounded border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
                CURRENT: {currentDate} {comparisonMode === 'ndvi' ? '• NDVI 0.11' : comparisonMode === 'wi' ? '• NDWI +0.22' : ''}
              </div>
            </div>
          </div>

          {/* Vertical Slider Handle Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-30 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl cursor-ew-resize border-2 border-slate-900 pointer-events-auto">
              <ArrowLeftRight size={14} />
            </div>
          </div>

          {/* Invisible Range Input for Full-Canvas Dragging */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(parseFloat(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-ew-resize z-40 w-full h-full"
            title="Drag left/right to compare imagery"
          />
        </div>

        {/* Analytical Findings & Statistics Grid */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Excavation Pit Expansion</div>
            <div className="text-xl font-black text-amber-400 tracking-tight mt-0.5">+14.8 Ha</div>
            <div className="text-[10px] text-slate-500 mt-0.5">4.2 Ha (2018) → 19.0 Ha (2024)</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Average Pit Deepening</div>
            <div className="text-xl font-black text-slate-100 tracking-tight mt-0.5">+22.4 m</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Stereo Photogrammetry Benchmark</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Ecological Buffer Integrity</div>
            <div className="text-xl font-black text-emerald-400 tracking-tight mt-0.5">100% Safe</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Zero encroachment in lake zone</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Boundary Compliance</div>
            <div className="text-xl font-black text-emerald-400 tracking-tight mt-0.5">Compliant</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Rule 28 Approved Mine Plan</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Automated Sentinel-2 L2A &amp; Maxar 30cm Change Detection Analysis Complete</span>
          </div>

          <button
            onClick={() => setCompareImageryOpen(false)}
            className="px-4 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold transition-colors cursor-pointer"
          >
            Return to GIS Map
          </button>
        </div>
      </div>
    </div>
  )
}
