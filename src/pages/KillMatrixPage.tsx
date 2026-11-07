import React, { useState } from 'react';
import {
  Grid3X3,
  Download,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  Info,
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { KillMatrixData, Mutant, StageStatus } from '../types';
import { StagePrerequisiteBanner } from '../components/StagePrerequisiteBanner';

interface KillMatrixPageProps {
  killMatrix: KillMatrixData | null;
  onNavigate: (page: any) => void;
  onInspectEvidence: (evidence: any, title?: string) => void;
  stageStatus: StageStatus;
  baselinePassed: boolean;
}

export const KillMatrixPage: React.FC<KillMatrixPageProps> = ({
  killMatrix,
  onNavigate,
  onInspectEvidence,
  stageStatus,
  baselinePassed
}) => {
  const [selectedCell, setSelectedCell] = useState<{ testId: string; mutantId: string } | null>(null);

  if (!killMatrix) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <StagePrerequisiteBanner
          stageName="Kill Matrix Heatmap"
          status={stageStatus}
          prerequisiteName="Mutation Analysis"
          prerequisitePage={baselinePassed ? 'mutations' : 'baseline'}
          missingReason={
            baselinePassed
              ? "Mutations have not been simulated yet. Execute the mutation engine to generate the test-by-mutant kill matrix."
              : "Baseline verification must be cleared before generating mutants and computing the kill matrix."
          }
          onNavigatePrerequisite={onNavigate}
        />

        <div className="bg-[#111B2D] border border-[#26364C] rounded-xl p-10 max-w-2xl mx-auto text-center space-y-4">
          <Grid3X3 className="w-12 h-12 mx-auto text-[#22B8CF]" />
          <h2 className="text-base font-bold text-[#E8EEF7]">Kill Matrix Not Yet Generated</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The Kill Matrix requires running both Baseline Verification and Mutation Analysis. Once mutants are simulated, each test's detection capability against every injected fault will appear in this interactive execution grid.
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

  const { tests, mutants, cells, mutationScore } = killMatrix;
  const survivingMutants = mutants.filter(m => m.status === 'survived');

  // Export to CSV
  const handleExportCSV = () => {
    let csv = `Test Name,` + mutants.map(m => m.id).join(',') + `\n`;
    tests.forEach(t => {
      const row = [t.name];
      mutants.forEach(m => {
        const cell = cells[`${t.id}__${m.id}`];
        row.push(cell?.detected ? '1' : '0');
      });
      csv += row.join(',') + `\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kill_matrix_${killMatrix.experimentId}.csv`;
    a.click();
  };

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(killMatrix, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `kill_matrix_${killMatrix.experimentId}.json`);
    dlAnchor.click();
  };

  const getStimulusSuggestion = (mutant: Mutant): string => {
    switch (mutant.category) {
      case 'relational':
        return 'Missing boundary stimulus: Stimulate corner-case values right at boundaries with alternating single-cycle enables.';
      case 'constant_boundary':
        return 'Missing off-by-one verification: Validate exact watermark flags at (THRESHOLD-1), (THRESHOLD), and (THRESHOLD+1).';
      case 'fsm_state_corrupt':
        return 'Missing invalid state transition test: Drive unmapped bus transactions and observe timeout recovery logic.';
      case 'reset_value':
        return 'Missing asynchronous reset check: Assert reset mid-transaction while pipeline is executing simultaneous load/store.';
      default:
        return 'Enhance randomized constrained stimulus coverage around this state path.';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111B2D] border border-[#26364C] p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#E8EEF7] font-mono flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-[#22B8CF]" />
              Full Regression Kill Matrix
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-[#22B8CF] border border-cyan-800 font-mono">
              Score: {mutationScore}%
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 font-mono">
            Deterministic {tests.length} tests × {mutants.length} mutants execution grid. Green indicates test killed mutant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#152238] hover:bg-[#26364C] text-slate-200 rounded-lg text-xs font-semibold border border-[#26364C] transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#22B8CF]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-[#152238] hover:bg-[#26364C] text-slate-200 rounded-lg text-xs font-semibold border border-[#26364C] transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#22B8CF]" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => onNavigate('selector')}
            className="px-4 py-2 bg-[#22B8CF] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-900/30"
          >
            <span>AI Test Selector</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="bg-[#111B2D] border border-[#26364C] rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-[#152238] border-b border-[#26364C] flex items-center justify-between text-xs font-mono">
          <span className="text-slate-200 font-bold">Interactive Test × Mutant Grid</span>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
              <span className="text-[#94A3B8]">Killed (Detected)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-rose-500/80 rounded-sm" />
              <span className="text-[#94A3B8]">Survived</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-slate-700 rounded-sm" />
              <span className="text-[#94A3B8]">Invalid / N/A</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto p-4 max-h-[500px]">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left bg-[#152238] border border-[#26364C] text-[#94A3B8] font-mono sticky left-0 z-10 w-48">
                  Test Routine
                </th>
                {mutants.map(m => (
                  <th
                    key={m.id}
                    className="p-1.5 text-center bg-[#152238] border border-[#26364C] font-mono text-[10px] text-slate-300 min-w-[36px]"
                    title={`${m.id} (${m.category}) - ${m.operatorDescription}`}
                  >
                    <div className="truncate max-w-[40px]">{m.id.split('_').pop()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t.id} className="hover:bg-[#152238]/50">
                  <td className="p-2 bg-[#111B2D] border border-[#26364C] font-mono font-medium text-slate-200 sticky left-0 z-10 truncate max-w-[200px]">
                    {t.name}
                  </td>
                  {mutants.map(m => {
                    const cellKey = `${t.id}__${m.id}`;
                    const cell = cells[cellKey];
                    const isKilled = cell?.detected;
                    const isInvalid = m.status === 'invalid';

                    return (
                      <td
                        key={m.id}
                        onClick={() => setSelectedCell({ testId: t.id, mutantId: m.id })}
                        className={`p-1.5 text-center border border-[#26364C] cursor-pointer transition ${
                          isInvalid
                            ? 'bg-slate-800 text-slate-500'
                            : isKilled
                            ? 'bg-emerald-950/80 hover:bg-emerald-800/80 text-emerald-400'
                            : 'bg-rose-950/70 hover:bg-rose-800/70 text-rose-400'
                        }`}
                        title={`Test: ${t.name}\nMutant: ${m.id} (${m.category})\nStatus: ${isInvalid ? 'Invalid' : isKilled ? 'KILLED' : 'SURVIVED'}`}
                      >
                        {isInvalid ? (
                          <span className="text-[10px] text-slate-600">-</span>
                        ) : isKilled ? (
                          <Check className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 mx-auto text-rose-400" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Surviving Mutants & Stimulus Suggestions */}
      {survivingMutants.length > 0 && (
        <div className="bg-[#111B2D] border border-amber-800/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Surviving Mutant Analysis & Recommended Verification Stimuli ({survivingMutants.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {survivingMutants.slice(0, 4).map(m => (
              <div key={m.id} className="bg-[#152238] p-3.5 rounded-lg border border-[#26364C] space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-amber-300 font-bold">{m.id}</span>
                  <span className="text-[10px] text-[#94A3B8]">{m.file}:{m.line}</span>
                </div>
                <div className="text-slate-300 font-mono text-[11px] bg-[#080D18] p-2 rounded">
                  <code>{m.mutatedSnippet}</code>
                </div>
                <div className="text-slate-300 text-[11px] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{getStimulusSuggestion(m)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
