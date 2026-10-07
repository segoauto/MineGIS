import { useState, useRef, useEffect } from 'react'
import { X, Sliders, Split, ArrowLeftRight } from 'lucide-react'
import { useMapStore } from '../../store'

interface MapSwipeWidgetProps {
  onClose: () => void
}

export default function MapSwipeWidget({ onClose }: MapSwipeWidgetProps) {
  const { swipePosition, setSwipePosition } = useMapStore()
  const isDraggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const rect = document.getElementById('ol-map')?.getBoundingClientRect()
    if (!rect) return
    const clientX = e.clientX
    const relativeX = clientX - rect.left
    const pct = Math.max(5, Math.min(95, (relativeX / rect.width) * 100))
    setSwipePosition(Math.round(pct))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* Floating Header HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 flex items-center gap-3 bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-2xl border border-sky-400/80 backdrop-blur-md animate-fade-in text-xs font-semibold">
        <Split size={14} className="text-sky-400" />
        <span className="flex items-center gap-1.5">
          <span>Interactive Map Comparison:</span>
          <span className="font-mono text-sky-300 font-bold">{swipePosition}% Split</span>
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors ml-2"
          title="Exit Swipe Mode"
        >
          <X size={14} />
        </button>
      </div>

      {/* Comparison Labels */}
      <div className="absolute top-16 left-6 z-20 bg-slate-900/80 text-white px-3 py-1 rounded-md text-[11px] font-bold border border-slate-700 shadow-md pointer-events-none">
        ◄ Standard Street Map (OpenStreetMap)
      </div>
      <div className="absolute top-16 right-6 z-20 bg-slate-900/80 text-white px-3 py-1 rounded-md text-[11px] font-bold border border-slate-700 shadow-md pointer-events-none">
        Esri Satellite / NDVI Spectral ►
      </div>

      {/* Vertical Swipe Divider Line */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none flex items-center justify-center"
        style={{ left: `${swipePosition}%` }}
      >
        <div className="w-0.5 h-full bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border-x border-sky-500" />
        
        {/* Draggable Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute w-10 h-10 -ml-5 rounded-full bg-slate-900 border-2 border-sky-400 text-sky-400 flex items-center justify-center shadow-2xl pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform"
          title="Drag left or right to swipe compare"
        >
          <ArrowLeftRight size={18} />
        </div>
      </div>
    </>
  )
}
