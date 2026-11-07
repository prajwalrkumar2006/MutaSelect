import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Terminal,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Cpu,
  Layers,
  Zap,
  Check,
  FolderOpen,
  Activity,
  Play
} from 'lucide-react';
import { BackendHealth, getBackendUrl, setBackendUrl, detectEdaToolchains, testEdaConnection, configureEdaPath } from '../lib/api';
import { EdaDetectionReport, EdaToolInfo } from '../types';

interface SettingsPageProps {
  backendHealth: BackendHealth;
  onRefreshHealth: () => void;
  isCheckingHealth: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  backendHealth,
  onRefreshHealth,
  isCheckingHealth
}) => {
  const [urlInput, setUrlInput] = useState(getBackendUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // EDA Toolchain State
  const [edaReport, setEdaReport] = useState<EdaDetectionReport | null>(null);
  const [isLoadingEda, setIsLoadingEda] = useState(false);
  const [modelsimPathInput, setModelsimPathInput] = useState('');
  const [vivadoPathInput, setVivadoPathInput] = useState('');
  const [testOutputs, setTestOutputs] = useState<Record<string, any>>({});
  const [testingTool, setTestingTool] = useState<string | null>(null);

  const fetchEdaStatus = async () => {
    setIsLoadingEda(true);
    try {
      const data = await detectEdaToolchains();
      setEdaReport(data);
      if (data.modelsim.customPath) setModelsimPathInput(data.modelsim.customPath);
      if (data.vivado.customPath) setVivadoPathInput(data.vivado.customPath);
    } catch (err) {
      console.error("Failed to detect EDA toolchains:", err);
    } finally {
      setIsLoadingEda(false);
    }
  };

  useEffect(() => {
    fetchEdaStatus();
  }, []);

  const handleSaveUrl = () => {
    setBackendUrl(urlInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onRefreshHealth();
    fetchEdaStatus();
  };

  const handleSavePath = async (tool: 'modelsim' | 'vivado') => {
    const p = tool === 'modelsim' ? modelsimPathInput : vivadoPathInput;
    try {
      await configureEdaPath(tool, p);
      await fetchEdaStatus();
    } catch (err) {
      console.error(`Failed to configure ${tool} path:`, err);
    }
  };

  const handleTestConnection = async (tool: string, customPath?: string) => {
    setTestingTool(tool);
    try {
      const result = await testEdaConnection(tool, customPath);
      setTestOutputs(prev => ({ ...prev, [tool]: result }));
      await fetchEdaStatus();
    } catch (err: any) {
      setTestOutputs(prev => ({
        ...prev,
        [tool]: {
          success: false,
          status: 'EXECUTION_FAILURE',
          message: err.message,
          stderr: err.message,
          exit_code: -1
        }
      }));
    } finally {
      setTestingTool(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INSTALLED_ACCESSIBLE':
        return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">INSTALLED & ACCESSIBLE</span>;
      case 'LICENSE_UNAVAILABLE':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">LICENSE CHECK FAILED</span>;
      case 'INSTALLED_NOT_CONFIGURED':
        return <span className="bg-blue-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">PATH NOT CONFIGURED</span>;
      default:
        return <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">MISSING EXECUTABLE</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 font-mono flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            EDA Toolchain & Local Windows Agent Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect directly to your local ModelSim, Xilinx Vivado Simulator, and execution agent on your Windows machine. Zero mock simulations.
          </p>
        </div>

        <button
          onClick={fetchEdaStatus}
          disabled={isLoadingEda}
          className="px-3.5 py-2 bg-[#152238] hover:bg-[#1a2b47] text-slate-200 border border-[#26364C] rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingEda ? 'animate-spin' : ''}`} />
          <span>Refresh Toolchain Detection</span>
        </button>
      </div>

      {/* ModelSim EDA Tool Card */}
      <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#26364C] gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-100 font-mono">
                1. Mentor Graphics / Siemens ModelSim & QuestaSim
              </h2>
              {edaReport && getStatusBadge(edaReport.modelsim.status)}
            </div>
            <p className="text-xs text-slate-400">
              Executes batch HDL compilation and simulation via <code className="text-cyan-300 font-mono">vlib</code>, <code className="text-cyan-300 font-mono">vlog -sv</code>, and <code className="text-cyan-300 font-mono">vsim -c -do "run -all; quit -f"</code>.
            </p>
          </div>

          <button
            onClick={() => handleTestConnection('modelsim', modelsimPathInput)}
            disabled={testingTool === 'modelsim'}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${testingTool === 'modelsim' ? 'animate-spin' : ''}`} />
            <span>{testingTool === 'modelsim' ? 'Testing vsim...' : 'Test Connection'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-2">
            <label className="block text-slate-300 font-sans font-medium">
              ModelSim Executable Directory (Windows Host / Custom Path)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={modelsimPathInput}
                onChange={e => setModelsimPathInput(e.target.value)}
                placeholder="e.g. C:\intelFPGA\20.1\modelsim_ase\win32aloem or C:\modeltech64_*\win64"
                className="flex-1 bg-[#080D18] border border-[#26364C] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleSavePath('modelsim')}
                className="px-3.5 py-2 bg-[#152238] hover:bg-[#1f3252] text-cyan-400 border border-[#26364C] rounded-lg font-bold text-xs transition"
              >
                Save
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-sans block">
              Common locations: <code className="text-slate-400">C:\intelFPGA\*\modelsim_ase\win32aloem</code>, <code className="text-slate-400">C:\modeltech64_*\win64</code>
            </span>
          </div>

          <div className="bg-[#080D18] p-3.5 rounded-lg border border-[#26364C] space-y-1.5 text-[11px]">
            <div className="text-slate-400 font-sans font-semibold">Detected Binaries:</div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>vsim (Simulation Engine):</span>
              <span className="text-cyan-300 truncate max-w-[200px]">{edaReport?.modelsim.executables.vsim || 'Not Found'}</span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>vlog (HDL Compiler):</span>
              <span className="text-cyan-300 truncate max-w-[200px]">{edaReport?.modelsim.executables.vlog || 'Not Found'}</span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>Version String:</span>
              <span className="text-emerald-400 font-semibold">{edaReport?.modelsim.version || 'Unverified'}</span>
            </div>
          </div>
        </div>

        {/* Live Test Console Output */}
        {testOutputs['modelsim'] && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>vsim -version Execution Output (Exit Code: {testOutputs['modelsim'].exit_code}):</span>
              <span className={testOutputs['modelsim'].success ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                {testOutputs['modelsim'].status}
              </span>
            </div>
            <pre className="bg-[#080D18] p-3 rounded-lg border border-[#26364C] text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-36 whitespace-pre-wrap">
              {testOutputs['modelsim'].stdout || testOutputs['modelsim'].stderr || testOutputs['modelsim'].message}
            </pre>
          </div>
        )}
      </div>

      {/* Xilinx Vivado EDA Tool Card */}
      <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#26364C] gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-100 font-mono">
                2. Xilinx Vivado Simulator
              </h2>
              {edaReport && getStatusBadge(edaReport.vivado.status)}
            </div>
            <p className="text-xs text-slate-400">
              Executes Vivado simulation pipeline via <code className="text-cyan-300 font-mono">xvlog -sv</code>, <code className="text-cyan-300 font-mono">xelab -debug typical</code>, and <code className="text-cyan-300 font-mono">xsim -R</code>.
            </p>
          </div>

          <button
            onClick={() => handleTestConnection('vivado', vivadoPathInput)}
            disabled={testingTool === 'vivado'}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${testingTool === 'vivado' ? 'animate-spin' : ''}`} />
            <span>{testingTool === 'vivado' ? 'Testing xvlog...' : 'Test Connection'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-2">
            <label className="block text-slate-300 font-sans font-medium">
              Vivado Bin Directory (Windows Host / Custom Path)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vivadoPathInput}
                onChange={e => setVivadoPathInput(e.target.value)}
                placeholder="e.g. C:\Xilinx\Vivado\2023.2\bin"
                className="flex-1 bg-[#080D18] border border-[#26364C] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleSavePath('vivado')}
                className="px-3.5 py-2 bg-[#152238] hover:bg-[#1f3252] text-cyan-400 border border-[#26364C] rounded-lg font-bold text-xs transition"
              >
                Save
              </button>
            </div>
            <span className="text-[11px] text-slate-500 font-sans block">
              Common location: <code className="text-slate-400">C:\Xilinx\Vivado\&lt;version&gt;\bin</code>
            </span>
          </div>

          <div className="bg-[#080D18] p-3.5 rounded-lg border border-[#26364C] space-y-1.5 text-[11px]">
            <div className="text-slate-400 font-sans font-semibold">Detected Binaries:</div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>xvlog (Verilog Compiler):</span>
              <span className="text-cyan-300 truncate max-w-[200px]">{edaReport?.vivado.executables.xvlog || 'Not Found'}</span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>xelab (Elaborator):</span>
              <span className="text-cyan-300 truncate max-w-[200px]">{edaReport?.vivado.executables.xelab || 'Not Found'}</span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>xsim (Simulator):</span>
              <span className="text-cyan-300 truncate max-w-[200px]">{edaReport?.vivado.executables.xsim || 'Not Found'}</span>
            </div>
          </div>
        </div>

        {/* Live Test Console Output */}
        {testOutputs['vivado'] && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>xvlog --version Execution Output (Exit Code: {testOutputs['vivado'].exit_code}):</span>
              <span className={testOutputs['vivado'].success ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                {testOutputs['vivado'].status}
              </span>
            </div>
            <pre className="bg-[#080D18] p-3 rounded-lg border border-[#26364C] text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-36 whitespace-pre-wrap">
              {testOutputs['vivado'].stdout || testOutputs['vivado'].stderr || testOutputs['vivado'].message}
            </pre>
          </div>
        )}
      </div>

      {/* Local Windows Agent Startup Guide */}
      <div className="bg-[#111B2D] border border-cyan-900/60 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm font-mono">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span>Local Windows EDA Execution Agent (start_agent.bat)</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          To connect your actual Windows ModelSim and Vivado installations to this web application, run the lightweight local agent on your Windows laptop.
          It uses standard localhost HTTP (<code className="text-cyan-300 font-mono">http://127.0.0.1:8000</code>) with SQLite persistence to safely execute simulation processes in isolated sandboxes.
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-[#080D18] p-3.5 rounded-lg border border-[#26364C] flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Option 1: Windows 1-Click Launch</span>
              <span className="text-slate-200 font-bold">Double-click start_agent.bat in the project repository root</span>
            </div>
            <span className="text-emerald-400 text-xs font-bold border border-emerald-800 bg-emerald-950 px-2 py-0.5 rounded">RECOMMENDED</span>
          </div>

          <div className="bg-[#080D18] p-3.5 rounded-lg border border-[#26364C] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase">Option 2: Windows PowerShell / Command Prompt</span>
              <code className="text-cyan-300 select-all">python local_eda_agent.py --port 8000</code>
            </div>
            <button
              onClick={() => copyToClipboard('python local_eda_agent.py --port 8000', 'agent_cmd')}
              className="p-1.5 hover:text-cyan-300 text-slate-400 transition"
              title="Copy Command"
            >
              {copiedCmd === 'agent_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
