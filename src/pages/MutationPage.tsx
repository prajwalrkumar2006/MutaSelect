import React, { useState } from 'react';
import {
  Zap,
  Filter,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Code2,
  Play,
  RotateCw,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Mutant, MutantStatus, OperatorCategory, StageStatus } from '../types';
import { StagePrerequisiteBanner } from '../components/StagePrerequisiteBanner';

interface MutationPageProps {
  mutants: Mutant[];
  onNavigate: (page: any) => void;
  onInspectEvidence: (evidence: any, title?: string) => void;
  stageStatus: StageStatus;
  baselinePassed: boolean;
  onRunMutations?: () => Promise<void>;
  isMutating?: boolean;
}

const CATEGORIES: { id: OperatorCategory; label: string }[] = [
  { id: 'relational', label: 'Relational (==, !=, <, >)' },
  { id: 'arithmetic', label: 'Arithmetic (+, -)' },
  { id: 'constant_boundary', label: 'Boundary & Constants (±1)' },
  { id: 'stuck_at', label: 'Stuck-at (0/1)' },
  { id: 'reset_value', label: 'Reset Values' },
  { id: 'branch_swap', label: 'Branch Swaps (if/else)' },
  { id: 'case_item_removal', label: 'Case Statement Pruning' },
  { id: 'assignment_type', label: 'Non-blocking/Blocking (<=, =)' },
  { id: 'fsm_state_corrupt', label: 'FSM Next-State Corruption' },
  { id: 'bitwise', label: 'Bitwise (&, |, ^)' },
  { id: 'logical', label: 'Logical (&&, ||)' },
];

export const MutationPage: React.FC<MutationPageProps> = ({
  mutants,
  onNavigate,
  onInspectEvidence,
  stageStatus,
  baselinePassed,
  onRunMutations,
  isMutating = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeMutant, setActiveMutant] = useState<Mutant | null>(mutants[0] || null);

  const filtered = mutants.filter(m => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
    return true;
  });

  const getStatusBadge = (status: MutantStatus) => {
    switch (status) {
      case 'killed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">KILLED</span>;
      case 'survived':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 font-mono">SURVIVED</span>;
      case 'potentially_equivalent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 font-mono">EQUIVALENT</span>;
      case 'timeout':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 font-mono">TIMEOUT</span>;
      case 'invalid':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 font-mono">INVALID</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 font-mono">{status}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Prerequisite & Guidance Banner */}
      <StagePrerequisiteBanner
        stageName="Mutation Analysis"
        status={stageStatus}
        prerequisiteName="Baseline Verification"
        prerequisitePage="baseline"
        missingReason="Original unmodified RTL must compile and pass all tests twice without flakiness before mutation analysis can be run."
        onNavigatePrerequisite={onNavigate}
        onRetry={onRunMutations}
        passedMessage={`${mutants.length} synthesizable mutants generated & evaluated against testbenches.`}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111B2D] border border-[#26364C] p-5 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-[#E8EEF7] font-mono flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#22B8CF]" />
            Synthesizable RTL Mutation Engine
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            AST-level operator injection across 5 operator groups. Testbenches are isolated and protected from mutation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRunMutations && (
            <button
              onClick={onRunMutations}
              disabled={isMutating || !baselinePassed}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                !baselinePassed
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isMutating
                  ? 'bg-[#152238] text-[#22B8CF] border border-[#22B8CF] cursor-wait'
                  : 'bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-900/30'
              }`}
              title={!baselinePassed ? 'Baseline verification must be cleared first' : 'Simulate mutants on hardware'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isMutating ? 'animate-spin' : ''}`} />
              <span>
                {isMutating
                  ? 'Simulating Mutants...'
                  : mutants.length > 0
                  ? 'Re-evaluate Mutants'
                  : 'Generate & Simulate Mutants'}
              </span>
            </button>
          )}

          <button
            onClick={() => onNavigate('kill-matrix')}
            className="px-4 py-2 bg-[#152238] hover:bg-[#26364C] text-[#E8EEF7] rounded-lg text-xs font-semibold border border-[#26364C] transition flex items-center gap-2 shrink-0"
          >
            <span>Kill Matrix Heatmap</span>
            <ChevronRight className="w-4 h-4 text-[#22B8CF]" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#111B2D] border border-[#26364C] p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[#94A3B8] font-sans">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#080D18] border border-[#26364C] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-[#22B8CF]"
          >
            <option value="all">All Mutation Categories ({mutants.length})</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-[#94A3B8] font-sans pl-2 border-l border-[#26364C]">
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#080D18] border border-[#26364C] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-[#22B8CF]"
          >
            <option value="all">All Statuses</option>
            <option value="killed">Killed</option>
            <option value="survived">Survived</option>
            <option value="potentially_equivalent">Potentially Equivalent</option>
            <option value="timeout">Timeout</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>

        <div className="text-[#94A3B8]">
          Showing <span className="text-[#22B8CF] font-bold">{filtered.length}</span> of {mutants.length} generated mutants
        </div>
      </div>

      {/* Two-Pane Workspace: Mutant Table & Diff Viewer */}
      {mutants.length === 0 ? (
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-8 text-center space-y-3">
          <Zap className="w-10 h-10 mx-auto text-[#22B8CF]" />
          <h3 className="font-bold text-base text-[#E8EEF7]">No Mutants Evaluated Yet</h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
            {baselinePassed
              ? "Baseline verification has passed! Click 'Generate & Simulate Mutants' above to inject AST mutations and run them against your testbench."
              : "Complete the Baseline Gate first. Once unmodified RTL verification succeeds, the mutation engine unlocks automatically."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Mutant List Table */}
          <div className="lg:col-span-7 bg-[#111B2D] border border-[#26364C] rounded-xl overflow-hidden flex flex-col max-h-[600px]">
            <div className="px-4 py-3 bg-[#152238] border-b border-[#26364C] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Generated Mutants</span>
              <span className="text-[10px] text-[#94A3B8] font-mono">Select to inspect AST diff</span>
            </div>

            <div className="overflow-y-auto divide-y divide-[#26364C]/60 font-mono text-xs">
              {filtered.map(mutant => {
                const isSelected = (activeMutant?.id || filtered[0]?.id) === mutant.id;

                return (
                  <div
                    key={mutant.id}
                    onClick={() => setActiveMutant(mutant)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#152238] border-l-2 border-[#22B8CF]'
                        : 'hover:bg-[#152238]/60'
                    }`}
                  >
                    <div className="space-y-1 truncate mr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#22B8CF]">{mutant.id}</span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {mutant.file}:{mutant.line}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-sans truncate">
                        {mutant.operatorDescription}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(mutant.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: AST Diff Viewer */}
          <div className="lg:col-span-5 bg-[#111B2D] border border-[#26364C] rounded-xl overflow-hidden flex flex-col max-h-[600px]">
            <div className="px-4 py-3 bg-[#152238] border-b border-[#26364C] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-[#22B8CF]" />
                <span className="text-xs font-semibold text-slate-200">AST Mutation Diff</span>
              </div>
              {activeMutant && (
                <span className="text-[10px] text-[#22B8CF] font-mono">
                  Line {activeMutant.line}
                </span>
              )}
            </div>

            {activeMutant ? (
              <div className="p-4 space-y-4 overflow-y-auto font-mono text-xs">
                {/* Status & Outcome Summary */}
                <div className="bg-[#152238] border border-[#26364C] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#94A3B8]">Classification:</span>
                    {getStatusBadge(activeMutant.status)}
                  </div>
                  {activeMutant.killingTestName && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Killed by:</span>
                      <span className="text-emerald-400 font-semibold truncate max-w-[200px]">
                        {activeMutant.killingTestName}
                      </span>
                    </div>
                  )}
                  {activeMutant.runtimeMs && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]">Simulation Runtime:</span>
                      <span className="text-slate-200">{activeMutant.runtimeMs} ms</span>
                    </div>
                  )}
                  {activeMutant.failureMessage && (
                    <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded border border-rose-900/60 mt-1">
                      {activeMutant.failureMessage}
                    </div>
                  )}
                </div>

                {/* Diff Comparison */}
                <div className="space-y-2">
                  <div className="text-slate-400 font-sans text-xs font-semibold">
                    Original Synthesizable RTL:
                  </div>
                  <pre className="bg-[#080D18] p-3 rounded-lg border border-[#26364C] text-emerald-400 whitespace-pre-wrap overflow-x-auto text-[11px]">
                    - {activeMutant.originalSnippet}
                  </pre>

                  <div className="text-slate-400 font-sans text-xs font-semibold pt-1">
                    Mutated AST Replacement:
                  </div>
                  <pre className="bg-[#080D18] p-3 rounded-lg border border-[#26364C] text-rose-400 whitespace-pre-wrap overflow-x-auto text-[11px]">
                    + {activeMutant.mutatedSnippet}
                  </pre>
                </div>

                {/* Evidence Link */}
                {activeMutant.evidence && (
                  <button
                    onClick={() => onInspectEvidence(activeMutant.evidence, `Mutant ${activeMutant.id} Simulation Evidence`)}
                    className="w-full py-2 bg-[#152238] hover:bg-[#26364C] text-slate-200 rounded-lg text-xs font-semibold border border-[#26364C] transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#22B8CF]" />
                    <span>Inspect Raw Simulator Log</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#94A3B8]">
                Select a mutant from the table to view its AST modification.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
