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
      <div className="flex items-center gap-2 bg-map-panel border border-map-border rounded-lg px-3 py-2 focus-within:border-gov-400 transition-colors">
        {isLoading
          ? <Loader2 size={15} className="text-map-muted animate-spin flex-shrink-0" />
          : <Search size={15} className="text-map-muted flex-shrink-0" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search leases, districts, companies..."
          className="flex-1 bg-transparent text-map-text text-sm placeholder:text-map-muted outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="text-map-muted hover:text-map-text">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-map-panel border border-map-border rounded-lg shadow-2xl z-50 overflow-hidden animate-fade-in">
          {results.map((lease) => (
            <button
              key={lease.id}
              onClick={() => handleSelect(lease)}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-map-border/50 transition-colors text-left"
            >
              <MapPin size={13} className="text-gov-300 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-map-text text-xs font-semibold truncate">{lease.mine_name}</div>
                <div className="text-map-muted text-xs">
                  <span className="font-mono">{lease.lease_id}</span>
                  {' · '}{lease.district}
                  {' · '}
                  <span className={clsx(
                    'font-medium',
                    lease.status === 'ACTIVE' ? 'text-blue-400' :
                    lease.status === 'EXPIRED' ? 'text-gray-400' :
                    lease.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'
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
