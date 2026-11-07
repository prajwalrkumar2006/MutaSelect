import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Terminal,
  Activity,
  GitBranch,
  ShieldAlert,
  Clock,
  RotateCcw,
  Sparkles,
  HelpCircle,
  FileCode,
  XCircle
} from 'lucide-react';
import { Project, DesignModel, PresenceStatus } from '../types';
import { createStarterTestbench } from '../lib/api';

interface ProjectDetailsPageProps {
  project: Project | null;
  onNavigate: (page: any) => void;
  onAddGeneratedTestbench?: (fileName: string, content: string) => void;
}

export const ProjectDetailsPage: React.FC<ProjectDetailsPageProps> = ({
  project,
  onNavigate,
  onAddGeneratedTestbench
}) => {
  const [showStarterModal, setShowStarterModal] = useState(false);
  const [generatedTbContent, setGeneratedTbContent] = useState('');

  if (!project || !project.design) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center space-y-4">
        <Cpu className="w-12 h-12 mx-auto text-slate-600" />
        <h2 className="text-base font-semibold text-slate-300">No Design Model Active</h2>
        <p className="text-xs text-slate-500">Select or upload a hardware design in Projects to inspect its structural AST model.</p>
        <button
          onClick={() => onNavigate('projects')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  const design = project.design;
  const primaryModule = design.modules.find(m => m.name === design.selectedTopModule) || design.modules[0];
  const tbInfo = design.testbenchInfo;

  const renderStatusBadge = (status: PresenceStatus) => {
    switch (status) {
      case 'detected':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-sans bg-emerald-950 text-emerald-400 border border-emerald-800">DETECTED</span>;
      case 'not_present':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-sans bg-slate-800 text-slate-400 border border-slate-700">NOT PRESENT</span>;
      case 'unsupported':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-sans bg-rose-950 text-rose-400 border border-rose-800">UNSUPPORTED</span>;
      case 'uncertain':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-sans bg-amber-950 text-amber-400 border border-amber-800">UNCERTAIN</span>;
    }
  };

  const handleOpenStarterTB = () => {
    if (!primaryModule) return;
    const tb = createStarterTestbench(
      primaryModule,
      primaryModule.constructs.clock.signalName,
      primaryModule.constructs.reset.signalName,
      primaryModule.constructs.reset.polarity === 'active_low'
    );
    setGeneratedTbContent(tb.content);
    setShowStarterModal(true);
  };

  const handleConfirmStarterTB = () => {
    if (primaryModule && onAddGeneratedTestbench) {
      onAddGeneratedTestbench(`tb_${primaryModule.name}.v`, generatedTbContent);
    }
    setShowStarterModal(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1222] border border-slate-800 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 font-mono">
              Structural RTL Design Model
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              PARSED (AST)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Design: <span className="text-cyan-400 font-semibold">{project.name}</span> | Hierarchy: {design.modules.length} Modules | Top: <code className="text-slate-300">{design.selectedTopModule}</code>
          </p>
        </div>

        <button
          onClick={() => onNavigate('config')}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 shrink-0"
        >
          <span>Configuration Review Gate</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Testbench Status Alert (If missing or incomplete) */}
      {tbInfo.status === 'missing' && (
        <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase font-mono">
              <AlertTriangle className="w-4 h-4" />
              <span>Missing Testbench Component Detected</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
              No simulation testbench was uploaded for <code className="font-mono text-white">{design.selectedTopModule}</code>. Mutation testing requires a stimulus and verification harness.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-amber-300">
              {tbInfo.missingComponents.map((c, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-amber-900/50 border border-amber-700/50">
                  • {c}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleOpenStarterTB}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold font-mono transition flex items-center gap-2 shrink-0 shadow-lg shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Starter Testbench</span>
          </button>
        </div>
      )}

      {/* Candidate Top Modules & Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Candidate Top Modules (DAG Hierarchy Ranking)
            </h3>
            <span className="text-xs text-slate-500 font-mono">Auto-Derived</span>
          </div>

          <div className="space-y-2">
            {design.topModuleCandidates.map((cand, idx) => (
              <div
                key={cand.name}
                className={`p-3 rounded-lg border flex items-center justify-between transition ${
                  cand.name === design.selectedTopModule
                    ? 'bg-cyan-950/30 border-cyan-500/50 text-slate-100'
                    : 'bg-[#070b14] border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-cyan-400 w-5">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-mono font-bold flex items-center gap-2">
                      <span>{cand.name}</span>
                      {cand.name === design.selectedTopModule && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700">
                          Active Top
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {cand.reason}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    Score: {cand.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clock & Reset Detection Card */}
        {primaryModule && (
          <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Clock & Reset Inferences
            </h3>

            <div className="space-y-3 text-xs font-mono">
              {/* Clock */}
              <div className="bg-[#070b14] p-3 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Clock Sensitivity:</span>
                  {renderStatusBadge(primaryModule.constructs.clock.status)}
                </div>
                {primaryModule.constructs.clock.status === 'detected' && (
                  <div className="text-slate-200 font-bold mt-1">
                    Signal: <code className="text-cyan-400">{primaryModule.constructs.clock.signalName}</code> ({primaryModule.constructs.clock.polarity})
                  </div>
                )}
                {primaryModule.constructs.clock.status === 'not_present' && (
                  <div className="text-slate-500 text-[11px] font-sans">
                    Purely combinational circuit; no edge-triggered clock required.
                  </div>
                )}
              </div>

              {/* Reset */}
              <div className="bg-[#070b14] p-3 rounded border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Reset Control:</span>
                  {renderStatusBadge(primaryModule.constructs.reset.status)}
                </div>
                {primaryModule.constructs.reset.status === 'detected' && (
                  <div className="text-slate-200 font-bold mt-1">
                    Signal: <code className="text-cyan-400">{primaryModule.constructs.reset.signalName}</code> ({primaryModule.constructs.reset.polarity}, {primaryModule.constructs.reset.syncType})
                  </div>
                )}
                {primaryModule.constructs.reset.status === 'not_present' && (
                  <div className="text-slate-500 text-[11px] font-sans">
                    No reset signal inferred in module logic.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Construct Inventory Grid with 4 Explicit Statuses */}
      {primaryModule && (
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Synthesizable Construct Inventory: <code className="text-cyan-400">{primaryModule.name}</code>
              </h3>
              <p className="text-xs text-slate-400">
                Separate statuses (Detected / Not Present / Unsupported / Uncertain) prevent false assumptions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* FSM */}
            <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">FSM State Machine</span>
                {renderStatusBadge(primaryModule.constructs.fsm.status)}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {primaryModule.constructs.fsm.status === 'detected' ? (
                  <>
                    <div className="text-slate-200 font-bold">Register: {primaryModule.constructs.fsm.stateRegister}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{primaryModule.constructs.fsm.transitionsCount} transitions recorded</div>
                  </>
                ) : (
                  <span className="text-slate-500">No FSM state registers found</span>
                )}
              </div>
            </div>

            {/* Counters */}
            <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Counters & Pointers</span>
                {renderStatusBadge(primaryModule.constructs.counters.status)}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {primaryModule.constructs.counters.status === 'detected' ? (
                  <>
                    <div className="text-slate-200 font-bold">{primaryModule.constructs.counters.count} Counter Operations</div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">
                      {primaryModule.constructs.counters.registers.join(', ') || 'Registers'}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500">No accumulator logic</span>
                )}
              </div>
            </div>

            {/* Case Statements */}
            <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Case Statements</span>
                {renderStatusBadge(primaryModule.constructs.caseStatements.status)}
              </div>
              <div className="text-xs font-mono text-slate-400">
                <div className="text-slate-200 font-bold">{primaryModule.constructs.caseStatements.count} Blocks</div>
                <div className="text-[11px] text-slate-500 mt-1">Control branch decoder</div>
              </div>
            </div>

            {/* Always Blocks */}
            <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Procedural Blocks</span>
                <span className="text-[10px] font-bold text-cyan-400 font-mono">
                  {primaryModule.constructs.alwaysBlocks.always + primaryModule.constructs.alwaysBlocks.always_ff + primaryModule.constructs.alwaysBlocks.always_comb} TOTAL
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                <div>always: {primaryModule.constructs.alwaysBlocks.always}</div>
                <div>always_ff: {primaryModule.constructs.alwaysBlocks.always_ff}</div>
                <div>always_comb: {primaryModule.constructs.alwaysBlocks.always_comb}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Port Interface */}
      {primaryModule && (
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Top-Level Interface: <code className="text-cyan-400">{primaryModule.name}</code>
              </h3>
              <p className="text-xs text-slate-400">{primaryModule.ports.length} Verified I/O Ports</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Verilog / SV Interface</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070b14] text-slate-400 border-b border-slate-800 text-[11px] uppercase font-sans">
                <tr>
                  <th className="py-2.5 px-4">Port Name</th>
                  <th className="py-2.5 px-4">Direction</th>
                  <th className="py-2.5 px-4">Bit Width</th>
                  <th className="py-2.5 px-4">Inferred Function</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {primaryModule.ports.map(p => (
                  <tr key={p.name} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-200">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-sans ${
                        p.direction === 'input'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : p.direction === 'output'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-purple-950 text-purple-400 border border-purple-800'
                      }`}>
                        {p.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-cyan-400">
                      {p.width}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans">
                      {p.name === primaryModule.constructs.clock.signalName
                        ? 'Master Clock'
                        : p.name === primaryModule.constructs.reset.signalName
                        ? 'System Reset'
                        : p.direction === 'input'
                        ? 'Input Stimulus Port'
                        : 'Monitored Output Signal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Starter Testbench Preview Modal */}
      {showStarterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1222] border border-cyan-500/40 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#0e172a] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-slate-100 text-sm">
                  Generated Starter Testbench Preview (tb_{primaryModule?.name}.v)
                </h3>
              </div>
              <button
                onClick={() => setShowStarterModal(false)}
                className="text-slate-400 hover:text-slate-100 text-sm"
              >
                Cancel
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-400 font-sans">
                A valid self-checking testbench has been synthesized with verified clock generation, reset pulsing, boundary stimulus, and 32 randomized vectors for <code className="text-cyan-400">{primaryModule?.name}</code>.
              </p>
              <pre className="bg-[#04070e] p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 whitespace-pre-wrap select-all">
                {generatedTbContent}
              </pre>
            </div>

            <div className="px-6 py-3 bg-[#0e172a] border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-sans">
                Marks tests with [isGenerated: true] to maintain verification integrity
              </span>
              <button
                onClick={handleConfirmStarterTB}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
              >
                Add Testbench to Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
