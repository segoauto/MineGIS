import { useEffect, useRef, useCallback } from 'react'
import { useMapStore, useAuthStore } from '../store'
import type { WSMessage, WSVehicleUpdate, WSVehicleAlert } from '../types'
import toast from 'react-hot-toast'

const WS_URL = import.meta.env?.VITE_WS_URL ?? 'ws://localhost:8000/ws'
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const { addVehicleAlert } = useMapStore()
  const { user } = useAuthStore()

  const handleMessage = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage

        if (msg.type === 'VEHICLE_UPDATE') {
          const update = msg as WSVehicleUpdate
          // Dispatch to map store via a custom event (decoupled from OpenLayers)
          window.dispatchEvent(
            new CustomEvent('minegis:vehicle-update', { detail: update.vehicles })
          )
        } else if (msg.type === 'VEHICLE_ALERT') {
          const alertMsg = msg as WSVehicleAlert
          addVehicleAlert(alertMsg.alert)

          const severityEmoji = {
            HIGH:   '🔴',
            MEDIUM: '🟡',
            LOW:    '🟢',
          }[alertMsg.alert.severity]

          toast(
            `${severityEmoji} ${alertMsg.alert.vehicle_number}\n${alertMsg.alert.alert_type_display}`,
            {
              duration: alertMsg.alert.severity === 'HIGH' ? 8000 : 4000,
              style: {
                background: '#1E293B',
                color: '#F1F5F9',
                border: `1px solid ${alertMsg.alert.severity === 'HIGH' ? '#EF4444' : '#F59E0B'}`,
              },
            }
          )
        }
      } catch {
        // Non-JSON message — ignore
      }
    },
    [addVehicleAlert]
  )

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token || !user) return

    const url = `${WS_URL}/vehicles/?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      reconnectAttempts.current = 0
      window.dispatchEvent(new CustomEvent('minegis:ws-connected'))
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      window.dispatchEvent(new CustomEvent('minegis:ws-disconnected'))
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [handleMessage, user])

  useEffect(() => {
    if (user) connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close(1000, 'Component unmounted')
    }
  }, [connect, user])

  const sendMessage = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { sendMessage }
}
