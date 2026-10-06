import { useState, useEffect, useRef } from 'react'
import {
  MapPin, Satellite, Mountain, Map,
  Bell, BookmarkIcon, User, LogOut,
  ChevronDown, Settings, ShieldCheck, CheckCircle2,
  ExternalLink, Layers, Sparkles, RotateCcw, Split
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMapStore, useAuthStore } from '../../store'
import { authApi } from '../../api/auth'
import { clearTokens } from '../../api/client'
import SearchBar from './SearchBar'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { notificationsApi, type Notification } from '../../api/notifications'
import { getUserJurisdiction } from '../../utils/districts'
import type { BaseLayerType } from '../../types'

const BASE_LAYERS: { id: BaseLayerType; label: string; icon: React.ElementType }[] = [
  { id: 'osm',         label: 'Streets',    icon: Map       },
  { id: 'satellite',   label: 'Satellite',  icon: Satellite },
  { id: 'terrain',     label: 'Topo',       icon: Mountain  },
  { id: 'carto_light', label: 'Light',      icon: Layers    },
]

export default function TopBar() {
  const {
    baseLayer, setBaseLayer, bookmarks, unreadAlertCount,
    markAlertsRead, vehicleAlerts, setMapFlyToTarget,
    setCompareImageryOpen, setTenderDemoModalOpen, resetDemoData,
  } = useMapStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const jurisdiction = getUserJurisdiction(user?.profile?.district)
  const isRestricted = jurisdiction.name !== 'Statewide'

  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showBaseLayers, setShowBaseLayers] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const bookmarksRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const alertsRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    if (!user) return
    setLoadingNotifications(true)
    try {
      const data = await notificationsApi.list()
      const items: Notification[] = Array.isArray(data) ? data : (data as any)?.results ?? []
      setNotifications(items)
    } catch {
      // Mock notifications if backend not reachable
      setNotifications([
        {
          id: 1,
          title: 'Geofence Entry Alert',
          message: 'Vehicle TS-07-EA-4122 entered Maheshwaram Quarry Perimeter.',
          severity: 'WARNING',
          severity_display: 'Warning',
          is_read: false,
          created_at_relative: '5m ago',
        } as any
      ])
    } finally {
      setLoadingNotifications(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookmarksRef.current && !bookmarksRef.current.contains(e.target as Node)) setShowBookmarks(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUser(false)
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) setShowAlerts(false)
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) setShowBaseLayers(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      markAlertsRead()
    } catch {
      markAlertsRead()
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length + unreadAlertCount

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore API logout error in offline demo
    } finally {
      clearTokens()
      logout()
      navigate('/login')
    }
  }

  const currentLayer = BASE_LAYERS.find(b => b.id === baseLayer) || BASE_LAYERS[0]
  const CurrentLayerIcon = currentLayer.icon

  return (
    <header className="bg-white border-b border-slate-300 shadow-xs z-30 select-none flex-shrink-0">
      {/* ── National Tricolor Top Strip ── */}
      <div className="h-1 w-full flex">
        <div className="h-full flex-1 bg-[#FF671F]" title="Saffron" />
        <div className="h-full flex-1 bg-white border-y border-slate-200" title="White" />
        <div className="h-full flex-1 bg-[#046A38]" title="Green" />
      </div>

      {/* ── Government Identity & Action Bar ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        {/* ── 1. Official State Emblem & Portal Branding ── */}
        <div
          className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-9 h-9 rounded-full bg-gov-50 border border-gov-300 p-1 flex items-center justify-center shadow-2xs group-hover:border-gov-500 transition-colors">
            <svg viewBox="0 0 100 100" className="w-full h-full text-gov-600">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="3 2" />
              <circle cx="50" cy="50" r="38" fill="#F0F5FA" stroke="currentColor" strokeWidth="2" />
              <path d="M50 22 L50 78 M22 50 L78 50 M30 30 L70 70 M30 70 L70 30" stroke="#0B3C5D" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="10" fill="#0B3C5D" />
            </svg>
          </div>

          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-gov-700 font-extrabold text-base tracking-tight">
                MineGIS<span className="text-[#FF671F]">-TS</span>
              </span>
              <span className="text-[9px] bg-gov-100 text-gov-800 font-bold px-1.5 py-0.2 rounded border border-gov-300 uppercase tracking-wider hidden sm:inline-block">
                Govt of Telangana
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-800">
              Department of Mines &amp; Geology
            </div>
          </div>
        </div>

        {/* ── 2. Global Search Bar (Centered) ── */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <SearchBar />
        </div>

        {/* ── 3. Right Utility & Officer Actions ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Active District Badge */}
          <div
            className={clsx(
              'hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold shadow-2xs whitespace-nowrap',
              isRestricted
                ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
            )}
            title={
              isRestricted
                ? `Showing data for ${jurisdiction.name} District only`
                : 'All Districts: Access across all 33 Telangana districts'
            }
          >
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                isRestricted ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'
              )}
            />
            <span className="flex items-center gap-1">
              <span className="text-slate-500 font-normal">District:</span>
              <strong className="text-slate-900">{jurisdiction.name}</strong>
              {isRestricted ? (
                <span className="ml-1 text-[9px] font-bold bg-amber-200/90 text-amber-950 px-1 py-0.2 rounded border border-amber-400 uppercase">
                  Assigned
                </span>
              ) : (
                <span className="ml-1 text-[9px] font-bold bg-emerald-200/90 text-emerald-950 px-1 py-0.2 rounded border border-emerald-400 uppercase">
                  All Districts
                </span>
              )}
            </span>
          </div>

          {/* Compact Base Layer Dropdown */}
          <div className="relative" ref={layersRef}>
            <button
              onClick={() => setShowBaseLayers((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
              title="Base Map Layer"
            >
              <CurrentLayerIcon size={13} className="text-gov-600" />
              <span className="hidden xl:inline">{currentLayer.label}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {showBaseLayers && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-300 rounded-lg shadow-lg z-50 p-1.5 animate-fade-in">
                <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-200 mb-1">
                  Map Type
                </div>
                {BASE_LAYERS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setBaseLayer(id)
                      setShowBaseLayers(false)
                    }}
                    className={clsx(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors',
                      baseLayer === id
                        ? 'bg-gov-50 text-gov-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={14} className={baseLayer === id ? 'text-gov-600' : 'text-slate-500'} />
                      <span>{label}</span>
                    </span>
                    {baseLayer === id && <span className="w-1.5 h-1.5 rounded-full bg-gov-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Satellite Images Compare Button */}
          <button
            onClick={() => setCompareImageryOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Compare Satellite Images from Different Dates"
          >
            <Split size={13} className="text-blue-600" />
            <span className="hidden xl:inline">Compare Images</span>
          </button>

          {/* Demo Tour Button */}
          <button
            onClick={() => setTenderDemoModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Open Sample Lease Walkthrough"
          >
            <Sparkles size={13} className="text-amber-600" />
            <span className="hidden sm:inline">Demo Tour</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={() => {
              resetDemoData()
              navigate('/map')
              toast.success('Demo data and map alerts have been reset.', { icon: '↺' })
            }}
            className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Reset Demo Data"
          >
            <RotateCcw size={14} />
          </button>

          {/* Saved Places */}
          <div className="relative" ref={bookmarksRef}>
            <button
              onClick={() => setShowBookmarks((p) => !p)}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Saved Places"
            >
              <BookmarkIcon size={15} />
            </button>

            {showBookmarks && (
              <div className="absolute top-full right-0 mt-1 w-60 bg-white border border-slate-300 rounded-lg shadow-lg z-50 p-2 animate-fade-in">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider px-2 py-1 border-b border-slate-200">
                  Saved Places
                </div>
                {bookmarks.length === 0 ? (
                  <p className="text-slate-500 text-xs p-2">No places saved yet.</p>
                ) : (
                  bookmarks.map((b) => (
                    <button
                      key={b.id}
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 rounded text-xs text-slate-800 flex items-center gap-2"
                    >
                      <MapPin size={13} className="text-gov-600 flex-shrink-0" />
                      <span className="truncate">{b.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Alerts Notification Bell */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => {
                setShowAlerts((p) => !p)
                if (!showAlerts) fetchNotifications()
              }}
              className="relative p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Alerts & Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-3.5 bg-red-600 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute top-full right-0 mt-1 w-80 sm:w-96 bg-white border border-slate-300 rounded-lg shadow-xl z-50 animate-fade-in">
                <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-lg">
                  <span className="text-slate-900 text-xs font-bold flex items-center gap-1.5">
                    <Bell size={13} className="text-gov-600" />
                    <span>Notifications &amp; Alerts</span>
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-gov-600 hover:text-gov-800 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                  {vehicleAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        if (alert.alert_lon && alert.alert_lat) {
                          setMapFlyToTarget({ lon: alert.alert_lon, lat: alert.alert_lat, zoom: 16, ping: true })
                          navigate('/map')
                          setShowAlerts(false)
                        } else {
                          navigate('/geofences')
                          setShowAlerts(false)
                        }
                      }}
                      className="px-3.5 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-gov-700">
                          {alert.vehicle_number}
                        </span>
                        <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.2 rounded border border-red-200 uppercase">
                          {alert.alert_type}
                        </span>
                      </div>
                      <div className="text-slate-800 font-medium mt-0.5 line-clamp-1">
                        {alert.alert_type_display}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {alert.description}
                      </div>
                    </div>
                  ))}

                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={clsx(
                        'px-3.5 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs',
                        !n.is_read && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex justify-between gap-2">
                        <div className="text-slate-900 font-semibold leading-tight">{n.title}</div>
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">{n.created_at_relative}</div>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{n.message}</div>
                    </div>
                  ))}

                  {notifications.length === 0 && vehicleAlerts.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No active alerts recorded.
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-200 bg-slate-50 text-center">
                  <button
                    onClick={() => {
                      navigate('/geofences')
                      setShowAlerts(false)
                    }}
                    className="text-xs text-gov-600 hover:text-gov-800 font-bold"
                  >
                    View All Boundary Alerts →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Officer Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUser((p) => !p)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <div className="w-6 h-6 bg-gov-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'O'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-slate-900 text-xs font-bold truncate max-w-[120px]">
                  {user?.full_name ?? user?.username}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user?.profile?.role?.replace(/_/g, ' ')}
                </div>
              </div>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {showUser && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl z-50 p-2 animate-fade-in text-xs">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80 rounded-md mb-2">
                  <div className="font-extrabold text-slate-900 truncate">
                    {user?.full_name ?? user?.username}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[9px] bg-gov-100 text-gov-800 font-bold px-1.5 py-0.2 rounded border border-gov-300 uppercase">
                      {user?.profile?.role?.replace(/_/g, ' ') || 'OFFICER'}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {jurisdiction.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      navigate('/dashboard')
                      setShowUser(false)
                    }}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    <ShieldCheck size={14} className="text-gov-600" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/geofences')
                      setShowUser(false)
                    }}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-2"
                  >
                    <Layers size={14} className="text-gov-600" />
                    <span>Boundary Alerts</span>
                  </button>
                </div>

                <div className="border-t border-slate-200 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-1.5 rounded hover:bg-red-50 text-red-700 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
