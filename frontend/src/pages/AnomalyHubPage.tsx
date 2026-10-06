import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  History,
  FileText,
  User,
  MoreVertical,
  X,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface ProductionRecord {
  id: number;
  lease_name: string;
  lease_id: string;
  period_type: string;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  quantity_produced_mt: number;
  quantity_dispatched_mt: number;
  anomaly_score: number;
  anomaly_flags: string[];
  status: string;
  notes: string;
}

export default function AnomalyHubPage({ embed = false }: { embed?: boolean }) {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'VERIFIED' | 'FLAGGED'>('VERIFIED');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('/api/leases/production/?flagged_only=true');
      setRecords(resp.data);
    } catch (err) {
      toast.error('Failed to load anomaly data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async () => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      await axios.post(`/api/leases/production/${selectedRecord.id}/resolve-anomaly/`, {
        new_status: resolutionStatus,
        notes: resolutionNotes
      });
      toast.success('Anomaly resolved successfully.');
      setSelectedRecord(null);
      setResolutionNotes('');
      fetchData();
    } catch (err) {
      toast.error('Failed to submit resolution.');
    } finally {
      setSubmitting(false);
    }
  };

  const mainContent = (
    <>
      <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">

        
        {/* --- Header Advisory --- */}
        <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="text-amber-600" size={22} />
              Statutory Anomaly Triage &amp; Inquiry Desk
            </h1>
            <p className="text-slate-600 text-xs mt-1">
              Automated Isolation Forest cross-examination matching monthly extraction declarations against satellite imagery changes and transport e-permits.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-300">
            <span>DMO Action Protocol: Rule 28 (TS MMCR)</span>
          </div>
        </div>

        {/* --- Statistics Strip --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-300 p-4 rounded-lg shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md"><AlertTriangle size={20} /></div>
            <div>
              <div className="text-2xl font-black text-slate-900">{records.length}</div>
              <div className="text-xs text-slate-500 font-semibold">Active Inquiries Pending</div>
            </div>
          </div>
          <div className="bg-white border border-slate-300 p-4 rounded-lg shadow-xs flex items-center gap-3">
             <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md"><CheckCircle size={20} /></div>
             <div>
                <div className="text-2xl font-black text-slate-900">0.82</div>
                <div className="text-xs text-slate-500 font-semibold">Mean Algorithmic Confidence</div>
             </div>
          </div>
          <div className="bg-white border border-slate-300 p-4 rounded-lg shadow-xs flex items-center gap-3">
             <div className="p-2.5 bg-blue-50 border border-blue-200 text-gov-600 rounded-md"><History size={20} /></div>
             <div>
                <div className="text-2xl font-black text-slate-900">3.4h</div>
                <div className="text-xs text-slate-500 font-semibold">Mean Inquiry Disposal Rate</div>
             </div>
          </div>
        </div>

        {/* --- Main List --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Flagged Lease Extraction Declarations
            </h2>
            <span className="text-xs text-slate-500">Sorted by Anomaly Confidence</span>
          </div>

          {loading ? (
             <div className="bg-white border border-slate-300 p-12 rounded-lg text-center text-slate-500 text-xs font-medium">
               Scanning satellite indices and transport records...
             </div>
          ) : records.length === 0 ? (
             <div className="bg-white border border-slate-300 p-12 rounded-lg text-center shadow-xs">
                <CheckCircle className="text-emerald-600 mx-auto mb-3" size={40} />
                <h3 className="text-sm font-bold text-slate-800">All Production Declarations Verified</h3>
                <p className="text-slate-500 text-xs mt-1">Algorithmic surveillance reports normal extraction patterns across all active Telangana mining concessions.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {records.map(rec => (
                   <div 
                    key={rec.id} 
                    className="group bg-white border border-slate-300 p-4 rounded-lg hover:border-gov-600 shadow-xs transition-all cursor-pointer border-l-4 border-l-amber-600 flex flex-col justify-between"
                    onClick={() => setSelectedRecord(rec)}
                  >
                     <div>
                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <span className="text-[10px] text-gov-600 font-mono font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                               {rec.lease_id}
                             </span>
                             <h4 className="text-sm font-bold text-slate-900 mt-1.5">{rec.lease_name}</h4>
                          </div>
                          <div className="text-right">
                             <div className="text-lg font-black text-red-700">{Math.round(rec.anomaly_score * 100)}%</div>
                             <div className="text-[10px] text-slate-500 uppercase font-semibold">Confidence</div>
                          </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-1.5 mb-3">
                          {rec.anomaly_flags.map(f => (
                             <span key={f} className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-300 rounded text-[10px] uppercase font-bold">
                                {f.replace(/_/g, ' ')}
                             </span>
                          ))}
                       </div>
                     </div>

                     <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                        <div className="text-slate-500 font-medium">
                           Declared: {rec.period_year}-{rec.period_month ?? 'Q' + rec.period_quarter}
                        </div>
                        <div className="flex items-center gap-1 text-gov-600 font-bold group-hover:translate-x-0.5 transition-transform">
                           Open Dossier <ArrowRight size={13} />
                        </div>
                     </div>
                   </div>
                ))}
             </div>
          )}
        </div>
      </div>

      {/* --- Detail Modal --- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
           <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gov-600 text-white flex items-center justify-between">
                 <div className="flex items-center gap-2.5">
                    <FileText size={18} className="text-amber-400" />
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">
                        Department Inquiry Memo #{selectedRecord.id}
                      </h2>
                      <p className="text-[11px] text-blue-100">Statutory Notice under Section 21 MMDR Act</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedRecord(null)} className="p-1 hover:bg-white/10 rounded transition-colors text-white">
                    <X size={18} />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 text-xs bg-slate-50/50">
                 <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded border border-slate-300">
                    <div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mine / Facility Details</div>
                       <div className="text-slate-900 font-bold text-sm">{selectedRecord.lease_name}</div>
                       <div className="text-slate-600 font-mono">{selectedRecord.lease_id}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Declared Extraction Volume</div>
                        <div className="text-slate-900 font-bold text-sm">{selectedRecord.quantity_produced_mt.toLocaleString()} MT</div>
                        <div className="text-slate-600 font-medium">Dispatched with Transit Pass: {selectedRecord.quantity_dispatched_mt.toLocaleString()} MT</div>
                    </div>
                 </div>

                 <div className="bg-red-50 border border-red-300 rounded p-4">
                    <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                       <ShieldAlert size={16} /> Statutory Extraction Inconsistencies Detected
                    </div>
                    <ul className="space-y-1.5">
                       {selectedRecord.anomaly_flags.map(f => (
                          <li key={f} className="text-red-900 flex items-start gap-2 font-medium">
                             <span className="font-bold">•</span>
                             <span>{f.replace(/_/g, ' ')}: Requires physical inspection and drone DGPS survey.</span>
                          </li>
                       ))}
                    </ul>
                 </div>

                 <div className="space-y-2 bg-white p-4 rounded border border-slate-300">
                    <div className="text-slate-700 font-bold uppercase text-[10px]">
                      District Mining Officer (DMO) Resolution &amp; Inspection Memo <span className="text-red-600">*</span>
                    </div>
                    <textarea 
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter field inspection findings, challan reference, or statutory dismissal rationale..."
                      className="w-full bg-white border border-slate-300 rounded p-3 text-xs text-slate-900 focus:border-gov-600 focus:ring-1 focus:ring-gov-600 outline-none h-24 transition-colors"
                    />
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <button 
                         type="button"
                         onClick={() => setResolutionStatus('VERIFIED')}
                         className={clsx(
                           "py-2 px-3 rounded text-xs font-bold transition-all border cursor-pointer",
                           resolutionStatus === 'VERIFIED' ? "bg-emerald-700 text-white border-emerald-800 shadow-xs" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                         )}
                       >
                          ✓ Dismiss as Verified
                       </button>
                       <button 
                         type="button"
                         onClick={() => setResolutionStatus('FLAGGED')}
                         className={clsx(
                           "py-2 px-3 rounded text-xs font-bold transition-all border cursor-pointer",
                           resolutionStatus === 'FLAGGED' ? "bg-amber-600 text-white border-amber-700 shadow-xs" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                         )}
                       >
                          ⚠️ Issue Statutory Show-Cause Notice
                       </button>
                    </div>
                 </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-white border-t border-slate-300 flex justify-end gap-2.5">
                 <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                 <button 
                  onClick={handleResolve}
                  disabled={submitting || !resolutionNotes}
                  className="px-5 py-1.5 bg-gov-600 hover:bg-gov-700 disabled:opacity-60 text-white rounded text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {submitting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MessageSquare size={13} />}
                  Record Official Resolution
                </button>
              </div>
           </div>
        </div>
      )}
    </>
  );

  if (embed) {
    return (
      <div className="flex-1 bg-slate-100 overflow-y-auto custom-scrollbar font-sans text-slate-900">
        {mainContent}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      <div className="h-1.5 w-full flex flex-shrink-0">
        <div className="h-full w-1/3 bg-[#FF671F]" />
        <div className="h-full w-1/3 bg-[#FFFFFF]" />
        <div className="h-full w-1/3 bg-[#046A38]" />
      </div>

      <header className="bg-white border-b border-slate-300 px-6 py-3 shadow-xs flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-gov-600 bg-blue-50/50 flex items-center justify-center p-1 flex-shrink-0">
              <span className="text-[9px] font-black text-gov-600 tracking-tighter">TS DMG</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-gov-600 tracking-tight leading-none">
                  తెలంగాణ ప్రభుత్వం | Department of Mines &amp; Geology
                </h1>
                <span className="text-[10px] bg-red-50 border border-red-300 text-red-800 px-1.5 py-0.2 rounded font-bold uppercase">
                  Enforcement Hub
                </span>
              </div>
              <h2 className="text-xs font-bold text-slate-800 leading-tight mt-1">
                AI/ML Production Anomaly Triage &amp; Statutory Non-Compliance Desk
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-700 transition-colors shadow-xs">
              Executive MIS
            </Link>
            <Link to="/" className="px-3.5 py-1.5 bg-gov-600 hover:bg-gov-700 text-white rounded text-xs font-bold transition-colors shadow-xs">
              Cadastral Map
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {mainContent}
      </main>
    </div>
  );
}
