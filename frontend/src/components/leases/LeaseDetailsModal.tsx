import React, { useState } from 'react'
import {
  X, MapPin, FileText, CheckCircle2, AlertTriangle, Calendar,
  IndianRupee, Download, Printer, ShieldCheck, Building2, User,
  Mail, Phone, ExternalLink, Map, Award, Check
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import type { MiningLease } from '../../types'
import { leasesApi } from '../../api/leases'
import { useAuthStore, useMapStore } from '../../store'
import { getRolePermissions } from '../../utils/rbac'

interface LeaseDetailsModalProps {
  lease: MiningLease | null
  isOpen: boolean
  onClose: () => void
  onInspectOnMap: (lease: MiningLease) => void
  onLeaseApproved?: (updatedLease: MiningLease) => void
}

export default function LeaseDetailsModal({
  lease,
  isOpen,
  onClose,
  onInspectOnMap,
  onLeaseApproved,
}: LeaseDetailsModalProps) {
  const { user } = useAuthStore()
  const perms = getRolePermissions(user?.profile?.role)
  const [isApproving, setIsApproving] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [currentLease, setCurrentLease] = useState<MiningLease | null>(lease)

  React.useEffect(() => {
    setCurrentLease(lease)
    setShowCertificate(false)
  }, [lease])

  if (!isOpen || !currentLease) return null

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const updated = await leasesApi.approveLease(currentLease.id || currentLease.lease_id, {
        approved_by: user?.username || 'Super Admin',
      })
      const fullUpdated: MiningLease = {
        ...currentLease,
        status: 'ACTIVE',
        status_display: 'Operational (Approved)',
      }
      setCurrentLease(fullUpdated)
      setShowCertificate(true)
      toast.success(`Lease ${currentLease.lease_id} successfully approved! Grant Order generated.`, {
        icon: '📜',
        duration: 5000,
      })
      if (onLeaseApproved) onLeaseApproved(fullUpdated)
    } catch (err: any) {
      toast.error('Approval failed: ' + (err?.message || 'Could not approve lease'))
    } finally {
      setIsApproving(false)
    }
  }

  const orderNumber = `TS-DMG-GO-${currentLease.district.slice(0, 3).toUpperCase()}-${String(currentLease.id || 101).padStart(4, '0')}-2026`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans text-slate-800 animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-300 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        
        {/* ── Modal Header ── */}
        <div className="px-5 py-4 bg-gov-700 text-white flex items-center justify-between border-b border-gov-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm tracking-wide bg-white/20 px-2 py-0.5 rounded">
                  {currentLease.lease_id}
                </span>
                <span className={clsx(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase border",
                  currentLease.status === 'ACTIVE'
                    ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                    : currentLease.status === 'PENDING'
                    ? "bg-amber-500/30 text-amber-200 border-amber-400/40"
                    : "bg-slate-500/30 text-slate-200 border-slate-400/40"
                )}>
                  {currentLease.status_display || currentLease.status}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white mt-0.5 truncate max-w-md sm:max-w-xl">
                {currentLease.mine_name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1 bg-slate-50">

          {/* If viewing official approved certificate view */}
          {showCertificate ? (
            <div className="bg-white border-2 border-gov-700 rounded-xl p-6 sm:p-8 shadow-md space-y-5 text-slate-900 relative">
              <div className="text-center border-b-2 border-slate-200 pb-4">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Government of Telangana</div>
                <h3 className="text-lg font-black text-gov-800 tracking-tight mt-1">
                  DEPARTMENT OF MINES &amp; GEOLOGY
                </h3>
                <div className="text-xs text-slate-600 font-semibold mt-0.5">
                  Statutory Mining Concession Grant Order &amp; Cadastral Certificate
                </div>
                <div className="inline-block mt-2 font-mono text-[11px] bg-gov-50 text-gov-800 font-bold px-3 py-1 rounded border border-gov-300">
                  G.O. MS Ref: {orderNumber}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                <span>
                  <strong>Statutory Concession Approved &amp; Granted:</strong> The competent authority has verified cadastral boundaries and environmental clearances.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="text-slate-500 font-bold text-[10px] uppercase">Concession Holder</div>
                  <div className="font-bold text-slate-900 text-sm">{currentLease.leaseholder_name}</div>
                  <div className="text-slate-600 font-mono">PAN: {currentLease.leaseholder_pan}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-slate-500 font-bold text-[10px] uppercase">Mineral Classification</div>
                  <div className="font-bold text-slate-900 text-sm">{currentLease.mineral_display}</div>
                  <div className="text-slate-600">Category: Major / Minor Statutory Mineral</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-slate-500 font-bold text-[10px] uppercase">Cadastral Location</div>
                  <div className="font-bold text-slate-900">{currentLease.village}, {currentLease.mandal}</div>
                  <div className="text-slate-600">{currentLease.survey_number} · District: {currentLease.district}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-slate-500 font-bold text-[10px] uppercase">Concession Demarcation</div>
                  <div className="font-bold text-slate-900 font-mono">{currentLease.area_hectares} Hectares</div>
                  <div className="text-slate-600 font-mono">GPS: {currentLease.centroid_lat?.toFixed(5)}°N, {currentLease.centroid_lon?.toFixed(5)}°E</div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
                <div>Digital Seal: TS-DMG-SEC-VERIFIED-2026</div>
                <div>Status: ACTIVE (OPERATIONAL)</div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Print Certificate
                </button>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Back to Lease Dossier
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Summary Stat Pills ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Concession Area</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                    {currentLease.area_hectares} Ha
                  </div>
                  <div className="text-[10px] text-slate-500">Cadastral Survey Extent</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Mineral Type</div>
                  <div className="text-base font-extrabold text-gov-700 truncate mt-0.5">
                    {currentLease.mineral_display}
                  </div>
                  <div className="text-[10px] text-slate-500">Scheduled Concession</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Revenue &amp; Royalty Due</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                    ₹{((currentLease.royalty_due || 0) / 100000).toFixed(2)} L
                  </div>
                  <div className="text-[10px] text-slate-500">Statutory Assessment</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Validity Period</div>
                  <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                    {currentLease.days_remaining !== undefined ? `${currentLease.days_remaining} Days` : 'Active Term'}
                  </div>
                  <div className="text-[10px] text-slate-500">Till {currentLease.valid_till}</div>
                </div>
              </div>

              {/* ── Pending Lease Alert with Approval Action ── */}
              {currentLease.status === 'PENDING' && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-200/60 rounded-lg text-amber-800 mt-0.5">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">
                        Lease Awaiting Statutory Approval
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        DMO field inspection, DGPS ground control survey, and statutory clearances are on file.
                        Super Admin and Approvers have administrative authorization to grant operational status.
                      </p>
                    </div>
                  </div>

                  {perms.canApproveLease ? (
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <CheckCircle2 size={15} />
                      <span>{isApproving ? 'Approving Lease...' : 'Approve & Issue Grant Order'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-3 py-1.5 rounded border border-slate-300">
                      🔒 Approval Requires Super Admin / Approver Role
                    </span>
                  )}
                </div>
              )}

              {/* ── Lessee & Contact Dossier ── */}
              <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gov-800 border-b border-slate-200 pb-2">
                  <User size={15} />
                  <span>Authorized Concessionaire Dossier</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Company / Leaseholder Name</span>
                    <strong className="text-slate-900 font-semibold">{currentLease.leaseholder_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Permanent Account Number (PAN)</span>
                    <span className="font-mono font-bold text-slate-800">{currentLease.leaseholder_pan || 'AAACT5589L'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Official Registered Contact</span>
                    <span className="font-mono text-slate-800">{currentLease.leaseholder_contact || '+91 800-425-MINE'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Department Communication Email</span>
                    <span className="text-slate-800">{currentLease.leaseholder_email || 'mining@telangana.gov.in'}</span>
                  </div>
                </div>
              </div>

              {/* ── Cadastral & Location Dossier ── */}
              <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gov-800 border-b border-slate-200 pb-2">
                  <MapPin size={15} />
                  <span>Cadastral Geography &amp; Revenue Jurisdiction</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">District</span>
                    <strong className="text-slate-900">{currentLease.district}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Mandal</span>
                    <span className="text-slate-800">{currentLease.mandal}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Revenue Village</span>
                    <span className="text-slate-800">{currentLease.village}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Cadastral Survey No</span>
                    <span className="font-mono font-bold text-slate-900">{currentLease.survey_number}</span>
                  </div>
                </div>

                {currentLease.centroid_lon && currentLease.centroid_lat && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-mono text-slate-700">
                    <span>GPS Centroid: {currentLease.centroid_lat.toFixed(6)}°N, {currentLease.centroid_lon.toFixed(6)}°E</span>
                    <span className="text-[11px] text-gov-700 font-sans font-bold">EPSG:4326 (WGS84)</span>
                  </div>
                )}
              </div>

              {/* ── Statutory Timeline ── */}
              <div className="bg-white rounded-xl border border-slate-300 p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gov-800 border-b border-slate-200 pb-2">
                  <Calendar size={15} />
                  <span>Concession Period &amp; Statutory Milestone Dates</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Grant Date</span>
                    <span className="font-mono text-slate-800">{currentLease.grant_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Commencement Date</span>
                    <span className="font-mono text-slate-800">{currentLease.commencement_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Tenure Valid From</span>
                    <span className="font-mono text-slate-800">{currentLease.valid_from}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Expiry Date</span>
                    <span className="font-mono font-bold text-slate-900">{currentLease.valid_till}</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* ── Modal Footer Actions ── */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-300 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onInspectOnMap(currentLease)
                useMapStore.getState().setMapMode('2D')
                onClose()
              }}
              className="px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Map size={14} />
              <span>Locate on GIS Map</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!showCertificate && (
              <button
                onClick={() => setShowCertificate(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Award size={14} className="text-gov-700" />
                <span>View Grant Certificate</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
