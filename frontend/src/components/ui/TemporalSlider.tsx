import { useState, useEffect } from 'react'
import { Calendar, FastForward, Play, Pause, Split } from 'lucide-react'
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
  const setCompareImageryOpen = useMapStore(s => s.setCompareImageryOpen)
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
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-[420px] bg-white border border-slate-300 rounded-lg px-4 py-3 shadow-lg transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gov-600" />
          <span className="text-slate-800 text-xs font-bold">Temporal Satellite Time-Lapse</span>
        </div>
        
        <div className="flex items-center gap-2">
          {loading && (
            <span className="flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-gov-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gov-600"></span>
            </span>
          )}
          <span className="text-gov-800 text-xs font-mono font-bold bg-gov-50 px-2 py-0.5 rounded border border-gov-300 shadow-2xs">
            {temporalDate}
          </span>
          <button
            onClick={() => setCompareImageryOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold transition-colors cursor-pointer"
            title="Open Split-Screen Dual-Epoch Comparison"
          >
            <Split size={12} className="text-blue-600" />
            <span>Compare</span>
          </button>
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
            "p-1.5 rounded-md border transition-colors",
            isPlaying ? "bg-red-50 text-red-700 border-red-300" : "bg-gov-50 text-gov-700 border-gov-300 hover:bg-gov-100"
          )}
          title={isPlaying ? "Pause" : "Play time-lapse"}
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
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-600"
          />
          
          {/* Tick marks */}
          <div className="absolute top-full mt-1 w-full flex justify-between text-[9px] text-slate-500 font-semibold pointer-events-none px-1">
             {TEMPORAL_DATES.map((date, i) => (
               <span key={date} className={clsx(safeIndex === i && "text-gov-700 font-bold")}>
                 {date.split('-')[0]}
               </span>
             ))}
          </div>
        </div>
      </div>
    </div>
  )
}
