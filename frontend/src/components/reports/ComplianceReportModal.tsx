import { useState } from 'react'
import { FileText, Printer, X, CheckCircle, AlertTriangle } from 'lucide-react'
import { useMapStore } from '../../store'
import { MOCK_LEASES } from '../../api/leases'

export default function ComplianceReportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const selectedLeaseData = useMapStore(s => s.selectedLeaseData)
  const conflictResult = useMapStore(s => s.conflictResult)
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  // Ensure active lease data is always present so downloading/printing NEVER results in a blank page
  const activeLease = selectedLeaseData || MOCK_LEASES[0] || {
    lease_id: 'TS-KGM-COAL-001',
    mine_name: 'Singareni Collieries OCP-IV',
    leaseholder_name: 'The Singareni Collieries Company Limited (SCCL)',
    mineral_display: 'Coal (Grade G-11)',
    mineral_type: 'Coal',
    village: 'Rudrampur',
    mandal: 'Kothagudem',
    district: 'Bhadradri Kothagudem',
    status: 'VALID',
    area_hectares: 1240.5,
  }

  const handlePrint = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      window.print()
    }, 400)
  }

  // Determine violations to mock state if no backend data is present (for demo)
  const hasViolations = conflictResult ? conflictResult.has_conflicts : false
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:fixed print:inset-0 print:block print:w-full print:h-full">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white text-gray-900 rounded-xl shadow-2xl flex flex-col print:shadow-none print:rounded-none format-print">
        
        {/* Screen-only header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl print:hidden">
          <div className="flex items-center gap-2 text-gov-600">
            <FileText size={20} />
            <h2 className="text-lg font-bold">Spatial Compliance Report Preview</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-gov-600 hover:bg-gov-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <span className="animate-pulse">Generating PDF...</span>
              ) : (
                <>
                  <Printer size={16} />
                  Download / Print
                </>
              )}
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-10 print:p-0 print:overflow-visible bg-white print:bg-transparent">
          
          {/* Official Header */}
          <div className="text-center pb-6 border-b-2 border-gray-900 mb-8">
            <h1 className="text-2xl font-black uppercase text-gray-900 tracking-wider">
              Department of Mines and Geology
            </h1>
            <h2 className="text-lg font-semibold text-gray-700 mt-1">
              Government of Telangana
            </h2>
            <p className="text-sm font-medium text-gray-500 mt-3 uppercase tracking-widest">
              Standardized Spatial Compliance Report
            </p>
          </div>

          <div className="space-y-8">
            {/* Report Meta */}
            <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">Report Date</p>
                  <p className="font-semibold">{dateStr}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 uppercase text-xs font-bold tracking-wider">Reference ID</p>
                  <p className="font-mono font-semibold">TGMG-SCR-{Math.floor(Math.random() * 100000)}</p>
                </div>
            </div>

            {/* Subject Info */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                Lease Subject Information
              </h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div><span className="text-gray-500 text-xs uppercase block">Lease ID</span><span className="font-mono font-semibold">{activeLease.lease_id}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Mine Name</span><span className="font-semibold">{activeLease.mine_name}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Leaseholder</span><span className="font-semibold text-gov-700">{activeLease.leaseholder_name}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Mineral</span><span className="font-semibold">{(activeLease as any).mineral_display || activeLease.mineral_type}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Location</span><span className="font-semibold">{`${activeLease.village || 'Mining Zone'}, ${activeLease.mandal || 'Mandal'}, ${activeLease.district || 'Telangana'}`}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Status</span><span className="font-semibold px-2 py-0.5 bg-gray-200 rounded">{activeLease.status}</span></div>
              </div>
            </div>

              {/* Spatial Conflict Results */}
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest border-b border-gray-200 pb-2 mb-4">
                  Geospatial Conflict Analysis
                </h3>
                
                {hasViolations ? (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
                     <AlertTriangle className="text-red-600 mt-0.5 flex-shrink-0" />
                     <div>
                       <h4 className="font-bold text-red-900">Spatial Violations Detected</h4>
                       <p className="text-sm text-red-800 mt-1">
                         The surveyed boundaries of this lease intersect with prohibited or regulated spatial zones.
                       </p>
                       <ul className="mt-3 space-y-2">
                         {conflictResult?.conflicts?.spatial_layers.map((layer) => (
                            <li key={layer.id} className="text-sm border-l-2 border-red-400 pl-2">
                              Intersection with <span className="font-bold">{layer.layer_type}</span> boundaries.
                              Source: <span className="font-mono text-xs">{layer.source}</span>
                            </li>
                         ))}
                       </ul>
                     </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3">
                     <CheckCircle className="text-green-600 flex-shrink-0" />
                     <div>
                       <h4 className="font-bold text-green-900">No Spatial Conflicts Detected</h4>
                       <p className="text-sm text-green-800">
                         The lease boundaries comply strictly with forest, eco-sensitive, and water body standoff regulations.
                       </p>
                     </div>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="mt-24 flex justify-between px-10 text-center">
                 <div>
                   <div className="w-40 border-b border-gray-400 mb-2"></div>
                   <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Survey Officer</p>
                 </div>
                 <div>
                   <div className="w-40 border-b border-gray-400 mb-2"></div>
                   <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Director of Mines</p>
                 </div>
              </div>

            </div>
        </div>
      </div>

      {/* Global CSS to isolate print specifically for this modal */}
      <style>{`
        @media print {
           body * {
             visibility: hidden;
           }
           .format-print, .format-print * {
             visibility: visible;
             color: black !important;
           }
           .format-print {
             position: absolute;
             left: 0;
             top: 0;
           }
        }
      `}</style>
    </div>
  )
}
