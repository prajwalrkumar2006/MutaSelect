import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  Lock,
  ArrowRight,
  Cpu,
  Clock,
  Terminal,
  AlertTriangle,
  Play
} from 'lucide-react';
import { ConfigSnapshot, Project, SimulatorType, ModuleDefinition } from '../types';

interface ConfigReviewPageProps {
  project: Project | null;
  config: ConfigSnapshot | null;
  onConfirmConfig: (newConfig: ConfigSnapshot) => void;
  onNavigate: (page: any) => void;
  isConfirmed: boolean;
}

export const ConfigReviewPage: React.FC<ConfigReviewPageProps> = ({
  project,
  config,
  onConfirmConfig,
  onNavigate,
  isConfirmed
}) => {
  const design = project?.design;
  const primaryModule = design?.modules.find(m => m.name === design?.selectedTopModule) || design?.modules[0];

  const [topModule, setTopModule] = useState(
    config?.topModule || design?.selectedTopModule || primaryModule?.name || ''
  );
  const [simulator, setSimulator] = useState<SimulatorType>(config?.simulator || 'verilator');
  const [timeoutSec, setTimeoutSec] = useState(config?.perTestTimeoutSec || 15);
  const [passFailRule, setPassFailRule] = useState<'exit_code' | 'regex' | 'string_marker'>(
    config?.passFailRule || 'exit_code'
  );
  const [clockSignal, setClockSignal] = useState(
    config?.clockInfo?.signalName || primaryModule?.constructs.clock.signalName || ''
  );
  const [clockPeriod, setClockPeriod] = useState(config?.clockInfo?.periodNs || 10);
  const [resetSignal, setResetSignal] = useState(
    config?.resetInfo?.signalName || primaryModule?.constructs.reset.signalName || ''
  );
  const [resetActiveLow, setResetActiveLow] = useState(
    primaryModule?.constructs.reset.polarity === 'active_low'
  );
  const [customFlags, setCustomFlags] = useState(config?.customCompileCmd || '');

  // Synchronize when active project changes
  useEffect(() => {
    if (design) {
      const top = design.selectedTopModule || design.modules[0]?.name || '';
      setTopModule(top);
      const mod = design.modules.find(m => m.name === top) || design.modules[0];
      if (mod) {
        setClockSignal(mod.constructs.clock.signalName || '');
        setResetSignal(mod.constructs.reset.signalName || '');
        setResetActiveLow(mod.constructs.reset.polarity === 'active_low');
      }
    }
  }, [project?.id]);

  const handleSaveAndConfirm = () => {
    const paramsMap: { [key: string]: string } = {};
    if (primaryModule?.parameters) {
      primaryModule.parameters.forEach(p => {
        paramsMap[p.name] = p.defaultValue;
      });
    }

    const updated: ConfigSnapshot = {
      id: `cfg-${Date.now()}-snapshot`,
      projectId: project?.id || 'active-project',
      topModule,
      compileOrder: design?.compileOrder || [],
      includeDirs: design?.includes || [],
      defines: {},
      parameters: paramsMap,
      simulator,
      testbenchType: design?.testbenchInfo.type || 'verilog_self_checking',
      tests: design?.testbenchInfo.tests || config?.tests || [],
      perTestTimeoutSec: timeoutSec,
      passFailRule,
      clockInfo: clockSignal ? { signalName: clockSignal, periodNs: clockPeriod } : undefined,
      resetInfo: resetSignal ? { signalName: resetSignal, activeLow: resetActiveLow } : undefined,
      confirmedAt: new Date().toISOString(),
      version: (config?.version || 0) + 1
    };

    onConfirmConfig(updated);
    onNavigate('baseline');
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-[#0b1222] border border-cyan-500/30 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 font-mono">
              Mandatory Configuration Review Gate
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded font-mono border ${
              isConfirmed
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-amber-950 text-amber-400 border-amber-800'
            }`}>
              {isConfirmed ? 'SNAPSHOT FROZEN' : 'CONFIRMATION REQUIRED'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic configuration derived from {project?.name || 'design'}. Every parameter is verified and editable before baseline simulation.
          </p>
        </div>

        <button
          onClick={handleSaveAndConfirm}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 shrink-0"
        >
          <Lock className="w-4 h-4" />
          <span>Confirm & Freeze Snapshot</span>
        </button>
      </div>

      {/* Editable Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Module & Compiler */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Top-Level Module & Compiler
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Top-Level Synthesizable Module
            </label>
            {design && design.modules.length > 1 ? (
              <select
                value={topModule}
                onChange={(e) => setTopModule(e.target.value)}
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              >
                {design.modules.filter(m => !m.isTestbench).map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name} (File: {m.file}, {m.ports.length} ports)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={topModule}
                onChange={(e) => setTopModule(e.target.value)}
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              Inferred from module hierarchy tree. Select intended root module if multiple submodules exist.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Target HDL Simulator (ModelSim, Vivado, or Icarus)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['modelsim', 'vivado', 'iverilog', 'verilator'] as SimulatorType[]).map(sim => (
                <button
                  key={sim}
                  type="button"
                  onClick={() => setSimulator(sim)}
                  className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border transition ${
                    simulator === sim
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-sm'
                      : 'bg-[#070b14] text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sim === 'modelsim' ? 'ModelSim' : sim === 'vivado' ? 'Vivado' : sim === 'iverilog' ? 'Icarus Verilog' : 'Verilator'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {simulator === 'modelsim'
                ? 'ModelSim / Questa: Mentor Graphics industrial batch engine (vlib work, vlog -sv, vsim -c -do "run -all; quit -f").'
                : simulator === 'vivado'
                ? 'Xilinx Vivado Simulator: Enterprise FPGA simulator (xvlog -sv, xelab -debug typical, xsim -R).'
                : simulator === 'iverilog'
                ? 'Icarus Verilog: IEEE 1364/2005 4-state simulation engine (iverilog -g2012, vvp).'
                : 'Verilator: High-performance 2-state cycle simulator with C++ multithreading.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Custom Compilation Directives
            </label>
            <input
              type="text"
              placeholder="-Wall -Wno-fatal -DDEBUG=1"
              value={customFlags}
              onChange={(e) => setCustomFlags(e.target.value)}
              className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Clock, Reset, and Pass/Fail Settings */}
        <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Clock, Reset & Execution Safeguards
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Clock Signal
              </label>
              <input
                type="text"
                placeholder="Leave blank if combinational"
                value={clockSignal}
                onChange={(e) => setClockSignal(e.target.value)}
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Clock Period (ns)
              </label>
              <input
                type="number"
                min={1}
                value={clockPeriod}
                onChange={(e) => setClockPeriod(Number(e.target.value))}
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reset Signal
              </label>
              <input
                type="text"
                placeholder="Leave blank if no reset"
                value={resetSignal}
                onChange={(e) => setResetSignal(e.target.value)}
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Reset Polarity
              </label>
              <select
                value={resetActiveLow ? 'low' : 'high'}
                onChange={(e) => setResetActiveLow(e.target.value === 'low')}
                className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="low">Active Low (rst_n == 0)</option>
                <option value="high">Active High (rst == 1)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Per-Test Timeout (Seconds)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Number(e.target.value))}
              className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Pass / Fail Assertion Metric
            </label>
            <select
              value={passFailRule}
              onChange={(e) => setPassFailRule(e.target.value as any)}
              className="w-full bg-[#070b14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="exit_code">Process Exit Code == 0 (Standard IEEE)</option>
              <option value="string_marker">Presence of "[PASS]" / "[FAIL]" Markers</option>
              <option value="regex">Regex Assertion Failure Scan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Snapshot Confirmation Footer */}
      <div className="p-4 bg-[#070b14] border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="text-slate-400">
          <strong className="text-slate-200">Snapshot Integrity:</strong> Freezing stores this hardware snapshot in Firestore. It will be referenced by baseline runs and all subsequent mutation jobs.
        </div>
        <button
          onClick={handleSaveAndConfirm}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>Confirm & Proceed to Baseline Gate</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
