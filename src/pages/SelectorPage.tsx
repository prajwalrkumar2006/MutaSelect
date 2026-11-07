import React, { useState } from 'react';
import {
  BrainCircuit,
  Zap,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BarChart3,
  Sliders,
  ChevronRight,
  ArrowRight,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Experiment, SelectionMethod, SelectionResult, StageStatus } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { StagePrerequisiteBanner } from '../components/StagePrerequisiteBanner';

interface SelectorPageProps {
  experiment: Experiment | null;
  onNavigate: (page: any) => void;
  onSelectMethod: (method: SelectionMethod) => void;
  targetRetention: number;
  onUpdateRetention: (val: number) => void;
  stageStatus: StageStatus;
  baselinePassed: boolean;
}

export const SelectorPage: React.FC<SelectorPageProps> = ({
  experiment,
  onNavigate,
  onSelectMethod,
  targetRetention,
  onUpdateRetention,
  stageStatus,
  baselinePassed
}) => {
  const [activeMethod, setActiveMethod] = useState<SelectionMethod>('ml_assisted');

  if (!experiment || !experiment.selections) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StagePrerequisiteBanner
          stageName="AI Test Suite Selector"
          status={stageStatus}
          prerequisiteName="Kill Matrix Generation"
          prerequisitePage={experiment?.killMatrix ? 'kill-matrix' : baselinePassed ? 'mutations' : 'baseline'}
          missingReason="A completed Kill Matrix is required before machine learning algorithms and greedy set-cover can evaluate test subsets."
          onNavigatePrerequisite={onNavigate}
        />

        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-10 max-w-2xl mx-auto text-center space-y-4">
          <BrainCircuit className="w-12 h-12 mx-auto text-[#6366F1]" />
          <h2 className="text-base font-bold text-[#E8EEF7]">Test Selection Models Awaiting Evaluation</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Run Baseline Verification and Mutation Analysis to produce test-by-mutant kill observations. Once faults are evaluated, our Random Forest classifier and greedy set-cover will extract the minimum regression suite.
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

  const selections = experiment.selections;
  const currentSelection = selections[activeMethod];
  const allTests = experiment.config.tests || [];

  const methodsData: { id: SelectionMethod; name: string; desc: string; res?: SelectionResult }[] = [
    {
      id: 'full',
      name: 'Full Regression Suite',
      desc: '100% of discovered tests. Maximum verification confidence, highest compute cost.',
      res: selections.full
    },
    {
      id: 'greedy',
      name: 'Greedy Set-Cover',
      desc: 'Deterministic weighted set-cover prioritizing tests with highest kills per runtime millisecond.',
      res: selections.greedy
    },
    {
      id: 'ml_assisted',
      name: 'ML-Assisted (Random Forest)',
      desc: 'Ensemble model learning test utility from unique kills, category diversity & runtime efficiency.',
      res: selections.ml_assisted
    },
    {
      id: 'random',
      name: 'Random Sampling (N=5 Seeds)',
      desc: 'Stochastic baseline average for comparing optimization quality against chance.',
      res: selections.random
    }
  ];

  // Feature Importance for ML chart
  const featureData = selections.ml_assisted?.featureImportance || [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111B2D] border border-[#26364C] p-5 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7] font-mono flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#6366F1]" />
            AI Test Suite Selector & Model Comparison
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Honest evaluation comparing 4 selection algorithms evaluated against held-out mutants.
          </p>
        </div>

        <button
          onClick={() => onNavigate('safety')}
          className="px-5 py-2.5 bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-2 shrink-0 shadow-md shadow-cyan-900/30"
        >
          <span>Safety Validation Gate</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Target Retention Threshold Controller */}
      <div className="bg-[#111B2D] border border-[#26364C] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sliders className="w-4 h-4 text-[#22B8CF]" />
            <span>Target Fault Retention Constraint: <strong className="text-[#22B8CF] font-mono">{targetRetention}%</strong></span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            Selectors must preserve at least this percentage of the original regression suite's killed mutants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="80"
            max="100"
            step="1"
            value={targetRetention}
            onChange={(e) => onUpdateRetention(parseFloat(e.target.value))}
            className="w-40 accent-[#22B8CF] cursor-pointer"
          />
          <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#152238] border border-[#26364C] rounded text-slate-200 min-w-[50px] text-center">
            {targetRetention}%
          </span>
        </div>
      </div>

      {/* 4 Selection Methods Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {methodsData.map(method => {
          const isSelected = activeMethod === method.id;
          const res = method.res;

          return (
            <div
              key={method.id}
              onClick={() => {
                setActiveMethod(method.id);
                onSelectMethod(method.id);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-[#152238] border-[#22B8CF] shadow-lg shadow-cyan-950/30'
                  : 'bg-[#111B2D] border-[#26364C] hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#22B8CF]' : 'text-[#E8EEF7]'}`}>
                    {method.name}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-950 text-[#22B8CF] border border-cyan-800">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  {method.desc}
                </p>
              </div>

              {res && (
                <div className="space-y-2 pt-3 border-t border-[#26364C] font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Tests Selected:</span>
                    <span className="text-slate-200 font-semibold">{res.selectedCount} / {res.totalTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Reduction:</span>
                    <span className="text-[#6366F1] font-bold">-{res.reductionPercentage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Time Saved:</span>
                    <span className="text-[#10B981] font-bold">+{res.runtimeSavedPercentage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Fault Retention:</span>
                    <span className={`font-bold ${res.retentionPercentage >= targetRetention ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                      {res.retentionPercentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deep Dive on Active Selection Method */}
      {currentSelection && (
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Selected Regression Tests ({currentSelection.selectedCount} Tests Retained)
            </h3>
            <span className="text-xs font-mono text-[#94A3B8]">
              Estimated Runtime: {currentSelection.estimatedRuntimeMs}ms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {allTests.map(test => {
              const isIncluded = currentSelection.selectedTestIds.includes(test.id);

              return (
                <div
                  key={test.id}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    isIncluded
                      ? 'bg-[#152238] border-cyan-800/80 text-cyan-200'
                      : 'bg-[#080D18] border-[#26364C] text-[#94A3B8] opacity-60'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold block truncate">{test.name}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{test.file}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                      isIncluded
                        ? 'bg-cyan-950 text-[#22B8CF] border border-cyan-800'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isIncluded ? 'KEPT' : 'SKIPPED'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Importance Attribution (When ML is Active) */}
      {activeMethod === 'ml_assisted' && featureData.length > 0 && (
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#E8EEF7]">ML Feature Importance Attribution</h3>
            <p className="text-xs text-[#94A3B8]">Weights assigned by the Random Forest classifier in determining test criticality</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <XAxis type="number" stroke="#94A3B8" fontSize={10} domain={[0, 1]} tickLine={false} />
                <YAxis dataKey="feature" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#152238', borderColor: '#26364C', borderRadius: '8px', fontSize: '11px', color: '#E8EEF7' }}
                  formatter={(value: any) => [`${Math.round(Number(value) * 100)}% weight`, 'Importance']}
                />
                <Bar dataKey="importance" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
