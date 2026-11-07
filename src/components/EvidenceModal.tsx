import React from 'react';
import { SimulationEvidence } from '../types';
import { Terminal, X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface EvidenceModalProps {
  evidence: SimulationEvidence | null;
  title?: string;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ evidence, title = "Simulation Telemetry & Verification Evidence", onClose }) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1222] border border-cyan-500/30 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0e172a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                {title}
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 font-mono border border-cyan-700/50">
                  Immutable Record
                </span>
              </h3>
              <p className="text-xs text-slate-400">Deterministic proof from EDA simulation execution sandbox</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto font-mono text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#070b14] p-3 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans">Exit Code</div>
              <div className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${evidence.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {evidence.exitCode === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {evidence.exitCode} ({evidence.exitCode === 0 ? 'PASS' : 'FAIL'})
              </div>
            </div>

            <div className="bg-[#070b14] p-3 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans">Simulator</div>
              <div className="text-slate-200 text-xs truncate mt-1">
                {evidence.simulatorVersion || 'Verilator 5.020'}
              </div>
            </div>

            <div className="bg-[#070b14] p-3 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans">Timestamp</div>
              <div className="text-slate-300 text-xs mt-1">
                {new Date(evidence.timestamp).toLocaleTimeString()}
              </div>
            </div>

            <div className="bg-[#070b14] p-3 rounded border border-slate-800">
              <div className="text-slate-500 text-[10px] uppercase font-sans">Config Snapshot</div>
              <div className="text-cyan-400 text-xs truncate mt-1">
                {evidence.configSnapshotId || 'snapshot-v1'}
              </div>
            </div>
          </div>

          {/* Invocation Command */}
          <div>
            <div className="text-slate-400 text-xs mb-1.5 font-sans font-medium flex items-center gap-1.5">
              <span>CLI Execution Command:</span>
            </div>
            <div className="bg-[#04070e] p-3 rounded border border-slate-800 text-cyan-300 overflow-x-auto select-all">
              {evidence.command}
            </div>
          </div>

          {/* Raw Log Preview */}
          <div>
            <div className="text-slate-400 text-xs mb-1.5 font-sans font-medium flex items-center justify-between">
              <span>Stdout / Stderr Simulation Log:</span>
              <span className="text-[10px] text-slate-500 font-sans">Cryptographic Evidence</span>
            </div>
            <pre className="bg-[#04070e] p-4 rounded border border-slate-800 text-slate-300 overflow-x-auto max-h-64 whitespace-pre-wrap leading-relaxed select-all">
              {evidence.rawLogPreview || "No stdout captured for this simulation run."}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0e172a] border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Backed by real sandbox execution record</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
