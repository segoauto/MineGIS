import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, MapPin, Calendar, Activity, FileText, AlertTriangle, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useMapStore } from '../../store'
import { leasesApi } from '../../api/leases'
import { gisApi } from '../../api/gis'
import { useMap } from '../../hooks/useMap'
import clsx from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:     'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
  EXPIRED:    'bg-slate-100 text-slate-700 border-slate-300 font-bold',
  PENDING:    'bg-amber-50 text-amber-800 border-amber-300 font-bold',
  SUSPENDED:  'bg-red-50 text-red-800 border-red-300 font-bold',
  SURRENDERED:'bg-purple-50 text-purple-800 border-purple-300 font-bold',
}

const MINERAL_ICONS: Record<string, string> = {
  COAL: '🪨', IRON_ORE: '⚙️', GRANITE: '🗿', LIMESTONE: '🏔️',
  FLUORITE: '💎', DOLOMITE: '🪨', SAND: '🏖️', OTHER: '⛏️',
}

type Tab = 'overview' | 'spatial' | 'compliance'

export default function LeaseInfoPanel() {
  const { selectedLeaseId, selectLease, leaseInfoPanelOpen } = useMapStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [bufferRadius, setBufferRadius] = useState(500)
  const { flyTo } = useMap({ current: null } as React.RefObject<HTMLDivElement>)

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', selectedLeaseId],
    queryFn: () => leasesApi.get(selectedLeaseId!),
    enabled: !!selectedLeaseId,
  })

  const { data: conflicts, refetch: fetchConflicts, isFetching: loadingConflicts } = useQuery({
    queryKey: ['lease-conflicts', selectedLeaseId],
    queryFn: () => leasesApi.getConflicts(selectedLeaseId!),
    enabled: false,
  })

  const { data: bufferResult, refetch: fetchBuffer, isFetching: loadingBuffer } = useQuery({
    queryKey: ['lease-buffer', selectedLeaseId, bufferRadius],
    queryFn: () => leasesApi.getBuffer(selectedLeaseId!, bufferRadius),
    enabled: false,
  })

  if (!leaseInfoPanelOpen || !selectedLeaseId) return null

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-300 shadow-2xl z-20 flex flex-col animate-slide-up">
      {/* Official Government Dossier Header */}
      <div className="flex items-start justify-between px-4 py-3.5 border-b border-slate-200 bg-gov-50">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-5 w-48 bg-slate-200 animate-pulse rounded" />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{MINERAL_ICONS[lease?.mineral_type ?? 'OTHER']}</span>
                <span className={clsx(
                  'text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider',
                  STATUS_COLORS[lease?.status ?? 'ACTIVE']
                )}>
                  {lease?.status}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Official Record</span>
              </div>
              <h2 className="text-slate-900 font-bold text-sm leading-tight truncate">
                {lease?.mine_name}
              </h2>
              <p className="text-gov-700 text-xs font-mono font-semibold mt-0.5">{lease?.lease_id}</p>
            </>
          )}
        </div>
        <button
          onClick={() => selectLease(null)}
          className="ml-2 text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors flex-shrink-0"
          title="Close dossier"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        {([
          { id: 'overview',   label: 'Overview',   icon: FileText },
          { id: 'spatial',    label: 'Spatial',     icon: MapPin },
          { id: 'compliance', label: 'Compliance',  icon: AlertTriangle },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-colors',
              activeTab === id
                ? 'text-gov-800 border-b-2 border-gov-700 bg-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <Icon size={12} className={activeTab === id ? 'text-gov-700' : 'text-slate-400'} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-map-border animate-pulse rounded" />
            ))}
          </div>
        ) : lease ? (
          <>
            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
              <div className="p-4 space-y-4">
                {/* Leaseholder */}
                <section>
                  <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Leaseholder Information</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                    <InfoRow label="Grantee / Company" value={lease.leaseholder_name} />
                    <InfoRow label="PAN Number" value={lease.leaseholder_pan ?? '—'} mono />
                    <InfoRow label="Contact Phone" value={lease.leaseholder_contact ?? '—'} />
                    <InfoRow label="Official Email" value={lease.leaseholder_email ?? '—'} />
                  </div>
                </section>

                {/* Location */}
                <section>
                  <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Geographic Location</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                    <InfoRow label="District" value={lease.district} />
                    <InfoRow label="Mandal" value={lease.mandal} />
                    <InfoRow label="Village" value={lease.village} />
                    <InfoRow label="Revenue Survey No." value={lease.survey_number ?? '—'} mono />
                    <InfoRow label="Sanctioned Area" value={`${lease.area_hectares} Hectares`} />
                    <InfoRow label="Mineral Classification" value={`${MINERAL_ICONS[lease.mineral_type]} ${lease.mineral_type.replace('_', ' ')}`} />
                  </div>
                </section>

                {/* Timeline */}
                <section>
                  <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Statutory Lease Period</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                    <InfoRow label="Grant Date" value={formatDate(lease.grant_date)} />
                    <InfoRow label="Commencement" value={formatDate(lease.commencement_date || lease.valid_from)} />
                    <InfoRow label="Expiry Date" value={formatDate(lease.valid_till)} />
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-600 text-xs font-medium">Validity Balance:</span>
                      <span className={clsx(
                        'text-xs font-bold px-1.5 py-0.5 rounded border',
                        lease.days_remaining < 0 ? 'text-red-700 bg-red-50 border-red-200' :
                        lease.days_remaining < 90 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      )}>
                        {lease.days_remaining < 0
                          ? `Expired (${Math.abs(lease.days_remaining)} days ago)`
                          : `${lease.days_remaining} days left`}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Financial */}
                <section>
                  <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Revenue &amp; Royalty Status</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-xs font-medium">Outstanding Royalty:</span>
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded border',
                        lease.royalty_due > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      )}>
                        {lease.royalty_due > 0
                          ? `₹${Number(lease.royalty_due).toLocaleString('en-IN')}`
                          : '✓ Dues Cleared'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Zoom action */}
                {lease.centroid_lat && lease.centroid_lon && (
                  <button
                    onClick={() => flyTo(lease.centroid_lon!, lease.centroid_lat!)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                  >
                    <MapPin size={14} />
                    Zoom to Lease on Map
                  </button>
                )}
              </div>
            )}

            {/* ── Spatial Tab ── */}
            {activeTab === 'spatial' && (
              <div className="p-4 space-y-4">
                {/* Buffer analysis */}
                <section>
                  <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Buffer Zone Query (PostGIS ST_Buffer)</h3>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={bufferRadius}
                      onChange={(e) => setBufferRadius(parseInt(e.target.value))}
                      className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs font-medium shadow-2xs"
                    >
                      {[100, 250, 500, 1000, 2000, 5000].map((r) => (
                        <option key={r} value={r}>{r} meters radius</option>
                      ))}
                    </select>
                    <button
                      onClick={() => fetchBuffer()}
                      disabled={loadingBuffer}
                      className="px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      {loadingBuffer ? 'Executing…' : 'Calculate'}
                    </button>
                  </div>
                  {bufferResult && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                      <p className="text-slate-600 text-xs">
                        Environmental layers within {bufferResult.radius_meters}m:
                        <span className="text-slate-900 font-bold ml-1">
                          {bufferResult.layers_in_buffer.length}
                        </span>
                      </p>
                      <p className="text-slate-600 text-xs">
                        Adjacent mining leases within {bufferResult.radius_meters}m:
                        <span className={clsx(
                          'font-bold ml-1',
                          bufferResult.leases_in_buffer.length > 0 ? 'text-amber-700' : 'text-emerald-700'
                        )}>
                          {bufferResult.leases_in_buffer.length}
                        </span>
                      </p>
                      {bufferResult.leases_in_buffer.map((l) => (
                        <div key={l.lease_id} className="text-xs text-slate-600 pl-2 border-l-2 border-slate-300 font-medium">
                          {l.lease_id} — {l.mine_name}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Conflict detection */}
                <section>
                  <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider mb-1.5">Encroachment Verification (PostGIS ST_Intersects)</h3>
                  <button
                    onClick={() => fetchConflicts()}
                    disabled={loadingConflicts}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold transition-colors disabled:opacity-50 mb-2 shadow-2xs"
                  >
                    {loadingConflicts ? 'Checking Intersections…' : 'Run Overlap Check'}
                  </button>
                  {conflicts && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-3">
                      <div className={clsx(
                        'text-xs font-bold mb-2 flex items-center gap-1.5',
                        conflicts.has_conflicts ? 'text-red-700' : 'text-emerald-700'
                      )}>
                        {conflicts.has_conflicts ? '⚠ Encroachment / Overlap detected' : '✓ Clean boundary — No spatial conflicts'}
                      </div>
                      {conflicts.conflicts.spatial_layers.map((l) => (
                        <div key={l.id} className="text-xs text-red-700 font-medium mb-1">
                          🌿 {l.name} ({l.layer_type})
                        </div>
                      ))}
                      {conflicts.conflicts.other_leases.map((l) => (
                        <div key={l.lease_id} className="text-xs text-amber-700 font-medium mb-1">
                          ⛏️ {l.lease_id} — {l.mine_name}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── Compliance Tab ── */}
            {activeTab === 'compliance' && (
              <div className="p-4">
                <ComplianceTab leaseId={lease.lease_id} />
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function ComplianceTab({ leaseId }: { leaseId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance', leaseId],
    queryFn: () => gisApi.getComplianceReport(leaseId),
  })

  if (isLoading) return <div className="text-slate-500 text-xs p-4">Loading statutory compliance audit...</div>
  if (!data) return null

  const checks = data.compliance_checks as Record<string, boolean> | undefined

  return (
    <div className="space-y-3">
      <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Statutory Exclusion Checks</h3>
      {checks ? (
        <div className="space-y-2">
          {[
            { key: 'forest_overlap', label: 'Reserve Forest Boundary Exclusion', warn: true },
            { key: 'water_body_overlap', label: 'River / Water Body Proximity Exclusion', warn: true },
            { key: 'eco_sensitive_zone_overlap', label: 'Eco-Sensitive Zone (ESZ) Buffer Clearance', warn: true },
          ].map(({ key, label, warn }) => (
            <div key={key} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2.5">
              <span className="text-xs text-slate-700 font-medium">{label}</span>
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded border',
                checks[key] && warn ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              )}>
                {checks[key] ? (warn ? '⚠ Overlap Detected' : 'Yes') : '✓ Clear'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-xs">No GIS boundary recorded for statutory validation.</p>
      )}
      <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex justify-between items-center">
        <span className="text-slate-700 text-xs font-medium">Verified DGPS Pillar Survey Points:</span>
        <span className="text-gov-700 font-bold font-mono text-xs">{String(data.dgps_survey_count ?? 0)}</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500 text-xs flex-shrink-0 font-medium">{label}:</span>
      <span className={clsx('text-xs text-right font-semibold', mono ? 'font-mono text-gov-700' : 'text-slate-800')}>
        {value}
      </span>
    </div>
  )
}

function formatDate(d: string) {
  try { return format(new Date(d), 'dd MMM yyyy') } catch { return d }
}
