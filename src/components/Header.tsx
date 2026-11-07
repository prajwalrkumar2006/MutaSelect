import React from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  Sparkles,
  Database,
  ChevronDown,
  RefreshCw,
  Terminal,
  Layers,
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Project, Experiment } from '../types';

interface HeaderProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project) => void;
  backendOnline: boolean;
  backendLatency?: number;
  simulatorsDetected?: { verilator: boolean; iverilog: boolean };
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenSettings: () => void;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
  currentExperiment: Experiment | null;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  backendOnline,
  backendLatency,
  simulatorsDetected,
  isDemoMode,
  onToggleDemoMode,
  onOpenSettings,
  isCheckingHealth,
  onRefreshHealth,
  currentExperiment
}) => {
  const getExperimentStatusLabel = () => {
    if (!currentExperiment) return { text: 'No Experiment', color: 'text-slate-400 border-slate-700 bg-slate-800' };
    if (currentExperiment.safetyReport?.status === 'passed') {
      return { text: 'Optimized & Certified', color: 'text-emerald-400 border-emerald-800 bg-emerald-950/80' };
    }
    if (currentExperiment.killMatrix) {
      return { text: 'Mutations Evaluated', color: 'text-cyan-400 border-cyan-800 bg-cyan-950/80' };
    }
    if (currentExperiment.baseline?.passed) {
      return { text: 'Baseline Verified', color: 'text-cyan-400 border-cyan-800 bg-cyan-950/80' };
    }
    if (currentExperiment.config?.confirmedAt) {
      return { text: 'Config Confirmed', color: 'text-indigo-400 border-indigo-800 bg-indigo-950/80' };
    }
    return { text: 'Draft Setup', color: 'text-slate-400 border-slate-700 bg-slate-800' };
  };

  const expStatus = getExperimentStatusLabel();

  return (
    <header className="h-16 bg-[#0B1220] border-b border-[#26364C] px-4 lg:px-6 flex items-center justify-between z-30 sticky top-0 select-none">
      {/* Brand & Project Context */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#22B8CF] to-[#6366F1] flex items-center justify-center shadow-md shadow-cyan-900/30">
            <Cpu className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#E8EEF7] font-mono">
                Muta<span className="text-[#22B8CF]">Select</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 text-[#22B8CF] bg-[#111B2D] border border-[#22B8CF]/40 rounded font-mono font-semibold">
                EDA
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8] hidden sm:block tracking-wide uppercase font-medium">
              Universal RTL Mutation & ML Regression
            </p>
          </div>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative group">
          <div className="flex items-center space-x-2.5 bg-[#111B2D] border border-[#26364C] hover:border-[#22B8CF]/60 rounded-lg px-3 py-1.5 cursor-pointer text-xs transition">
            <Database className="w-3.5 h-3.5 text-[#22B8CF]" />
            <div className="flex flex-col text-left">
              <span className="text-[#E8EEF7] font-medium max-w-[150px] sm:max-w-[210px] truncate leading-tight">
                {selectedProject ? selectedProject.name : 'Select Project'}
              </span>
              {selectedProject && (
                <span className="text-[10px] text-[#94A3B8] font-mono leading-none">
                  {selectedProject.design?.files.length || 0} files &bull; {selectedProject.design?.selectedTopModule || 'DUT'}
                </span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>

          <div className="absolute left-0 mt-1 w-72 bg-[#111B2D] border border-[#26364C] rounded-lg shadow-2xl py-1.5 hidden group-hover:block z-50">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-[#26364C] flex justify-between items-center">
              <span>Hardware Projects</span>
              <span className="font-mono text-[9px] text-[#22B8CF]">{projects.length} available</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[#26364C]/50">
              {projects.map(proj => (
                <button
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#152238] transition ${
                    selectedProject?.id === proj.id ? 'text-[#22B8CF] bg-[#152238] font-semibold' : 'text-[#E8EEF7]'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="truncate font-medium">{proj.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Top: {proj.design?.selectedTopModule || 'Auto'}
                    </div>
                  </div>
                  {proj.isSample && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-[#26364C] shrink-0">
                      Ref Design
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Experiment Status Capsule */}
      <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-[#111B2D] border border-[#26364C] rounded-lg text-xs font-mono">
        <Activity className="w-3.5 h-3.5 text-[#22B8CF]" />
        <span className="text-slate-400">Experiment:</span>
        <span className={`px-1.5 py-0.2 rounded text-[10px] border ${expStatus.color}`}>
          {expStatus.text}
        </span>
      </div>

      {/* Status Indicators & Controls */}
      <div className="flex items-center space-x-3">
        {/* Backend Connectivity Status */}
        <div
          onClick={onOpenSettings}
          className="flex items-center space-x-2 bg-[#111B2D] border border-[#26364C] hover:border-slate-600 rounded-lg px-2.5 py-1.5 cursor-pointer text-xs transition"
          title={
            backendOnline
              ? `Backend Connected (${backendLatency || 10}ms) | Simulators: ${
                  simulatorsDetected?.verilator ? 'Verilator' : ''
                } ${simulatorsDetected?.iverilog ? 'Icarus Verilog' : ''}`
              : 'Backend disconnected. Click to inspect Worker & Settings.'
          }
        >
          {backendOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[#94A3B8] font-medium hidden md:inline">Simulator:</span>
              <span className="text-[#10B981] font-mono text-xs font-semibold">Online</span>
              {backendLatency && (
                <span className="text-slate-500 text-[10px] font-mono hidden sm:inline">
                  {backendLatency}ms
                </span>
              )}
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-[#94A3B8] font-medium hidden md:inline">Simulator:</span>
              <span className="text-[#F43F5E] font-mono text-xs font-semibold">Offline</span>
            </>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefreshHealth();
            }}
            className={`p-1 hover:text-[#22B8CF] text-slate-400 transition ${
              isCheckingHealth ? 'animate-spin text-[#22B8CF]' : ''
            }`}
            title="Probe backend simulators"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {/* Live Execution vs Demo Mode Switch */}
        <button
          onClick={onToggleDemoMode}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            isDemoMode
              ? 'bg-amber-950/60 border-amber-600/70 text-amber-300 hover:bg-amber-950/80'
              : 'bg-[#152238] border-[#22B8CF]/60 text-[#22B8CF] hover:bg-[#111B2D]'
          }`}
          title={
            isDemoMode
              ? 'Demo Mode Active: Using offline reference data. Click to switch to Live Execution.'
              : 'Live Mode Active: Executing real local or Cloud Run hardware simulations. Click to switch to Demo Mode.'
          }
        >
          {isDemoMode ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Demo Mode</span>
            </>
          ) : (
            <>
              <Terminal className="w-3.5 h-3.5 text-[#22B8CF]" />
              <span className="hidden sm:inline">Live Mode</span>
            </>
          )}
        </button>

        {/* EDA Engineer Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#26364C]">
          <div
            className="w-8 h-8 rounded-lg bg-[#111B2D] border border-[#22B8CF]/40 flex items-center justify-center text-xs font-bold text-[#22B8CF] font-mono"
            title="Verification Engineer Session"
          >
            EDA
          </div>
        </div>
      </div>
    </header>
  );
};
