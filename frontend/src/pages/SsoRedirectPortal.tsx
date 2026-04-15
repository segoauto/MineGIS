import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, ShieldCheck, ChevronRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SsoRedirectPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSimulateLogin = () => {
    setLoading(true);
    // Simulate a successful login on the NIC side
    setTimeout(() => {
      // In real OIDC, NIC would redirect back to: 
      // http://localhost:3000/sso-callback?code=MOCK_AUTH_CODE_123
      const mockCode = Math.random().toString(36).substring(2, 12).toUpperCase();
      window.location.href = `/sso-callback?code=${mockCode}`;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200">
        
        {/* --- Header --- */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-8 text-white text-center">
          <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">NIC e-Pramaan</h1>
          <p className="text-blue-100/80 text-xs mt-1 uppercase tracking-widest font-semibold italic">Identity Service</p>
        </div>

        {/* --- Content --- */}
        <div className="p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <Info className="text-blue-600 shrink-0" size={18} />
            <p className="text-xs text-blue-800 leading-relaxed">
              You are being redirected from <strong>MineGIS-TS</strong> to the National Identity Service for secure authentication.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Government ID / Aadhaar</label>
              <div className="relative">
                 <input 
                  type="text" 
                  disabled 
                  value="XXXXXXXX4420"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono text-slate-500" 
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            </div>

            <button
              onClick={handleSimulateLogin}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint size={18} />
                  Authorize with Biometrics
                  <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-center gap-4 grayscale opacity-40 italic font-bold text-lg text-slate-400">
              <span>Digital India</span>
              <span className="w-px h-4 bg-slate-300"></span>
              <span>NIC</span>
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-xs text-center max-w-xs leading-relaxed">
        This is a pre-production simulation of the NIC e-Pramaan OIDC flow for technical validation of the MineGIS-TS platform.
      </p>
    </div>
  );
}
