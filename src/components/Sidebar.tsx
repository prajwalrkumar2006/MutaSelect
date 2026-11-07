import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Cpu,
  Sliders,
  CheckCircle2,
  Zap,
  Grid3X3,
  BrainCircuit,
  ShieldCheck,
  GitCompare,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
  AlertTriangle,
  Play
} from 'lucide-react';
import { StageStatus } from '../types';

export type NavPage =
  | 'dashboard'
  | 'projects'
  | 'design'
  | 'config'
  | 'baseline'
  | 'mutations'
  | 'kill-matrix'
  | 'selector'
  | 'safety'
  | 'comparison'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  stageStatuses: {
    config: StageStatus;
    baseline: StageStatus;
    mutations: StageStatus;
    killMatrix: StageStatus;
    selector: StageStatus;
    safety: StageStatus;
    comparison: StageStatus;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  stageStatuses
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getStatusBadge = (status: StageStatus) => {
    switch (status) {
      case 'passed':
        return { label: 'PASS', class: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
      case 'failed':
        return { label: 'FAIL', class: 'bg-rose-950 text-rose-400 border-rose-800' };
      case 'running':
        return { label: 'RUN', class: 'bg-cyan-950 text-cyan-300 border-cyan-800 animate-pulse' };
      case 'ready':
        return { label: 'READY', class: 'bg-cyan-950 text-cyan-400 border-cyan-800' };
      case 'blocked':
        return { label: 'LOCK', class: 'bg-slate-800 text-slate-500 border-slate-700' };
      case 'unsupported':
        return { label: 'N/A', class: 'bg-slate-800 text-amber-500 border-amber-800' };
      default:
        return { label: 'WAIT', class: 'bg-slate-900 text-slate-600 border-slate-800' };
    }
  };

  interface NavItem {
    id: NavPage;
    label: string;
    icon: any;
    status?: StageStatus;
  }

  const navSections: { group: string; items: NavItem[] }[] = [
    {
      group: 'PROJECT',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Projects & Upload', icon: FolderGit2 },
        { id: 'design', label: 'RTL Design Model', icon: Cpu }
      ]
    },
    {
      group: 'VERIFICATION',
      items: [
        {
          id: 'config',
          label: 'Configuration Gate',
          icon: Sliders,
          status: stageStatuses.config
        },
        {
          id: 'baseline',
          label: 'Baseline Verification',
          icon: CheckCircle2,
          status: stageStatuses.baseline
        },
        {
          id: 'mutations',
          label: 'Mutation Analysis',
          icon: Zap,
          status: stageStatuses.mutations
        },
        {
          id: 'kill-matrix',
          label: 'Kill Matrix Heatmap',
          icon: Grid3X3,
          status: stageStatuses.killMatrix
        }
      ]
    },
    {
      group: 'OPTIMIZATION',
      items: [
        {
          id: 'selector',
          label: 'AI Test Selector',
          icon: BrainCircuit,
          status: stageStatuses.selector
        },
        {
          id: 'safety',
          label: 'Safety Validation',
          icon: ShieldCheck,
          status: stageStatuses.safety
        },
        {
          id: 'comparison',
          label: 'Suite Comparison',
          icon: GitCompare,
          status: stageStatuses.comparison
        }
      ]
    },
    {
      group: 'MANAGEMENT',
      items: [
        { id: 'history', label: 'Experiment History', icon: History },
        { id: 'settings', label: 'Worker & Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-[#0B1220] border-r border-[#26364C] flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-20`}
    >
      {/* Top Header / Collapser */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map(section => (
          <div key={section.group} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {section.group}
              </div>
            )}

            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const badge = item.status ? getStatusBadge(item.status) : null;
              const isBlocked = item.status === 'blocked';

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? `${item.label} ${item.status ? `(${item.status})` : ''}` : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2 rounded-lg text-xs font-medium transition group relative ${
                    isActive
                      ? 'bg-[#152238] text-[#22B8CF] border border-[#22B8CF]/40 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#111B2D]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-[#22B8CF]'
                          : isBlocked
                          ? 'text-slate-500 group-hover:text-slate-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!isCollapsed && badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono border ${badge.class}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Collapse Toggle & Flow Health */}
      <div className="p-2 border-t border-[#26364C] bg-[#080D18]/80">
        {!isCollapsed && (
          <div className="px-3 py-2 mb-2 bg-[#111B2D] border border-[#26364C] rounded-lg">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-medium">Pipeline Status</span>
              <span className={`font-mono text-[10px] font-bold ${
                stageStatuses.baseline === 'passed' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {stageStatuses.baseline === 'passed' ? 'Active' : 'Unverified'}
              </span>
            </div>
            <div className="w-full bg-[#080D18] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  stageStatuses.safety === 'passed'
                    ? 'w-full bg-emerald-500'
                    : stageStatuses.mutations === 'passed'
                    ? 'w-3/4 bg-cyan-400'
                    : stageStatuses.baseline === 'passed'
                    ? 'w-1/2 bg-cyan-500'
                    : stageStatuses.config === 'passed'
                    ? 'w-1/4 bg-amber-500'
                    : 'w-1/12 bg-slate-700'
                }`}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#111B2D] transition text-xs"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
            <div className="flex items-center space-x-2 text-slate-400">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px]">Collapse Navigation</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
