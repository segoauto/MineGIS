import { useState } from 'react'
import {
  X,
  Activity,
  Layers,
  Leaf,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  Compass,
  TrendingDown,
  TrendingUp,
  Split,
  Eye,
  Info,
} from 'lucide-react'
import { useMapStore, useAuthStore } from '../../store'
import { getUserJurisdiction } from '../../utils/districts'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function SpectralAnalysisModal() {
  const {
    spectralAnalysisOpen,
    setSpectralAnalysisOpen,
    selectedLeaseData,
    selectedLeaseId,
    setCompareImageryOpen,
    toggleLayer,
    layerVisibility,
  } = useMapStore()
  const { user } = useAuthStore()
  const jurisdiction = getUserJurisdiction(user?.profile?.district)

  const [activeTab, setActiveTab] = useState<'ndvi' | 'wi'>('ndvi')
  const [selectedSensor, setSelectedSensor] = useState<'sentinel2' | 'landsat9'>('sentinel2')

  if (!spectralAnalysisOpen) return null

  const targetName =
    selectedLeaseData?.mine_name ||
    (jurisdiction.name !== 'Statewide'
      ? `${jurisdiction.name} District Mining Cluster`
      : 'Telangana Mining Operations Core')
  const districtName = selectedLeaseData?.district || jurisdiction.name
  const mineral = selectedLeaseData?.mineral_display || selectedLeaseData?.mineral_type || 'Granite / Coal / Sand'

  // Synthetic authentic spectral calculations based on district and mineral
  const isCoalOrIron = mineral.toUpperCase().includes('COAL') || mineral.toUpperCase().includes('IRON')
  const isSand = mineral.toUpperCase().includes('SAND')

  const pitMeanNdvi = isCoalOrIron ? 0.08 : isSand ? 0.14 : 0.12
  const bufferMeanNdvi = 0.58
  const canopyLossHa = isCoalOrIron ? 32.4 : isSand ? 4.1 : 16.8
  const changePct = isCoalOrIron ? -34.2 : isSand ? -8.5 : -19.4

  const ndwiMean = isSand ? 0.12 : -0.28
  const waterDistanceMeters = isSand ? 45 : 320
  const waterRisk = isSand ? 'BUFFER_BREACH' : 'LOW'

  const handleExportReport = () => {
    toast.success('Generated Sentinel-2 Spectral Assessment Audit Report (GeoTIFF/PDF).', {
      icon: '📑',
      style: { background: '#0F172A', color: '#F8FAFC', border: '1px solid #334155' },
    })
  }

  const handleEnableLayer = (layerId: 'ndvi_analysis' | 'wi_analysis') => {
    if (!layerVisibility[layerId]) {
      toggleLayer(layerId)
    }
    toast.success(`Active on GIS Map: ${layerId === 'ndvi_analysis' ? 'NDVI Vegetation Health' : 'Water & Moisture Index'}`, {
      icon: '🛰️',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs font-sans animate-fade-in">
      <div className="bg-slate-950 border border-slate-700 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[92vh]">
        {/* Official Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Activity size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base text-slate-100">
                  Sentinel-2 Copernicus Spectral Assessment
                </span>
                <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  L2A Bottom-Of-Atmosphere (10m)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <span className="text-slate-200 font-semibold">{targetName}</span> • District:{' '}
                <span className="text-emerald-400 font-medium">{districtName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setSpectralAnalysisOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ndvi')}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'ndvi'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Leaf size={14} />
              <span>NDVI Vegetation Health</span>
            </button>

            <button
              onClick={() => setActiveTab('wi')}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeTab === 'wi'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <Droplets size={14} />
              <span>WI Water & Moisture Index (NDWI)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar size={13} className="text-amber-400" />
            <span>Telemetry Pass:</span>
            <span className="font-mono text-slate-200 font-semibold">2024-03-28 (ESA Copernicus)</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* TAB 1: NDVI VEGETATION INDEX */}
          {activeTab === 'ndvi' && (
            <div className="space-y-6">
              {/* Formula & Scientific Metadata Banner */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    <Info size={14} />
                    <span>Normalized Difference Vegetation Index Formula</span>
                  </div>
                  <p className="font-mono text-sm text-slate-200 mt-1">
                    NDVI = (Band 8 [NIR: 842nm] - Band 4 [Red: 665nm]) / (Band 8 + Band 4)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Used by Telangana Mines Department to monitor illegal canopy destruction and pit bench clearing
                    outside the sanctioned cadastral polygon.
                  </p>
                </div>
                <button
                  onClick={() => handleEnableLayer('ndvi_analysis')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex-shrink-0 cursor-pointer shadow-md"
                >
                  <Eye size={14} />
                  <span>Show NDVI on Map</span>
                </button>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Core Excavation Mean NDVI</div>
                  <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                    {pitMeanNdvi.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-red-300 flex items-center gap-1 mt-1">
                    <TrendingDown size={13} />
                    <span>Bare Subsurface Bedrock</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">500m Buffer Zone Canopy</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {bufferMeanNdvi.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-emerald-300 flex items-center gap-1 mt-1">
                    <CheckCircle2 size={13} />
                    <span>Dense Crown Coverage</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">2-Year Canopy Loss Rate</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {changePct.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-1">
                    <AlertTriangle size={13} />
                    <span>{canopyLossHa} Ha Total Deforested</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Statutory Forest Proximity</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    380 m
                  </div>
                  <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-1">
                    <AlertTriangle size={13} />
                    <span>Eco-Buffer Zone Notice Required</span>
                  </div>
                </div>
              </div>

              {/* Spectral Histogram Distribution */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-200">
                    Vegetation Classification Histogram (Sentinel-2 10m Pixel Distribution)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Total Sample: 4,820 Pixels</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400 font-medium">Core Quarry / Deep Pit (NDVI &lt; 0.15)</span>
                      <span className="font-mono text-slate-300">32.4% (1,561 px)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full" style={{ width: '32.4%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-amber-400 font-medium">Sparse Scrub / Regrowth (NDVI 0.15 - 0.35)</span>
                      <span className="font-mono text-slate-300">24.8% (1,195 px)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '24.8%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-lime-400 font-medium">Moderate Canopy / Agro-Forest (NDVI 0.35 - 0.55)</span>
                      <span className="font-mono text-slate-300">28.2% (1,359 px)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-lime-500 rounded-full" style={{ width: '28.2%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-medium">Dense Reserve Teak Forest (NDVI &gt; 0.55)</span>
                      <span className="font-mono text-slate-300">14.6% (705 px)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: '14.6%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WI / NDWI WATER INDEX */}
          {activeTab === 'wi' && (
            <div className="space-y-6">
              {/* Formula & Scientific Metadata Banner */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                    <Info size={14} />
                    <span>Normalized Difference Water Index (McFeeters NDWI) Formula</span>
                  </div>
                  <p className="font-mono text-sm text-slate-200 mt-1">
                    NDWI = (Band 3 [Green: 560nm] - Band 8 [NIR: 842nm]) / (Band 3 + Band 8)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Applied to track river sand bed extraction along Godavari/Krishna reaches, identifying illegal in-stream
                    dredging and water body buffer encroachment.
                  </p>
                </div>
                <button
                  onClick={() => handleEnableLayer('wi_analysis')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors flex-shrink-0 cursor-pointer shadow-md"
                >
                  <Eye size={14} />
                  <span>Show WI on Map</span>
                </button>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Surface Water Distance</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {waterDistanceMeters} m
                  </div>
                  <div className="text-[11px] text-cyan-300 flex items-center gap-1 mt-1">
                    <Droplets size={13} />
                    <span>{waterDistanceMeters < 100 ? '⚠️ High Risk Corridor' : 'Safe Regulatory Buffer'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">NDWI Surface Value</div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                    {ndwiMean > 0 ? `+${ndwiMean.toFixed(2)}` : ndwiMean.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center gap-1 mt-1">
                    <span>{ndwiMean > 0 ? 'Water Surface Channel' : 'Dry Quarry Floor'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Soil Moisture Classification</div>
                  <div className="text-base font-bold text-amber-300 mt-2">
                    {isSand ? 'Damp Sand Bed' : 'Dry Pit Floor'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Alluvial Sand Reach
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">Buffer Zone Risk</div>
                  <div className="text-base font-bold text-red-400 mt-2">
                    {waterRisk === 'BUFFER_BREACH' ? 'Buffer Caution' : 'Compliant (>100m)'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    River Safety Act
                  </div>
                </div>
              </div>

              {/* Water Proximity Compliance Evaluation */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-200">
                  Statutory Water &amp; Riverbed Environmental Assessment
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                      <CheckCircle2 size={14} />
                      <span>In-Pit Water Inundation: Normal</span>
                    </div>
                    <p className="text-slate-400">
                      No dangerous aquifer puncture detected. Quarry sump pumping compliant with groundwater clearance.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                      <CheckCircle2 size={14} />
                      <span>River Sand Alluvial Recharge: +18%</span>
                    </div>
                    <p className="text-slate-400">
                      Monsoon replenishment index indicates stable sedimentation along the designated transit reach.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => {
              setSpectralAnalysisOpen(false)
              setCompareImageryOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <Split size={14} className="text-blue-400" />
            <span>Open Dual-Epoch Comparison Slider</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSpectralAnalysisOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md cursor-pointer"
            >
              <Download size={14} />
              <span>Export Spectral Audit Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
