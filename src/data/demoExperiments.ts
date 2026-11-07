import { Experiment, Mutant, KillMatrixData, TestDefinition } from '../types';

export const DEMO_TESTS_FIFO: TestDefinition[] = [
  { id: 't01', name: 'test_reset_behavior', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_reset_behavior', estimatedRuntimeMs: 120 },
  { id: 't02', name: 'test_single_write_read', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_single_write_read', estimatedRuntimeMs: 145 },
  { id: 't03', name: 'test_full_capacity_fill', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_full_capacity_fill', estimatedRuntimeMs: 290 },
  { id: 't04', name: 'test_overflow_protection', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_overflow_protection', estimatedRuntimeMs: 310 },
  { id: 't05', name: 'test_underflow_protection', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_underflow_protection', estimatedRuntimeMs: 130 },
  { id: 't06', name: 'test_watermarks', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_watermarks', estimatedRuntimeMs: 275 },
  { id: 't07', name: 'test_simultaneous_write_read', type: 'cocotb', file: 'test_fifo.py', commandOrFilter: 'test_simultaneous_write_read', estimatedRuntimeMs: 220 },
];

export const DEMO_MUTANTS_FIFO: Mutant[] = [
  {
    id: 'm01',
    file: 'fifo_sync.v',
    line: 28,
    column: 27,
    category: 'relational',
    operatorDescription: 'Inverted equality comparator (== -> !=)',
    originalSnippet: 'assign empty = (fifo_count == 0);',
    mutatedSnippet: 'assign empty = (fifo_count != 0);',
    diff: '@@ -28,1 +28,1 @@\n- assign empty = (fifo_count == 0);\n+ assign empty = (fifo_count != 0);',
    status: 'killed',
    killingTestId: 't01',
    killingTestName: 'test_reset_behavior',
    runtimeMs: 118,
    failureMessage: 'AssertionError: FIFO must be empty after reset (dut.empty.value == 0)',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_reset_behavior',
      exitCode: 1,
      timestamp: '2026-11-03T07:12:00Z',
      simulatorVersion: 'Verilator 5.020 2024-01-01 rev v5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Starting cocotb test test_reset_behavior on mutant m01\n[SIM] dut.empty.value observed as 0 (expected 1)\nAssertionError: FIFO must be empty after reset\nTEST FAILED',
    }
  },
  {
    id: 'm02',
    file: 'fifo_sync.v',
    line: 29,
    column: 27,
    category: 'relational',
    operatorDescription: 'Full flag comparator modified (== -> >=)',
    originalSnippet: 'assign full = (fifo_count == DEPTH);',
    mutatedSnippet: 'assign full = (fifo_count >= DEPTH);',
    diff: '@@ -29,1 +29,1 @@\\n- assign full = (fifo_count == DEPTH);\\n+ assign full = (fifo_count >= DEPTH);',
    status: 'survived',
    failureMessage: undefined,
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=all',
      exitCode: 0,
      timestamp: '2026-11-03T07:12:15Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Running all regression tests against mutant m02\nAll 7 tests reported PASS.\nMutant survived: DEPTH bound is never exceeded under normal flow.',
    }
  },
  {
    id: 'm03',
    file: 'fifo_sync.v',
    line: 38,
    column: 32,
    category: 'arithmetic',
    operatorDescription: 'Pointer increment corrupted (+ 1 -> - 1)',
    originalSnippet: 'wr_ptr <= wr_ptr + 1\'b1;',
    mutatedSnippet: 'wr_ptr <= wr_ptr - 1\'b1;',
    diff: '@@ -38,1 +38,1 @@\n- wr_ptr <= wr_ptr + 1\'b1;\n+ wr_ptr <= wr_ptr - 1\'b1;',
    status: 'killed',
    killingTestId: 't02',
    killingTestName: 'test_single_write_read',
    runtimeMs: 142,
    failureMessage: 'AssertionError: Expected 0xA5, got 0x00 on readback',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_single_write_read',
      exitCode: 1,
      timestamp: '2026-11-03T07:12:20Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Running test_single_write_read on m03\nWrite address miscalculated: pointer decremented instead of incremented.\nExpected 0xA5, got 0x00',
    }
  },
  {
    id: 'm04',
    file: 'fifo_sync.v',
    line: 41,
    column: 30,
    category: 'stuck_at',
    operatorDescription: 'Stuck-at-0 on overflow_err assertion',
    originalSnippet: 'overflow_err <= 1\'b1;',
    mutatedSnippet: 'overflow_err <= 1\'b0;',
    diff: '@@ -41,1 +41,1 @@\n- overflow_err <= 1\'b1;\n+ overflow_err <= 1\'b0;',
    status: 'killed',
    killingTestId: 't04',
    killingTestName: 'test_overflow_protection',
    runtimeMs: 295,
    failureMessage: 'AssertionError: Overflow flag must trigger on write when full',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_overflow_protection',
      exitCode: 1,
      timestamp: '2026-11-03T07:12:35Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] 17th write performed into full FIFO\noverflow_err sampled low (expected high)\nFAIL',
    }
  },
  {
    id: 'm05',
    file: 'fifo_sync.v',
    line: 55,
    column: 31,
    category: 'stuck_at',
    operatorDescription: 'Stuck-at-0 on underflow_err assertion',
    originalSnippet: 'underflow_err <= 1\'b1;',
    mutatedSnippet: 'underflow_err <= 1\'b0;',
    diff: '@@ -55,1 +55,1 @@\n- underflow_err <= 1\'b1;\n+ underflow_err <= 1\'b0;',
    status: 'killed',
    killingTestId: 't05',
    killingTestName: 'test_underflow_protection',
    runtimeMs: 128,
    failureMessage: 'AssertionError: Underflow flag must trigger on read when empty',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_underflow_protection',
      exitCode: 1,
      timestamp: '2026-11-03T07:12:45Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Read attempted while empty=1\nunderflow_err sampled low (expected high)\nFAIL',
    }
  },
  {
    id: 'm06',
    file: 'fifo_sync.v',
    line: 30,
    column: 33,
    category: 'constant_boundary',
    operatorDescription: 'Watermark threshold off-by-one (ALMOST_EMPTY_THRESH + 1)',
    originalSnippet: 'assign almost_empty = (fifo_count <= ALMOST_EMPTY_THRESH);',
    mutatedSnippet: 'assign almost_empty = (fifo_count <= (ALMOST_EMPTY_THRESH + 1));',
    diff: '@@ -30,1 +30,1 @@\n- assign almost_empty = (fifo_count <= ALMOST_EMPTY_THRESH);\n+ assign almost_empty = (fifo_count <= (ALMOST_EMPTY_THRESH + 1));',
    status: 'killed',
    killingTestId: 't06',
    killingTestName: 'test_watermarks',
    runtimeMs: 270,
    failureMessage: 'AssertionError: almost_empty flagged prematurely at count=3',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_watermarks',
      exitCode: 1,
      timestamp: '2026-11-03T07:13:00Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Running test_watermarks on mutant m06\nThreshold violated: almost_empty was high when count was 3 > 2',
    }
  },
  {
    id: 'm07',
    file: 'fifo_sync.v',
    line: 65,
    column: 21,
    category: 'case_item_removal',
    operatorDescription: 'Removed simultaneous push/pop branch 2\'b11 in case statement',
    originalSnippet: 'case ({wr_en && !full, rd_en && !empty})',
    mutatedSnippet: 'case ({wr_en && !full, rd_en && !empty}) // 2\'b10 handled, 2\'b01 handled',
    diff: '@@ -65,3 +65,2 @@\n- 2\'b10: fifo_count <= fifo_count + 1\'b1;\n- 2\'b01: fifo_count <= fifo_count - 1\'b1;\n+ default: fifo_count <= fifo_count;',
    status: 'killed',
    killingTestId: 't07',
    killingTestName: 'test_simultaneous_write_read',
    runtimeMs: 218,
    failureMessage: 'AssertionError: Count should remain constant on simultaneous push/pop',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_simultaneous_write_read',
      exitCode: 1,
      timestamp: '2026-11-03T07:13:10Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Running simultaneous write & read\nMutant caused occupancy desync\nFAIL',
    }
  },
  {
    id: 'm08',
    file: 'fifo_sync.v',
    line: 35,
    column: 17,
    category: 'reset_value',
    operatorDescription: 'Reset value corruption (wr_ptr <= 1 instead of 0)',
    originalSnippet: 'wr_ptr <= {ADDR_WIDTH{1\'b0}};',
    mutatedSnippet: 'wr_ptr <= {{(ADDR_WIDTH-1){1\'b0}}, 1\'b1};',
    diff: '@@ -35,1 +35,1 @@\n- wr_ptr <= {ADDR_WIDTH{1\'b0}};\n+ wr_ptr <= {{(ADDR_WIDTH-1){1\'b0}}, 1\'b1};',
    status: 'killed',
    killingTestId: 't01',
    killingTestName: 'test_reset_behavior',
    runtimeMs: 115,
    failureMessage: 'AssertionError: FIFO reset failed, pointers mismatched',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_reset_behavior',
      exitCode: 1,
      timestamp: '2026-11-03T07:13:20Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] wr_ptr sampled 1 after reset pulse\nFAIL',
    }
  },
  {
    id: 'm09',
    file: 'fifo_sync.v',
    line: 49,
    column: 17,
    category: 'reset_value',
    operatorDescription: 'Reset value corruption on rd_ptr',
    originalSnippet: 'rd_ptr <= {ADDR_WIDTH{1\'b0}};',
    mutatedSnippet: 'rd_ptr <= {{(ADDR_WIDTH-1){1\'b0}}, 1\'b1};',
    diff: '@@ -49,1 +49,1 @@\n- rd_ptr <= {ADDR_WIDTH{1\'b0}};\n+ rd_ptr <= {{(ADDR_WIDTH-1){1\'b0}}, 1\'b1};',
    status: 'killed',
    killingTestId: 't01',
    killingTestName: 'test_reset_behavior',
    runtimeMs: 114,
    failureMessage: 'AssertionError: FIFO reset failed, rd_ptr mismatched',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_reset_behavior',
      exitCode: 1,
      timestamp: '2026-11-03T07:13:30Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] rd_ptr sampled 1 after reset pulse\nFAIL',
    }
  },
  {
    id: 'm10',
    file: 'fifo_sync.v',
    line: 23,
    column: 31,
    category: 'bitwise',
    operatorDescription: 'Identity bitwise OR with 0 (Semantically identical localparam shift)',
    originalSnippet: 'localparam DEPTH = 1 << ADDR_WIDTH;',
    mutatedSnippet: 'localparam DEPTH = (1 << ADDR_WIDTH) | 0;',
    diff: '@@ -23,1 +23,1 @@\\n- localparam DEPTH = 1 << ADDR_WIDTH;\\n+ localparam DEPTH = (1 << ADDR_WIDTH) | 0;',
    status: 'potentially_equivalent',
    evidence: {
      command: 'yosys-equiv-check --top fifo_sync',
      exitCode: 0,
      timestamp: '2026-11-03T07:13:40Z',
      simulatorVersion: 'Yosys 0.36',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[YOSYS] Proving equivalence via SAT miter...\nNetlist match: 100% equivalent. Excluded from mutation denominator.',
    }
  },
  {
    id: 'm11',
    file: 'fifo_sync.v',
    line: 31,
    column: 32,
    category: 'relational',
    operatorDescription: 'Watermark almost_full comparator modified (>= -> >)',
    originalSnippet: 'assign almost_full = (fifo_count >= ALMOST_FULL_THRESH);',
    mutatedSnippet: 'assign almost_full = (fifo_count > ALMOST_FULL_THRESH);',
    diff: '@@ -31,1 +31,1 @@\n- assign almost_full = (fifo_count >= ALMOST_FULL_THRESH);\n+ assign almost_full = (fifo_count > ALMOST_FULL_THRESH);',
    status: 'killed',
    killingTestId: 't06',
    killingTestName: 'test_watermarks',
    runtimeMs: 272,
    failureMessage: 'AssertionError: almost_full was not high at count=14',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_watermarks',
      exitCode: 1,
      timestamp: '2026-11-03T07:13:50Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Running test_watermarks on m11\nalmost_full expected 1 at count=14, observed 0\nFAIL',
    }
  },
  {
    id: 'm12',
    file: 'fifo_sync.v',
    line: 36,
    column: 21,
    category: 'branch_swap',
    operatorDescription: 'Condition branch inverted if (!full) -> if (full)',
    originalSnippet: 'if (!full) begin\n    mem[wr_ptr] <= wr_data;\n    wr_ptr <= wr_ptr + 1\'b1;\nend',
    mutatedSnippet: 'if (full) begin\n    mem[wr_ptr] <= wr_data;\n    wr_ptr <= wr_ptr + 1\'b1;\nend',
    diff: '@@ -36,1 +36,1 @@\n- if (!full) begin\n+ if (full) begin',
    status: 'killed',
    killingTestId: 't02',
    killingTestName: 'test_single_write_read',
    runtimeMs: 140,
    failureMessage: 'AssertionError: Write ignored when not full',
    evidence: {
      command: 'cocotb-run --sim verilator --top fifo_sync -f COCOTB_TEST_FILTER=test_single_write_read',
      exitCode: 1,
      timestamp: '2026-11-03T07:14:00Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: '[SIM] Write dropped because condition inverted\nFAIL',
    }
  }
];

export function buildDemoKillMatrix(): KillMatrixData {
  const cells: { [key: string]: any } = {};
  
  // Matrix data for each test and mutant
  const killsMap: { [testId: string]: string[] } = {
    't01': ['m01', 'm08', 'm09'],
    't02': ['m01', 'm03', 'm08', 'm09', 'm12'],
    't03': ['m01', 'm03', 'm08', 'm12'],
    't04': ['m01', 'm03', 'm04', 'm08', 'm12'],
    't05': ['m01', 'm05', 'm08', 'm09'],
    't06': ['m01', 'm06', 'm08', 'm11'],
    't07': ['m01', 'm03', 'm07', 'm08', 'm12']
  };

  DEMO_TESTS_FIFO.forEach(test => {
    DEMO_MUTANTS_FIFO.forEach(mutant => {
      const isKilledByThisTest = killsMap[test.id]?.includes(mutant.id) || false;
      const key = `${test.id}__${mutant.id}`;
      
      if (mutant.status === 'potentially_equivalent') {
        cells[key] = {
          mutantId: mutant.id,
          testId: test.id,
          detected: false,
          runtimeMs: 110,
          exitCode: 0,
          status: 'potentially_equivalent'
        };
      } else {
        cells[key] = {
          mutantId: mutant.id,
          testId: test.id,
          detected: isKilledByThisTest,
          runtimeMs: test.estimatedRuntimeMs || 150,
          exitCode: isKilledByThisTest ? 1 : 0,
          failureLogSnippet: isKilledByThisTest ? `AssertionError in ${test.name} at cycle 14` : undefined,
          status: isKilledByThisTest ? 'killed' : 'survived'
        };
      }
    });
  });

  const validMutants = DEMO_MUTANTS_FIFO.filter(m => m.status === 'killed' || m.status === 'survived');
  const killed = validMutants.filter(m => m.status === 'killed').length;
  const survived = validMutants.filter(m => m.status === 'survived').length;

  return {
    experimentId: 'exp-demo-fifo-2026',
    totalMutants: DEMO_MUTANTS_FIFO.length,
    validMutants: validMutants.length,
    killedMutants: killed,
    survivedMutants: survived,
    invalidMutants: 0,
    timeoutMutants: 0,
    equivalentMutants: 1,
    inconclusiveMutants: 0,
    mutationScore: Math.round((killed / (killed + survived)) * 1000) / 10, // 90.9%
    cells,
    tests: DEMO_TESTS_FIFO,
    mutants: DEMO_MUTANTS_FIFO,
    createdAt: '2026-11-03T07:15:00Z'
  };
}

export const DEMO_EXPERIMENT_FIFO: Experiment = {
  id: 'exp-demo-fifo-2026',
  projectId: 'sample-fifo-sync',
  name: 'Full Suite Mutation Run & ML Selection',
  status: 'completed',
  isDemo: true,
  config: {
    id: 'cfg-fifo-v1-snapshot',
    projectId: 'sample-fifo-sync',
    topModule: 'fifo_sync',
    compileOrder: ['fifo_sync.v'],
    includeDirs: [],
    defines: {},
    parameters: { DATA_WIDTH: '8', ADDR_WIDTH: '4' },
    simulator: 'verilator',
    testbenchType: 'cocotb',
    tests: DEMO_TESTS_FIFO,
    perTestTimeoutSec: 15,
    passFailRule: 'exit_code',
    clockInfo: { signalName: 'clk', periodNs: 10 },
    resetInfo: { signalName: 'rst_n', activeLow: true },
    confirmedAt: '2026-11-03T07:10:00Z',
    version: 1
  },
  baseline: {
    passed: true,
    compilationSuccess: true,
    compileLog: '%Info: Compiling Verilog module fifo_sync with Verilator 5.020 --timing --trace\n%Info: Binary compiled successfully. No lint warnings.',
    simulatorVersion: 'Verilator 5.020 2024-01-01 rev v5.020',
    testedAt: '2026-11-03T07:11:00Z',
    totalTests: 7,
    passedTests: 7,
    failedTests: 0,
    isDeterministic: true,
    testResults: DEMO_TESTS_FIFO.map(t => ({
      testId: t.id,
      testName: t.name,
      passed: true,
      runtimeMs: t.estimatedRuntimeMs || 150,
      exitCode: 0,
      stdout: `[PASS] ${t.name} ran 2x deterministically in ${t.estimatedRuntimeMs}ms`,
      stderr: '',
      flakyCheckPassed: true
    })),
    evidence: {
      command: 'verilator --binary -j 4 fifo_sync.v && pytest --cocotb test_fifo.py',
      exitCode: 0,
      timestamp: '2026-11-03T07:11:00Z',
      simulatorVersion: 'Verilator 5.020',
      configSnapshotId: 'cfg-fifo-v1-snapshot',
      rawLogPreview: 'Baseline check PASSED. All 7 tests passed twice in isolation. Non-determinism: 0.00%.'
    }
  },
  killMatrix: buildDemoKillMatrix(),
  selections: {
    full: {
      method: 'full',
      selectedTestIds: ['t01', 't02', 't03', 't04', 't05', 't06', 't07'],
      totalTests: 7,
      selectedCount: 7,
      reductionPercentage: 0,
      estimatedRuntimeMs: 1490,
      runtimeSavedPercentage: 0,
      retainedMutantKills: 10,
      totalKilledMutants: 10,
      retentionPercentage: 100,
      lostMutantIds: []
    },
    random: {
      method: 'random',
      selectedTestIds: ['t01', 't03', 't06'],
      totalTests: 7,
      selectedCount: 3,
      reductionPercentage: 57.1,
      estimatedRuntimeMs: 685,
      runtimeSavedPercentage: 54.0,
      retainedMutantKills: 7,
      totalKilledMutants: 10,
      retentionPercentage: 70.0,
      lostMutantIds: ['m04', 'm05', 'm07']
    },
    greedy: {
      method: 'greedy',
      selectedTestIds: ['t01', 't02', 't04', 't05', 't06', 't07'],
      totalTests: 7,
      selectedCount: 6,
      reductionPercentage: 14.3,
      estimatedRuntimeMs: 1200,
      runtimeSavedPercentage: 19.5,
      retainedMutantKills: 10,
      totalKilledMutants: 10,
      retentionPercentage: 100.0,
      lostMutantIds: []
    },
    ml_assisted: {
      method: 'ml_assisted',
      selectedTestIds: ['t02', 't04', 't05', 't06', 't07'],
      totalTests: 7,
      selectedCount: 5,
      reductionPercentage: 28.6,
      estimatedRuntimeMs: 1080,
      runtimeSavedPercentage: 27.5,
      retainedMutantKills: 10,
      totalKilledMutants: 10,
      retentionPercentage: 100.0,
      lostMutantIds: [],
      trainScore: 0.98,
      testScore: 0.96,
      generalizationGap: 0.02,
      featureImportance: [
        { feature: 'unique_kills_ratio', importance: 0.38, description: 'Proportion of mutants detected solely by this test' },
        { feature: 'category_coverage_entropy', importance: 0.24, description: 'Diversity across FSM, boundary, and pointer mutation operators' },
        { feature: 'runtime_efficiency', importance: 0.19, description: 'Kills detected per millisecond of execution' },
        { feature: 'historical_kill_consistency', importance: 0.12, description: 'Cross-seed regression stability across 5 folds' },
        { feature: 'line_coverage_weight', importance: 0.07, description: 'Verilator AST block depth reached' }
      ]
    }
  },
  safetyReport: {
    status: 'passed',
    retentionThreshold: 95.0,
    actualRetention: 100.0,
    fullSuiteKills: 10,
    selectedSuiteKills: 10,
    lostMutants: [],
    mustKillRuleViolations: [],
    fallbackTriggered: false,
    certifiedAt: '2026-11-03T07:16:00Z',
    validationSeed: 42,
    holdoutScore: 100.0
  },
  createdAt: '2026-11-03T07:10:00Z',
  updatedAt: '2026-11-03T07:16:00Z'
};
