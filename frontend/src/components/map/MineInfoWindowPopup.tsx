import { X, Shield, MapPin, ZoomIn, FileText, CheckCircle2, AlertTriangle, Building2, Calendar } from 'lucide-react'
import { useMapStore } from '../../store'
import toast from 'react-hot-toast'

interface MineInfoWindowPopupProps {
  properties: Record<string, any>
  coordinate?: [number, number]
  onClose: () => void
}

export default function MineInfoWindowPopup({ properties, coordinate, onClose }: MineInfoWindowPopupProps) {
  const { setDrawBoundaryMode, selectLease, setMapFlyToTarget } = useMapStore()

  const company = properties.Company || properties.mine_name || 'Mining Lease'
  const mineral = properties.Mineral || properties.mineral_display || 'Mineral Extraction'
  const district = properties.District || properties.district || 'Telangana'
  const mandal = properties.Mandal || properties.mandal || '—'
  const surveyNumb = properties.SurveyNumb || properties.survey_number || '—'
  const mineralTyp = properties.MineralTyp || 'Quarry Lease (QL)'
  const landType = properties.LandType || 'Govt. Revenue Land'
  const production = properties.Production ? Number(properties.Production).toLocaleString('en-IN') : '—'
  const dispatch = properties.Dispatch ? Number(properties.Dispatch).toLocaleString('en-IN') : '—'
  const ets = properties.ETS ? Number(properties.ETS).toLocaleString('en-IN') : '—'
  const notice = properties.Notice ? `₹${Number(properties.Notice).toLocaleString('en-IN')}` : 'Nil'
  const regFrom = properties.Reg_From || '2022-01-01'
  const regTo = properties.Reg_To || '2027-12-31'
  const address = properties.Address || 'Telangana State Mineral Concession Area'

  const handleEstablishGeofence = () => {
    setDrawBoundaryMode('polygon', 'geofence')
    toast.success(`Click points on map to establish geofence around ${company}.`, { icon: '🛡️' })
    onClose()
  }

  const handleZoom = () => {
    if (coordinate) {
      setMapFlyToTarget({
        lon: coordinate[0],
        lat: coordinate[1],
        zoom: 16,
        message: `Centered on ${company}`,
      })
    }
  }

  return (
    <div className="absolute top-20 right-4 z-30 w-96 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
      {/* Official Header */}
      <div className="flex items-start justify-between p-3.5 bg-slate-900 text-white">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Telangana Mining Concession InfoWindow
            </span>
          </div>
          <h3 className="font-bold text-sm text-white leading-tight">
            {company}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
            <span className="text-amber-300 font-semibold">{mineral}</span>
            <span>·</span>
            <span>{district} District</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Close Popup"
        >
          <X size={16} />
        </button>
      </div>

      {/* Attributes Table */}
      <div className="p-3.5 space-y-3 overflow-y-auto custom-scrollbar flex-1 text-xs">
        {/* Quick Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5">
            <span className="text-[9px] uppercase font-bold text-emerald-800 block">Production</span>
            <span className="font-mono font-bold text-xs text-emerald-950">{production} MT</span>
          </div>
          <div className="bg-sky-50 border border-sky-200 rounded p-1.5">
            <span className="text-[9px] uppercase font-bold text-sky-800 block">Dispatch</span>
            <span className="font-mono font-bold text-xs text-sky-950">{dispatch} MT</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-1.5">
            <span className="text-[9px] uppercase font-bold text-amber-800 block">ETS Passes</span>
            <span className="font-mono font-bold text-xs text-amber-950">{ets}</span>
          </div>
        </div>

        {/* Detailed Attribute Pairs */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 divide-y divide-slate-200 text-xs">
          <div className="py-1 flex justify-between">
            <span className="text-slate-500">Mandal:</span>
            <span className="font-bold text-slate-800">{mandal}</span>
          </div>
          <div className="py-1 flex justify-between">
            <span className="text-slate-500">Survey Number:</span>
            <span className="font-mono font-bold text-slate-800">{surveyNumb}</span>
          </div>
          <div className="py-1 flex justify-between">
            <span className="text-slate-500">Mineral Concession Type:</span>
            <span className="font-semibold text-slate-800">{mineralTyp}</span>
          </div>
          <div className="py-1 flex justify-between">
            <span className="text-slate-500">Land Classification:</span>
            <span className="font-semibold text-slate-800">{landType}</span>
          </div>
          <div className="py-1 flex justify-between">
            <span className="text-slate-500">Audit Notice Status:</span>
            <span className="font-semibold text-amber-800">{notice}</span>
          </div>
          <div className="py-1 flex justify-between">
            <span className="text-slate-500">Registered Validity:</span>
            <span className="font-mono text-slate-700">{regFrom} to {regTo}</span>
          </div>
          <div className="py-1.5">
            <span className="text-slate-500 block mb-0.5">Site Address:</span>
            <p className="text-[11px] text-slate-700 font-medium leading-relaxed bg-white p-1.5 rounded border border-slate-200">
              {address}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleEstablishGeofence}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gov-600 hover:bg-gov-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Shield size={13} />
            <span>Draw Geofence</span>
          </button>
          <button
            onClick={handleZoom}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
          >
            <ZoomIn size={13} />
            <span>Zoom In</span>
          </button>
        </div>
      </div>
    </div>
  )
}
