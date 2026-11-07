import React from 'react';
import {
  History,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Download,
  Calendar,
  Layers
} from 'lucide-react';
import { Experiment } from '../types';

interface HistoryPageProps {
  experiments: Experiment[];
  onSelectExperiment: (exp: Experiment) => void;
  onNavigate: (page: any) => void;
  onInspectEvidence: (evidence: any, title?: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  experiments,
  onSelectExperiment,
  onNavigate,
  onInspectEvidence
}) => {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1222] border border-slate-800 p-5 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Immutable Experiment History & Reproducibility Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Every run stores its random seed, configuration snapshot, and simulator evidence for cryptographic audit.
          </p>
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          View Active Dashboard
        </button>
      </div>

      {/* History Log Table */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-200">
            Recorded Hardware Experiments ({experiments.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">Real Verification Telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070b14] text-slate-400 border-b border-slate-800 text-[11px] uppercase font-sans">
              <tr>
                <th className="py-3 px-4">Experiment ID & Name</th>
                <th className="py-3 px-4">Simulator</th>
                <th className="py-3 px-4">Mutation Score</th>
                <th className="py-3 px-4">Suite Reduction</th>
                <th className="py-3 px-4">Safety Fallback</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {experiments.map(exp => {
                const km = exp.killMatrix;
                const mlSel = exp.selections?.ml_assisted;

                return (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{exp.name}</div>
                      <div className="text-[11px] text-slate-500">{exp.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {exp.config.simulator}
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-400">
                      {km ? `${km.mutationScore}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {mlSel ? `-${mlSel.reductionPercentage}%` : '0%'}
                    </td>
                    <td className="py-3 px-4">
                      {exp.safetyReport?.fallbackTriggered ? (
                        <span className="text-rose-400 font-bold">TRIGGERED</span>
                      ) : (
                        <span className="text-emerald-400">STANDBY (PASS)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {new Date(exp.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspectEvidence(exp.baseline?.evidence, `Evidence Record: ${exp.name}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans border border-slate-700 transition"
                      >
                        Inspect Evidence
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
