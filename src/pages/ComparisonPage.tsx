import React, { useState } from 'react';
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { Experiment, SelectionMethod, StageStatus } from '../types';
import { StagePrerequisiteBanner } from '../components/StagePrerequisiteBanner';

interface ComparisonPageProps {
  experiment: Experiment | null;
  onNavigate: (page: any) => void;
  stageStatus: StageStatus;
  baselinePassed: boolean;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  experiment,
  onNavigate,
  stageStatus,
  baselinePassed
}) => {
  const [methodA, setMethodA] = useState<SelectionMethod>('full');
  const [methodB, setMethodB] = useState<SelectionMethod>('ml_assisted');

  if (!experiment || !experiment.selections) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StagePrerequisiteBanner
          stageName="Suite Comparison & Delta"
          status={stageStatus}
          prerequisiteName="AI Test Selector"
          prerequisitePage={experiment?.killMatrix ? 'selector' : baselinePassed ? 'mutations' : 'baseline'}
          missingReason="Suite comparison requires multiple regression strategies to be computed from mutation results."
          onNavigatePrerequisite={onNavigate}
        />

        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-10 max-w-2xl mx-auto text-center space-y-4">
          <GitCompare className="w-12 h-12 mx-auto text-[#22B8CF]" />
          <h2 className="text-base font-bold text-[#E8EEF7]">No Regression Suites to Compare Yet</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Run Baseline Verification, Mutation Analysis, and AI Selection to evaluate test subset trade-offs side by side.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate(baselinePassed ? 'mutations' : 'baseline')}
              className="px-5 py-2.5 bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              {baselinePassed ? 'Go to Mutation Analysis' : 'Go to Baseline Gate'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selA = experiment.selections[methodA];
  const selB = experiment.selections[methodB];

  const getMethodTitle = (m: SelectionMethod) => {
    switch (m) {
      case 'full': return 'Full Regression Suite';
      case 'greedy': return 'Greedy Set-Cover';
      case 'ml_assisted': return 'ML-Assisted (Random Forest)';
      case 'random': return 'Random Sampling';
    }
  };

  const runtimeDiff = (selA && selB) ? selA.estimatedRuntimeMs - selB.estimatedRuntimeMs : 0;
  const testCountDiff = (selA && selB) ? selA.selectedCount - selB.selectedCount : 0;
  const retentionDiff = (selA && selB) ? selB.retentionPercentage - selA.retentionPercentage : 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111B2D] border border-[#26364C] p-5 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7] font-mono flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-[#22B8CF]" />
            Suite Comparison & Optimization Delta
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono">
            Side-by-side trade-off analysis between regression selection strategies.
          </p>
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 bg-[#152238] hover:bg-[#26364C] text-[#E8EEF7] rounded-lg text-xs font-semibold border border-[#26364C] transition"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111B2D] border border-[#26364C] p-4 rounded-xl space-y-2">
          <label className="text-xs font-bold text-[#94A3B8] font-sans uppercase">
            Baseline Strategy (Method A)
          </label>
          <select
            value={methodA}
            onChange={(e) => setMethodA(e.target.value as any)}
            className="w-full bg-[#080D18] border border-[#26364C] rounded-lg px-3 py-2 text-xs font-mono text-[#22B8CF] focus:outline-none focus:border-[#22B8CF]"
          >
            <option value="full">Full Regression Suite</option>
            <option value="greedy">Greedy Set-Cover</option>
            <option value="ml_assisted">ML-Assisted (Random Forest)</option>
            <option value="random">Random Sampling</option>
          </select>
        </div>

        <div className="bg-[#111B2D] border border-[#26364C] p-4 rounded-xl space-y-2">
          <label className="text-xs font-bold text-[#94A3B8] font-sans uppercase">
            Optimized Target (Method B)
          </label>
          <select
            value={methodB}
            onChange={(e) => setMethodB(e.target.value as any)}
            className="w-full bg-[#080D18] border border-[#26364C] rounded-lg px-3 py-2 text-xs font-mono text-[#22B8CF] focus:outline-none focus:border-[#22B8CF]"
          >
            <option value="ml_assisted">ML-Assisted (Random Forest)</option>
            <option value="greedy">Greedy Set-Cover</option>
            <option value="random">Random Sampling</option>
            <option value="full">Full Regression Suite</option>
          </select>
        </div>
      </div>

      {/* Side by Side Cards */}
      {selA && selB && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A */}
          <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26364C]">
              <span className="font-bold text-slate-200 text-sm">{getMethodTitle(methodA)}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Baseline</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Total Tests:</span>
                <span className="font-bold">{selA.selectedCount} / {selA.totalTests}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Estimated Runtime:</span>
                <span className="font-bold text-[#22B8CF]">{selA.estimatedRuntimeMs}ms</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Fault Retention:</span>
                <span className="font-bold text-[#6366F1]">{selA.retentionPercentage}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Lost Mutants:</span>
                <span className="font-bold">{selA.lostMutantIds.length}</span>
              </div>
            </div>
          </div>

          {/* Card B */}
          <div className="bg-[#111B2D] border border-[#22B8CF]/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#26364C]">
              <span className="font-bold text-[#22B8CF] text-sm">{getMethodTitle(methodB)}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-[#22B8CF] border border-cyan-800 font-mono">Optimized</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Total Tests:</span>
                <span className="font-bold">{selB.selectedCount} / {selB.totalTests}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Estimated Runtime:</span>
                <span className="font-bold text-[#22B8CF]">{selB.estimatedRuntimeMs}ms</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Fault Retention:</span>
                <span className="font-bold text-[#10B981]">{selB.retentionPercentage}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[#94A3B8]">Lost Mutants:</span>
                <span className="font-bold text-slate-200">{selB.lostMutantIds.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delta Metrics Banner */}
      {selA && selB && (
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">
            Net Optimization Advantage (Method B vs Method A)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-center">
            <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]">
              <span className="text-[11px] text-[#94A3B8] block">Test Suite Pruning</span>
              <span className="text-lg font-bold text-[#6366F1]">
                {testCountDiff > 0 ? `-${testCountDiff} tests` : `${Math.abs(testCountDiff)} tests`}
              </span>
            </div>
            <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]">
              <span className="text-[11px] text-[#94A3B8] block">Cycle Time Reduction</span>
              <span className="text-lg font-bold text-[#10B981]">
                {runtimeDiff > 0 ? `-${runtimeDiff} ms` : `+${Math.abs(runtimeDiff)} ms`}
              </span>
            </div>
            <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]">
              <span className="text-[11px] text-[#94A3B8] block">Retention Differential</span>
              <span className={`text-lg font-bold ${retentionDiff >= 0 ? 'text-[#10B981]' : 'text-amber-400'}`}>
                {retentionDiff >= 0 ? `+${retentionDiff}%` : `${retentionDiff}%`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
