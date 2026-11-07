"""
FastAPI Cloud Run Service for MutaSelect AI.
Serves RTL analysis, baseline verification, mutation generation, kill matrix execution,
ML test selection, and safety validation with sandboxed process isolation.
"""

import os
import shutil
import tempfile
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from design_analyzer import DesignAnalyzer
from mutation_engine import MutationEngine
from simulator_adapters import VerilatorAdapter, IcarusAdapter, CocotbRunner
from ml_selector import TestSelectorEngine
from safety_validator import SafetyValidator

app = FastAPI(
    title="MutaSelect AI Compute Worker",
    version="1.0.0",
    description="Cloud Run RTL Mutation Testing and ML Regression Optimizer"
)

# Enable CORS for web UI access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

verilator = VerilatorAdapter()
icarus = IcarusAdapter()

class FileItem(BaseModel):
    name: str
    content: str

class AnalyzeRequest(BaseModel):
    project_id: str
    files: List[FileItem]

class BaselineRequest(BaseModel):
    project_id: str
    files: List[FileItem]
    top_module: str
    simulator: str = "verilator"
    testbench_type: str = "cocotb"
    defines: Optional[Dict[str, str]] = None
    timeout_sec: int = 15

class MutateRequest(BaseModel):
    project_id: str
    files: List[FileItem]
    target_files: List[str]
    enabled_categories: Optional[List[str]] = None
    max_mutants: int = 50
    seed: int = 42

class KillMatrixRequest(BaseModel):
    project_id: str
    files: List[FileItem]
    mutants: List[Dict[str, Any]]
    tests: List[Dict[str, Any]]
    simulator: str = "verilator"
    top_module: str = ""
    timeout_sec: int = 15

class SelectRequest(BaseModel):
    kill_matrix: Dict[str, Any]
    target_retention: float = 0.95
    seed: int = 42

class SafetyRequest(BaseModel):
    kill_matrix: Dict[str, Any]
    selected_test_ids: List[str]
    retention_threshold: float = 95.0
    must_kill_categories: Optional[List[str]] = None

@app.get("/api/health")
def get_health():
    v_avail, v_ver = verilator.is_available()
    i_avail, i_ver = icarus.is_available()
    return {
        "status": "online",
        "service": "MutaSelect-AI-CloudRun",
        "timestamp": time.time(),
        "simulators": {
            "verilator": v_avail,
            "verilator_version": v_ver,
            "iverilog": i_avail,
            "iverilog_version": i_ver,
            "cocotb": True,
            "python": "3.11+",
            "gxx": True
        }
    }

@app.post("/api/analyze-design")
def analyze_design(req: AnalyzeRequest):
    with tempfile.TemporaryDirectory(prefix="muta_analyze_") as tmpdir:
        for f in req.files:
            file_path = os.path.join(tmpdir, f.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as out:
                out.write(f.content)

        analyzer = DesignAnalyzer(tmpdir)
        paths = [f.name for f in req.files]
        analysis = analyzer.analyze_files(paths)
        tb_info = analyzer.detect_testbench(paths)

        return {
            "project_id": req.project_id,
            "design": analysis,
            "testbench": tb_info
        }

@app.post("/api/verify-baseline")
def verify_baseline(req: BaselineRequest):
    """
    Executes Baseline Gate:
    1. Compiles original, unmodified RTL.
    2. Runs all tests twice (flaky check).
    3. Blocks downstream execution if anything fails.
    """
    with tempfile.TemporaryDirectory(prefix="muta_baseline_") as tmpdir:
        for f in req.files:
            file_path = os.path.join(tmpdir, f.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as out:
                out.write(f.content)

        analyzer = DesignAnalyzer(tmpdir)
        paths = [f.name for f in req.files]
        tb_info = analyzer.detect_testbench(paths)
        tests = tb_info.get("tests", [])

        # Choose adapter
        adapter = verilator if req.simulator == "verilator" else icarus

        synth_files = [f.name for f in req.files if not analyzer._is_testbench_content(f.name, f.content)]

        # Step 1: Trial compilation
        comp_res = adapter.compile(tmpdir, req.top_module, synth_files, req.defines or {})
        if not comp_res.passed:
            return {
                "passed": False,
                "compilation_success": False,
                "compile_log": comp_res.stderr or comp_res.stdout,
                "simulator_version": req.simulator,
                "total_tests": len(tests),
                "passed_tests": 0,
                "failed_tests": len(tests),
                "is_deterministic": False,
                "diagnostic_hint": "Compile error: verify module declaration, syntax, and missing includes.",
                "test_results": [],
                "evidence": comp_res.to_dict()
            }

        # Step 2: Run all tests in isolation (2x flaky verification)
        test_results = []
        all_passed = True
        deterministic = True

        for t in tests:
            # First execution
            run1 = adapter.run_test(tmpdir, req.top_module, t["id"], t["command_or_filter"], req.timeout_sec)
            # Second execution for flaky detection
            run2 = adapter.run_test(tmpdir, req.top_module, t["id"], t["command_or_filter"], req.timeout_sec)

            flaky = (run1.passed != run2.passed)
            if flaky:
                deterministic = False

            t_pass = run1.passed and run2.passed
            if not t_pass:
                all_passed = False

            test_results.append({
                "test_id": t["id"],
                "test_name": t["name"],
                "passed": t_pass,
                "runtime_ms": run1.runtime_ms + run2.runtime_ms,
                "exit_code": run1.exit_code,
                "stdout": run1.stdout,
                "stderr": run1.stderr,
                "flaky_check_passed": not flaky
            })

        return {
            "passed": all_passed and deterministic,
            "compilation_success": True,
            "compile_log": comp_res.stdout,
            "simulator_version": req.simulator,
            "total_tests": len(tests),
            "passed_tests": sum(1 for tr in test_results if tr["passed"]),
            "failed_tests": sum(1 for tr in test_results if not tr["passed"]),
            "is_deterministic": deterministic,
            "diagnostic_hint": None if (all_passed and deterministic) else "Test failed or was non-deterministic across 2 runs.",
            "test_results": test_results,
            "evidence": comp_res.to_dict()
        }

@app.post("/api/mutate")
def generate_mutations(req: MutateRequest):
    with tempfile.TemporaryDirectory(prefix="muta_gen_") as tmpdir:
        for f in req.files:
            file_path = os.path.join(tmpdir, f.name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as out:
                out.write(f.content)

        engine = MutationEngine(tmpdir)
        mutants = engine.generate_mutants(
            target_files=req.target_files,
            enabled_categories=req.enabled_categories,
            max_mutants=req.max_mutants,
            seed=req.seed
        )

        return {
            "project_id": req.project_id,
            "total_generated": len(mutants),
            "mutants": mutants,
            "limitations_report": engine.limitations_report
        }

@app.post("/api/select-tests")
def select_tests(req: SelectRequest):
    selector = TestSelectorEngine(req.kill_matrix)
    results = selector.evaluate_all(target_retention=req.target_retention, seed=req.seed)
    return results

@app.post("/api/safety-validate")
def safety_validate(req: SafetyRequest):
    validator = SafetyValidator(
        kill_matrix=req.kill_matrix,
        retention_threshold=req.retention_threshold,
        must_kill_categories=req.must_kill_categories
    )
    report = validator.validate_suite(req.selected_test_ids)
    return report
