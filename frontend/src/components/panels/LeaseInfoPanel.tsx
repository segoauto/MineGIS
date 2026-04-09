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
  ACTIVE:     'bg-blue-600/20 text-blue-300 border-blue-600/40',
  EXPIRED:    'bg-gray-600/20 text-gray-400 border-gray-600/40',
  PENDING:    'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
  SUSPENDED:  'bg-red-600/20 text-red-400 border-red-600/40',
  SURRENDERED:'bg-purple-600/20 text-purple-400 border-purple-600/40',
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
    <div className="absolute top-0 right-0 h-full w-96 bg-map-panel/98 backdrop-blur-md border-l border-map-border shadow-2xl z-20 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-4 border-b border-map-border bg-gov-600/20">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-5 w-48 bg-map-border animate-pulse rounded" />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{MINERAL_ICONS[lease?.mineral_type ?? 'OTHER']}</span>
                <span className={clsx(
                  'text-xs px-2 py-0.5 rounded-full border font-medium',
                  STATUS_COLORS[lease?.status ?? 'ACTIVE']
                )}>
                  {lease?.status}
                </span>
              </div>
              <h2 className="text-map-text font-bold text-sm leading-tight truncate">
                {lease?.mine_name}
              </h2>
              <p className="text-map-muted text-xs font-mono mt-0.5">{lease?.lease_id}</p>
            </>
          )}
        </div>
        <button
          onClick={() => selectLease(null)}
          className="ml-2 text-map-muted hover:text-map-text p-1 rounded hover:bg-map-border transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-map-border">
        {([
          { id: 'overview',   label: 'Overview',   icon: FileText },
          { id: 'spatial',    label: 'Spatial',     icon: MapPin },
          { id: 'compliance', label: 'Compliance',  icon: AlertTriangle },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              activeTab === id
                ? 'text-gov-400 border-b-2 border-gov-400 bg-gov-600/10'
                : 'text-map-muted hover:text-map-text'
            )}
          >
            <Icon size={12} />
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
                  <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Leaseholder</h3>
                  <div className="bg-map-bg/50 rounded-lg p-3 space-y-1.5">
                    <InfoRow label="Name" value={lease.leaseholder_name} />
                    <InfoRow label="PAN" value={lease.leaseholder_pan ?? '—'} mono />
                    <InfoRow label="Contact" value={lease.leaseholder_contact ?? '—'} />
                    <InfoRow label="Email" value={lease.leaseholder_email ?? '—'} />
                  </div>
                </section>

                {/* Location */}
                <section>
                  <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Location</h3>
                  <div className="bg-map-bg/50 rounded-lg p-3 space-y-1.5">
                    <InfoRow label="District" value={lease.district} />
                    <InfoRow label="Mandal" value={lease.mandal} />
                    <InfoRow label="Village" value={lease.village} />
                    <InfoRow label="Survey No." value={lease.survey_number ?? '—'} mono />
                    <InfoRow label="Area" value={`${lease.area_hectares} ha`} />
                    <InfoRow label="Mineral" value={`${MINERAL_ICONS[lease.mineral_type]} ${lease.mineral_type.replace('_', ' ')}`} />
                  </div>
                </section>

                {/* Timeline */}
                <section>
                  <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Timeline</h3>
                  <div className="bg-map-bg/50 rounded-lg p-3 space-y-1.5">
                    <InfoRow label="Granted" value={formatDate(lease.grant_date)} />
                    <InfoRow label="Valid From" value={formatDate(lease.valid_from)} />
                    <InfoRow label="Valid Till" value={formatDate(lease.valid_till)} />
                    <div className="flex items-center justify-between">
                      <span className="text-map-muted text-xs">Days Remaining</span>
                      <span className={clsx(
                        'text-xs font-semibold',
                        lease.days_remaining < 0 ? 'text-red-400' :
                        lease.days_remaining < 90 ? 'text-yellow-400' : 'text-green-400'
                      )}>
                        {lease.days_remaining < 0
                          ? `Expired ${Math.abs(lease.days_remaining)} days ago`
                          : `${lease.days_remaining} days`}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Financial */}
                <section>
                  <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Financial</h3>
                  <div className="bg-map-bg/50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-map-muted text-xs">Royalty Due</span>
                      <span className={clsx(
                        'text-xs font-bold',
                        lease.royalty_due > 0 ? 'text-red-400' : 'text-green-400'
                      )}>
                        {lease.royalty_due > 0
                          ? `₹${lease.royalty_due.toLocaleString('en-IN')}`
                          : '✓ No dues'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Fly to action */}
                {lease.centroid_lat && lease.centroid_lon && (
                  <button
                    onClick={() => flyTo(lease.centroid_lon!, lease.centroid_lat!)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gov-600 hover:bg-gov-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <MapPin size={13} />
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
                  <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Buffer Analysis (PostGIS)</h3>
                  <div className="flex gap-2 mb-2">
                    <select
                      value={bufferRadius}
                      onChange={(e) => setBufferRadius(parseInt(e.target.value))}
                      className="flex-1 bg-map-bg border border-map-border rounded px-2 py-1.5 text-map-text text-xs"
                    >
                      {[100, 250, 500, 1000, 2000, 5000].map((r) => (
                        <option key={r} value={r}>{r}m radius</option>
                      ))}
                    </select>
                    <button
                      onClick={() => fetchBuffer()}
                      disabled={loadingBuffer}
                      className="px-3 py-1.5 bg-gov-600 hover:bg-gov-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingBuffer ? 'Running...' : 'Analyze'}
                    </button>
                  </div>
                  {bufferResult && (
                    <div className="bg-map-bg/50 rounded-lg p-3 space-y-2">
                      <p className="text-map-muted text-xs">
                        Layers within {bufferResult.radius_meters}m:
                        <span className="text-map-text font-semibold ml-1">
                          {bufferResult.layers_in_buffer.length}
                        </span>
                      </p>
                      <p className="text-map-muted text-xs">
                        Other leases within {bufferResult.radius_meters}m:
                        <span className={clsx(
                          'font-semibold ml-1',
                          bufferResult.leases_in_buffer.length > 0 ? 'text-yellow-400' : 'text-green-400'
                        )}>
                          {bufferResult.leases_in_buffer.length}
                        </span>
                      </p>
                      {bufferResult.leases_in_buffer.map((l) => (
                        <div key={l.lease_id} className="text-xs text-map-muted pl-2 border-l border-map-border">
                          {l.lease_id} — {l.mine_name}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Conflict detection */}
                <section>
                  <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider mb-2">Conflict Detection (PostGIS)</h3>
                  <button
                    onClick={() => fetchConflicts()}
                    disabled={loadingConflicts}
                    className="w-full py-1.5 bg-red-700/50 hover:bg-red-700/70 text-red-200 rounded text-xs font-medium transition-colors disabled:opacity-50 mb-2"
                  >
                    {loadingConflicts ? 'Running ST_Intersects...' : 'Run Conflict Check'}
                  </button>
                  {conflicts && (
                    <div className="bg-map-bg/50 rounded-lg p-3">
                      <div className={clsx(
                        'text-xs font-bold mb-2',
                        conflicts.has_conflicts ? 'text-red-400' : 'text-green-400'
                      )}>
                        {conflicts.has_conflicts ? '⚠ Conflicts detected' : '✓ No conflicts found'}
                      </div>
                      {conflicts.conflicts.spatial_layers.map((l) => (
                        <div key={l.id} className="text-xs text-red-300 mb-1">
                          🌿 {l.name} ({l.layer_type})
                        </div>
                      ))}
                      {conflicts.conflicts.other_leases.map((l) => (
                        <div key={l.lease_id} className="text-xs text-yellow-300 mb-1">
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

  if (isLoading) return <div className="text-map-muted text-xs">Loading compliance report...</div>
  if (!data) return null

  const checks = data.compliance_checks as Record<string, boolean> | undefined

  return (
    <div className="space-y-3">
      <h3 className="text-map-muted text-xs font-semibold uppercase tracking-wider">Spatial Compliance</h3>
      {checks ? (
        <div className="space-y-2">
          {[
            { key: 'forest_overlap', label: 'Forest Boundary Overlap', warn: true },
            { key: 'water_body_overlap', label: 'Water Body Overlap', warn: true },
            { key: 'eco_sensitive_zone_overlap', label: 'Eco-Sensitive Zone Overlap', warn: true },
          ].map(({ key, label, warn }) => (
            <div key={key} className="flex items-center justify-between bg-map-bg/50 rounded p-2.5">
              <span className="text-xs text-map-muted">{label}</span>
              <span className={clsx(
                'text-xs font-semibold',
                checks[key] && warn ? 'text-red-400' : 'text-green-400'
              )}>
                {checks[key] ? (warn ? '⚠ Overlap' : 'Yes') : '✓ Clear'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-map-muted text-xs">No boundary data available for compliance check.</p>
      )}
      <div className="bg-map-bg/50 rounded p-2.5">
        <span className="text-map-muted text-xs">DGPS Survey Points: </span>
        <span className="text-map-text text-xs font-semibold">{String(data.dgps_survey_count ?? 0)}</span>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-map-muted text-xs flex-shrink-0">{label}</span>
      <span className={clsx('text-xs text-right', mono ? 'font-mono text-gov-300' : 'text-map-text')}>
        {value}
      </span>
    </div>
  )
}

function formatDate(d: string) {
  try { return format(new Date(d), 'dd MMM yyyy') } catch { return d }
}
