import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function SsoCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('No authorization code received from NIC.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const resp = await axios.post('/api/auth/sso/callback/', { code });
        const { access, refresh, user } = resp.data;
        
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        setToken(access);
        setUser(user);
        
        toast.success(`Welcome, ${user.first_name} ${user.last_name}`);
        navigate('/');
      } catch (err: any) {
        console.error('SSO Callback Error:', err);
        setError(err.response?.data?.detail || 'Handshake failed with local authentication server.');
      }
    };

    exchangeCode();
  }, [params, navigate, setToken, setUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-sm space-y-4">
          <div className="bg-red-500/20 text-red-400 p-4 rounded-xl border border-red-500/30">
            <h1 className="font-bold">SSO Authentication Error</h1>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="text-gov-400 text-sm hover:underline"
          >
            Back to standard login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="space-y-6">
        <div className="relative">
          <div className="w-20 h-20 bg-gov-600/20 rounded-full flex items-center justify-center mx-auto border border-gov-600/30">
            <ShieldCheck className="text-gov-500" size={36} />
          </div>
          <div className="absolute inset-0 w-20 h-20 border-2 border-gov-500/30 border-t-gov-500 rounded-full animate-spin mx-auto" />
        </div>
        
        <div>
          <h1 className="text-lg font-bold tracking-tight">Completing Secure Handshake</h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-semibold italic">Verifying NIC Claims...</p>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono justify-center">
          <Loader2 size={12} className="animate-spin" />
          <span>Synchronizing Identity Profile</span>
        </div>
      </div>
    </div>
  );
}
