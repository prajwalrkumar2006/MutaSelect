import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  RotateCw,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
  Timer,
  Cpu,
  Database,
  Hash,
  Copy,
  Check,
  Activity,
  Layers
} from 'lucide-react';
import { BaselineReport, ConfigSnapshot, Project, StageStatus } from '../types';
import { StagePrerequisiteBanner } from '../components/StagePrerequisiteBanner';

interface VerificationPageProps {
  project: Project | null;
  config: ConfigSnapshot | null;
  baseline: BaselineReport | null;
  onRunBaseline: (forceFresh?: boolean) => Promise<void>;
  isRunning: boolean;
  onNavigate: (page: any) => void;
  onInspectEvidence: (evidence: any, title?: string) => void;
  stageStatus: StageStatus;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  project,
  config,
  baseline,
  onRunBaseline,
  isRunning,
  onNavigate,
  onInspectEvidence,
  stageStatus
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const isPassed = baseline?.passed === true;
  const isConfigConfirmed = Boolean(config?.confirmedAt);

  const handleCopyExecId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const timing = baseline?.timingBreakdown;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Prerequisite & Guidance Banner */}
      <StagePrerequisiteBanner
        stageName="Baseline Verification Gate"
        status={stageStatus}
        prerequisiteName="Configuration Gate"
        prerequisitePage="config"
        missingReason="Top module, simulator, and testbench configuration must be reviewed and confirmed before baseline verification."
        onNavigatePrerequisite={onNavigate}
        onRetry={() => onRunBaseline(false)}
        passedMessage="Unmodified RTL compiled cleanly and passed 100% of tests across 2 independent executions with 0% nondeterminism."
      />

      {/* Top Gate Header Panel */}
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
        isPassed
          ? 'bg-[#111B2D] border-emerald-800/80'
          : baseline
          ? 'bg-[#152238] border-rose-800/80'
          : 'bg-[#111B2D] border-[#26364C]'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#E8EEF7] font-mono">
              Baseline Verification Gate
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold border ${
              isPassed
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : baseline
                ? 'bg-rose-950 text-rose-400 border-rose-800'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}>
              {isPassed ? 'GATE CLEARED (PASSED)' : baseline ? 'GATE BLOCKED (FAILED)' : 'RUN REQUIRED'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Unmodified RTL must compile cleanly and pass 100% of tests twice in isolation before mutation analysis is permitted.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => onRunBaseline(false)}
            disabled={isRunning || !isConfigConfirmed}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              !isConfigConfirmed
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : isRunning
                ? 'bg-[#152238] text-[#22B8CF] border border-[#22B8CF] cursor-wait'
                : 'bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-900/30'
            }`}
            title={!isConfigConfirmed ? 'Confirm configuration gate first' : 'Run baseline simulation'}
          >
            <RotateCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Simulating on Icarus Verilog...' : 'Execute Baseline Check'}</span>
          </button>

          <button
            onClick={() => onRunBaseline(true)}
            disabled={isRunning || !isConfigConfirmed}
            className={`px-3 py-2.5 rounded-lg text-xs font-mono font-medium transition border flex items-center gap-1.5 ${
              !isConfigConfirmed || isRunning
                ? 'bg-slate-800/60 text-slate-600 border-slate-800 cursor-not-allowed'
                : 'bg-[#152238] hover:bg-[#1a2b47] text-slate-300 border-[#26364C] hover:text-[#22B8CF]'
            }`}
            title="Bypasses cache and forces fresh re-compilation and 2x execution"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Force Fresh Run</span>
          </button>

          {isPassed && (
            <button
              onClick={() => onNavigate('mutations')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/30 transition flex items-center gap-2"
            >
              <span>Unlock Mutations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Monotonic High-Resolution Timing & Execution Telemetry Card */}
      {baseline && (
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl overflow-hidden shadow-lg">
          <div className="px-5 py-4 bg-[#152238] border-b border-[#26364C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Timer className="w-4 h-4 text-[#22B8CF]" />
              <h3 className="text-sm font-semibold text-slate-200">
                High-Resolution Monotonic Execution Telemetry
              </h3>

              {/* Execution Type Badge */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                baseline.isCached
                  ? 'bg-cyan-950 text-[#22B8CF] border-cyan-800'
                  : baseline.executionType === 'rejected_duplicate'
                  ? 'bg-amber-950 text-amber-400 border-amber-800'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
              }`}>
                {baseline.isCached
                  ? 'CACHED ARTIFACT (IDENTICAL SOURCE & CONFIG)'
                  : baseline.executionType === 'rejected_duplicate'
                  ? 'DUPLICATE REJECTED'
                  : 'FRESH SIMULATION (SANDBOX RUN)'}
              </span>
            </div>

            {baseline.executionId && (
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">ID:</span>
                <span className="text-slate-200 bg-[#080D18] px-2 py-1 rounded border border-[#26364C] select-all">
                  {baseline.executionId}
                </span>
                <button
                  onClick={() => handleCopyExecId(baseline.executionId!)}
                  className="p-1 hover:text-[#22B8CF] text-slate-400 transition"
                  title="Copy Execution ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Granular Phase Timing Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
              <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]/80">
                <span className="text-[10px] text-[#94A3B8] block">Total Duration</span>
                <span className="text-base font-bold text-slate-100">
                  {timing?.totalMs !== undefined ? `${timing.totalMs} ms` : `${baseline.testResults[0]?.runtimeMs || 0} ms`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Monotonic E2E</span>
              </div>

              <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]/80">
                <span className="text-[10px] text-[#94A3B8] block">Compilation Phase</span>
                <span className="text-base font-bold text-[#22B8CF]">
                  {timing?.compilationMs !== undefined ? `${timing.compilationMs} ms` : '—'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">iverilog / AST</span>
              </div>

              <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]/80">
                <span className="text-[10px] text-[#94A3B8] block">Elaboration Phase</span>
                <span className="text-base font-bold text-purple-400">
                  {timing?.elaborationMs !== undefined ? `${timing.elaborationMs} ms` : '—'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Target & Bytecode</span>
              </div>

              <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]/80">
                <span className="text-[10px] text-[#94A3B8] block">Simulator Startup</span>
                <span className="text-base font-bold text-amber-400">
                  {timing?.startupMs !== undefined ? `${timing.startupMs} ms` : '—'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Engine Init</span>
              </div>

              <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]/80">
                <span className="text-[10px] text-[#94A3B8] block">Test Execution</span>
                <span className="text-base font-bold text-emerald-400">
                  {timing?.simulationMs !== undefined ? `${timing.simulationMs} ms` : `${baseline.testResults[0]?.runtimeMs || 0} ms`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">2x Deterministic</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#94A3B8] bg-[#080D18] p-3 rounded-lg border border-[#26364C]/60 gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#22B8CF]" />
                <span>Timer Mechanism: <strong className="text-slate-200 font-mono">process.hrtime.bigint()</strong> (Monotonic nanosecond clock, zero NTP drift)</span>
              </div>
              {baseline.isCached && baseline.cachedAt && (
                <span className="text-cyan-300 font-mono text-[10px]">
                  Cached snapshot from: {new Date(baseline.cachedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Failure Diagnostic Callout if Blocked */}
      {baseline && !isPassed && (
        <div className="bg-[#152238] border border-rose-800/90 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertOctagon className="w-5 h-5" />
            <span>HARD VERIFICATION BLOCK: Mutation Analysis Disabled</span>
          </div>

          <p className="text-xs text-rose-200 leading-relaxed">
            The unmodified design failed verification or exhibited non-deterministic flakiness across the two baseline trial runs.
            Downstream mutation testing cannot generate valid kill metrics on a failing baseline.
          </p>

          {baseline.diagnosticHint && (
            <div className="bg-[#080D18] border border-rose-900/80 p-3 rounded-lg text-xs text-rose-300 font-mono">
              <strong>Diagnostic Hint:</strong> {baseline.diagnosticHint}
            </div>
          )}

          {baseline.compileLog && (
            <div>
              <div className="text-xs text-[#94A3B8] font-mono mb-1">Compiler Diagnostics (Stderr):</div>
              <pre className="bg-[#080D18] p-3 rounded-lg border border-rose-900/60 text-rose-300 font-mono text-xs overflow-x-auto max-h-48 whitespace-pre-wrap">
                {baseline.compileLog}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Baseline Verification Results Table */}
      {baseline && (
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-[#152238] border-b border-[#26364C] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Test Execution Telemetry ({baseline.passedTests}/{baseline.totalTests} Passed)
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Flaky check: {baseline.isDeterministic ? '100% Deterministic (Identical output across runs)' : 'Non-deterministic divergence detected'}
              </p>
            </div>
            <button
              onClick={() => onInspectEvidence(baseline.evidence, "Baseline Run CLI Evidence")}
              className="text-xs text-[#22B8CF] hover:underline flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Raw Simulator Log</span>
            </button>
          </div>

          <div className="divide-y divide-[#26364C]/60 font-mono text-xs">
            {baseline.testResults.map(res => (
              <div key={res.testId} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#152238]/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{res.testName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({res.testId})</span>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] font-sans flex items-center gap-3">
                    <span>Measured Runtime: <strong className="text-slate-200 font-mono">{res.runtimeMs} ms</strong></span>
                    <span>Exit Code: <strong className="text-slate-300 font-mono">{res.exitCode}</strong></span>
                    <span>Deterministic: <strong className={res.flakyCheckPassed ? 'text-emerald-400' : 'text-rose-400'}>
                      {res.flakyCheckPassed ? 'Yes (Pass 2x)' : 'Failed (Flaky)'}
                    </strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    res.passed
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border-rose-800'
                  }`}>
                    {res.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulator Sandbox Specifications */}
      <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold font-sans">
          <Terminal className="w-4 h-4 text-[#22B8CF]" />
          <span>Execution Isolation Environment</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]">
            <span className="text-[#94A3B8] block">Configured Simulator</span>
            <span className="text-[#22B8CF] font-bold uppercase">{config?.simulator || 'IVERILOG'}</span>
          </div>
          <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]">
            <span className="text-[#94A3B8] block">Top Synthesizable Module</span>
            <span className="text-slate-200 font-bold">{config?.topModule || 'Auto-detected'}</span>
          </div>
          <div className="bg-[#152238] p-3 rounded-lg border border-[#26364C]">
            <span className="text-[#94A3B8] block">Concurrency Lock</span>
            <span className="text-emerald-400 font-bold">In-Flight Lock Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
