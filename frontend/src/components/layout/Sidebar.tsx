import { useState } from 'react'
import {
  LayoutDashboard, Map, FileText, Truck, ShieldAlert,
  AlertTriangle, FileBarChart2, ShieldCheck, ChevronLeft, ChevronRight,
  HelpCircle, MapPin, Lock, Scale, Users
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore, useMapStore } from '../../store'
import { getUserJurisdiction, TELANGANA_DISTRICTS } from '../../utils/districts'
import { getRolePermissions } from '../../utils/rbac'

export type PortalTab =
  | 'dashboard'
  | 'map'
  | 'leases'
  | 'fleet'
  | 'weighbridge'
  | 'geofences'
  | 'alerts'
  | 'hro'
  | 'reports'
  | 'governance'

interface SidebarProps {
  activeTab: PortalTab
  onSelectTab: (tab: PortalTab) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { user } = useAuthStore()
  const { unreadAlertCount, vehicleAlerts, setMapFlyToTarget } = useMapStore()
  const [selectedDistrict, setSelectedDistrict] = useState('STATEWIDE')

  const role = user?.profile?.role
  const perms = getRolePermissions(role)
  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isRestricted = jurisdiction.name !== 'Statewide'
  const activeAlertCount = vehicleAlerts.filter(a => !a.is_resolved).length + unreadAlertCount

  const ALL_NAV_ITEMS: { id: PortalTab; label: string; icon: React.ElementType; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'map',
      label: 'Map View',
      icon: Map,
    },
    {
      id: 'leases',
      label: 'Mines & Leases',
      icon: FileText,
    },
    {
      id: 'fleet',
      label: 'Vehicles & Trucks',
      icon: Truck,
    },
    {
      id: 'weighbridge',
      label: 'Weighbridge & ANPR',
      icon: Scale,
      badge: 'Live',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
    {
      id: 'geofences',
      label: 'Boundary Alerts',
      icon: ShieldAlert,
      badge: 'Active',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      id: 'alerts',
      label: 'Alerts & Issues',
      icon: AlertTriangle,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
      badgeColor: 'bg-red-100 text-red-800 border-red-300',
    },
    {
      id: 'hro',
      label: 'HRO & Zonal Officers',
      icon: Users,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileBarChart2,
    },
    {
      id: 'governance',
      label: 'Activity Log',
      icon: ShieldCheck,
    },
  ]

  // Filter navigation items by role permissions
  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => perms.allowedTabs.includes(item.id))

  return (
    <aside
      className={clsx(
        'bg-white border-r border-slate-300 flex flex-col justify-between transition-all duration-300 z-30 select-none flex-shrink-0 shadow-sm',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* ── Navigation List ── */}
      <div className="flex-1 py-3 overflow-y-auto custom-scrollbar flex flex-col">
        {!collapsed && (
          <div className="px-4 mb-2 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Menu ({NAV_ITEMS.length} Tabs)</span>
            {perms.isReadOnly && (
              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-300">
                View Only
              </span>
            )}
          </div>
        )}

        <nav className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer group',
                  isActive
                    ? 'bg-gov-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon
                  size={18}
                  className={clsx(
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-gov-600'
                  )}
                />
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && (
                  <span
                    className={clsx(
                      'text-[10px] font-bold px-1.5 py-0.2 rounded border',
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── Bottom Section: Jurisdiction Badge & Collapse ── */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80 space-y-2 flex-shrink-0">
        {!collapsed && (
          <div
            className={clsx(
              'p-2.5 rounded-lg border text-xs',
              isRestricted
                ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
            )}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <MapPin size={13} className={isRestricted ? 'text-amber-700' : 'text-emerald-700'} />
              <span className="truncate">{jurisdiction.name} District</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {isRestricted ? 'Assigned Jurisdiction' : 'All Districts Access'}
            </div>

            {/* Deep Zoom District Navigation Dropdown */}
            <div className="mt-2 pt-2 border-t border-slate-200/80">
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Select District to Go Deep:
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  const dName = e.target.value
                  setSelectedDistrict(dName)
                  if (dName && TELANGANA_DISTRICTS[dName]) {
                    const d = TELANGANA_DISTRICTS[dName]
                    setMapFlyToTarget({ lon: d.center[0], lat: d.center[1], zoom: 11, ping: true })
                    onSelectTab('map')
                    toast.success(`Deep Zoom: Navigated to ${dName} District`, {
                      icon: '📍',
                      style: { background: '#0F172A', color: '#38BDF8', border: '1px solid #0284C7' }
                    })
                  } else if (dName === 'STATEWIDE') {
                    setMapFlyToTarget({ lon: 78.9, lat: 17.6, zoom: 8.5 })
                    onSelectTab('map')
                    toast.success('Viewing Statewide Telangana', { icon: '🗺️' })
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-hidden focus:border-gov-500 cursor-pointer shadow-2xs"
              >
                <option value="STATEWIDE">Statewide (All 33 Districts)</option>
                {Object.keys(TELANGANA_DISTRICTS).sort().map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          {!collapsed && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold pl-1">
              <HelpCircle size={13} className="text-slate-400" />
              <span>Help: 1800-425-MINE</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={clsx(
              'p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs',
              collapsed ? 'w-full flex justify-center' : 'ml-auto'
            )}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
