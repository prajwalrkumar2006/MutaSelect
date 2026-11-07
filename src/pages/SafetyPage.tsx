import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  ArrowRight,
  RotateCcw,
  Sliders,
  Lock
} from 'lucide-react';
import { Experiment, SafetyValidationReport, StageStatus } from '../types';
import { StagePrerequisiteBanner } from '../components/StagePrerequisiteBanner';

interface SafetyPageProps {
  experiment: Experiment | null;
  onNavigate: (page: any) => void;
  onRunSafetyCheck: (threshold: number, mustKillCategories: string[]) => void;
  stageStatus: StageStatus;
  baselinePassed: boolean;
}

export const SafetyPage: React.FC<SafetyPageProps> = ({
  experiment,
  onNavigate,
  onRunSafetyCheck,
  stageStatus,
  baselinePassed
}) => {
  const [threshold, setThreshold] = useState(experiment?.safetyReport?.retentionThreshold || 95.0);
  const [fsmMustKill, setFsmMustKill] = useState(true);
  const [resetMustKill, setResetMustKill] = useState(true);

  if (!experiment || !experiment.safetyReport) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StagePrerequisiteBanner
          stageName="Safety Validation Gate"
          status={stageStatus}
          prerequisiteName="AI Test Selector"
          prerequisitePage={experiment?.selections ? 'selector' : baselinePassed ? 'mutations' : 'baseline'}
          missingReason="A selected regression test subset must exist before independent holdout safety verification can certify fault retention."
          onNavigatePrerequisite={onNavigate}
        />

        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-10 max-w-2xl mx-auto text-center space-y-4">
          <ShieldCheck className="w-12 h-12 mx-auto text-[#10B981]" />
          <h2 className="text-base font-bold text-[#E8EEF7]">Safety Validation Awaiting Test Suite</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Safety validation acts as an independent auditor. It evaluates the selected test suite against held-out mutants and critical must-kill invariants (FSM transitions, reset sequences). If retention falls below 95%, it triggers an automated fallback to the 100% full regression suite.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate(experiment?.killMatrix ? 'selector' : baselinePassed ? 'mutations' : 'baseline')}
              className="px-5 py-2.5 bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              {experiment?.killMatrix ? 'Go to AI Test Selector' : 'Go to Baseline Gate'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const report = experiment.safetyReport;
  const isApproved = report.status === 'passed';

  const handleRevalidate = () => {
    const categories: any[] = [];
    if (fsmMustKill) categories.push('fsm_state_corrupt');
    if (resetMustKill) categories.push('reset_value');
    onRunSafetyCheck(threshold, categories);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Safety Status Banner */}
      <div className={`p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
        isApproved
          ? 'bg-[#111B2D] border-emerald-800/80'
          : 'bg-[#152238] border-rose-800/90'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isApproved ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            )}
            <h1 className="text-xl font-bold text-[#E8EEF7] font-mono">
              Independent Safety Validation Gate
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold border ${
              isApproved
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-rose-950 text-rose-400 border-rose-800'
            }`}>
              {isApproved ? 'SUITE APPROVED' : 'FALLBACK TRIGGERED'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            {isApproved
              ? 'Selected suite certified deterministic fault retention above threshold. Reduced regression approved for production CI/CD.'
              : 'Safety threshold violated. The system automatically aborted optimization and triggered Full Regression Fallback.'}
          </p>
        </div>

        <button
          onClick={handleRevalidate}
          className="px-4 py-2.5 bg-[#152238] hover:bg-[#26364C] text-slate-200 rounded-lg text-xs font-semibold border border-[#26364C] transition flex items-center gap-2 shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-[#22B8CF]" />
          <span>Re-evaluate Safety Gate</span>
        </button>
      </div>

      {/* Fallback Incident Report (if rejected) */}
      {!isApproved && report.fallbackReason && (
        <div className="bg-[#152238] border border-rose-800/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4" />
            <span>Automated Safety Action: Reverted to 100% Full Suite</span>
          </div>
          <p className="text-xs text-rose-200 leading-relaxed font-mono">
            {report.fallbackReason}
          </p>

          {report.lostMutants.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-rose-900/60 font-mono text-xs">
              <div className="text-[11px] text-[#94A3B8] font-sans font-semibold">Lost Uncovered Mutants:</div>
              {report.lostMutants.map(lost => (
                <div key={lost.id} className="bg-[#080D18] p-2 rounded text-rose-300 flex items-center justify-between">
                  <span>{lost.id} ({lost.file}:{lost.line})</span>
                  <span className="text-[10px] text-slate-400">{lost.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safety Invariants and Must-Kill Rules */}
      <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#22B8CF]" />
          Safety Constraints & Must-Kill Invariants
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#152238] p-4 rounded-xl border border-[#26364C] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Retention Floor Constraint
              </span>
              <span className="font-mono text-[#22B8CF] font-bold text-xs">
                {threshold}%
              </span>
            </div>
            <input
              type="range"
              min="85"
              max="100"
              step="0.5"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-[#22B8CF] cursor-pointer"
            />
            <span className="text-[10px] text-[#94A3B8] block">
              Observed retention: <strong className="text-slate-200">{report.actualRetention}%</strong>
            </span>
          </div>

          <div className="bg-[#152238] p-4 rounded-xl border border-[#26364C] space-y-3 text-xs">
            <span className="font-semibold text-slate-300 block">Must-Kill Invariant Categories</span>
            <label className="flex items-center space-x-2 text-[#94A3B8] cursor-pointer">
              <input
                type="checkbox"
                checked={fsmMustKill}
                onChange={(e) => setFsmMustKill(e.target.checked)}
                className="rounded accent-[#22B8CF]"
              />
              <span>FSM State Corruptions (Zero-tolerance)</span>
            </label>
            <label className="flex items-center space-x-2 text-[#94A3B8] cursor-pointer">
              <input
                type="checkbox"
                checked={resetMustKill}
                onChange={(e) => setResetMustKill(e.target.checked)}
                className="rounded accent-[#22B8CF]"
              />
              <span>Reset Values & Polarity Inversions</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
