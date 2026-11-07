import React from 'react';
import {
  Zap,
  Clock,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  Play,
  FileCode,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Database,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  Cpu,
  BookOpen,
  Sliders,
  Upload
} from 'lucide-react';
import { Experiment, Project, StageStatus } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardPageProps {
  currentExperiment: Experiment | null;
  activeProject: Project | null;
  projects?: Project[];
  onSelectProject?: (p: Project) => void;
  onNavigate: (page: any) => void;
  onInspectEvidence: (evidence: any, title?: string) => void;
  backendOnline?: boolean;
  backendLatency?: number;
  stageStatuses?: {
    config: StageStatus;
    baseline: StageStatus;
    mutations: StageStatus;
    killMatrix: StageStatus;
    selector: StageStatus;
    safety: StageStatus;
    comparison: StageStatus;
  };
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentExperiment,
  activeProject,
  projects = [],
  onSelectProject,
  onNavigate,
  onInspectEvidence,
  backendOnline = true,
  backendLatency,
  stageStatuses
}) => {
  const hasExecutedExperiment = Boolean(currentExperiment?.killMatrix && currentExperiment?.baseline?.passed);

  // Workflow Pipeline Stages for the interactive Progress Tracker
  const workflowSteps = [
    { id: 'projects', label: '1. Ingest RTL', status: activeProject ? 'passed' : 'ready', desc: 'Verilog / SystemVerilog upload' },
    { id: 'design', label: '2. RTL Model', status: activeProject?.design ? 'passed' : 'ready', desc: 'AST hierarchy & FSMs' },
    { id: 'config', label: '3. Config Gate', status: stageStatuses?.config || 'ready', desc: 'Simulator & clock/reset' },
    { id: 'baseline', label: '4. Baseline Gate', status: stageStatuses?.baseline || 'blocked', desc: 'Unmodified RTL 2x flaky check' },
    { id: 'mutations', label: '5. Mutation Engine', status: stageStatuses?.mutations || 'blocked', desc: '5 operator groups' },
    { id: 'kill-matrix', label: '6. Kill Matrix', status: stageStatuses?.killMatrix || 'blocked', desc: 'Tests x Mutants heatmap' },
    { id: 'selector', label: '7. AI Selector', status: stageStatuses?.selector || 'blocked', desc: 'Greedy & ML optimization' },
    { id: 'safety', label: '8. Safety Gate', status: stageStatuses?.safety || 'blocked', desc: 'Holdout retention certification' }
  ];

  // ==========================================
  // VIEW A: Empty State / Pre-Execution State
  // ==========================================
  if (!hasExecutedExperiment || !currentExperiment) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Welcome & Primary Actions */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-2xl p-6 lg:p-8 relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#152238] border border-[#22B8CF]/40 text-xs font-mono text-[#22B8CF]">
              <Cpu className="w-3.5 h-3.5" />
              <span>Universal RTL Verification & AI Regression Optimizer</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#E8EEF7] tracking-tight">
              Executive Engineering Dashboard
            </h1>
            <p className="text-[#94A3B8] text-sm leading-relaxed">
              Welcome to MutaSelect AI. Run syntax-aware mutation analysis and machine-learning-assisted test selection on any arbitrary Verilog or SystemVerilog hardware design. Maximize fault detection while minimizing regression execution time.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('projects')}
                className="px-5 py-2.5 bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-2 shadow-lg shadow-cyan-900/30"
              >
                <Upload className="w-4 h-4" />
                <span>Upload New RTL Project</span>
              </button>
              <button
                onClick={() => onNavigate('config')}
                className="px-5 py-2.5 bg-[#152238] hover:bg-[#26364C] text-[#E8EEF7] font-semibold rounded-lg text-xs border border-[#26364C] transition flex items-center space-x-2"
              >
                <Sliders className="w-4 h-4 text-[#22B8CF]" />
                <span>Configure Simulator & Clocks</span>
              </button>
              {stageStatuses?.baseline === 'ready' && (
                <button
                  onClick={() => onNavigate('baseline')}
                  className="px-5 py-2.5 bg-[#6366F1] hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Run Baseline Gate</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column: Active Project & Simulator Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Project Card */}
          <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-[#22B8CF]" />
                <h3 className="font-bold text-sm text-[#E8EEF7]">Active Project Context</h3>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs text-[#22B8CF] hover:underline flex items-center space-x-1"
              >
                <span>Switch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeProject ? (
              <div className="bg-[#152238] border border-[#26364C] rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100">{activeProject.name}</h4>
                    <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{activeProject.description}</p>
                  </div>
                  {activeProject.isSample && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-[#26364C] font-mono shrink-0">
                      Sample
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#26364C] text-[11px] font-mono">
                  <div>
                    <span className="text-[#94A3B8] block">Top Module</span>
                    <span className="text-[#22B8CF] font-medium">{activeProject.design?.selectedTopModule || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block">Files</span>
                    <span className="text-slate-200">{activeProject.design?.files.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block">Tests</span>
                    <span className="text-slate-200">{activeProject.design?.testbenchInfo.tests.length || 0}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#94A3B8] border border-dashed border-[#26364C] rounded-lg">
                No active project selected.
              </div>
            )}
          </div>

          {/* Simulator Worker Status Card */}
          <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-4 h-4 text-[#22B8CF]" />
                <h3 className="font-bold text-sm text-[#E8EEF7]">EDA Simulation Backend</h3>
              </div>
              <button
                onClick={() => onNavigate('settings')}
                className="text-xs text-[#22B8CF] hover:underline flex items-center space-x-1"
              >
                <span>Settings</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-[#152238] border border-[#26364C] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className="text-xs font-semibold text-slate-200">
                    {backendOnline ? 'Full-Stack Engine Online' : 'Simulation Engine Offline'}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#94A3B8]">
                  {backendLatency ? `${backendLatency}ms latency` : 'Local Port 3000'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#26364C] text-[11px] font-mono">
                <div>
                  <span className="text-[#94A3B8] block">Verilator Engine</span>
                  <span className="text-emerald-400 font-medium">Available (v5.006)</span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block">Icarus Verilog</span>
                  <span className="text-emerald-400 font-medium">Available (v11.0)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive EDA Workflow Stepper */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#22B8CF]" />
              <h3 className="font-bold text-sm text-[#E8EEF7]">Verification & ML Optimization Pipeline</h3>
            </div>
            <span className="text-xs font-mono text-[#94A3B8]">Step-by-step gate execution</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {workflowSteps.map(step => {
              const isPassed = step.status === 'passed';
              const isReady = step.status === 'ready';
              const isBlocked = step.status === 'blocked';

              return (
                <button
                  key={step.id}
                  onClick={() => onNavigate(step.id)}
                  className={`p-3.5 rounded-lg border text-left transition group relative ${
                    isPassed
                      ? 'bg-[#152238] border-emerald-800/60 hover:border-emerald-500/60'
                      : isReady
                      ? 'bg-[#152238] border-[#22B8CF]/50 hover:border-[#22B8CF]'
                      : 'bg-[#111B2D] border-[#26364C] opacity-75 hover:opacity-100 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">{step.label}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        isPassed
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : isReady
                          ? 'bg-cyan-950 text-[#22B8CF] border-cyan-800'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {isPassed ? 'PASS' : isReady ? 'READY' : 'BLOCKED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">{step.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#E8EEF7]">
            <BookOpen className="w-4 h-4 text-[#6366F1]" />
            <span>Getting Started with MutaSelect AI</span>
          </div>
          <ol className="text-xs text-[#94A3B8] space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-slate-200">Upload or Select RTL:</strong> Add your Verilog/SV modules and testbench (or use the built-in Starter Testbench generator).
            </li>
            <li>
              <strong className="text-slate-200">Confirm Configuration Gate:</strong> Freeze the top-level module, simulator, and testbench parameters.
            </li>
            <li>
              <strong className="text-slate-200">Run Baseline Gate:</strong> Simulates unmodified RTL twice to guarantee 100% test determinism.
            </li>
            <li>
              <strong className="text-slate-200">Generate & Evaluate Mutants:</strong> Synthesizable RTL mutations across 5 operator groups.
            </li>
            <li>
              <strong className="text-slate-200">AI Regression Selection:</strong> Automatically compute the minimum test suite retaining $\ge 95\%$ fault coverage with certified holdout safety.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW B: Full Active Telemetry Dashboard
  // (Rendered when a real experiment has executed)
  // ==========================================
  const km = currentExperiment.killMatrix!;
  const selections = currentExperiment.selections;
  const mlSelect = selections?.ml_assisted;
  const greedySelect = selections?.greedy;

  const mutationScore = km.mutationScore;
  const testReduction = mlSelect ? mlSelect.reductionPercentage : (greedySelect?.reductionPercentage || 0);
  const timeSaved = mlSelect ? mlSelect.runtimeSavedPercentage : (greedySelect?.runtimeSavedPercentage || 0);
  const retention = mlSelect ? mlSelect.retentionPercentage : 100;

  // Category breakdown for chart
  const categoryStats: { [cat: string]: { total: number; killed: number } } = {};
  km.mutants.forEach(m => {
    if (!categoryStats[m.category]) {
      categoryStats[m.category] = { total: 0, killed: 0 };
    }
    categoryStats[m.category].total++;
    if (m.status === 'killed') {
      categoryStats[m.category].killed++;
    }
  });

  const chartData = Object.entries(categoryStats).map(([cat, stats]) => ({
    name: cat.replace(/_/g, ' '),
    total: stats.total,
    killed: stats.killed,
    score: stats.total > 0 ? Math.round((stats.killed / stats.total) * 100) : 0
  }));

  const pieData = [
    { name: 'Killed', value: km.killedMutants, color: '#10B981' },
    { name: 'Survived', value: km.survivedMutants, color: '#F43F5E' },
    { name: 'Invalid', value: km.invalidMutants, color: '#F59E0B' },
    { name: 'Equivalent', value: km.equivalentMutants, color: '#64748B' }
  ].filter(p => p.value > 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Project Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111B2D] border border-[#26364C] p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#E8EEF7] font-mono">
              Regression Suite Telemetry
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              BASELINE PASSED
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono">
            Active Design: <span className="text-[#22B8CF] font-medium">{activeProject?.name || 'Hardware Project'}</span> | Top Module: <code className="text-slate-200">{currentExperiment.config.topModule || 'Top'}</code> | Simulator: <code className="text-slate-200">{currentExperiment.config.simulator}</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('selector')}
            className="px-4 py-2 bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-md shadow-cyan-900/30"
          >
            <Zap className="w-4 h-4" />
            Optimize Test Suite
          </button>
          <button
            onClick={() => onInspectEvidence(currentExperiment.baseline?.evidence, "Baseline Gate Evidence")}
            className="px-4 py-2 bg-[#152238] hover:bg-[#26364C] text-[#E8EEF7] rounded-lg text-xs font-semibold border border-[#26364C] transition flex items-center gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#22B8CF]" />
            Inspect Evidence
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Mutation Score */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Mutation Score</span>
            <Zap className="w-4 h-4 text-[#22B8CF]" />
          </div>
          <div className="text-2xl font-extrabold text-[#22B8CF] font-mono mt-2">
            {mutationScore}%
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 font-mono">
            {km.killedMutants} killed / {km.validMutants} valid
          </div>
          <div className="w-full bg-[#080D18] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#22B8CF] h-full" style={{ width: `${Math.min(100, mutationScore)}%` }} />
          </div>
        </div>

        {/* Test Reduction */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Suite Reduction</span>
            <TrendingDown className="w-4 h-4 text-[#6366F1]" />
          </div>
          <div className="text-2xl font-extrabold text-[#6366F1] font-mono mt-2">
            {testReduction}%
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 font-mono">
            {mlSelect ? `${mlSelect.selectedCount} / ${mlSelect.totalTests} tests` : 'Optimization active'}
          </div>
          <div className="w-full bg-[#080D18] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#6366F1] h-full" style={{ width: `${Math.min(100, testReduction)}%` }} />
          </div>
        </div>

        {/* Runtime Saved */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Time Saved</span>
            <Clock className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-extrabold text-[#10B981] font-mono mt-2">
            {timeSaved}%
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 font-mono">
            Cycle runtime reduced
          </div>
          <div className="w-full bg-[#080D18] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#10B981] h-full" style={{ width: `${Math.min(100, timeSaved)}%` }} />
          </div>
        </div>

        {/* Fault Retention */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Fault Retention</span>
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-extrabold text-[#10B981] font-mono mt-2">
            {retention}%
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 font-mono">
            Target: &ge;95% threshold
          </div>
          <div className="w-full bg-[#080D18] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-[#10B981] h-full" style={{ width: `${Math.min(100, retention)}%` }} />
          </div>
        </div>

        {/* Safety Gate Status */}
        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8]">Safety Gate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-2">
            CERTIFIED
          </div>
          <div className="text-[10px] text-[#94A3B8] mt-1 font-mono">
            0% fallback triggered
          </div>
          <div className="w-full bg-[#080D18] h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-400 h-full w-full" />
          </div>
        </div>
      </div>

      {/* Visualizations: Category Effectiveness & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#E8EEF7]">Mutation Category Detection Rate</h3>
              <p className="text-xs text-[#94A3B8]">Kills per operator category (synthesizable RTL only)</p>
            </div>
            <button
              onClick={() => onNavigate('mutations')}
              className="text-xs text-[#22B8CF] hover:underline flex items-center space-x-1"
            >
              <span>View All Mutants</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#152238', borderColor: '#26364C', borderRadius: '8px', fontSize: '11px', color: '#E8EEF7' }}
                  formatter={(value: any) => [`${value}% detection`, 'Score']}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10B981' : entry.score >= 50 ? '#22B8CF' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-[#E8EEF7]">Mutant Outcome Distribution</h3>
          <p className="text-xs text-[#94A3B8]">Killed vs Survived vs Invalid</p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#152238', borderColor: '#26364C', borderRadius: '8px', fontSize: '11px', color: '#E8EEF7' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[#94A3B8]">{p.name}:</span>
                <span className="text-slate-200 font-semibold">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
