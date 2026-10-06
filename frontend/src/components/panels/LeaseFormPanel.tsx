import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Save, Trash2, MapPin, AlertCircle, CheckCircle,
  Loader2, PenLine, Calendar, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useMapStore, useAuthStore } from '../../store'
import { leasesApi, type LeasePayload } from '../../api/leases'
import clsx from 'clsx'
import { format } from 'date-fns'
// @ts-ignore
import * as turf from '@turf/turf'

const MINERAL_TYPES = [
  { value: 'COAL',      label: 'Coal' },
  { value: 'IRON_ORE',  label: 'Iron Ore' },
  { value: 'GRANITE',   label: 'Granite' },
  { value: 'LIMESTONE', label: 'Limestone' },
  { value: 'FLUORITE',  label: 'Fluorite' },
  { value: 'DOLOMITE',  label: 'Dolomite' },
  { value: 'SAND',      label: 'Sand & Gravel' },
  { value: 'OTHER',     label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE',     label: 'Active',      color: 'text-blue-400' },
  { value: 'PENDING',    label: 'Pending',     color: 'text-yellow-400' },
  { value: 'SUSPENDED',  label: 'Suspended',   color: 'text-red-400' },
  { value: 'SURRENDERED',label: 'Surrendered', color: 'text-purple-400' },
]

const TS_DISTRICTS = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad',
  'Jagtial', 'Jangaon', 'Jayashankar', 'Jogulamba', 'Kamareddy',
  'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad',
  'Mahbubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri',
  'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal',
  'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy',
  'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy',
  'Warangal', 'Yadadri Bhuvanagiri',
]

const today = format(new Date(), 'yyyy-MM-dd')

const EMPTY_FORM: Partial<LeasePayload> = {
  mine_name: '',
  mineral_type: 'COAL',
  leaseholder_name: '',
  leaseholder_contact: '',
  leaseholder_email: '',
  district: '',
  mandal: '',
  village: '',
  survey_number: '',
  area_hectares: 0,
  grant_date: today,
  commencement_date: today,
  valid_from: today,
  valid_till: format(new Date(Date.now() + 10 * 365.25 * 24 * 3600 * 1000), 'yyyy-MM-dd'),
  status: 'PENDING',
  royalty_due: 0,
}

export default function LeaseFormPanel() {
  const {
    leaseFormOpen, leaseFormEditId, drawnBoundaryGeoJSON, drawnPointCoords,
    closeLeaseForm, setDrawBoundaryMode, drawBoundaryMode, setDrawnBoundaryGeoJSON,
    triggerMapRefresh,
  } = useMapStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<Partial<LeasePayload>>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  
  const [lat, setLat] = useState<string>('')
  const [lon, setLon] = useState<string>('')
  const [redZoneBuffer, setRedZoneBuffer] = useState<string>('')

  // Load existing lease data when editing
  const { data: existingLease, isLoading: loadingEdit } = useQuery({
    queryKey: ['lease', leaseFormEditId],
    queryFn: () => leasesApi.get(leaseFormEditId!),
    enabled: !!leaseFormEditId,
  })

  // Populate form when editing
  useEffect(() => {
    if (existingLease) {
      setForm({
        mine_name: existingLease.mine_name,
        mineral_type: existingLease.mineral_type,
        leaseholder_name: existingLease.leaseholder_name,
        leaseholder_contact: existingLease.leaseholder_contact ?? '',
        leaseholder_email: existingLease.leaseholder_email ?? '',
        district: existingLease.district,
        mandal: existingLease.mandal ?? '',
        village: existingLease.village ?? '',
        survey_number: existingLease.survey_number ?? '',
        area_hectares: existingLease.area_hectares,
        grant_date: existingLease.grant_date,
        commencement_date: existingLease.commencement_date,
        valid_from: existingLease.valid_from,
        valid_till: existingLease.valid_till,
        status: existingLease.status,
        royalty_due: existingLease.royalty_due,
      })
    } else if (!leaseFormEditId) {
      setForm({
        ...EMPTY_FORM,
        district: user?.profile?.district || '',
      })
    }
  }, [existingLease, leaseFormEditId, user])

  // Pre-fill coordinates if point was dropped on map
  useEffect(() => {
    if (drawnPointCoords) {
      setLon(drawnPointCoords[0].toFixed(6))
      setLat(drawnPointCoords[1].toFixed(6))
    }
  }, [drawnPointCoords])

  // Auto-generate boundary based on Lat, Lon, Area, and optional Red Zone
  useEffect(() => {
    const latNum = parseFloat(lat)
    const lonNum = parseFloat(lon)
    const area = form.area_hectares
    
    if (!isNaN(latNum) && !isNaN(lonNum) && area && area > 0) {
      const center = turf.point([lonNum, latNum])
      const areaSqMeters = area * 10000
      const sideLengthMeters = Math.sqrt(areaSqMeters)
      const radiusKm = (sideLengthMeters / 2) / 1000
      
      try {
        // Generate a square (envelope of a circle)
        const circle = turf.circle(center, radiusKm, { steps: 4 })
        const square = turf.envelope(circle)
        
        let featureCollection: any = turf.featureCollection([square])
        
        // Add Red Zone Buffer if specified
        const bufferMeters = parseFloat(redZoneBuffer)
        if (!isNaN(bufferMeters) && bufferMeters > 0) {
          const buffered = turf.buffer(square, bufferMeters / 1000, { units: 'kilometers' })
          if (buffered) {
            // Include it in the geojson output so it saves or at least draws it!
            // The backend boundary is MultiPolygon. Overlapping polygons are valid.
            featureCollection = turf.featureCollection([square, buffered])
          }
        }
        
        setDrawnBoundaryGeoJSON(featureCollection)
      } catch (e) {
        console.error("Failed to generate math geometry", e)
      }
    }
  }, [lat, lon, form.area_hectares, redZoneBuffer, setDrawnBoundaryGeoJSON])

  const createMutation = useMutation({
    mutationFn: (payload: LeasePayload) => leasesApi.create(payload),
    onSuccess: (lease) => {
      toast.success(`Lease "${lease.mine_name}" created!`)
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      triggerMapRefresh()
      closeLeaseForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to create lease')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<LeasePayload>) => leasesApi.update(leaseFormEditId!, payload),
    onSuccess: (lease) => {
      toast.success(`Lease "${lease.mine_name}" updated!`)
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['lease', leaseFormEditId] })
      triggerMapRefresh()
      closeLeaseForm()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update lease')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => leasesApi.delete(leaseFormEditId!),
    onSuccess: () => {
      toast.success('Lease deleted')
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      triggerMapRefresh()
      closeLeaseForm()
    },
    onError: () => {
      toast.error('Failed to delete lease')
    },
  })

  if (!leaseFormOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      boundary_geojson: drawnBoundaryGeoJSON ?? (existingLease?.boundary_geojson ?? null),
    } as LeasePayload

    if (leaseFormEditId) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const f = (field: keyof LeasePayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 w-[420px] bg-white border-l border-slate-300 shadow-2xl flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gov-600 text-white flex-shrink-0 border-b border-gov-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-white/10 border border-white/20 flex items-center justify-center">
            <PenLine size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">
              {leaseFormEditId ? 'Edit Mining Lease Dossier' : 'New Mining Lease Registration'}
            </p>
            <p className="text-[11px] text-blue-100 flex items-center gap-1.5">
              <span>{leaseFormEditId ? `Dossier ID: ${existingLease?.lease_id}` : 'DMG Form-A: Cadastral Entry'}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={closeLeaseForm} 
          className="text-blue-100 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
          title="Close Form"
        >
          <X size={18} />
        </button>
      </div>

      {loadingEdit ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-slate-50">
          <Loader2 size={24} className="animate-spin text-gov-600" />
          <span className="text-xs text-slate-500 font-medium">Fetching lease dossier records...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

          {/* Boundary section */}
          <Section label="Cadastral Boundary & Centroid" icon={MapPin}>
            <div className={clsx(
              'rounded-md p-3 border text-xs flex flex-col gap-2.5',
              drawnBoundaryGeoJSON || existingLease?.boundary_geojson
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  {drawnBoundaryGeoJSON || existingLease?.boundary_geojson
                    ? <CheckCircle size={14} className="text-emerald-700" />
                    : <AlertCircle size={14} className="text-amber-700" />
                  }
                  <span>
                    {drawnBoundaryGeoJSON ? 'Statutory Polygon Demarcated' :
                     existingLease?.boundary_geojson ? 'Existing Boundary Loaded' :
                     'Boundary Geometry Pending'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-white/80 px-1.5 py-0.5 rounded border border-current">
                  WGS84
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-current/20">
                <button
                  type="button"
                  onClick={() => setDrawBoundaryMode(drawBoundaryMode === 'point' ? false : 'point')}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold transition-colors border shadow-xs',
                    drawBoundaryMode === 'point'
                      ? 'bg-gov-600 text-white border-gov-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <MapPin size={13} className={drawBoundaryMode === 'point' ? 'text-white' : 'text-gov-600'} />
                  {drawBoundaryMode === 'point' ? 'Click on Map...' : 'Drop Centroid Pin'}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawBoundaryMode(drawBoundaryMode === 'polygon' ? false : 'polygon')}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold transition-colors border shadow-xs',
                    drawBoundaryMode === 'polygon'
                      ? 'bg-gov-600 text-white border-gov-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <PenLine size={13} className={drawBoundaryMode === 'polygon' ? 'text-white' : 'text-gov-600'} />
                  {drawBoundaryMode === 'polygon' ? 'Demarcating...' : 'Draw Polygon'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Centroid Latitude (DD)">
                <input
                  type="number" step="0.000001"
                  value={lat} onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 17.385000" className={inputCls}
                />
              </FormField>
              <FormField label="Centroid Longitude (DD)">
                <input
                  type="number" step="0.000001"
                  value={lon} onChange={(e) => setLon(e.target.value)}
                  placeholder="e.g. 78.486700" className={inputCls}
                />
              </FormField>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-1">
              <FormField label="Demarcated Area (Ha) *">
                <input
                  required type="number" step="0.01" min="0"
                  value={form.area_hectares ?? ''} onChange={f('area_hectares')}
                  placeholder="0.00" className={inputCls}
                />
              </FormField>
              <FormField label="Statutory Safety Buffer (m)">
                <input
                  type="number" step="1" min="0"
                  value={redZoneBuffer} onChange={(e) => setRedZoneBuffer(e.target.value)}
                  placeholder="e.g. 500" className={inputCls}
                />
              </FormField>
            </div>
          </Section>

          {/* Mine Details */}
          <Section label="Mine Information">
            <FormField label="Mine Name *">
              <input
                required
                value={form.mine_name ?? ''}
                onChange={f('mine_name')}
                placeholder="e.g. Sri Balaji Coal Mine"
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mineral Type *">
                <select required value={form.mineral_type ?? 'COAL'} onChange={f('mineral_type')} className={inputCls}>
                  {MINERAL_TYPES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Status *">
                <select required value={form.status ?? 'PENDING'} onChange={f('status')} className={inputCls}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </Section>

          {/* Location */}
          <Section label="Location">
            <FormField label="District *">
              <select
                required
                value={form.district ?? ''}
                onChange={f('district')}
                className={inputCls}
              >
                <option value="">Select District</option>
                {TS_DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mandal">
                <input value={form.mandal ?? ''} onChange={f('mandal')} placeholder="Mandal" className={inputCls} />
              </FormField>
              <FormField label="Village">
                <input value={form.village ?? ''} onChange={f('village')} placeholder="Village" className={inputCls} />
              </FormField>
            </div>
            <FormField label="Survey Number">
              <input value={form.survey_number ?? ''} onChange={f('survey_number')} placeholder="R.S. No. 234/1A" className={inputCls} />
            </FormField>
          </Section>

          {/* Leaseholder */}
          <Section label="Leaseholder Details">
            <FormField label="Entity / Person Name *">
              <input
                required
                value={form.leaseholder_name ?? ''}
                onChange={f('leaseholder_name')}
                placeholder="Company or individual name"
                className={inputCls}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact">
                <input value={form.leaseholder_contact ?? ''} onChange={f('leaseholder_contact')} placeholder="+91 98..." className={inputCls} />
              </FormField>
              <FormField label="Email">
                <input type="email" value={form.leaseholder_email ?? ''} onChange={f('leaseholder_email')} placeholder="contact@..." className={inputCls} />
              </FormField>
            </div>
          </Section>

          {/* Dates */}
          <Section label="Lease Dates" icon={Calendar}>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Grant Date *">
                <input type="date" required value={form.grant_date ?? today} onChange={f('grant_date')} className={inputCls} />
              </FormField>
              <FormField label="Commencement *">
                <input type="date" required value={form.commencement_date ?? today} onChange={f('commencement_date')} className={inputCls} />
              </FormField>
              <FormField label="Valid From *">
                <input type="date" required value={form.valid_from ?? today} onChange={f('valid_from')} className={inputCls} />
              </FormField>
              <FormField label="Valid Till *">
                <input type="date" required value={form.valid_till ?? ''} onChange={f('valid_till')} className={inputCls} />
              </FormField>
            </div>
          </Section>

          {/* Financial */}
          <Section label="Financial">
            <FormField label="Royalty Due (₹)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.royalty_due ?? 0}
                onChange={f('royalty_due')}
                placeholder="0.00"
                className={inputCls}
              />
            </FormField>
          </Section>

          {/* Actions */}
          <div className="sticky bottom-0 bg-white py-3 border-t border-slate-300 -mx-4 px-4 flex items-center gap-2 shadow-lg">
            {leaseFormEditId && (
              <>
                {deleteConfirm ? (
                  <>
                    <span className="text-red-700 text-xs font-semibold mr-auto">Confirm revoke?</span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded shadow-xs transition-colors"
                    >
                      {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Revoke
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setDeleteConfirm(false)} 
                      className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 text-xs font-medium border border-slate-300 rounded bg-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-700 hover:bg-red-50 text-xs font-semibold rounded border border-red-300 transition-colors"
                  >
                    <Trash2 size={13} />
                    Revoke Lease
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={closeLeaseForm}
              className="ml-auto px-3 py-1.5 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded border border-slate-300 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gov-600 hover:bg-gov-700 text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {leaseFormEditId ? 'Update Record' : 'Save Lease'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, icon: Icon = Building2, children }: {
  label: string; icon?: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded border border-slate-300 p-3 shadow-xs space-y-2.5">
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
        <Icon size={13} className="text-gov-600" />
        <span className="text-slate-800 text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-slate-700 text-xs font-semibold">{label}</label>
      {children}
    </div>
  )
}

const inputCls = [
  'w-full bg-white border border-slate-300 rounded px-2.5 py-1.5',
  'text-slate-900 text-xs font-medium placeholder-slate-400',
  'focus:outline-none focus:border-gov-600 focus:ring-1 focus:ring-gov-600',
  'transition-colors shadow-xs',
].join(' ')
