import { useState } from 'react'
import {
  MapPin, Satellite, Mountain, Map,
  Bell, BookmarkIcon, Maximize, User, LogOut,
  ChevronDown, Settings,
} from 'lucide-react'
import { useMapStore, useAuthStore } from '../../store'
import { authApi } from '../../api/auth'
import { clearTokens } from '../../api/client'
import SearchBar from './SearchBar'
import clsx from 'clsx'
import type { BaseLayerType } from '../../types'

const BASE_LAYERS: { id: BaseLayerType; label: string; icon: React.ElementType }[] = [
  { id: 'osm',       label: 'Map',       icon: Map       },
  { id: 'satellite', label: 'Satellite', icon: Satellite  },
  { id: 'terrain',   label: 'Terrain',   icon: Mountain   },
]

export default function TopBar() {
  const { baseLayer, setBaseLayer, bookmarks, unreadAlertCount, markAlertsRead } = useMapStore()
  const { user, logout } = useAuthStore()

  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)

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
            onClick={() => { setShowAlerts((p) => !p); markAlertsRead() }}
            className="relative p-2 rounded-lg text-map-muted hover:text-map-text hover:bg-map-border transition-colors"
            title="Alerts"
          >
            <Bell size={16} />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          {showAlerts && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-map-panel border border-map-border rounded-lg shadow-2xl z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-map-border">
                <span className="text-map-text text-xs font-semibold">Recent Alerts</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {useMapStore.getState().vehicleAlerts.slice(0, 8).map((alert) => (
                  <div key={alert.id} className="px-3 py-2 border-b border-map-border/50 hover:bg-map-border/30">
                    <div className="text-map-text text-xs font-medium">{alert.vehicle_number} — {alert.alert_type_display}</div>
                    <div className="text-map-muted text-xs">{alert.severity} · {alert.description.slice(0, 60)}...</div>
                  </div>
                ))}
                {useMapStore.getState().vehicleAlerts.length === 0 && (
                  <p className="text-map-muted text-xs p-3">No recent alerts.</p>
                )}
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
