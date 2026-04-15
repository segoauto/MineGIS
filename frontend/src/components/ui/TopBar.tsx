import { useState, useEffect } from 'react'
import {
  MapPin, Satellite, Mountain, Map,
  Bell, BookmarkIcon, User, LogOut,
  ChevronDown, Settings, PieChart, ShieldCheck
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useMapStore, useAuthStore } from '../../store'
import { authApi } from '../../api/auth'
import { clearTokens } from '../../api/client'
import SearchBar from './SearchBar'
import clsx from 'clsx'
import { notificationsApi, type Notification } from '../../api/notifications'
import type { BaseLayerType } from '../../types'

const BASE_LAYERS: { id: BaseLayerType; label: string; icon: React.ElementType }[] = [
  { id: 'osm',       label: 'OpenStreetMap', icon: Map       },
  { id: 'satellite', label: 'Esri Satellite', icon: Satellite  },
  { id: 'terrain',   label: 'Topo Terrain',   icon: Mountain   },
]

export default function TopBar() {
  const { baseLayer, setBaseLayer, bookmarks, unreadAlertCount, markAlertsRead } = useMapStore()
  const { user, logout } = useAuthStore()

  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const navigate = useNavigate()

  const fetchNotifications = async () => {
    if (!user) return
    setLoadingNotifications(true)
    try {
      const data = await notificationsApi.list()
      // Handle both plain array and paginated DRF response {count, results:[]}
      const items: Notification[] = Array.isArray(data) ? data : (data as any)?.results ?? []
      setNotifications(items)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
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

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      markAlertsRead()
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.is_read).length + unreadAlertCount

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token') ?? ''
    try { await authApi.logout(refresh) } catch {}
    clearTokens()
    logout()
    window.location.href = '/login'
  }

  return (
    <header className="relative z-30 flex items-center gap-3 px-4 py-2.5 bg-map-panel/98 backdrop-blur-md border-b border-map-border">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="bg-gov-600 rounded-lg p-1.5">
          <MapPin size={16} className="text-white" />
        </div>
        <div className="leading-none">
          <div className="text-map-text font-bold text-sm tracking-tight">MineGIS<span className="text-saffron-500">-TS</span></div>
          <div className="text-map-muted text-xs">Dept. of Mines &amp; Geology</div>
        </div>
      </div>

      {/* ── Base layer toggle ── */}
      <div className="flex items-center bg-map-bg border border-map-border rounded-lg p-0.5 flex-shrink-0">
        {BASE_LAYERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setBaseLayer(id)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all',
              baseLayer === id
                ? 'bg-gov-600 text-white shadow-sm'
                : 'text-map-muted hover:text-map-text'
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Link ── */}
      {['R01_SUPER_ADMIN', 'R02_STATE_EXEC', 'R03_STATE_MGR', 'R04_DISTRICT_OFFICER', 'R07_GIS_ANALYST'].includes(user?.profile?.role || '') && (
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gov-900/40 hover:bg-gov-900/60 text-gov-400 border border-gov-500/30 rounded-lg transition-colors text-xs font-medium shadow-sm"
        >
          <PieChart size={14} />
          <span className="hidden md:inline">Dashboard</span>
        </button>
      )}
      
      {/* ── Governance Link ── */}
      {['R01_SUPER_ADMIN', 'R02_STATE_EXEC', 'R08_AUDITOR'].includes(user?.profile?.role || '') && (
        <button 
          onClick={() => navigate('/governance')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors text-xs font-medium ml-1 shadow-sm"
          title="Audit & Compliance"
        >
          <ShieldCheck size={14} className="text-gov-400" />
          <span className="hidden md:inline">Governance</span>
        </button>
      )}

      {/* ── Search bar ── */}
      <div className="flex-1 min-w-0">
        <SearchBar />
      </div>

      {/* ── Right actions ── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Bookmarks */}
        <div className="relative">
          <button
            onClick={() => setShowBookmarks((p) => !p)}
            className="p-2 rounded-lg text-map-muted hover:text-map-text hover:bg-map-border transition-colors"
            title="Bookmarks"
          >
            <BookmarkIcon size={16} />
          </button>
          {showBookmarks && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-map-panel border border-map-border rounded-lg shadow-2xl z-50 p-2 animate-fade-in">
              {bookmarks.length === 0 ? (
                <p className="text-map-muted text-xs p-2">No bookmarks saved yet.</p>
              ) : (
                bookmarks.map((b) => (
                  <button key={b.id} className="w-full text-left px-3 py-2 hover:bg-map-border rounded text-xs text-map-text">
                    📍 {b.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Alerts bell */}
        <div className="relative">
          <button
            onClick={() => { setShowAlerts((p) => !p); if (!showAlerts) fetchNotifications() }}
            className="relative p-2 rounded-lg text-map-muted hover:text-map-text hover:bg-map-border transition-colors"
            title="Alerts & Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[12px] h-3 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showAlerts && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-map-panel border border-map-border rounded-lg shadow-2xl z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-map-border flex justify-between items-center">
                <span className="text-map-text text-xs font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-gov-400 hover:text-gov-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {/* System Notifications */}
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={clsx(
                      "px-3 py-2.5 border-b border-map-border/50 hover:bg-map-border/30 transition-colors cursor-pointer",
                      !n.is_read && "bg-gov-900/10"
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="text-map-text text-xs font-medium leading-tight">{n.title}</div>
                      <div className="text-[10px] text-map-muted whitespace-nowrap">{n.created_at_relative}</div>
                    </div>
                    <div className="text-map-muted text-[11px] mt-0.5 line-clamp-2">{n.message}</div>
                    <div className={clsx(
                      "text-[9px] mt-1 font-bold uppercase tracking-wider px-1 inline-block rounded",
                      n.severity === 'CRITICAL' ? "text-red-400 bg-red-400/10" :
                      n.severity === 'WARNING' ? "text-amber-400 bg-amber-400/10" :
                      "text-gov-400 bg-gov-400/10"
                    )}>
                      {n.severity_display}
                    </div>
                  </div>
                ))}

                {/* Vehicle Alerts (from Store) */}
                {useMapStore.getState().vehicleAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="px-3 py-2.5 border-b border-map-border/50 hover:bg-map-border/30 opacity-80">
                    <div className="text-map-text text-xs font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {alert.vehicle_number} — {alert.alert_type_display}
                    </div>
                    <div className="text-map-muted text-[11px] mt-0.5">{alert.description}</div>
                  </div>
                ))}

                {notifications.length === 0 && useMapStore.getState().vehicleAlerts.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-map-muted text-xs">No notifications yet.</div>
                  </div>
                )}
              </div>
              <div className="px-3 py-2 border-t border-map-border text-center">
                <button className="text-[11px] text-map-muted hover:text-map-text transition-colors">
                  View all activity
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUser((p) => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-map-muted hover:text-map-text hover:bg-map-border transition-colors"
          >
            <div className="w-6 h-6 bg-gov-600 rounded-full flex items-center justify-center">
              <User size={12} className="text-white" />
            </div>
            <div className="hidden md:block text-left leading-none">
              <div className="text-map-text text-xs font-medium">{user?.full_name ?? user?.username}</div>
              <div className="text-map-muted text-xs">{user?.profile?.role?.replace('_', ' ')}</div>
            </div>
            <ChevronDown size={12} />
          </button>

          {showUser && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-map-panel border border-map-border rounded-lg shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-map-border">
                <div className="text-map-text text-sm font-semibold">{user?.full_name}</div>
                <div className="text-map-muted text-xs">{user?.email}</div>
                {user?.profile?.district && (
                  <div className="text-gov-300 text-xs mt-0.5">📍 {user.profile.district} District</div>
                )}
              </div>
              <button className="w-full flex items-center gap-2 px-4 py-2.5 text-map-muted hover:text-map-text hover:bg-map-border transition-colors text-xs">
                <Settings size={13} /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-900/20 transition-colors text-xs"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
