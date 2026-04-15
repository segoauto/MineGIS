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

export default function AnomalyHubPage() {
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

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="text-amber-400" size={28} />
              AI/ML Anomaly Investigation Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Triaging production records flagged by the Isolation Forest engine for non-compliance.
            </p>
          </div>
          <Link to="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-700">
            Back to MIS
          </Link>
        </div>

        {/* --- Statistics Strip --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl"><AlertTriangle size={24} /></div>
            <div>
              <div className="text-2xl font-bold text-white">{records.length}</div>
              <div className="text-xs text-slate-400">Pening Investigations</div>
            </div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-center gap-4 text-emerald-400">
             <div className="p-3 bg-emerald-500/20 rounded-xl"><CheckCircle size={24} /></div>
             <div>
                <div className="text-2xl font-bold text-white">0.82</div>
                <div className="text-xs text-slate-400">Avg. Anomaly Intensity</div>
             </div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex items-center gap-4 text-gov-400">
             <div className="p-3 bg-gov-500/20 rounded-xl"><History size={24} /></div>
             <div>
                <div className="text-2xl font-bold text-white">3.4h</div>
                <div className="text-xs text-slate-400">Median Resolution Time</div>
             </div>
          </div>
        </div>

        {/* --- Main List --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Flagged Production Records</h2>
            <div className="flex gap-2">
               <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Filter size={16} /></button>
               <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Search size={16} /></button>
            </div>
          </div>

          {loading ? (
             <div className="p-20 text-center text-slate-500">Scanning satellite and production data vectors...</div>
          ) : records.length === 0 ? (
             <div className="bg-slate-800/20 border border-dashed border-slate-700 p-12 rounded-3xl text-center">
                <CheckCircle className="text-emerald-500 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-medium text-white text-emerald-400">No Active Anomalies</h3>
                <p className="text-slate-400 text-sm mt-1">Isolation Forest engine reports normal operational patterns across all sectors.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {records.map(rec => (
                   <div 
                    key={rec.id} 
                    className="group bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer border-l-4 border-l-amber-500"
                    onClick={() => setSelectedRecord(rec)}
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <div className="text-xs text-amber-500 font-bold uppercase mb-1">{rec.lease_id}</div>
                           <h4 className="text-white font-bold">{rec.lease_name}</h4>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="text-xl font-black text-white">{Math.round(rec.anomaly_score * 100)}%</div>
                           <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Anomaly Score</div>
                        </div>
                     </div>
                     
                     <div className="flex flex-wrap gap-2 mb-4">
                        {rec.anomaly_flags.map(f => (
                           <span key={f} className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-[10px] uppercase font-bold">
                              {f.replace(/_/g, ' ')}
                           </span>
                        ))}
                     </div>

                     <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                        <div className="text-xs text-slate-500">
                           {rec.period_year}-{rec.period_month ?? 'Q' + rec.period_quarter} Production
                        </div>
                        <div className="flex items-center gap-1 text-gov-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                           Investigate <ArrowRight size={14} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-[#1E293B] border border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                 <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <FileText className="text-gov-400" />
                    Investigation Case #{selectedRecord.id}
                 </h2>
                 <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <div className="text-xs text-slate-500 uppercase font-bold mb-2">Facility Information</div>
                       <div className="text-white font-bold">{selectedRecord.lease_name}</div>
                       <div className="text-sm text-slate-400">{selectedRecord.lease_id}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Production Volume</div>
                        <div className="text-white font-bold">{selectedRecord.quantity_produced_mt.toLocaleString()} MT</div>
                        <div className="text-sm text-slate-400 italic">Dispatched: {selectedRecord.quantity_dispatched_mt.toLocaleString()} MT</div>
                    </div>
                 </div>

                 <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 text-red-400 font-bold mb-4">
                       <ShieldAlert size={18} /> ML Vector Deviations Detected
                    </div>
                    <ul className="space-y-3">
                       {selectedRecord.anomaly_flags.map(f => (
                          <li key={f} className="text-sm text-slate-300 flex items-start gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                             {f.replace(/_/g, ' ')} investigation required.
                          </li>
                       ))}
                    </ul>
                 </div>

                 <div className="space-y-4">
                    <div className="text-xs text-slate-500 uppercase font-bold">Investigation Findings & Resolution</div>
                    <textarea 
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter site inspection findings or reason for dismissal..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-gov-400 outline-none h-32 transition-colors"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={() => setResolutionStatus('VERIFIED')}
                         className={clsx(
                           "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border outline-none",
                           resolutionStatus === 'VERIFIED' ? "bg-emerald-600 text-white border-emerald-500 shadow-lg" : "bg-slate-800 text-slate-400 border-slate-700"
                         )}
                       >
                          Verify & Dismiss Anomaly
                       </button>
                       <button 
                         onClick={() => setResolutionStatus('FLAGGED')}
                         className={clsx(
                           "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all border outline-none",
                           resolutionStatus === 'FLAGGED' ? "bg-amber-600 text-white border-amber-500 shadow-lg" : "bg-slate-800 text-slate-400 border-slate-700"
                         )}
                       >
                          Escalate Investigation
                       </button>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                 <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-6 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                 <button 
                  onClick={handleResolve}
                  disabled={submitting || !resolutionNotes}
                  className="px-8 py-2.5 bg-gov-600 hover:bg-gov-500 disabled:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-xl transition-all flex items-center gap-2"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MessageSquare size={16} />}
                  Submit Resolution
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
