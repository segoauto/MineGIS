import { useState, useMemo } from 'react'
import {
  FileText, Search, Filter, Map, Calendar,
  IndianRupee, CheckCircle2, AlertCircle, Clock,
  ArrowUpDown, ExternalLink, Plus, Upload, Download,
  Check, Eye, ShieldCheck, Award
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore, useMapStore } from '../../store'
import { leasesApi } from '../../api/leases'
import { getUserJurisdiction } from '../../utils/districts'
import { getRolePermissions } from '../../utils/rbac'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MiningLease } from '../../types'
import BulkLeaseUploadModal from './BulkLeaseUploadModal'
import LeaseDetailsModal from './LeaseDetailsModal'

interface LeaseDirectoryProps {
  onInspectLeaseOnMap: (lease: MiningLease) => void
}

export default function LeaseDirectory({ onInspectLeaseOnMap }: LeaseDirectoryProps) {
  const { user } = useAuthStore()
  const { selectLease, openLeaseCreateForm } = useMapStore()
  const perms = getRolePermissions(user?.profile?.role)
  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isRestricted = jurisdiction.name !== 'Statewide'

  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'SUSPENDED'>('ALL')
  const [mineralFilter, setMineralFilter] = useState<string>('ALL')
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [selectedDetailsLease, setSelectedDetailsLease] = useState<MiningLease | null>(null)

  const { data: leasesData, isLoading } = useQuery({
    queryKey: ['leases-directory', user?.profile?.district],
    queryFn: () => leasesApi.list(),
  })

  const leases = leasesData?.results || []

  // Counts by status
  const statusCounts = useMemo(() => {
    let active = 0
    let pending = 0
    let expired = 0
    let suspended = 0
    for (const l of leases) {
      if (l.status === 'ACTIVE') active++
      else if (l.status === 'PENDING') pending++
      else if (l.status === 'EXPIRED') expired++
      else if (l.status === 'SUSPENDED') suspended++
    }
    return { all: leases.length, active, pending, expired, suspended }
  }, [leases])

  const filteredLeases = useMemo(() => {
    return leases.filter((l) => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false
      if (mineralFilter !== 'ALL' && l.mineral_type !== mineralFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          l.mine_name.toLowerCase().includes(q) ||
          l.lease_id.toLowerCase().includes(q) ||
          l.leaseholder_name.toLowerCase().includes(q) ||
          l.mandal.toLowerCase().includes(q) ||
          l.village.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [leases, statusFilter, mineralFilter, search])

  const handleSelectAndInspect = (lease: MiningLease) => {
    selectLease(lease.lease_id, lease)
    onInspectLeaseOnMap(lease)
  }

  // Export filtered data as CSV
  const handleExportCSV = () => {
    if (filteredLeases.length === 0) {
      toast.error('No concession records to export')
      return
    }

    const headers = [
      'Lease ID', 'Mine Name', 'Mineral', 'Status', 'Leaseholder',
      'PAN', 'Contact', 'Email', 'District', 'Mandal', 'Village',
      'Survey Number', 'Area (Ha)', 'Centroid Lon', 'Centroid Lat',
      'Grant Date', 'Commencement Date', 'Valid From', 'Valid Till', 'Royalty Due (INR)'
    ]

    const csvRows = [headers.join(',')]

    for (const l of filteredLeases) {
      const row = [
        `"${l.lease_id || ''}"`,
        `"${(l.mine_name || '').replace(/"/g, '""')}"`,
        `"${l.mineral_display || l.mineral_type || ''}"`,
        `"${l.status || ''}"`,
        `"${(l.leaseholder_name || '').replace(/"/g, '""')}"`,
        `"${l.leaseholder_pan || ''}"`,
        `"${l.leaseholder_contact || ''}"`,
        `"${l.leaseholder_email || ''}"`,
        `"${l.district || ''}"`,
        `"${l.mandal || ''}"`,
        `"${l.village || ''}"`,
        `"${l.survey_number || ''}"`,
        l.area_hectares || 0,
        l.centroid_lon || '',
        l.centroid_lat || '',
        l.grant_date || '',
        l.commencement_date || '',
        l.valid_from || '',
        l.valid_till || '',
        l.royalty_due || 0,
      ]
      csvRows.push(row.join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `telangana_mining_leases_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filteredLeases.length} concession records to CSV!`, { icon: '📥' })
  }

  // Quick Approve inline
  const handleQuickApprove = async (lease: MiningLease) => {
    try {
      await leasesApi.approveLease(lease.id || lease.lease_id, {
        approved_by: user?.username || 'Super Admin',
      })
      queryClient.invalidateQueries({ queryKey: ['leases-directory'] })
      toast.success(`Lease ${lease.lease_id} approved successfully!`, { icon: '✅' })
    } catch (err: any) {
      toast.error('Approval error: ' + (err?.message || 'Could not approve'))
    }
  }

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Title Banner ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
              <FileText size={24} className="text-gov-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-gov-700 tracking-tight">
                  Mining Lease Directory &amp; Cadastral Concession Registry
                </h1>
                <span className="text-[10px] bg-gov-100 text-gov-800 font-bold px-2 py-0.5 rounded border border-gov-300 uppercase">
                  {jurisdiction.name} Scope
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Official statutory concession records, revenue assessment status, and cadastral survey numbers. Click any Lease ID or Mine Name for full information.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Export filtered concession records to CSV / Excel"
            >
              <Download size={14} className="text-gov-600" />
              <span>Export Data</span>
            </button>

            {perms.canBulkUpload && (
              <button
                onClick={() => setIsBulkUploadOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-gov-700 border border-gov-600 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Upload size={14} />
                <span>Bulk Upload (CSV / XLSX)</span>
              </button>
            )}

            {perms.canCreateLease && (
              <button
                onClick={() => openLeaseCreateForm()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Register New Lease</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Status KPI Filter Pill Strip ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs custom-scrollbar">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={clsx(
              'px-3.5 py-2 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              statusFilter === 'ALL'
                ? 'bg-gov-700 text-white border-gov-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            )}
          >
            <span>All Concessions</span>
            <span className={clsx(
              'px-1.5 py-0.2 rounded text-[11px] font-mono',
              statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}>
              {statusCounts.all}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={clsx(
              'px-3.5 py-2 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                : 'bg-white text-emerald-800 border-slate-300 hover:bg-emerald-50/50'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active (Operational)</span>
            <span className={clsx(
              'px-1.5 py-0.2 rounded text-[11px] font-mono',
              statusFilter === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            )}>
              {statusCounts.active}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={clsx(
              'px-3.5 py-2 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50/60'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Pending Approval</span>
            <span className={clsx(
              'px-1.5 py-0.2 rounded text-[11px] font-mono font-bold',
              statusFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
            )}>
              {statusCounts.pending}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('EXPIRED')}
            className={clsx(
              'px-3.5 py-2 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              statusFilter === 'EXPIRED'
                ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Expired Concessions</span>
            <span className={clsx(
              'px-1.5 py-0.2 rounded text-[11px] font-mono',
              statusFilter === 'EXPIRED' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}>
              {statusCounts.expired}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('SUSPENDED')}
            className={clsx(
              'px-3.5 py-2 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              statusFilter === 'SUSPENDED'
                ? 'bg-red-700 text-white border-red-800 shadow-xs'
                : 'bg-white text-red-700 border-slate-300 hover:bg-red-50/40'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Suspended</span>
            <span className={clsx(
              'px-1.5 py-0.2 rounded text-[11px] font-mono',
              statusFilter === 'SUSPENDED' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-800'
            )}>
              {statusCounts.suspended}
            </span>
          </button>
        </div>

        {/* ── Search and Secondary Filter Bar ── */}
        <div className="bg-white border border-slate-300 rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Lease ID, Quarry Name, Leaseholder..."
              className="w-full bg-white border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-gov-600 focus:ring-1 focus:ring-gov-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
              <span className="text-[11px] text-slate-500 font-medium">Mineral:</span>
              <select
                value={mineralFilter}
                onChange={(e) => setMineralFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
              >
                <option value="ALL">All Minerals</option>
                <option value="GRANITE">Granite</option>
                <option value="LIMESTONE">Limestone</option>
                <option value="SAND">River Sand</option>
                <option value="COAL">Coal</option>
                <option value="OTHER">Quartz / Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table View ── */}
        <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Showing {filteredLeases.length} Concession Records</span>
            <span className="text-[11px] text-slate-500 font-normal">Department of Mines &amp; Geology · Telangana</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Lease ID &amp; Mine (Click for Info)</th>
                  <th className="py-2.5 px-4">Mineral Classification</th>
                  <th className="py-2.5 px-4">Leaseholder &amp; PAN</th>
                  <th className="py-2.5 px-4">Revenue Location</th>
                  <th className="py-2.5 px-3 text-center">Area (Ha)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Cadastral Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Clickable Lease ID and Mine */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedDetailsLease(lease)}
                        className="text-left group cursor-pointer"
                        title="Click to view entire information"
                      >
                        <div className="font-mono font-bold text-gov-700 text-xs group-hover:underline flex items-center gap-1">
                          <span>{lease.lease_id}</span>
                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-gov-600" />
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5 group-hover:text-gov-800 transition-colors">
                          {lease.mine_name}
                        </div>
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{lease.mineral_display || lease.mineral_type}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium truncate max-w-[200px]">{lease.leaseholder_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{lease.leaseholder_pan || 'PAN Verified'}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      <div>{lease.village}, {lease.mandal}</div>
                      <div className="text-slate-500 text-[10px]">{lease.survey_number} · {lease.district}</div>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                      {lease.area_hectares}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1',
                          lease.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : lease.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        )}
                      >
                        {lease.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        <span>{lease.status_display || lease.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Approval button for Pending Leases */}
                        {lease.status === 'PENDING' && perms.canApproveLease && (
                          <button
                            onClick={() => handleQuickApprove(lease)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Approve pending lease & issue grant order"
                          >
                            <CheckCircle2 size={12} />
                            <span>Approve</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedDetailsLease(lease)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="View entire information"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => handleSelectAndInspect(lease)}
                          className="px-2.5 py-1 bg-white hover:bg-gov-600 hover:text-white text-gov-700 border border-gov-600 rounded text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          title="Locate & Highlight on Map"
                        >
                          <Map size={12} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Entire Information & Approval Modal ── */}
      <LeaseDetailsModal
        lease={selectedDetailsLease}
        isOpen={Boolean(selectedDetailsLease)}
        onClose={() => setSelectedDetailsLease(null)}
        onInspectOnMap={handleSelectAndInspect}
        onLeaseApproved={(updatedLease) => {
          queryClient.invalidateQueries({ queryKey: ['leases-directory'] })
        }}
      />

      {/* ── Bulk Upload Modal ── */}
      <BulkLeaseUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leases-directory'] })
        }}
      />
    </div>
  )
}
