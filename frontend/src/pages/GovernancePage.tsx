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

export default function GovernancePage({ embed = false }: { embed?: boolean }) {
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

  const mainContent = (
    <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">

        
        {/* --- Verification Hub --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={clsx(
            "lg:col-span-2 p-6 rounded-lg border shadow-xs flex flex-col justify-between transition-all",
            result === null ? "bg-white border-slate-300" :
            result.is_valid ? "bg-emerald-50/60 border-emerald-300" : "bg-red-50/60 border-red-300"
          )}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-gov-600" size={20} />
                  Statutory Chain-of-Custody &amp; Cryptographic Heartbeat
                </h2>
                <p className="text-slate-600 text-xs mt-1">
                  Enforces Section 23C of the MMDR Act. Cryptographically binds all lease updates, boundary approvals, and royalty adjustments into an immutable hash chain.
                </p>
              </div>
              <div className={clsx(
                "p-2.5 rounded border flex items-center justify-center",
                result === null ? "bg-slate-100 border-slate-300 text-slate-600" :
                result.is_valid ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-red-100 border-red-300 text-red-800"
              )}>
                {result === null ? <Activity size={20} className="animate-pulse" /> :
                 result.is_valid ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col md:flex-row items-end justify-between gap-4">
              <div className="flex-1">
                {result ? (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Verification Status Report</div>
                    <div className={clsx(
                      "text-base font-extrabold",
                      result.is_valid ? "text-emerald-800" : "text-red-700"
                    )}>
                      {result.is_valid ? "✓ SHA-256 HASH CHAIN VERIFIED — ZERO TAMPERING DETECTED" : "⚠️ INTEGRITY MISMATCH DETECTED"}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Audit Timestamp: {format(new Date(result.verification_timestamp), 'HH:mm:ss, dd MMMM yyyy')}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs">Press button to execute cryptographic validation across all historical audit entries.</div>
                )}
              </div>
              <button 
                onClick={runVerification}
                disabled={verifying}
                className={clsx(
                  "px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer",
                  verifying ? "bg-slate-300 text-slate-600 cursor-not-allowed" : "bg-gov-600 hover:bg-gov-700 text-white"
                )}
              >
                <RefreshCw size={14} className={clsx(verifying && "animate-spin")} />
                {verifying ? "Computing Hash Tree..." : "Verify Cryptographic Chain"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-300 p-5 rounded-lg shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
              Cryptographic Standard
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 border border-slate-200 rounded text-gov-600"><Database size={15} /></div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Storage Architecture</div>
                  <div className="text-xs text-slate-900 font-bold">PostgreSQL Write-Once Ledger</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 border border-slate-200 rounded text-gov-600"><Lock size={15} /></div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Digest Algorithm</div>
                  <div className="text-xs text-slate-900 font-bold">FIPS 180-4 SHA-256 Chaining</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 border border-slate-200 rounded text-gov-600"><Activity size={15} /></div>
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Genesis Root Checksum</div>
                  <div className="text-xs text-slate-900 font-mono font-bold">0x{recentLogs[0]?.current_hash?.slice(0, 12) || '4a8b9f12c'}...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Recent Logs Table --- */}
        <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock size={15} className="text-gov-600" />
                Immutable Statutory Audit Trail (Latest Transactions)
              </h3>
              <p className="text-[11px] text-slate-500">Chronological ledger recording all cadastral edits, approvals, and credential actions</p>
            </div>
            <span className="text-[11px] text-slate-600 font-mono bg-white border border-slate-300 px-2 py-0.5 rounded">
              Total Recorded Blocks: {recentLogs.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Audit Timestamp</th>
                  <th className="px-4 py-2.5">Department Officer</th>
                  <th className="px-4 py-2.5">Statutory Action</th>
                  <th className="px-4 py-2.5">Affected Entity</th>
                  <th className="px-4 py-2.5 text-right">Cryptographic SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {loadingLogs ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading statutory audit trail...</td></tr>
                ) : recentLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                        log.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-red-50 text-red-800 border-red-300"
                      )}>
                        {log.action_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{log.entity_type}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                        {log.current_hash.slice(0, 16)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
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
                <span className="text-[10px] bg-amber-50 border border-amber-300 text-amber-900 px-1.5 py-0.2 rounded font-bold uppercase">
                  Vigilance Registry
                </span>
              </div>
              <h2 className="text-xs font-bold text-slate-800 leading-tight mt-1">
                Statutory Audit Ledger &amp; Cryptographic Proof of Non-Tampering
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
