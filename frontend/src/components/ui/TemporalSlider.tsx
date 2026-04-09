import { useState, useEffect } from 'react'
import { Calendar, FastForward, Play, Pause } from 'lucide-react'
import { useMapStore } from '../../store'
import clsx from 'clsx'

const TEMPORAL_DATES = [
  '2018-01-01',
  '2019-06-15',
  '2020-03-10',
  '2021-11-20',
  '2022-08-05',
  '2023-04-12',
  '2024-04-01', // Present
]

export default function TemporalSlider() {
  const baseLayer = useMapStore(s => s.baseLayer)
  const temporalDate = useMapStore(s => s.temporalDate)
  const setTemporalDate = useMapStore(s => s.setTemporalDate)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  const currentIndex = TEMPORAL_DATES.indexOf(temporalDate)
  const safeIndex = currentIndex === -1 ? TEMPORAL_DATES.length - 1 : currentIndex

  // Auto-play effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (isPlaying) {
      interval = setInterval(() => {
        const idx = TEMPORAL_DATES.indexOf(temporalDate)
        if (idx >= TEMPORAL_DATES.length - 1) {
          setIsPlaying(false)
        } else {
          handleDateChange(TEMPORAL_DATES[idx + 1])
        }
      }, 2500) // 2.5s per frame
    }
    return () => clearInterval(interval)
  }, [isPlaying, temporalDate])

  // Mock loading animation when date changes
  const handleDateChange = (date: string) => {
    setLoading(true)
    setTemporalDate(date)
    setTimeout(() => setLoading(false), 800)
  }

  // Only show when Satellite is active
  if (baseLayer !== 'satellite') return null

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-[400px] bg-map-panel/95 backdrop-blur-md border border-map-border rounded-xl px-4 py-3 shadow-2xl transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gov-400" />
          <span className="text-map-text text-xs font-semibold">Temporal Satellite Imagery</span>
        </div>
        
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-gov-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gov-500"></span>
            </span>
          )}
          <span className="text-gov-300 text-xs font-mono font-bold bg-gov-900/40 px-2 py-0.5 rounded border border-gov-700/50">
            {temporalDate}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (safeIndex >= TEMPORAL_DATES.length - 1) {
              setTemporalDate(TEMPORAL_DATES[0])
            }
            setIsPlaying(!isPlaying)
          }}
          className={clsx(
            "p-1.5 rounded-full transition-colors",
            isPlaying ? "bg-red-500/20 text-red-400" : "bg-gov-600/20 text-gov-400 hover:bg-gov-600/40"
          )}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <div className="flex-1 relative flex items-center h-6">
          <input
            type="range"
            min="0"
            max={TEMPORAL_DATES.length - 1}
            value={safeIndex}
            onChange={(e) => {
               setIsPlaying(false)
               handleDateChange(TEMPORAL_DATES[parseInt(e.target.value)])
            }}
            className="w-full h-1 bg-map-border rounded-lg appearance-none cursor-pointer accent-gov-400"
          />
          
          {/* Tick marks */}
          <div className="absolute top-full mt-1 w-full flex justify-between text-[9px] text-map-muted pointer-events-none px-1">
             {TEMPORAL_DATES.map((date, i) => (
               <span key={date} className={clsx(safeIndex === i && "text-gov-400 font-bold")}>
                 {date.split('-')[0]}
               </span>
             ))}
          </div>
        </div>
      </div>
    </div>
  )
}
