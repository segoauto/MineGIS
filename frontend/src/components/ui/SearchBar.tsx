import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, MapPin, Loader2 } from 'lucide-react'
import { useMapStore } from '../../store'
import { leasesApi } from '../../api/leases'
import clsx from 'clsx'
import type { MiningLease } from '../../types'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MiningLease[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  const { selectLease } = useMapStore()

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setIsLoading(true)
    try {
      const { results: r } = await leasesApi.search(q, 8)
      setResults(r)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceTimer.current)
  }, [query, search])

  const handleSelect = (lease: MiningLease) => {
    setQuery(lease.mine_name)
    setIsOpen(false)
    selectLease(lease.lease_id, lease)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus-within:bg-white focus-within:border-gov-600 focus-within:ring-1 focus-within:ring-gov-600 transition-all shadow-2xs">
        {isLoading
          ? <Loader2 size={14} className="text-slate-400 animate-spin flex-shrink-0" />
          : <Search size={14} className="text-slate-500 flex-shrink-0" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search Lease ID, Mine Name, District..."
          className="flex-1 bg-transparent text-slate-800 text-xs placeholder:text-slate-400 outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg z-50 overflow-hidden animate-fade-in divide-y divide-slate-100">
          <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Matching Mining Leases ({results.length})
          </div>
          {results.map((lease) => (
            <button
              key={lease.id}
              onClick={() => handleSelect(lease)}
              className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
            >
              <MapPin size={14} className="text-gov-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-slate-900 text-xs font-bold truncate">{lease.mine_name}</div>
                <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="font-mono text-gov-700 font-semibold">{lease.lease_id}</span>
                  <span>·</span>
                  <span>{lease.district}</span>
                  <span>·</span>
                  <span className={clsx(
                    'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border',
                    lease.status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                    lease.status === 'EXPIRED' ? 'text-slate-700 bg-slate-100 border-slate-300' :
                    lease.status === 'PENDING' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200'
                  )}>
                    {lease.status}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
