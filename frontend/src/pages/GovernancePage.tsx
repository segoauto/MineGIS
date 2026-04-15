import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Activity, 
  Clock, 
  RefreshCw,
  FileSearch,
  CheckCircle2,
  XCircle,
  Database,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface VerificationResult {
  is_valid: boolean;
  broken_log_id: string | null;
  message: string;
  verification_timestamp: string;
}

interface AuditLog {
  log_id: string;
  action_display: string;
  username: string;
  entity_type: string;
  timestamp: string;
  status: string;
  current_hash: string;
}

export default function GovernancePage() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchLogs = async () => {
    try {
      const resp = await axios.get('/api/audit/logs/?page_size=10');
      setRecentLogs(resp.data.results);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const runVerification = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const resp = await axios.get('/api/audit/logs/verify-chain/');
      setResult(resp.data);
      if (resp.data.is_valid) {
        toast.success('System Integrity Verified: No tampering detected.');
      } else {
        toast.error('INTEGRITY FAILURE: Hash chain mismatch detected!');
      }
    } catch (err) {
      toast.error('System verification failed to complete.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* --- Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="text-gov-400" size={28} />
              Platform Governance & Auditing
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Cryptographic evidence of system actions and data integrity (Module 5 compliance).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-700">
              Executive MIS
            </Link>
            <Link to="/" className="px-4 py-2 bg-gov-600 hover:bg-gov-500 text-white rounded-lg text-sm transition-colors shadow-lg">
              Spatial Portal
            </Link>
          </div>
        </div>

        {/* --- Verification Hub --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={clsx(
            "lg:col-span-2 p-6 rounded-2xl border flex flex-col justify-between transition-all duration-500",
            result === null ? "bg-slate-800/40 border-slate-700/50" :
            result.is_valid ? "bg-emerald-950/20 border-emerald-500/30" : "bg-red-950/20 border-red-500/30"
          )}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">System Integrity Heartbeat</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Verifies the cryptographic link between every action logged in the system.
                </p>
              </div>
              <div className={clsx(
                "p-3 rounded-xl",
                result === null ? "bg-slate-700/50" :
                result.is_valid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              )}>
                {result === null ? <Activity className="animate-pulse" /> :
                 result.is_valid ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
              </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row items-end justify-between gap-6">
              <div className="flex-1">
                {result ? (
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Last Verification Result</div>
                    <div className={clsx(
                      "text-xl font-bold",
                      result.is_valid ? "text-emerald-400" : "text-red-400"
                    )}>
                      {result.is_valid ? "CHAIN INTEGRITY SECURE" : "INTEGRITY COMPROMISED"}
                    </div>
                    <div className="text-sm text-slate-400">
                      Completed at: {format(new Date(result.verification_timestamp), 'HH:mm:ss, MMM dd yyyy')}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-sm">Waiting for manual trigger...</div>
                )}
              </div>
              <button 
                onClick={runVerification}
                disabled={verifying}
                className={clsx(
                  "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95",
                  verifying ? "bg-slate-700 cursor-not-allowed" : "bg-gov-600 hover:bg-gov-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                )}
              >
                <RefreshCw size={18} className={clsx(verifying && "animate-spin")} />
                {verifying ? "Computing Hashes..." : "Verify System Chain"}
              </button>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Chain Metadata</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg text-gov-400"><Database size={16} /></div>
                <div>
                  <div className="text-xs text-slate-500">Storage Layer</div>
                  <div className="text-sm text-slate-300 font-medium">PostgreSQL Immutable</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg text-gov-400"><Lock size={16} /></div>
                <div>
                  <div className="text-xs text-slate-500">Algorithm</div>
                  <div className="text-sm text-slate-300 font-medium">SHA-256 Chaining</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700/50 rounded-lg text-gov-400"><Activity size={16} /></div>
                <div>
                  <div className="text-xs text-slate-500">Immutability Proof</div>
                  <div className="text-sm text-slate-300 font-medium font-mono">0x{recentLogs[0]?.current_hash?.slice(0, 12)}...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Recent Logs Table --- */}
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              Latest Immutable Records
            </h3>
            <div className="text-xs text-slate-500">Live feed from Block 0-N</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Entity</th>
                  <th className="px-5 py-3 font-semibold text-right">Cryptographic Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingLogs ? (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-500">Loading audit trail...</td></tr>
                ) : recentLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-4 text-xs font-mono text-slate-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss dd/MM')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-300">{log.username}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        log.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {log.action_display}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">{log.entity_type}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="text-xs font-mono text-gov-400/60 transition-all">{log.current_hash.slice(0, 16)}...</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
