/**
 * Core Domain Types for MutaSelect AI
 * Generic, Universal RTL Mutation Testing & ML Regression Suite Optimization
 */

export type SimulatorType = 'modelsim' | 'vivado' | 'iverilog' | 'verilator' | 'custom';
export type TestbenchType = 'cocotb' | 'systemverilog' | 'verilog_self_checking' | 'custom_command';

export type EdaToolStatus =
  | 'INSTALLED_ACCESSIBLE'
  | 'INSTALLED_NOT_CONFIGURED'
  | 'MISSING_EXECUTABLE'
  | 'LICENSE_UNAVAILABLE'
  | 'EXECUTION_FAILURE'
  | 'CONFIGURED';

export interface EdaToolInfo {
  tool: 'modelsim' | 'vivado' | 'iverilog';
  displayName: string;
  executables: Record<string, string | null>;
  customPath?: string;
  status: EdaToolStatus;
  version: string;
  licenseStatus: string;
  details: string;
}

export interface EdaDetectionReport {
  modelsim: EdaToolInfo;
  vivado: EdaToolInfo;
  iverilog: EdaToolInfo;
  timestamp?: number;
}

export type PresenceStatus = 'detected' | 'not_present' | 'unsupported' | 'uncertain';

export type StageStatus = 
  | 'not_started' 
  | 'ready' 
  | 'running' 
  | 'passed' 
  | 'failed' 
  | 'blocked' 
  | 'unsupported';

export type MutantStatus = 
  | 'killed' 
  | 'survived' 
  | 'equivalent'
  | 'potentially_equivalent' 
  | 'invalid' 
  | 'compilation_failure'
  | 'timeout' 
  | 'inconclusive';

export type OperatorGroup = 
  | 'expression' 
  | 'data' 
  | 'sequential' 
  | 'control' 
  | 'protocol';

export type OperatorCategory = 
  // A. Expression mutations
  | 'relational' 
  | 'logical' 
  | 'arithmetic' 
  | 'bitwise' 
  | 'conditional_expr'
  // B. Data mutations
  | 'constant_boundary' 
  | 'literal_mod'
  | 'bit_width_slice' 
  | 'assignment_swap'
  | 'assignment_type'
  | 'operand_replacement'
  | 'stuck_at'
  // C. Sequential logic mutations
  | 'reset_value' 
  | 'reset_condition'
  | 'clock_edge_swap'
  | 'register_update'
  | 'enable_condition'
  // D. Control logic mutations
  | 'fsm_state_corrupt' 
  | 'fsm_transition_swap'
  | 'case_item_removal' 
  | 'branch_swap' 
  | 'control_signal_inversion'
  // E. Protocol and handshake mutations
  | 'handshake_condition'
  | 'ready_valid_corruption'
  | 'strobe_steering';

export interface PortDefinition {
  name: string;
  direction: 'input' | 'output' | 'inout';
  width: string;
  type?: string;
}

export interface ClockDetectionInfo {
  status: PresenceStatus;
  signalName?: string;
  polarity?: 'posedge' | 'negedge';
  uncertaintyReason?: string;
}

export interface ResetDetectionInfo {
  status: PresenceStatus;
  signalName?: string;
  polarity?: 'active_low' | 'active_high';
  syncType?: 'async' | 'sync';
  uncertaintyReason?: string;
}

export interface FsmDetectionInfo {
  status: PresenceStatus;
  stateRegister?: string;
  states?: string[];
  transitionsCount?: number;
  resetState?: string;
  uncertaintyReason?: string;
}

export interface ConstructInventory {
  alwaysBlocks: {
    always: number;
    always_comb: number;
    always_ff: number;
    always_latch: number;
  };
  clock: ClockDetectionInfo;
  reset: ResetDetectionInfo;
  fsm: FsmDetectionInfo;
  counters: {
    status: PresenceStatus;
    count: number;
    registers: string[];
  };
  caseStatements: {
    status: PresenceStatus;
    count: number;
  };
  generateBlocks: {
    status: PresenceStatus;
    count: number;
  };
  continuousAssignments: {
    status: PresenceStatus;
    count: number;
  };
  dataPaths: {
    status: PresenceStatus;
    description: string;
  };
  controlPaths: {
    status: PresenceStatus;
    description: string;
  };
}

export interface ModuleDefinition {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  ports: PortDefinition[];
  parameters: { name: string; defaultValue: string; type?: string }[];
  instantiations: { moduleName: string; instanceName: string; line: number }[];
  isTopCandidate: boolean;
  isTestbench: boolean;
  constructs: ConstructInventory;
}

export interface TestbenchMetadata {
  status: 'detected' | 'incomplete' | 'missing';
  type: TestbenchType;
  isGenerated: boolean;
  testbenchFiles: string[];
  missingComponents: string[];
  tests: TestDefinition[];
  warningMessage?: string;
}

export interface DesignModel {
  projectId: string;
  designName: string;
  files: {
    name: string;
    path: string;
    size: number;
    sha256: string;
    isSynthesizable: boolean;
    isTestbench: boolean;
    content?: string;
  }[];
  modules: ModuleDefinition[];
  topModuleCandidates: { name: string; score: number; reason: string }[];
  selectedTopModule: string;
  packages: string[];
  includes: string[];
  dependenciesGraph: { [module: string]: string[] };
  compileOrder: string[];
  testbenchInfo: TestbenchMetadata;
  unsupportedConstructs: {
    file: string;
    line: number;
    construct: string;
    reason: string;
  }[];
  createdAt: string;
}

export interface TestDefinition {
  id: string;
  name: string;
  type: TestbenchType;
  file: string;
  commandOrFilter: string;
  targetFocus?: string;
  estimatedRuntimeMs?: number;
  isGenerated?: boolean;
}

export interface ConfigSnapshot {
  id: string;
  projectId: string;
  topModule: string;
  compileOrder: string[];
  includeDirs: string[];
  defines: { [key: string]: string };
  parameters: { [key: string]: string };
  simulator: SimulatorType;
  customCompileCmd?: string;
  customRunCmd?: string;
  testbenchType: TestbenchType;
  tests: TestDefinition[];
  perTestTimeoutSec: number;
  passFailRule: 'exit_code' | 'regex' | 'string_marker';
  passFailMarker?: string;
  clockInfo?: { signalName: string; periodNs: number };
  resetInfo?: { signalName: string; activeLow: boolean };
  confirmedAt?: string;
  version: number;
}

export interface TimingBreakdown {
  compilationMs: number;
  elaborationMs: number;
  startupMs: number;
  simulationMs: number;
  totalMs: number;
  timerMechanism?: string;
}

export type BaselineExecutionType = 'fresh' | 'cached' | 'rejected_duplicate';

export interface BaselineTestResult {
  testId: string;
  testName: string;
  passed: boolean;
  runtimeMs: number;
  exitCode: number;
  stdout: string;
  stderr?: string;
  failingLine?: string;
  flakyCheckPassed: boolean;
  isGenerated?: boolean;
  timingBreakdown?: TimingBreakdown;
}

export interface BaselineReport {
  passed: boolean;
  compilationSuccess: boolean;
  compileLog: string;
  simulatorVersion: string;
  testedAt?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  isDeterministic: boolean;
  testResults: BaselineTestResult[];
  diagnosticHint?: string;
  evidence?: SimulationEvidence;
  executionId?: string;
  executionType?: BaselineExecutionType;
  isCached?: boolean;
  cachedAt?: string;
  timingBreakdown?: TimingBreakdown;
}

export interface SimulationEvidence {
  command: string;
  exitCode: number;
  logUrl?: string;
  rawLogPreview: string;
  timestamp: string;
  simulatorVersion: string;
  configSnapshotId: string;
  executionId?: string;
}

export interface Mutant {
  id: string;
  file: string;
  line: number;
  column: number;
  group?: OperatorGroup;
  category: OperatorCategory;
  operatorDescription: string;
  originalSnippet: string;
  mutatedSnippet: string;
  diff: string;
  status: MutantStatus;
  killingTestId?: string;
  killingTestName?: string;
  runtimeMs?: number;
  failureMessage?: string;
  evidence?: SimulationEvidence;
  constructContext?: string;
  isHoldout?: boolean;
}

export interface KillMatrixCell {
  mutantId: string;
  testId: string;
  detected: boolean;
  runtimeMs: number;
  exitCode: number;
  failureLogSnippet?: string;
  status: MutantStatus;
}

export interface KillMatrixData {
  experimentId: string;
  totalMutants: number;
  validMutants: number;
  killedMutants: number;
  survivedMutants: number;
  invalidMutants: number;
  timeoutMutants: number;
  equivalentMutants: number;
  inconclusiveMutants: number;
  mutationScore: number;
  cells: { [key: string]: KillMatrixCell };
  tests: TestDefinition[];
  mutants: Mutant[];
  createdAt: string;
}

export type SelectionMethod = 'full' | 'random' | 'greedy' | 'ml_assisted';

export interface SelectionResult {
  method: SelectionMethod;
  selectedTestIds: string[];
  totalTests: number;
  selectedCount: number;
  reductionPercentage: number;
  estimatedRuntimeMs: number;
  runtimeSavedPercentage: number;
  retainedMutantKills: number;
  totalKilledMutants: number;
  retentionPercentage: number;
  lostMutantIds: string[];
  featureImportance?: { feature: string; importance: number; description: string }[];
  trainScore?: number;
  testScore?: number;
  generalizationGap?: number;
  isTrained?: boolean;
}

export interface SafetyValidationReport {
  status: 'passed' | 'rejected_fallback';
  retentionThreshold: number;
  actualRetention: number;
  fullSuiteKills: number;
  selectedSuiteKills: number;
  lostMutants: {
    id: string;
    category: OperatorCategory;
    file: string;
    line: number;
    description: string;
  }[];
  mustKillRuleViolations: string[];
  fallbackTriggered: boolean;
  fallbackReason?: string;
  certifiedAt: string;
  validationSeed: number;
  holdoutScore: number;
}

export interface Experiment {
  id: string;
  projectId: string;
  name: string;
  status: 'draft' | 'baseline_running' | 'baseline_failed' | 'baseline_passed' | 'mutating' | 'completed' | 'failed';
  config: ConfigSnapshot;
  baseline?: BaselineReport;
  killMatrix?: KillMatrixData;
  selections?: { [key in SelectionMethod]?: SelectionResult };
  safetyReport?: SafetyValidationReport;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  activeExperimentId?: string;
  design?: DesignModel;
  tags: string[];
  isSample?: boolean;
}
