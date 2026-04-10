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
    leaseFormOpen, leaseFormEditId, drawnBoundaryGeoJSON,
    closeLeaseForm, setDrawBoundaryMode, drawBoundaryMode,
    triggerMapRefresh,
  } = useMapStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<Partial<LeasePayload>>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

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

  // Pre-fill area if boundary was drawn (approximate)
  useEffect(() => {
    if (drawnBoundaryGeoJSON) {
      // Rough area calc from bounding box – exact calc happens server-side
      setForm(f => ({ ...f, boundary_geojson: drawnBoundaryGeoJSON }))
    }
  }, [drawnBoundaryGeoJSON])

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
    <div className="absolute right-0 top-0 bottom-0 z-30 w-[400px] bg-map-panel/98 backdrop-blur-md border-l border-map-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-map-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gov-600/20 border border-gov-600/30 flex items-center justify-center">
            <PenLine size={13} className="text-gov-400" />
          </div>
          <div>
            <p className="text-map-text text-sm font-semibold">
              {leaseFormEditId ? 'Edit Mining Lease' : 'New Mining Lease'}
            </p>
            <p className="text-map-muted text-xs">
              {leaseFormEditId ? existingLease?.lease_id : 'Fill details and save'}
            </p>
          </div>
        </div>
        <button onClick={closeLeaseForm} className="text-map-muted hover:text-map-text p-1.5 rounded hover:bg-map-border transition-colors">
          <X size={15} />
        </button>
      </div>

      {loadingEdit ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gov-400" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

          {/* Boundary section */}
          <div className={clsx(
            'rounded-lg p-3 border text-xs',
            drawnBoundaryGeoJSON || existingLease?.boundary_geojson
              ? 'bg-green-900/10 border-green-700/30'
              : 'bg-yellow-900/10 border-yellow-700/30'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {drawnBoundaryGeoJSON || existingLease?.boundary_geojson
                  ? <CheckCircle size={12} className="text-green-400" />
                  : <AlertCircle size={12} className="text-yellow-400" />
                }
                <span className={drawnBoundaryGeoJSON || existingLease?.boundary_geojson ? 'text-green-300' : 'text-yellow-300'}>
                  {drawnBoundaryGeoJSON ? 'Boundary drawn on map' :
                   existingLease?.boundary_geojson ? 'Using existing boundary' :
                   'No boundary set'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawBoundaryMode(!drawBoundaryMode)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                  drawBoundaryMode
                    ? 'bg-gov-600 text-white'
                    : 'bg-map-border text-map-text hover:bg-gov-600/30'
                )}
              >
                <MapPin size={10} />
                {drawBoundaryMode ? 'Drawing… (dbl-click to finish)' : 'Draw on Map'}
              </button>
            </div>
          </div>

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

            <FormField label="Area (Hectares) *">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.area_hectares ?? ''}
                onChange={f('area_hectares')}
                placeholder="0.00"
                className={inputCls}
              />
            </FormField>
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
          <div className="sticky bottom-0 bg-map-panel/98 backdrop-blur-sm py-3 border-t border-map-border -mx-4 px-4 flex items-center gap-2">
            {leaseFormEditId && (
              <>
                {deleteConfirm ? (
                  <>
                    <span className="text-red-400 text-xs mr-auto">Delete permanently?</span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Confirm Delete
                    </button>
                    <button type="button" onClick={() => setDeleteConfirm(false)} className="px-3 py-2 text-map-muted hover:text-map-text text-xs rounded-lg hover:bg-map-border transition-colors">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:bg-red-900/20 text-xs font-medium rounded-lg transition-colors border border-red-600/30"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={closeLeaseForm}
              className="ml-auto px-3 py-2 text-map-muted hover:text-map-text text-xs rounded-lg hover:bg-map-border transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gov-600 hover:bg-gov-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {leaseFormEditId ? 'Save Changes' : 'Create Lease'}
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
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Icon size={11} className="text-gov-400" />
        <span className="text-map-muted text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-map-muted text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}

const inputCls = [
  'w-full bg-map-bg border border-map-border rounded-lg px-3 py-2',
  'text-map-text text-xs placeholder-map-border',
  'focus:outline-none focus:border-gov-500 focus:ring-1 focus:ring-gov-500/30',
  'transition-colors',
].join(' ')
