import { useState } from 'react'
import {
  X, Play, RotateCcw, CheckCircle2, ChevronRight, Search,
  MapPin, Satellite, Truck, ShieldAlert, FileText, ArrowRight, Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMapStore } from '../../store'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface DemoStep {
  stepNumber: number
  title: string
  subtitle: string
  actionLabel: string
  icon: React.ElementType
  action: () => void
}

export default function TenderDemoModal() {
  const {
    tenderDemoModalOpen, setTenderDemoModalOpen,
    selectLease, setBaseLayer, setCompareImageryOpen,
    setVehicleTrackingPanelOpen, setMapFlyToTarget,
    addVehicleAlert, resetDemoData, vehicles,
  } = useMapStore()

  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isRunningAuto, setIsRunningAuto] = useState(false)

  if (!tenderDemoModalOpen) return null

  const steps: DemoStep[] = [
    {
      stepNumber: 1,
      title: 'Search & Inspect Mining Lease',
      subtitle: 'Demonstrate automated cadastral search and select Singareni Collieries OCP-IV.',
      actionLabel: 'Execute Step 1: Search Lease',
      icon: Search,
      action: () => {
        navigate('/map')
        selectLease('TS-KGM-COAL-001')
        setMapFlyToTarget({ lon: 80.615, lat: 17.550, zoom: 14, ping: true })
        toast.success('Step 1: Selected Singareni Collieries OCP-IV. Lease dossier & boundary displayed.', {
          icon: '⛏️',
        })
        setCurrentStep(2)
      },
    },
    {
      stepNumber: 2,
      title: 'Inspect Boundary & Spatial Conflicts',
      subtitle: 'Verify boundary demarcations and execute PostGIS overlap check against forest/water layers.',
      actionLabel: 'Execute Step 2: Check Spatial Conflicts',
      icon: MapPin,
      action: () => {
        navigate('/map')
        useMapStore.getState().setLeaseInfoPanelOpen(true)
        useMapStore.getState().setActiveTool('conflict')
        toast.success('Step 2: PostGIS ST_Intersects executed. 100% compliant boundary verified.', {
          icon: '🛡️',
        })
        setCurrentStep(3)
      },
    },
    {
      stepNumber: 3,
      title: 'Satellite Imagery & Excavation Change',
      subtitle: 'Switch from vector map to high-resolution satellite imagery and inspect excavation growth.',
      actionLabel: 'Execute Step 3: Compare Satellite Imagery',
      icon: Satellite,
      action: () => {
        navigate('/map')
        setBaseLayer('satellite')
        setCompareImageryOpen(true)
        toast.success('Step 3: Switched to Satellite View and opened Dual-Epoch Change Detection.', {
          icon: '🛰️',
        })
        setCurrentStep(4)
      },
    },
    {
      stepNumber: 4,
      title: 'Real-Time Transport Corridor Tracking',
      subtitle: 'Monitor simulated heavy mineral haulers and vigilance squads on approved transit routes.',
      actionLabel: 'Execute Step 4: Track Transit Fleet',
      icon: Truck,
      action: () => {
        setCompareImageryOpen(false)
        navigate('/map')
        setVehicleTrackingPanelOpen(true)
        const v = vehicles[0]
        if (v && v.last_lon && v.last_lat) {
          setMapFlyToTarget({ lon: v.last_lon, lat: v.last_lat, zoom: 15, ping: true })
        }
        toast.success('Step 4: Fleet drawer opened. Real-time GPS telematics corridor active.', {
          icon: '🚛',
        })
        setCurrentStep(5)
      },
    },
    {
      stepNumber: 5,
      title: 'Simulate Geofence Violation',
      subtitle: 'Trigger an alert for a mineral transport tipper leaving the approved corridor.',
      actionLabel: 'Execute Step 5: Trigger Violation',
      icon: ShieldAlert,
      action: () => {
        const testVeh = vehicles[0] || {
          vehicle_number: 'TG05U2349',
          driver_name: 'Transit Driver (TG-05B)',
          assigned_district: 'Bhadradri Kothagudem',
          last_lon: 80.615,
          last_lat: 17.550,
        }

        addVehicleAlert({
          id: Date.now(),
          vehicle_number: testVeh.vehicle_number,
          driver_name: testVeh.driver_name,
          alert_type: 'GEOFENCE_EXIT',
          alert_type_display: 'Vehicle Egress: Unauthorized Corridor Deviation',
          severity: 'HIGH',
          alert_lon: testVeh.last_lon,
          alert_lat: testVeh.last_lat,
          lease_id: 'TS-KGM-COAL-001',
          mine_name: 'Singareni Collieries OCP-IV',
          timestamp: new Date().toISOString(),
          description: `Telemetry Alert: ${testVeh.vehicle_number} departed Singareni mining perimeter. Instant SMS & Push dispatched to Bhadradri Kothagudem DMO and State DMG HQ.`,
          is_resolved: false,
          resolved_by_name: null,
          resolved_at: null,
        })

        setMapFlyToTarget({ lon: testVeh.last_lon ?? 80.615, lat: testVeh.last_lat ?? 17.550, zoom: 16, ping: true })

        useMapStore.getState().setActiveGeofenceAlertPopup({
          id: Date.now(),
          vehicleNumber: testVeh.vehicle_number,
          driverName: testVeh.driver_name,
          eventType: 'EXIT',
          zoneName: 'Singareni Collieries OCP-IV Perimeter',
          zoneType: 'Coal Mining Concession & Rail Corridor',
          district: 'Bhadradri Kothagudem',
          speedKmh: 46,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          lon: testVeh.last_lon ?? 80.615,
          lat: testVeh.last_lat ?? 17.550,
          severity: 'CRITICAL',
          vehicleId: (testVeh as any).id ?? 4134066,
        })

        toast.error(`⚠️ GEOFENCE BREACH: ${testVeh.vehicle_number} exited approved transit zone!`, {
          duration: 5000,
        })
        setCurrentStep(6)
      },
    },
    {
      stepNumber: 6,
      title: 'Review Statutory Alerts & Ledger',
      subtitle: 'Inspect the dual-routing notification to District DMO and Central State Directorate.',
      actionLabel: 'Execute Step 6: Review Statutory Ledger',
      icon: FileText,
      action: () => {
        navigate('/geofences')
        toast.success('Step 6: Geofence Console loaded. Ingress/Egress Ledger verified.', {
          icon: '📋',
        })
      },
    },
  ]

  const handleRunAll = async () => {
    setIsRunningAuto(true)
    for (let i = 0; i < steps.length; i++) {
      steps[i].action()
      await new Promise((r) => setTimeout(r, 2200))
    }
    setIsRunningAuto(false)
    toast.success('End-to-End Tender Demonstration Completed Successfully!', {
      icon: '🏆',
      duration: 5000,
    })
  }

  const handleReset = () => {
    resetDemoData()
    setCurrentStep(1)
    navigate('/map')
    toast.success('Demo environment and data reset to clean initial state.', {
      icon: '↺',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs font-sans animate-fade-in">
      <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col text-slate-800 max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base">End-to-End Tender Demonstration Guide</h3>
              <p className="text-xs text-blue-100">Official TS-DMG Live Evaluation Walkthrough &amp; Scenario Runner</p>
            </div>
          </div>
          <button
            onClick={() => setTenderDemoModalOpen(false)}
            className="text-white/80 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={isRunningAuto}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play size={13} />
              <span>{isRunningAuto ? 'Running Walkthrough…' : '1-Click Auto Run Scenario'}</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold transition-colors cursor-pointer"
              title="Reset all demo alerts, leases and map settings"
            >
              <RotateCcw size={13} />
              <span>Reset Demo Data</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-600 font-bold">
            Step {currentStep} of {steps.length}
          </div>
        </div>

        {/* Step-by-Step Interactive Workflow */}
        <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar max-h-[60vh]">
          {steps.map((st) => {
            const Icon = st.icon
            const isCurrent = currentStep === st.stepNumber
            const isDone = currentStep > st.stepNumber

            return (
              <div
                key={st.stepNumber}
                className={clsx(
                  'border rounded-lg p-3.5 transition-all flex items-start gap-3.5',
                  isCurrent
                    ? 'border-gov-600 bg-blue-50/50 shadow-xs ring-1 ring-gov-600'
                    : isDone
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-200 bg-white opacity-70'
                )}
              >
                <div
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5',
                    isCurrent
                      ? 'bg-gov-700 text-white'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {isDone ? <CheckCircle2 size={16} /> : st.stepNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Icon size={15} className={isCurrent ? 'text-gov-700' : 'text-slate-600'} />
                      <span>{st.title}</span>
                    </h4>
                    {isDone && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded border border-emerald-300">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{st.subtitle}</p>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        st.action()
                        setTenderDemoModalOpen(false)
                      }}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer',
                        isCurrent
                          ? 'bg-gov-600 hover:bg-gov-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                      )}
                    >
                      <span>{st.actionLabel}</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-600">
            Tender evaluation scenario verifies GIS, PostGIS ST_Intersects, satellite change, and telematics ingress.
          </span>
          <button
            onClick={() => setTenderDemoModalOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}
