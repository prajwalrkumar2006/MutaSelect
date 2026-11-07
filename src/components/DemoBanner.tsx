import React from 'react';
import { Sparkles, Terminal, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DemoBannerProps {
  isDemoMode: boolean;
  onDisableDemo: () => void;
  onEnableDemo: () => void;
  backendOnline: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  isDemoMode,
  onDisableDemo,
  onEnableDemo,
  backendOnline
}) => {
  if (isDemoMode) {
    return (
      <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 sticky top-16 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-mono font-bold tracking-wider px-1.5 py-0.5 bg-amber-900/60 border border-amber-600/50 rounded text-[11px] text-amber-300">
            DEMO MODE ACTIVE
          </span>
          <span className="text-amber-200/90 hidden sm:inline">
            Viewing reference design metrics and simulated test results. No live container compute is consumed.
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onDisableDemo}
            className="px-2.5 py-1 rounded bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition shadow-sm"
          >
            Switch to Live Execution
          </button>
        </div>
      </div>
    );
  }

  // Live Mode: If backend is offline, warn user
  if (!backendOnline) {
    return (
      <div className="bg-rose-950/80 border-b border-rose-600/40 px-4 py-2 flex items-center justify-between text-xs text-rose-200 sticky top-16 z-20 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-mono font-bold text-rose-300">
            LIVE SIMULATOR OFFLINE
          </span>
          <span className="text-rose-200/90 hidden sm:inline">
            The local simulation backend or Cloud Run worker is unreachable. Baseline and mutation jobs require an active simulator.
          </span>
        </div>

        <button
          onClick={onEnableDemo}
          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] transition"
        >
          Enable Demo Mode
        </button>
      </div>
    );
  }

  return null;
};
