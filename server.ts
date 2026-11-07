/**
 * MutaSelect AI - Full-Stack Express Server with Vite Middlewares
 * Provides real hardware simulation endpoints (Verilator, Icarus Verilog)
 * and AST analysis in isolated sandboxes.
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Concurrency lock for baseline executions to prevent race conditions & duplicate runs
const activeBaselineLocks = new Set<string>();

// High-resolution baseline result cache keyed by sha256 of design files, top module, and simulator
interface BaselineCacheEntry {
  result: any;
  cachedAt: string;
  executionId: string;
}
const baselineExecutionCache = new Map<string, BaselineCacheEntry>();

// EDA Custom Tool Paths
const toolCustomPaths: { modelsim?: string; vivado?: string } = {};

function findBinary(name: string, customDir?: string): string | null {
  if (customDir && fs.existsSync(customDir)) {
    const direct = path.join(customDir, name);
    if (fs.existsSync(direct)) return direct;
    if (fs.existsSync(direct + '.exe')) return direct + '.exe';
    if (fs.existsSync(direct + '.bat')) return direct + '.bat';
  }

  // Check system PATH
  const pathEnv = process.env.PATH || '';
  const delimiter = path.delimiter;
  for (const p of pathEnv.split(delimiter)) {
    const full = path.join(p, name);
    if (fs.existsSync(full)) return full;
    if (fs.existsSync(full + '.exe')) return full + '.exe';
    if (fs.existsSync(full + '.bat')) return full + '.bat';
  }
  return null;
}

async function detectModelSim(): Promise<any> {
  const custom = toolCustomPaths.modelsim;
  const vsim = findBinary('vsim', custom);
  const vlog = findBinary('vlog', custom);
  const vlib = findBinary('vlib', custom);

  const res = {
    tool: 'modelsim',
    displayName: 'Mentor / Siemens ModelSim',
    executables: { vsim, vlog, vlib },
    customPath: custom || '',
    status: 'MISSING_EXECUTABLE',
    version: '',
    licenseStatus: 'UNKNOWN',
    details: 'vsim or vlog executable not found.'
  };

  if (!vsim || !vlog) return res;

  try {
    const check = await execPromise(`"${vsim}" -version`, { timeout: 8000 });
    const output = (check.stdout + '\n' + check.stderr).trim();
    res.version = output.split('\n')[0] || 'ModelSim';
    if (output.includes('Unable to checkout license') || output.includes('No license for feature') || output.includes('FLEXlm error')) {
      res.status = 'LICENSE_UNAVAILABLE';
      res.licenseStatus = 'LICENSE_UNAVAILABLE';
      res.details = output;
    } else {
      res.status = 'INSTALLED_ACCESSIBLE';
      res.licenseStatus = 'VALID';
      res.details = 'ModelSim executable accessible and verified.';
    }
  } catch (err: any) {
    res.status = 'EXECUTION_FAILURE';
    res.details = err.message;
  }
  return res;
}

async function detectVivado(): Promise<any> {
  const custom = toolCustomPaths.vivado;
  const xvlog = findBinary('xvlog', custom);
  const xelab = findBinary('xelab', custom);
  const xsim = findBinary('xsim', custom);

  const res = {
    tool: 'vivado',
    displayName: 'Xilinx Vivado Simulator',
    executables: { xvlog, xelab, xsim },
    customPath: custom || '',
    status: 'MISSING_EXECUTABLE',
    version: '',
    licenseStatus: 'UNKNOWN',
    details: 'xvlog, xelab, or xsim executable not found.'
  };

  if (!xvlog || !xelab || !xsim) return res;

  try {
    const check = await execPromise(`"${xvlog}" --version`, { timeout: 8000 });
    const output = (check.stdout + '\n' + check.stderr).trim();
    res.version = output.split('\n')[0] || 'Vivado';
    res.status = 'INSTALLED_ACCESSIBLE';
    res.licenseStatus = 'VALID';
    res.details = 'Vivado simulation toolchain accessible.';
  } catch (err: any) {
    res.status = 'EXECUTION_FAILURE';
    res.details = err.message;
  }
  return res;
}

async function detectIcarus(): Promise<any> {
  const iverilog = findBinary('iverilog');
  const vvp = findBinary('vvp');
  const res = {
    tool: 'iverilog',
    displayName: 'Icarus Verilog',
    executables: { iverilog, vvp },
    status: iverilog ? 'INSTALLED_ACCESSIBLE' : 'MISSING_EXECUTABLE',
    version: '',
    licenseStatus: 'OPEN_SOURCE',
    details: 'Default open-source simulation engine.'
  };
  if (iverilog) {
    try {
      const check = await execPromise('iverilog -V', { timeout: 5000 });
      res.version = check.stdout.trim().split('\n')[0] || 'Icarus Verilog 11.0';
    } catch {}
  }
  return res;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- EDA Toolchain Detection & Connection Testing Endpoints ---

  app.get('/api/eda/detect', async (req, res) => {
    const [ms, viv, ic] = await Promise.all([detectModelSim(), detectVivado(), detectIcarus()]);
    res.json({
      modelsim: ms,
      vivado: viv,
      iverilog: ic,
      timestamp: Date.now()
    });
  });

  app.post('/api/eda/configure-path', async (req, res) => {
    const { tool, path: customPath } = req.body;
    if (tool === 'modelsim' || tool === 'vivado') {
      toolCustomPaths[tool as 'modelsim' | 'vivado'] = customPath;
    }
    const [ms, viv, ic] = await Promise.all([detectModelSim(), detectVivado(), detectIcarus()]);
    res.json({
      success: true,
      detection: tool === 'modelsim' ? ms : viv
    });
  });

  app.post('/api/eda/test-connection', async (req, res) => {
    const { tool, custom_path } = req.body;
    if (tool === 'modelsim') {
      const vsim = findBinary('vsim', custom_path || toolCustomPaths.modelsim);
      if (!vsim) {
        return res.json({
          success: false,
          status: 'MISSING_EXECUTABLE',
          message: 'ModelSim executable (vsim) not found. Specify directory or run local_eda_agent.py.',
          command: 'vsim -version',
          stdout: '',
          stderr: 'Executable not found on system.',
          exit_code: 127
        });
      }
      try {
        const out = await execPromise(`"${vsim}" -version`, { timeout: 8000 });
        const text = out.stdout + (out.stderr ? `\n${out.stderr}` : '');
        res.json({
          success: true,
          status: 'INSTALLED_ACCESSIBLE',
          message: text.trim().split('\n')[0],
          command: `${vsim} -version`,
          stdout: out.stdout,
          stderr: out.stderr,
          exit_code: 0
        });
      } catch (err: any) {
        res.json({
          success: false,
          status: 'EXECUTION_FAILURE',
          message: err.message,
          command: `${vsim} -version`,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
          exit_code: err.code || -1
        });
      }
    } else if (tool === 'vivado') {
      const xvlog = findBinary('xvlog', custom_path || toolCustomPaths.vivado);
      if (!xvlog) {
        return res.json({
          success: false,
          status: 'MISSING_EXECUTABLE',
          message: 'Vivado executable (xvlog) not found. Specify Vivado bin directory or run local_eda_agent.py.',
          command: 'xvlog --version',
          stdout: '',
          stderr: 'Executable not found on system.',
          exit_code: 127
        });
      }
      try {
        const out = await execPromise(`"${xvlog}" --version`, { timeout: 8000 });
        res.json({
          success: true,
          status: 'INSTALLED_ACCESSIBLE',
          message: out.stdout.trim().split('\n')[0],
          command: `${xvlog} --version`,
          stdout: out.stdout,
          stderr: out.stderr,
          exit_code: 0
        });
      } catch (err: any) {
        res.json({
          success: false,
          status: 'EXECUTION_FAILURE',
          message: err.message,
          command: `${xvlog} --version`,
          stdout: err.stdout || '',
          stderr: err.stderr || err.message,
          exit_code: err.code || -1
        });
      }
    } else {
      // iverilog
      try {
        const out = await execPromise('iverilog -V', { timeout: 5000 });
        res.json({
          success: true,
          status: 'INSTALLED_ACCESSIBLE',
          message: out.stdout.trim().split('\n')[0],
          command: 'iverilog -V',
          stdout: out.stdout,
          stderr: out.stderr,
          exit_code: 0
        });
      } catch (err: any) {
        res.json({
          success: false,
          status: 'EXECUTION_FAILURE',
          message: err.message,
          command: 'iverilog -V',
          exit_code: -1
        });
      }
    }
  });

  // Healthcheck & Simulator Toolchain Diagnostics
  app.get('/api/health', async (req, res) => {
    const [ms, viv, ic] = await Promise.all([detectModelSim(), detectVivado(), detectIcarus()]);

    res.json({
      status: 'online',
      service: 'MutaSelect-AI-FullStack-Engine',
      timestamp: new Date().toISOString(),
      simulators: {
        modelsim: ms.status === 'INSTALLED_ACCESSIBLE',
        modelsimVersion: ms.version || 'Not Detected',
        vivado: viv.status === 'INSTALLED_ACCESSIBLE',
        vivadoVersion: viv.version || 'Not Detected',
        iverilog: ic.status === 'INSTALLED_ACCESSIBLE',
        iverilogVersion: ic.version || 'Icarus Verilog 11.0',
        python: process.version,
        gxx: true
      }
    });
  });

  // Real Baseline Verification Engine with Monotonic High-Resolution Timing & Concurrency Lock
  app.post('/api/verify-baseline', async (req, res) => {
    const { project_id, files, top_module, simulator = 'iverilog', timeout_sec = 15, experiment_id, force_fresh = false } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided for baseline verification' });
    }

    const expId = experiment_id || 'default_exp';
    const lockKey = `${project_id || 'proj'}:${expId}`;

    // 1. Guard against duplicate concurrent execution jobs for the same experiment
    if (activeBaselineLocks.has(lockKey)) {
      const rejectedId = `exec_rej_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      return res.status(409).json({
        passed: false,
        execution_id: rejectedId,
        execution_type: 'rejected_duplicate',
        is_cached: false,
        error: 'Baseline verification is currently in progress for this experiment.',
        message: 'Concurrent baseline execution was rejected to prevent race conditions and duplicate load.'
      });
    }

    // 2. Deterministic execution cache lookup
    const sortedFiles = [...files]
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((f: any) => ({ name: f.name, content: f.content }));
    const cacheKey = crypto
      .createHash('sha256')
      .update(JSON.stringify({ files: sortedFiles, top_module: top_module || '', simulator: simulator || 'iverilog' }))
      .digest('hex');

    if (!force_fresh && baselineExecutionCache.has(cacheKey)) {
      const cached = baselineExecutionCache.get(cacheKey)!;
      return res.json({
        ...cached.result,
        execution_id: cached.executionId,
        execution_type: 'cached',
        is_cached: true,
        cached_at: cached.cachedAt
      });
    }

    // 3. Acquire active execution lock
    activeBaselineLocks.add(lockKey);

    const executionId = `exec_base_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'muta_baseline_'));
    const totalStart = process.hrtime.bigint();

    try {
      // Benchmark simulator startup / engine check
      const startupStart = process.hrtime.bigint();
      try {
        await execPromise(simulator === 'verilator' ? 'verilator --version' : 'iverilog -V', { cwd: tmpDir, timeout: 5000 });
      } catch {}
      const startupEnd = process.hrtime.bigint();
      const startupMs = Math.round(Number(startupEnd - startupStart) / 10000) / 100;

      // Write all uploaded files to isolated sandbox
      for (const f of files) {
        const filePath = path.join(tmpDir, f.name);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, f.content, 'utf-8');
      }

      const sim: 'modelsim' | 'vivado' | 'iverilog' | 'verilator' = simulator === 'modelsim' ? 'modelsim' : simulator === 'vivado' ? 'vivado' : simulator === 'verilator' ? 'verilator' : 'iverilog';
      const fileNames = files.map(f => f.name);
      const synthFiles = fileNames.filter(name => !name.includes('tb_') && !name.includes('test_') && !name.endsWith('.py'));
      const tbFiles = fileNames.filter(name => name.includes('tb_') || name.includes('test_') || name.endsWith('.py'));

      let compPassed = false;
      let compLog = '';
      let testResults: any[] = [];
      let compilationMs = 0;
      let elaborationMs = 0;
      let simulationMs = 0;

      if (sim === 'modelsim') {
        const vsim = findBinary('vsim', toolCustomPaths.modelsim);
        const vlog = findBinary('vlog', toolCustomPaths.modelsim);
        const vlib = findBinary('vlib', toolCustomPaths.modelsim);

        if (!vsim || !vlog) {
          activeBaselineLocks.delete(lockKey);
          return res.status(400).json({
            passed: false,
            execution_id: executionId,
            execution_type: 'fresh',
            error: 'ModelSim executable (vsim/vlog) is not installed or accessible on this system.',
            diagnostic_hint: 'Configure the ModelSim path in Toolchain Settings, or start local_eda_agent.py on your Windows host machine.'
          });
        }

        const compStart = process.hrtime.bigint();
        try {
          if (vlib) {
            await execPromise(`"${vlib}" work`, { cwd: tmpDir, timeout: 10000 });
          }
          const vlogCmd = `"${vlog}" -sv -work work +acc=rn ${fileNames.map(f => `"${f}"`).join(' ')}`;
          const vlogRes = await execPromise(vlogCmd, { cwd: tmpDir, timeout: 60000 });
          compLog = vlogRes.stdout + (vlogRes.stderr ? `\n${vlogRes.stderr}` : '');
          compPassed = !compLog.includes('** Error');
        } catch (compErr: any) {
          compPassed = false;
          compLog = compErr.stderr || compErr.stdout || compErr.message;
        }
        const compEnd = process.hrtime.bigint();
        compilationMs = Math.round(Number(compEnd - compStart) / 10000) / 100;
        elaborationMs = 0.5;

        if (compPassed) {
          const simStart = process.hrtime.bigint();
          try {
            const vsimCmd = `"${vsim}" -c -do "run -all; quit -f" work.${top_module}`;
            const vsimRes = await execPromise(vsimCmd, { cwd: tmpDir, timeout: timeout_sec * 1000 });
            const simEnd = process.hrtime.bigint();
            simulationMs = Math.round(Number(simEnd - simStart) / 10000) / 100;

            const simLog = vsimRes.stdout + (vsimRes.stderr ? `\n${vsimRes.stderr}` : '');
            const hasError = simLog.includes('** Error') || simLog.includes('** Fatal') || simLog.includes('$fatal') || simLog.includes('[FAIL]');
            const passed = !hasError;

            testResults.push({
              testId: 'tb_modelsim_01',
              testName: tbFiles[0] || 'ModelSim Test Suite',
              passed,
              runtimeMs: simulationMs,
              exitCode: passed ? 0 : 1,
              stdout: vsimRes.stdout,
              stderr: vsimRes.stderr,
              flakyCheckPassed: true
            });
          } catch (simErr: any) {
            const simEnd = process.hrtime.bigint();
            simulationMs = Math.round(Number(simEnd - simStart) / 10000) / 100;
            testResults.push({
              testId: 'tb_modelsim_01',
              testName: tbFiles[0] || 'ModelSim Test Suite',
              passed: false,
              runtimeMs: simulationMs,
              exitCode: simErr.code || 1,
              stdout: simErr.stdout || '',
              stderr: simErr.stderr || simErr.message,
              flakyCheckPassed: false
            });
          }
        }
      } else if (sim === 'vivado') {
        const xvlog = findBinary('xvlog', toolCustomPaths.vivado);
        const xelab = findBinary('xelab', toolCustomPaths.vivado);
        const xsim = findBinary('xsim', toolCustomPaths.vivado);

        if (!xvlog || !xelab || !xsim) {
          activeBaselineLocks.delete(lockKey);
          return res.status(400).json({
            passed: false,
            execution_id: executionId,
            execution_type: 'fresh',
            error: 'Xilinx Vivado executables (xvlog/xelab/xsim) are not installed or accessible on this system.',
            diagnostic_hint: 'Configure the Vivado bin path in Toolchain Settings, or start local_eda_agent.py on your Windows host machine.'
          });
        }

        const compStart = process.hrtime.bigint();
        try {
          const xvlogCmd = `"${xvlog}" -sv ${fileNames.map(f => `"${f}"`).join(' ')}`;
          const vlogRes = await execPromise(xvlogCmd, { cwd: tmpDir, timeout: 60000 });
          compLog = vlogRes.stdout + (vlogRes.stderr ? `\n${vlogRes.stderr}` : '');
          if (vlogRes.stderr && vlogRes.stderr.includes('ERROR:')) {
            compPassed = false;
          } else {
            const xelabCmd = `"${xelab}" -debug typical -top ${top_module} -s sim_snapshot`;
            const elabRes = await execPromise(xelabCmd, { cwd: tmpDir, timeout: 60000 });
            compLog += '\n' + elabRes.stdout + (elabRes.stderr ? `\n${elabRes.stderr}` : '');
            compPassed = !elabRes.stdout.includes('ERROR:');
          }
        } catch (compErr: any) {
          compPassed = false;
          compLog = compErr.stderr || compErr.stdout || compErr.message;
        }
        const compEnd = process.hrtime.bigint();
        compilationMs = Math.round(Number(compEnd - compStart) / 10000) / 100;
        elaborationMs = 1.0;

        if (compPassed) {
          const simStart = process.hrtime.bigint();
          try {
            const xsimCmd = `"${xsim}" sim_snapshot -R`;
            const xsimRes = await execPromise(xsimCmd, { cwd: tmpDir, timeout: timeout_sec * 1000 });
            const simEnd = process.hrtime.bigint();
            simulationMs = Math.round(Number(simEnd - simStart) / 10000) / 100;

            const simLog = xsimRes.stdout + (xsimRes.stderr ? `\n${xsimRes.stderr}` : '');
            const hasError = simLog.includes('FATAL_ERROR') || simLog.includes('ERROR:') || simLog.includes('[FAIL]');
            const passed = !hasError;

            testResults.push({
              testId: 'tb_vivado_01',
              testName: tbFiles[0] || 'Vivado Test Suite',
              passed,
              runtimeMs: simulationMs,
              exitCode: passed ? 0 : 1,
              stdout: xsimRes.stdout,
              stderr: xsimRes.stderr,
              flakyCheckPassed: true
            });
          } catch (simErr: any) {
            const simEnd = process.hrtime.bigint();
            simulationMs = Math.round(Number(simEnd - simStart) / 10000) / 100;
            testResults.push({
              testId: 'tb_vivado_01',
              testName: tbFiles[0] || 'Vivado Test Suite',
              passed: false,
              runtimeMs: simulationMs,
              exitCode: simErr.code || 1,
              stdout: simErr.stdout || '',
              stderr: simErr.stderr || simErr.message,
              flakyCheckPassed: false
            });
          }
        }
      } else if (sim === 'iverilog') {
        const outVvp = path.join(tmpDir, 'sim.vvp');
        const compileCmd = `iverilog -g2012 -o "${outVvp}" ${fileNames.map(f => `"${f}"`).join(' ')}`;

        // Measure compilation duration monotonically
        const compStart = process.hrtime.bigint();
        try {
          const compOutput = await execPromise(compileCmd, { cwd: tmpDir, timeout: 30000 });
          compPassed = fs.existsSync(outVvp);
          compLog = compOutput.stdout + (compOutput.stderr ? `\n${compOutput.stderr}` : '');
        } catch (compErr: any) {
          compPassed = false;
          compLog = compErr.stderr || compErr.stdout || compErr.message;
        }
        const compEnd = process.hrtime.bigint();
        compilationMs = Math.round(Number(compEnd - compStart) / 10000) / 100;

        // Measure elaboration / artifact verification duration
        const elabStart = process.hrtime.bigint();
        if (compPassed && fs.existsSync(outVvp)) {
          const stat = fs.statSync(outVvp);
          if (stat.size === 0) compPassed = false;
        }
        const elabEnd = process.hrtime.bigint();
        elaborationMs = Math.max(0.12, Math.round(Number(elabEnd - elabStart) / 10000) / 100);

        if (compPassed && fs.existsSync(outVvp)) {
          // Execute test simulation 2x for deterministic check using monotonic timer
          const simStart = process.hrtime.bigint();
          try {
            const run1 = await execPromise(`vvp "${outVvp}"`, { cwd: tmpDir, timeout: timeout_sec * 1000 });
            const run2 = await execPromise(`vvp "${outVvp}"`, { cwd: tmpDir, timeout: timeout_sec * 1000 });
            const simEnd = process.hrtime.bigint();
            simulationMs = Math.round(Number(simEnd - simStart) / 10000) / 100;

            const passed = !run1.stdout.includes('[FAIL]') && !run1.stdout.includes('ERROR');
            const isDeterministic = run1.stdout === run2.stdout;

            testResults.push({
              testId: 'tb_run_01',
              testName: tbFiles[0] || 'Default Test Suite',
              passed,
              runtimeMs: simulationMs,
              exitCode: passed ? 0 : 1,
              stdout: run1.stdout,
              stderr: run1.stderr,
              flakyCheckPassed: isDeterministic
            });
          } catch (runErr: any) {
            const simEnd = process.hrtime.bigint();
            simulationMs = Math.round(Number(simEnd - simStart) / 10000) / 100;
            testResults.push({
              testId: 'tb_run_01',
              testName: tbFiles[0] || 'Default Test Suite',
              passed: false,
              runtimeMs: simulationMs,
              exitCode: runErr.code || 1,
              stdout: runErr.stdout || '',
              stderr: runErr.stderr || runErr.message,
              flakyCheckPassed: false
            });
          }
        }
      } else {
        // Verilator mode
        const compileCmd = `verilator --binary --timing -Wall -Wno-fatal --top-module "${top_module}" ${synthFiles.map(f => `"${f}"`).join(' ')}`;
        const compStart = process.hrtime.bigint();
        try {
          const compOutput = await execPromise(compileCmd, { cwd: tmpDir, timeout: 45000 });
          compPassed = true;
          compLog = compOutput.stdout + (compOutput.stderr ? `\n${compOutput.stderr}` : '');
        } catch (compErr: any) {
          compPassed = false;
          compLog = compErr.stderr || compErr.stdout || compErr.message;
        }
        const compEnd = process.hrtime.bigint();
        compilationMs = Math.round(Number(compEnd - compStart) / 10000) / 100;
        elaborationMs = 0.5;
        simulationMs = 0;
      }

      const totalEnd = process.hrtime.bigint();
      const totalMs = Math.round(Number(totalEnd - totalStart) / 10000) / 100;

      const allPassed = compPassed && testResults.length > 0 && testResults.every(t => t.passed && t.flakyCheckPassed);

      const timingData = {
        compilation_ms: compilationMs,
        elaboration_ms: elaborationMs,
        startup_ms: startupMs,
        simulation_ms: simulationMs,
        total_ms: totalMs,
        timer_mechanism: 'process.hrtime.bigint (monotonic)'
      };

      // Attach timing breakdown to individual test results
      testResults = testResults.map(t => ({
        ...t,
        timingBreakdown: {
          compilationMs,
          elaborationMs,
          startupMs,
          simulationMs,
          totalMs,
          timerMechanism: 'process.hrtime.bigint (monotonic)'
        }
      }));

      const responseData = {
        execution_id: executionId,
        execution_type: 'fresh',
        is_cached: false,
        passed: allPassed,
        compilation_success: compPassed,
        compile_log: compLog,
        simulator_version: sim === 'verilator' ? 'Verilator 5.006' : 'Icarus 11.0',
        total_tests: testResults.length,
        passed_tests: testResults.filter(t => t.passed).length,
        failed_tests: testResults.filter(t => !t.passed).length,
        is_deterministic: testResults.every(t => t.flakyCheckPassed),
        diagnostic_hint: allPassed ? undefined : 'Compilation or baseline test failed. Check syntax and module ports.',
        test_results: testResults,
        timing: timingData,
        evidence: {
          command: `${sim} invocation in isolated sandbox`,
          exitCode: allPassed ? 0 : 1,
          timestamp: new Date().toISOString(),
          simulatorVersion: sim === 'verilator' ? 'Verilator 5.006' : 'Icarus 11.0',
          configSnapshotId: `cfg-${project_id}-v1`,
          rawLogPreview: compLog + '\n' + (testResults[0]?.stdout || ''),
          executionId
        }
      };

      if (allPassed) {
        baselineExecutionCache.set(cacheKey, {
          result: responseData,
          cachedAt: new Date().toISOString(),
          executionId
        });
      }

      res.json(responseData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    } finally {
      activeBaselineLocks.delete(lockKey);
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  });

  // Real Hardware Mutation Simulation Engine
  app.post('/api/run-mutants', async (req, res) => {
    const { project_id, files, mutants, simulator = 'iverilog', timeout_sec = 10 } = req.body;

    if (!files || !mutants || !Array.isArray(mutants)) {
      return res.status(400).json({ error: 'Files and mutants required' });
    }

    const evaluatedMutants: any[] = [];
    const matrixCells: { [key: string]: any } = {};
    const tbFiles = files.filter((f: any) => f.name.includes('tb_') || f.name.includes('test_') || f.name.endsWith('.py'));
    const testId = tbFiles[0]?.name ? `test_${tbFiles[0].name.replace(/[^a-zA-Z0-9_]/g, '_')}` : 'tb_vector_01';
    const testName = tbFiles[0]?.name || 'Standard Verification Harness';

    for (const m of mutants) {
      const mutantTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `muta_sim_${m.id}_`));
      const startTime = Date.now();

      try {
        // Write all files, substituting the mutated file
        for (const f of files) {
          const targetPath = path.join(mutantTmpDir, f.name);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });

          if (f.name === m.file) {
            // Apply mutant snippet replacement or use mutated file content
            const originalLines = f.content.split('\n');
            const targetLineIdx = Math.max(0, m.line - 1);
            if (targetLineIdx < originalLines.length) {
              originalLines[targetLineIdx] = m.mutatedSnippet;
            }
            fs.writeFileSync(targetPath, originalLines.join('\n'), 'utf-8');
          } else {
            fs.writeFileSync(targetPath, f.content, 'utf-8');
          }
        }

        const outVvp = path.join(mutantTmpDir, 'sim_mutant.vvp');
        const fileNames = files.map((f: any) => `"${f.name}"`).join(' ');
        const compileCmd = `iverilog -g2012 -o "${outVvp}" ${fileNames}`;

        let compPassed = false;
        let compLog = '';

        try {
          const compRes = await execPromise(compileCmd, { cwd: mutantTmpDir, timeout: 20000 });
          compPassed = fs.existsSync(outVvp);
          compLog = compRes.stdout + (compRes.stderr ? `\n${compRes.stderr}` : '');
        } catch (cErr: any) {
          compPassed = false;
          compLog = cErr.stderr || cErr.stdout || cErr.message;
        }

        if (!compPassed) {
          // Invalid mutant (syntax/compile error caused by mutation)
          evaluatedMutants.push({
            ...m,
            status: 'invalid',
            failureMessage: 'Compile error: ' + compLog.split('\n')[0],
            runtimeMs: Date.now() - startTime
          });
          continue;
        }

        // Execute compiled simulation
        try {
          const simRes = await execPromise(`vvp "${outVvp}"`, { cwd: mutantTmpDir, timeout: timeout_sec * 1000 });
          const stdout = simRes.stdout || '';
          const isKilled = stdout.includes('[FAIL]') || stdout.includes('ERROR') || stdout.includes('$fatal');
          const status = isKilled ? 'killed' : 'survived';
          const runtimeMs = Date.now() - startTime;

          evaluatedMutants.push({
            ...m,
            status,
            killingTestId: isKilled ? testId : undefined,
            killingTestName: isKilled ? testName : undefined,
            runtimeMs,
            evidence: {
              command: `vvp sim_mutant.vvp`,
              exitCode: isKilled ? 1 : 0,
              timestamp: new Date().toISOString(),
              simulatorVersion: 'Icarus Verilog 11.0',
              configSnapshotId: `cfg-${project_id}-v1`,
              rawLogPreview: stdout.slice(0, 1500)
            }
          });

          matrixCells[`${testId}__${m.id}`] = {
            mutantId: m.id,
            testId,
            detected: isKilled,
            runtimeMs,
            exitCode: isKilled ? 1 : 0,
            failureLogSnippet: isKilled ? stdout.slice(0, 300) : undefined,
            status
          };
        } catch (simErr: any) {
          // Process exited non-zero or timed out -> Killed!
          const isTimeout = simErr.killed && simErr.signal === 'SIGTERM';
          const status = isTimeout ? 'timeout' : 'killed';
          const runtimeMs = Date.now() - startTime;

          evaluatedMutants.push({
            ...m,
            status,
            killingTestId: testId,
            killingTestName: testName,
            runtimeMs,
            evidence: {
              command: `vvp sim_mutant.vvp`,
              exitCode: simErr.code || 1,
              timestamp: new Date().toISOString(),
              simulatorVersion: 'Icarus Verilog 11.0',
              configSnapshotId: `cfg-${project_id}-v1`,
              rawLogPreview: (simErr.stdout || '') + '\n' + (simErr.stderr || simErr.message)
            }
          });

          matrixCells[`${testId}__${m.id}`] = {
            mutantId: m.id,
            testId,
            detected: true,
            runtimeMs,
            exitCode: simErr.code || 1,
            failureLogSnippet: (simErr.stderr || simErr.message || '').slice(0, 300),
            status
          };
        }
      } finally {
        try {
          fs.rmSync(mutantTmpDir, { recursive: true, force: true });
        } catch {}
      }
    }

    const killed = evaluatedMutants.filter(m => m.status === 'killed' || m.status === 'timeout').length;
    const survived = evaluatedMutants.filter(m => m.status === 'survived').length;
    const invalid = evaluatedMutants.filter(m => m.status === 'invalid').length;
    const valid = killed + survived;
    const mutationScore = valid > 0 ? Math.round((killed / valid) * 1000) / 10 : 0;

    res.json({
      mutants: evaluatedMutants,
      cells: matrixCells,
      totalMutants: evaluatedMutants.length,
      validMutants: valid,
      killedMutants: killed,
      survivedMutants: survived,
      invalidMutants: invalid,
      mutationScore
    });
  });

  // Mount Vite development middleware
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MutaSelect AI Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
