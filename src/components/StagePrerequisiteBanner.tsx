import React from 'react';
import {
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Info
} from 'lucide-react';
import { StageStatus } from '../types';
import { NavPage } from './Sidebar';

interface StagePrerequisiteBannerProps {
  stageName: string;
  status: StageStatus;
  prerequisiteName?: string;
  prerequisitePage?: NavPage;
  missingReason?: string;
  onNavigatePrerequisite?: (page: NavPage) => void;
  onRetry?: () => void;
  passedMessage?: string;
}

export const StagePrerequisiteBanner: React.FC<StagePrerequisiteBannerProps> = ({
  stageName,
  status,
  prerequisiteName,
  prerequisitePage,
  missingReason,
  onNavigatePrerequisite,
  onRetry,
  passedMessage
}) => {
  // If the stage is passed, show a compact, unobtrusive confirmation bar
  if (status === 'passed') {
    return (
      <div className="bg-[#111B2D] border border-emerald-900/60 rounded-xl px-4 py-3 flex items-center justify-between text-xs mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-200">{stageName}: Passed</span>
            <span className="text-slate-400 ml-2">
              {passedMessage || 'Stage verified and output artifacts are active.'}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
          COMPLETED
        </span>
      </div>
    );
  }

  // If the stage is running
  if (status === 'running') {
    return (
      <div className="bg-[#111B2D] border border-cyan-800/60 rounded-xl p-4 flex items-center justify-between text-xs mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <span className="font-semibold text-cyan-300">{stageName} Execution in Progress</span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Simulating hardware in isolated container sandbox... Output streams directly to console.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 animate-pulse">
          RUNNING
        </span>
      </div>
    );
  }

  // If the stage failed
  if (status === 'failed') {
    return (
      <div className="bg-[#152238] border border-rose-800/80 rounded-xl p-4 text-xs mb-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <XCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-100">{stageName} Failed</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  FAILED
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                {missingReason || 'The execution did not complete successfully or violated validation criteria.'}
              </p>
            </div>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shrink-0 shadow-md shadow-rose-900/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Stage</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // If the stage is blocked by missing prerequisites
  if (status === 'blocked') {
    return (
      <div className="bg-[#111B2D] border border-amber-800/70 rounded-xl p-4 text-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-100">Prerequisite Required: {prerequisiteName || 'Prior Workflow Stage'}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  BLOCKED
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                {missingReason || `This stage requires ${prerequisiteName || 'earlier stages'} to be verified before execution can proceed.`}
              </p>
            </div>
          </div>

          {prerequisitePage && onNavigatePrerequisite && (
            <button
              onClick={() => onNavigatePrerequisite(prerequisitePage)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition shrink-0 shadow-md shadow-amber-900/30"
            >
              <span>Go to {prerequisiteName || 'Prerequisite'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // If the stage is Ready (prerequisites satisfied, awaiting user execution)
  return (
    <div className="bg-[#111B2D] border border-cyan-800/50 rounded-xl px-4 py-3 flex items-center justify-between text-xs mb-6">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
          <Info className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-slate-200">{stageName}: Ready</span>
          <span className="text-slate-400 ml-2">
            Prerequisites are satisfied. You may review configuration or execute this stage below.
          </span>
        </div>
      </div>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
        READY
      </span>
    </div>
  );
};
