import { useState, useMemo } from 'react'
import {
  FileText, Search, Filter, Map, Calendar,
  IndianRupee, CheckCircle2, AlertCircle, Clock,
  ArrowUpDown, ExternalLink, Plus, Upload
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore, useMapStore } from '../../store'
import { leasesApi } from '../../api/leases'
import { getUserJurisdiction } from '../../utils/districts'
import { getRolePermissions } from '../../utils/rbac'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MiningLease } from '../../types'
import BulkLeaseUploadModal from './BulkLeaseUploadModal'

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'PENDING'>('ALL')
  const [mineralFilter, setMineralFilter] = useState<string>('ALL')
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)

  const { data: leasesData, isLoading } = useQuery({
    queryKey: ['leases-directory', user?.profile?.district],
    queryFn: () => leasesApi.list(),
  })

  const leases = leasesData?.results || []

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

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 overflow-y-auto custom-scrollbar font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">

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
                Official statutory concession records, revenue assessment status, and cadastral survey numbers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {perms.canBulkUpload && (
              <button
                onClick={() => setIsBulkUploadOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-gov-700 border border-gov-600 rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Upload size={15} />
                <span>Bulk Upload (CSV / XLSX)</span>
              </button>
            )}
            {perms.canCreateLease && (
              <button
                onClick={() => openLeaseCreateForm()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>Register New Lease</span>
              </button>
            )}
            {!perms.canCreateLease && !perms.canBulkUpload && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-600 rounded text-xs font-semibold">
                <span>🔒 Read-Only Directory</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter Bar ── */}
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
              <span className="text-[11px] text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Operational)</option>
                <option value="PENDING">Pending Review</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

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
            <span className="text-[11px] text-slate-500 font-normal">Department of Mines &amp; Geology</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Lease ID &amp; Mine</th>
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
                  <tr key={lease.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-gov-700 text-xs">{lease.lease_id}</div>
                      <div className="font-bold text-slate-900 mt-0.5">{lease.mine_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{lease.mineral_display}</span>
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
                          'text-[10px] font-bold px-2 py-0.5 rounded border',
                          lease.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : lease.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        )}
                      >
                        {lease.status_display || lease.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSelectAndInspect(lease)}
                        className="px-2.5 py-1 bg-white hover:bg-gov-600 hover:text-white text-gov-700 border border-gov-600 rounded text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Map size={12} />
                        <span>Inspect on Map</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

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
